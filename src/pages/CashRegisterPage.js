import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../components/AuthProvider';
import { useFirebase } from '../contexts/FirebaseContext';
import {
    collection,
    doc,
    getDocs,
    query,
    where,
    updateDoc,
    orderBy,
    limit,
    addDoc,
    onSnapshot,
    serverTimestamp,
} from 'firebase/firestore';
import { PlusCircle, MinusCircle, DollarSign, Archive, Store, Users } from 'lucide-react';

const CashRegisterPage = () => {
    const { currentUser, userRole, userStoreId, userStoreName, loading: authAuthLoading } = useAuth();
    const { db, appId, firebaseLoading } = useFirebase();

    const [allStores, setAllStores] = useState([]);
    const [selectedStoreId, setSelectedStoreId] = useState(userStoreId);
    const [selectedStoreName, setSelectedStoreName] = useState(userStoreName);


    const [cashRegisterStatus, setCashRegisterStatus] = useState('closed');
    const [currentSessionId, setCurrentSessionId] = useState(null);
    const [openingBalance, setOpeningBalance] = useState('');
    const [currentCashCount, setCurrentCashCount] = useState('');
    const [manualClosingBalance, setManualClosingBalance] = useState('');
    const [dailySalesSummary, setDailySalesSummary] = useState({
        totalSales: 0,
        cashSales: 0,
        creditCardSales: 0,
        debitCardSales: 0,
        pixSales: 0,
    });
    const [salesBySeller, setSalesBySeller] = useState([]); // NOVO ESTADO
    const [supplies, setSupplies] = useState([]);
    const [outflows, setOutflows] = useState([]);
    const [newSupplyAmount, setNewSupplyAmount] = useState('');
    const [newSupplyDescription, setNewSupplyDescription] = useState('');
    const [newOutflowAmount, setNewOutflowAmount] = useState('');
    const [newOutflowDescription, setNewOutflowDescription] = useState('');
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);

    const [cashRegisterHistory, setCashRegisterHistory] = useState([]);
    const [currentSessionOpenedAt, setCurrentSessionOpenedAt] = useState(null);

    useEffect(() => {
        if (userRole === 'admin' && db) {
            const fetchStores = async () => {
                const storesCollectionRef = collection(db, 'stores');
                try {
                    const storesSnapshot = await getDocs(storesCollectionRef);
                    const storesList = storesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                    setAllStores(storesList);
                    if (!selectedStoreId && storesList.length > 0) {
                        setSelectedStoreId(storesList[0].id);
                        setSelectedStoreName(storesList[0].name);
                    }
                } catch (err) {
                    console.error("Erro ao buscar lojas:", err);
                    setError("Não foi possível carregar a lista de lojas.");
                }
            };
            fetchStores();
        }
    }, [userRole, db, selectedStoreId]);

    useEffect(() => {
        setSelectedStoreId(userStoreId);
        setSelectedStoreName(userStoreName);
    }, [userStoreId, userStoreName]);


    const fetchDailySales = useCallback(async (openedAtDate) => {
        if (!db || !appId || !selectedStoreId || !openedAtDate) {
            return { 
                totalSales: 0, cashSales: 0, creditCardSales: 0, debitCardSales: 0, pixSales: 0, salesBySeller: [] 
            };
        }

        const salesCollectionRef = collection(db, 'artifacts', appId, 'stores', selectedStoreId, 'sales');
        const salesQuery = query(
            salesCollectionRef,
            where('date', '>=', openedAtDate)
        );

        try {
            const querySnapshot = await getDocs(salesQuery);
            let total = 0, cash = 0, credit = 0, debit = 0, pix = 0;
            const sellerSales = {};

            querySnapshot.forEach(doc => {
                const sale = doc.data();
                total += sale.totalAmount || 0;
                
                if (sale.sellerInfo && sale.sellerInfo.name) {
                    const sellerName = sale.sellerInfo.name;
                    sellerSales[sellerName] = (sellerSales[sellerName] || 0) + sale.totalAmount;
                }

                 if (sale.paymentMethods) {
                    sale.paymentMethods.forEach(pm => {
                        if (pm.method === 'Dinheiro') cash += pm.amount;
                        else if (pm.method.includes('Credito')) credit += pm.amount;
                        else if (pm.method === 'Cartao de Debito') debit += pm.amount;
                        else if (pm.method === 'PIX') pix += pm.amount;
                    });
                }
            });
            
            const salesBySellerArray = Object.entries(sellerSales).map(([name, totalAmount]) => ({ name, totalAmount }));

            return {
                totalSales: total,
                cashSales: cash,
                creditCardSales: credit,
                debitCardSales: debit,
                pixSales: pix,
                salesBySeller: salesBySellerArray,
            };
        } catch (err) {
            console.error("CashRegisterPage: Erro ao buscar vendas diarias:", err);
            setError(`Erro ao carregar vendas diarias: ${err.message}`);
            return { totalSales: 0, cashSales: 0, creditCardSales: 0, debitCardSales: 0, pixSales: 0, salesBySeller: [] };
        }
    }, [db, appId, selectedStoreId]);

    useEffect(() => {
        let unsubscribeCashRegister = () => {};

        if (db && currentUser && selectedStoreId && !firebaseLoading && !authAuthLoading) {
            const sessionsCollectionRef = collection(db, 'stores', selectedStoreId, 'cash_register_sessions');
            const q = query(
                sessionsCollectionRef,
                where('status', '==', 'open'),
                orderBy('openedAt', 'desc'),
                limit(1)
            );

            unsubscribeCashRegister = onSnapshot(q, async (snapshot) => {
                if (!snapshot.empty) {
                    const docSnap = snapshot.docs[0];
                    const data = docSnap.data();
                    const openedAtDate = data.openedAt && data.openedAt.toDate ? data.openedAt.toDate() : null;
                    
                    setCurrentSessionId(docSnap.id);
                    setCashRegisterStatus(data.status || 'closed');
                    setOpeningBalance(data.openingBalance !== undefined ? data.openingBalance.toString() : '');
                    setCurrentCashCount(data.currentCashCount !== undefined ? data.currentCashCount.toString() : '');
                    setSupplies(data.supplies || []);
                    setOutflows(data.outflows || []);
                    setCurrentSessionOpenedAt(openedAtDate);
                    
                    if (openedAtDate) {
                        const summary = await fetchDailySales(openedAtDate);
                        setDailySalesSummary({
                            totalSales: summary.totalSales,
                            cashSales: summary.cashSales,
                            creditCardSales: summary.creditCardSales,
                            debitCardSales: summary.debitCardSales,
                            pixSales: summary.pixSales,
                        });
                        setSalesBySeller(summary.salesBySeller);
                    }

                    setManualClosingBalance('');
                    setError('');
                } else {
                    setCurrentSessionId(null);
                    setCashRegisterStatus('closed');
                    setOpeningBalance('');
                    setCurrentCashCount('');
                    setSupplies([]);
                    setOutflows([]);
                    setCurrentSessionOpenedAt(null);
                    setDailySalesSummary({ totalSales: 0, cashSales: 0, creditCardSales: 0, debitCardSales: 0, pixSales: 0 });
                    setSalesBySeller([]);
                    setManualClosingBalance('');
                }
            }, (err) => {
                console.error("CashRegisterPage: Erro ao ouvir o status da sessao de caixa ATUAL:", err);
                setError(`Erro ao carregar o status do caixa: ${err.message}`);
                setCashRegisterStatus('closed');
                setCurrentSessionId(null);
            });
        } else {
            setCashRegisterStatus('closed');
            setCurrentSessionId(null);
        }

        return () => {
            if (unsubscribeCashRegister) {
                unsubscribeCashRegister();
            }
        };
    }, [db, currentUser, selectedStoreId, firebaseLoading, authAuthLoading, fetchDailySales]);

    useEffect(() => {
        let unsubscribeHistory = () => {};

        if (db && currentUser && selectedStoreId && !firebaseLoading && !authAuthLoading) {
            const sessionsCollectionRef = collection(db, 'stores', selectedStoreId, 'cash_register_sessions');
            const q = query(
                sessionsCollectionRef,
                where('status', '==', 'closed'),
                orderBy('closedAt', 'desc'),
                limit(10)
            );

            unsubscribeHistory = onSnapshot(q, (snapshot) => {
                const historyData = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data(),
                    openedAt: doc.data().openedAt && doc.data().openedAt.toDate ? doc.data().openedAt.toDate() : null,
                    closedAt: doc.data().closedAt && doc.data().closedAt.toDate ? doc.data().closedAt.toDate() : null,
                    supplies: doc.data().supplies?.map(s => ({
                        ...s,
                        timestamp: s.timestamp && s.timestamp.toDate ? s.timestamp.toDate() : s.timestamp || null
                    })) || [],
                    outflows: doc.data().outflows?.map(o => ({
                        ...o,
                        timestamp: o.timestamp && o.timestamp.toDate ? o.timestamp.toDate() : o.timestamp || null
                    })) || [],
                }));
                setCashRegisterHistory(historyData);
            }, (err) => {
                console.error("CashRegisterPage: Erro ao carregar historico de caixa:", err);
            });
        } else {
            setCashRegisterHistory([]);
        }

        return () => {
            if (unsubscribeHistory) {
                unsubscribeHistory();
            }
        };
    }, [db, currentUser, selectedStoreId, firebaseLoading, authAuthLoading]);

    const handleOpenCashRegister = async () => {
        if (isProcessing) return;
        if (!openingBalance || isNaN(parseFloat(openingBalance)) || parseFloat(openingBalance) < 0) {
            setError("Por favor, insira um valor de saldo de abertura valido.");
            return;
        }
        if (!currentUser || !selectedStoreId) {
            setError("Informacoes de usuario ou loja nao disponiveis. Tente fazer login novamente.");
            return;
        }
        if (authAuthLoading || firebaseLoading || !db) {
            setError("Servicos do Firebase nao inicializados. Tente recarregar a pagina.");
            return;
        }

        setIsProcessing(true);
        setError('');
        setMessage('');

        try {
            const parsedOpeningBalance = parseFloat(openingBalance);
            const sessionsCollectionRef = collection(db, 'stores', selectedStoreId, 'cash_register_sessions');
            
            await addDoc(sessionsCollectionRef, {
                status: 'open',
                openedAt: serverTimestamp(),
                openedBy: currentUser.email,
                openingBalance: parsedOpeningBalance,
                currentCashCount: parsedOpeningBalance,
                supplies: [],
                outflows: [],
                dailySalesSummary: {
                    totalSales: 0,
                    cashSales: 0,
                    creditCardSales: 0,
                    debitCardSales: 0,
                    pixSales: 0,
                },
                salesBySeller: [],
                storeId: selectedStoreId,
                storeName: selectedStoreName,
            });

            setMessage("Caixa aberto com sucesso!");
            setCashRegisterStatus('open');
            setError('');
        } catch (err) {
            console.error("CashRegisterPage: Erro ao abrir o caixa:", err);
            setError(`Erro ao abrir o caixa: ${err.message}`);
        } finally {
            setIsProcessing(false);
        }
    };

    const handleCloseCashRegister = async () => {
        if (isProcessing) return;
        if (cashRegisterStatus !== 'open' || !currentSessionId) {
             setError("O caixa ja esta fechado ou nao ha uma sessao ativa para fechar.");
             return;
        }
        if (!manualClosingBalance || isNaN(parseFloat(manualClosingBalance)) || parseFloat(manualClosingBalance) < 0) {
            setError("Por favor, insira um valor de saldo de fechamento valido.");
            return;
        }
        if (!currentUser || !selectedStoreId) {
            setError("Informacoes de usuario ou loja nao disponiveis. Tente fazer login novamente.");
            return;
        }
        if (authAuthLoading || firebaseLoading || !db) {
            setError("Servicos do Firebase nao inicializados. Tente recarregar a pagina.");
            return;
        }

        setIsProcessing(true);
        setError('');
        setMessage('');

        try {
            const currentSessionDocRef = doc(db, 'stores', selectedStoreId, 'cash_register_sessions', currentSessionId);
            const finalSummary = await fetchDailySales(currentSessionOpenedAt);
            const parsedManualClosingBalance = parseFloat(manualClosingBalance);
            const parsedCurrentCashCount = parseFloat(currentCashCount);
            const difference = parsedManualClosingBalance - parsedCurrentCashCount;

            await updateDoc(currentSessionDocRef, {
                status: 'closed',
                closedAt: serverTimestamp(),
                closedBy: currentUser.email,
                closingBalance: parsedManualClosingBalance,
                dailySalesSummary: {
                    totalSales: finalSummary.totalSales,
                    cashSales: finalSummary.cashSales,
                    creditCardSales: finalSummary.creditCardSales,
                    debitCardSales: finalSummary.debitCardSales,
                    pixSales: finalSummary.pixSales,
                },
                salesBySeller: finalSummary.salesBySeller,
                cashCountDifference: difference,
            });

            setMessage("Caixa fechado com sucesso e sessao arquivada!");
        } catch (err) {
            console.error("CashRegisterPage: Erro ao fechar o caixa:", err);
            setError(`Erro ao fechar o caixa: ${err.message}`);
        } finally {
            setIsProcessing(false);
        }
    };

    const handleAddSupply = async () => {
        if (isProcessing) return;
        if (cashRegisterStatus !== 'open' || !currentSessionId) {
            setError("O caixa precisa estar aberto para adicionar suprimentos.");
            return;
        }
        if (!newSupplyAmount || isNaN(parseFloat(newSupplyAmount)) || parseFloat(newSupplyAmount) <= 0) {
            setError("Por favor, insira um valor de suprimento valido.");
            return;
        }
        if (!newSupplyDescription.trim()) {
            setError("Por favor, insira uma descricao para o suprimento.");
            return;
        }
        if (!selectedStoreId) {
            setError("ID da loja nao disponivel.");
            return;
        }

        setIsProcessing(true);
        setError('');
        setMessage('');

        try {
            const supplyValue = parseFloat(newSupplyAmount);
            const currentSessionDocRef = doc(db, 'stores', selectedStoreId, 'cash_register_sessions', currentSessionId);

            await updateDoc(currentSessionDocRef, {
                supplies: [...supplies, {
                    amount: supplyValue,
                    description: newSupplyDescription.trim(),
                    timestamp: new Date(),
                    addedBy: currentUser.email,
                }],
                currentCashCount: parseFloat(currentCashCount) + supplyValue,
            });

            setMessage("Suprimento adicionado com sucesso!");
            setNewSupplyAmount('');
            setNewSupplyDescription('');
        } catch (err) {
            console.error("CashRegisterPage: Erro ao adicionar suprimento:", err);
            setError(`Erro ao adicionar suprimento: ${err.message}`);
        } finally {
            setIsProcessing(false);
        }
    };

    const handleAddOutflow = async () => {
        if (isProcessing) return;
        if (cashRegisterStatus !== 'open' || !currentSessionId) {
            setError("O caixa precisa estar aberto para adicionar sangrias.");
            return;
        }
        if (!newOutflowAmount || isNaN(parseFloat(newOutflowAmount)) || parseFloat(newOutflowAmount) <= 0) {
            setError("Por favor, insira um valor de sangria valido.");
            return;
        }
        if (!newOutflowDescription.trim()) {
            setError("Por favor, insira uma descricao para a sangria.");
            return;
        }
        if (!selectedStoreId) {
            setError("ID da loja nao disponivel.");
            return;
        }

        setIsProcessing(true);
        setError('');
        setMessage('');

        try {
            const outflowValue = parseFloat(newOutflowAmount);
            if (outflowValue > parseFloat(currentCashCount)) {
                setError("O valor da sangria nao pode ser maior que o saldo atual em caixa.");
                setIsProcessing(false);
                return;
            }

            const currentSessionDocRef = doc(db, 'stores', selectedStoreId, 'cash_register_sessions', currentSessionId);

            await updateDoc(currentSessionDocRef, {
                outflows: [...outflows, {
                    amount: outflowValue,
                    description: newOutflowDescription.trim(),
                    timestamp: new Date(),
                    addedBy: currentUser.email,
                }],
                currentCashCount: parseFloat(currentCashCount) - outflowValue,
            });

            setMessage("Sangria adicionada com sucesso!");
            setNewOutflowAmount('');
            setNewOutflowDescription('');
        } catch (err) {
            console.error("CashRegisterPage: Erro ao adicionar sangria:", err);
            setError(`Erro ao adicionar sangria: ${err.message}`);
        } finally {
            setIsProcessing(false);
        }
    };

    const handleStoreChange = (e) => {
        const newStoreId = e.target.value;
        const store = allStores.find(s => s.id === newStoreId);
        setSelectedStoreId(newStoreId);
        setSelectedStoreName(store ? store.name : 'Loja desconhecida');

        setCashRegisterStatus('closed');
        setCurrentSessionId(null);
        setOpeningBalance('');
        setCurrentCashCount('');
        setManualClosingBalance('');
        setDailySalesSummary({ totalSales: 0, cashSales: 0, creditCardSales: 0, debitCardSales: 0, pixSales: 0 });
        setSalesBySeller([]);
        setSupplies([]);
        setOutflows([]);
        setCashRegisterHistory([]);
        setError('');
        setMessage('');
    };


    const styles = {
        container: {
            padding: '20px',
            maxWidth: '900px',
            margin: '20px auto',
            backgroundColor: '#f9f9f9',
            borderRadius: '12px',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)',
            fontFamily: "'Inter', sans-serif', sans-serif",
            color: '#333',
        },
        header: {
            textAlign: 'center',
            color: '#34495e',
            marginBottom: '30px',
            fontSize: '2.2em',
            fontWeight: '700',
        },
        section: {
            backgroundColor: '#fff',
            padding: '25px',
            borderRadius: '10px',
            marginBottom: '20px',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)',
            border: '1px solid #e0e0e0',
        },
        sectionTitle: {
            color: '#2c3e50',
            fontSize: '1.5em',
            marginBottom: '15px',
            borderBottom: '2px solid #eee',
            paddingBottom: '10px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
        },
        cashStatus: {
            textAlign: 'center',
            fontSize: '1.8em',
            fontWeight: 'bold',
            marginBottom: '20px',
            padding: '15px',
            borderRadius: '8px',
            color: cashRegisterStatus === 'open' ? '#28a745' : '#dc3545',
            backgroundColor: cashRegisterStatus === 'open' ? '#e6ffe6' : '#ffe6e6',
            border: `1px solid ${cashRegisterStatus === 'open' ? '#28a745' : '#dc3545'}`,
        },
        currentBalance: {
            textAlign: 'center',
            fontSize: '1.5em',
            fontWeight: 'bold',
            color: '#007bff',
            marginBottom: '20px',
        },
        inputGroup: {
            marginBottom: '15px',
        },
        label: {
            display: 'block',
            marginBottom: '8px',
            fontWeight: '600',
            color: '#555',
        },
        input: {
            width: '100%',
            padding: '12px',
            border: '1px solid #ddd',
            borderRadius: '6px',
            fontSize: '1em',
            boxSizing: 'border-box',
            transition: 'border-color 0.3s ease',
        },
        button: {
            padding: '12px 20px',
            borderRadius: '6px',
            border: 'none',
            color: 'white',
            fontSize: '1em',
            cursor: 'pointer',
            transition: 'background-color 0.3s ease, transform 0.1s ease',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            fontWeight: '600',
        },
        primaryButton: {
            backgroundColor: '#007bff',
        },
        successButton: {
            backgroundColor: '#28a745',
        },
        dangerButton: {
            backgroundColor: '#dc3545',
        },
        buttonDisabled: {
            opacity: 0.6,
            cursor: 'not-allowed',
        },
        buttonContainer: {
            display: 'flex',
            gap: '15px',
            marginTop: '20px',
            justifyContent: 'flex-end',
        },
        summaryTable: {
            width: '100%',
            borderCollapse: 'collapse',
            marginTop: '15px',
            fontSize: '0.95em',
        },
        tableRow: {
            borderBottom: '1px solid #eee',
        },
        tableCell: {
            padding: '10px 15px',
            textAlign: 'left',
            fontSize: '0.9em',
            color: '#333',
        },
        list: {
            listStyleType: 'none',
            padding: 0,
            marginTop: '10px',
        },
        listItem: {
            backgroundColor: '#e6f7ff',
            borderLeft: '4px solid #3498db',
            padding: '10px 15px',
            marginBottom: '8px',
            borderRadius: '4px',
            fontSize: '0.9em',
            color: '#333',
        },
        messageError: {
            backgroundColor: '#f8d7da',
            color: '#721c24',
            padding: '12px',
            borderRadius: '8px',
            marginBottom: '20px',
            textAlign: 'center',
            border: '1px solid #f5c6cb',
        },
        messageSuccess: {
            backgroundColor: '#d4edda',
            color: '#155724',
            padding: '12px',
            borderRadius: '8px',
            marginBottom: '20px',
            textAlign: 'center',
            border: '1px solid #c3e6cb',
        },
        loadingContainer: {
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            minHeight: '200px',
            color: '#34495e',
        },
        spinner: {
            border: '4px solid rgba(0, 0, 0, 0.1)',
            borderTop: '4px solid #3498db',
            borderRadius: '50%',
            width: '40px',
            height: '40px',
            animation: 'spin 1s linear infinite',
            marginBottom: '10px',
        },
        '@keyframes spin': {
            '0%': { transform: 'rotate(0deg)' },
            '100%': { transform: 'rotate(360deg)' },
        },
        historyItem: {
            backgroundColor: '#f0f4f7',
            padding: '15px',
            borderRadius: '8px',
            marginBottom: '15px',
            border: '1px solid #e0e0e0',
        },
        historyItemHeader: {
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '10px',
            paddingBottom: '5px',
            borderBottom: '1px dashed #ccc',
        },
        historyDate: {
            fontWeight: 'bold',
            color: '#34495e',
            fontSize: '1.1em',
        },
        historyBalances: {
            display: 'flex',
            justifyContent: 'space-around',
            fontSize: '0.9em',
            color: '#555',
            flexWrap: 'wrap',
            gap: '10px',
        },
        historyDetailList: {
            listStyleType: 'disc',
            paddingLeft: '20px',
            marginTop: '10px',
            fontSize: '0.85em',
            color: '#666',
        },
        toggleDetailsButton: {
            background: 'none',
            border: 'none',
            color: '#007bff',
            cursor: 'pointer',
            fontSize: '0.9em',
            marginTop: '10px',
            textDecoration: 'underline',
        }
    };

    const formatCurrency = (value) => {
        const numValue = parseFloat(value);
        return isNaN(numValue) ? '0,00' : numValue.toFixed(2).replace('.', ',');
    };

    const formatDateTime = (date) => {
        if (!date) return 'N/A';
        return date.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
    };

    if (authAuthLoading || firebaseLoading) {
        return (
            <div style={styles.loadingContainer}>
                <div style={styles.spinner}></div>
                <p>A carregar informacoes de autentacao e Firebase...</p>
            </div>
        );
    }

    if (!currentUser) {
        return (
            <div style={styles.loadingContainer}>
                <p>Voce precisa estar logado para acessar a pagina de Caixa.</p>
            </div>
        );
    }

    if (!selectedStoreId && userRole !== 'admin') {
        return (
            <div style={styles.loadingContainer}>
                <p>Sua conta nao esta associada a uma loja.</p>
                <p>Entre em contato com o administrador para associar sua conta a uma loja existente.</p>
            </div>
        );
    }

    return (
        <div style={styles.container}>
            <h2 style={styles.header}>Gerenciamento de Caixa</h2>

            {error && <div style={styles.messageError}>{error}</div>}
            {message && <div style={styles.messageSuccess}>{message}</div>}

            {userRole === 'admin' && (
                <div style={styles.section}>
                    <div style={styles.inputGroup}>
                        <label style={styles.label} htmlFor="store-selector">
                           <Store style={{marginRight: '8px'}}/> Visualizando Caixa da Loja
                        </label>
                        <select 
                            id="store-selector"
                            value={selectedStoreId || ''}
                            onChange={handleStoreChange}
                            style={styles.input}
                        >
                            <option value="">-- Selecione uma Loja --</option>
                            {allStores.map(store => (
                                <option key={store.id} value={store.id}>{store.name}</option>
                            ))}
                        </select>
                    </div>
                </div>
            )}


            {selectedStoreId ? (
                <>
                    <div style={styles.section}>
                        <h3 style={styles.sectionTitle}><DollarSign /> Status do Caixa</h3>
                        <p style={styles.cashStatus}>Status do Caixa: {cashRegisterStatus.toUpperCase()}</p>
                        <p style={{textAlign: 'center', color: '#555'}}>Caixa da loja: "{selectedStoreName || 'Carregando...'}"</p>
                        {cashRegisterStatus === 'closed' && (
                            <div style={styles.inputGroup}>
                                <label style={styles.label} htmlFor="openingBalance">Saldo de Abertura (R$):</label>
                                <input
                                    type="number"
                                    id="openingBalance"
                                    value={openingBalance}
                                    onChange={(e) => setOpeningBalance(e.target.value)}
                                    placeholder="Ex: 100.00"
                                    style={styles.input}
                                    min="0"
                                    step="0.01"
                                    disabled={isProcessing}
                                />
                                <button
                                    onClick={handleOpenCashRegister}
                                    style={{ ...styles.button, ...styles.primaryButton, width: '100%', marginTop: '15px' }}
                                    disabled={isProcessing}
                                >
                                    Abrir Caixa
                                </button>
                            </div>
                        )}
                        {cashRegisterStatus === 'open' && (
                            <>
                                <p style={styles.currentBalance}>Aberto em: {currentSessionOpenedAt ? formatDateTime(currentSessionOpenedAt) : 'N/A'}</p>
                                <p style={styles.currentBalance}>Saldo de Abertura: R$ {formatCurrency(openingBalance)}</p>
                                <p style={styles.currentBalance}>Saldo Atual Estimado: R$ {formatCurrency(currentCashCount)}</p>

                                <div style={styles.inputGroup}>
                                    <label style={styles.label} htmlFor="manualClosingBalance">Saldo Contado no Fechamento (R$):</label>
                                    <input
                                        type="number"
                                        id="manualClosingBalance"
                                        value={manualClosingBalance}
                                        onChange={(e) => setManualClosingBalance(e.target.value)}
                                        placeholder="Ex: 250.00"
                                        style={styles.input}
                                        min="0"
                                        step="0.01"
                                        disabled={isProcessing}
                                    />
                                </div>

                                <button
                                    onClick={handleCloseCashRegister}
                                    style={{ ...styles.button, ...styles.dangerButton, width: '100%', marginTop: '15px' }}
                                    disabled={isProcessing}
                                >
                                    Fechar Caixa
                                </button>
                            </>
                        )}
                    </div>

                    {cashRegisterStatus === 'open' && (
                        <>
                            <div style={styles.section}>
                                <h3 style={styles.sectionTitle}><DollarSign /> Resumo de Vendas da Sessao</h3>
                                <table style={styles.summaryTable}>
                                    <tbody>
                                        <tr style={styles.tableRow}>
                                            <td style={styles.tableCell}>Total de Vendas:</td>
                                            <td style={styles.tableCell}>R$ {formatCurrency(dailySalesSummary.totalSales)}</td>
                                        </tr>
                                        <tr style={styles.tableRow}>
                                            <td style={styles.tableCell}>Vendas em Dinheiro:</td>
                                            <td style={styles.tableCell}>R$ {formatCurrency(dailySalesSummary.cashSales)}</td>
                                        </tr>
                                        <tr style={styles.tableRow}>
                                            <td style={styles.tableCell}>Vendas Cartao de Credito:</td>
                                            <td style={styles.tableCell}>R$ {formatCurrency(dailySalesSummary.creditCardSales)}</td>
                                        </tr>
                                        <tr style={styles.tableRow}>
                                            <td style={styles.tableCell}>Vendas Cartao de Debito:</td>
                                            <td style={styles.tableCell}>R$ {formatCurrency(dailySalesSummary.debitCardSales)}</td>
                                        </tr>
                                        <tr style={styles.tableRow}>
                                            <td style={styles.tableCell}>Vendas PIX:</td>
                                            <td style={styles.tableCell}>R$ {formatCurrency(dailySalesSummary.pixSales)}</td>
                                        </tr>
                                    </tbody>
                                </table>
                                
                                {salesBySeller.length > 0 && (
                                    <div style={{marginTop: '20px'}}>
                                        <h4 style={{...styles.sectionTitle, fontSize: '1.2em', border: 'none'}}><Users /> Vendas por Vendedor</h4>
                                        <table style={styles.summaryTable}>
                                            <tbody>
                                                {salesBySeller.map(seller => (
                                                    <tr key={seller.name} style={styles.tableRow}>
                                                        <td style={styles.tableCell}>{seller.name}</td>
                                                        <td style={styles.tableCell}>R$ {formatCurrency(seller.totalAmount)}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>

                            <div style={styles.section}>
                                <h3 style={styles.sectionTitle}><PlusCircle /> Adicionar Suprimento</h3>
                                <div style={styles.inputGroup}>
                                    <label style={styles.label} htmlFor="supplyAmount">Valor (R$):</label>
                                    <input
                                        type="number"
                                        id="supplyAmount"
                                        value={newSupplyAmount}
                                        onChange={(e) => setNewSupplyAmount(e.target.value)}
                                        placeholder="Ex: 50.00"
                                        style={styles.input}
                                        min="0"
                                        step="0.01"
                                        disabled={isProcessing}
                                    />
                                </div>
                                <div style={styles.inputGroup}>
                                    <label style={styles.label} htmlFor="supplyDescription">Descricao:</label>
                                    <input
                                        type="text"
                                        id="supplyDescription"
                                        value={newSupplyDescription}
                                        onChange={(e) => setNewSupplyDescription(e.target.value)}
                                        placeholder="Ex: Troco inicial, Reforco de caixa"
                                        style={styles.input}
                                        disabled={isProcessing}
                                    />
                                </div>
                                <button
                                    onClick={handleAddSupply}
                                    style={{ ...styles.button, ...styles.successButton, width: '100%', marginTop: '15px' }}
                                    disabled={isProcessing}
                                >
                                    Adicionar Suprimento
                                </button>
                                {supplies.length > 0 && (
                                    <>
                                        <h4 style={{marginTop: '20px', marginBottom: '10px', color: '#555'}}>Historico de Suprimentos:</h4>
                                        <ul style={styles.list}>
                                            {supplies.map((s, index) => (
                                                <li key={index} style={styles.listItem}>
                                                    R$ {formatCurrency(s.amount)} - {s.description} (por {s.addedBy} em {formatDateTime(s.timestamp)})
                                                </li>
                                            ))}
                                        </ul>
                                    </>
                                )}
                            </div>

                            <div style={styles.section}>
                                <h3 style={styles.sectionTitle}><MinusCircle /> Adicionar Sangria</h3>
                                <div style={styles.inputGroup}>
                                    <label style={styles.label} htmlFor="outflowAmount">Valor (R$):</label>
                                    <input
                                        type="number"
                                        id="outflowAmount"
                                        value={newOutflowAmount}
                                        onChange={(e) => setNewOutflowAmount(e.target.value)}
                                        placeholder="Ex: 20.00"
                                        style={styles.input}
                                        min="0"
                                        step="0.01"
                                        disabled={isProcessing}
                                    />
                                </div>
                                <div style={styles.inputGroup}>
                                    <label style={styles.label} htmlFor="outflowDescription">Descricao:</label>
                                    <input
                                        type="text"
                                        id="outflowDescription"
                                        value={newOutflowDescription}
                                        onChange={(e) => setNewOutflowDescription(e.target.value)}
                                        placeholder="Ex: Pagamento de despesa, Retirada"
                                        style={styles.input}
                                        disabled={isProcessing}
                                    />
                                </div>
                                <button
                                    onClick={handleAddOutflow}
                                    style={{ ...styles.button, ...styles.dangerButton, width: '100%', marginTop: '15px' }}
                                    disabled={isProcessing}
                                >
                                    Adicionar Sangria
                                </button>
                                {outflows.length > 0 && (
                                    <>
                                        <h4 style={{marginTop: '20px', marginBottom: '10px', color: '#555'}}>Historico de Sangrias:</h4>
                                        <ul style={styles.list}>
                                            {outflows.map((o, index) => (
                                                <li key={index} style={styles.listItem}>
                                                    R$ {formatCurrency(o.amount)} - {o.description} (por {o.addedBy} em {formatDateTime(o.timestamp)})
                                                </li>
                                            ))}
                                        </ul>
                                    </>
                                )}
                            </div>
                        </>
                    )}

                    <div style={styles.section}>
                        <h3 style={styles.sectionTitle}><Archive /> Historico de Sessoes de Caixa</h3>
                        {cashRegisterHistory.length === 0 ? (
                            <p style={{textAlign: 'center', color: '#888'}}>Nenhuma sessao de caixa anterior encontrada para esta loja.</p>
                        ) : (
                            cashRegisterHistory.map(session => (
                                <CashRegisterHistoryItem key={session.id} session={session} styles={styles} formatCurrency={formatCurrency} formatDateTime={formatDateTime} />
                            ))
                        )}
                    </div>
                </>
            ) : (
                userRole === 'admin' && <p style={{textAlign: 'center', color: '#555'}}>Selecione uma loja para visualizar os detalhes do caixa.</p>
            )}
        </div>
    );
};

const CashRegisterHistoryItem = ({ session, styles, formatCurrency, formatDateTime }) => {
    const [showDetails, setShowDetails] = useState(false);

    return (
        <div style={styles.historyItem}>
            <div style={styles.historyItemHeader}>
                <span style={styles.historyDate}>Sessao de {formatDateTime(session.openedAt)}</span>
                <span>Fechado por: {session.closedBy || 'N/A'}</span>
            </div>
            <div style={styles.historyBalances}>
                <span>Abertura: R$ {formatCurrency(session.openingBalance)}</span>
                <span>Fechamento: R$ {formatCurrency(session.closingBalance)}</span>
                {session.cashCountDifference !== undefined && (
                    <span style={{color: session.cashCountDifference === 0 ? '#28a745' : '#dc3545'}}>
                        Diferença: R$ {formatCurrency(session.cashCountDifference)}
                    </span>
                )}
                <span>Vendas: R$ {session.dailySalesSummary?.totalSales ? formatCurrency(session.dailySalesSummary.totalSales) : formatCurrency(0)}</span>
            </div>
            <button onClick={() => setShowDetails(!showDetails)} style={styles.toggleDetailsButton}>
                {showDetails ? 'Ocultar Detalhes' : 'Ver Detalhes'}
            </button>
            {showDetails && (
                <div>
                    <h4 style={{marginTop: '15px', marginBottom: '8px', color: '#555'}}>Suprimentos:</h4>
                    {session.supplies.length > 0 ? (
                        <ul style={styles.historyDetailList}>
                            {session.supplies.map((s, i) => (
                                <li key={i}>R$ {formatCurrency(s.amount)} - {s.description} (por {s.addedBy} em {formatDateTime(s.timestamp)})</li>
                            ))}
                        </ul>
                    ) : <p style={{fontSize: '0.85em', color: '#888'}}>Nenhum suprimento registrado.</p>}

                    <h4 style={{marginTop: '10px', marginBottom: '8px', color: '#555'}}>Sangrias:</h4>
                    {session.outflows.length > 0 ? (
                        <ul style={styles.historyDetailList}>
                            {session.outflows.map((o, i) => (
                                <li key={i}>R$ {formatCurrency(o.amount)} - {o.description} (por {o.addedBy} em {formatDateTime(o.timestamp)})</li>
                            ))}
                        </ul>
                    ) : <p style={{fontSize: '0.85em', color: '#888'}}>Nenhuma sangria registrada.</p>}

                    <h4 style={{marginTop: '10px', marginBottom: '8px', color: '#555'}}>Resumo de Vendas:</h4>
                    {session.dailySalesSummary ? (
                        <ul style={styles.historyDetailList}>
                            <li>Vendas em Dinheiro: R$ {formatCurrency(session.dailySalesSummary.cashSales)}</li>
                            <li>Vendas Cartao de Credito: R$ {formatCurrency(session.dailySalesSummary.creditCardSales)}</li>
                            <li>Vendas Cartao de Debito: R$ {formatCurrency(session.dailySalesSummary.debitCardSales)}</li>
                            <li>Vendas PIX: R$ {formatCurrency(session.dailySalesSummary.pixSales)}</li>
                        </ul>
                    ) : <p style={{fontSize: '0.85em', color: '#888'}}>Resumo de vendas nao disponivel para esta sessao.</p>}
                    
                    {session.salesBySeller && session.salesBySeller.length > 0 && (
                        <>
                             <h4 style={{marginTop: '10px', marginBottom: '8px', color: '#555'}}>Vendas por Vendedor:</h4>
                             <ul style={styles.historyDetailList}>
                                {session.salesBySeller.map(seller => (
                                    <li key={seller.name}>{seller.name}: R$ {formatCurrency(seller.totalAmount)}</li>
                                ))}
                             </ul>
                        </>
                    )}
                </div>
            )}
        </div>
    );
};

export default CashRegisterPage;

