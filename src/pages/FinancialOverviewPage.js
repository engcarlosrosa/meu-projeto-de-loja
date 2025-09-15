import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { collection, doc, addDoc, updateDoc, onSnapshot, runTransaction, orderBy, query, where, writeBatch, getDocs } from 'firebase/firestore'; 
import { useAuth } from '../components/AuthProvider';
import { Plus, Edit, Trash2, Landmark, Repeat, TrendingUp, TrendingDown, CheckCircle, XCircle, Scale, Eye, Layers } from 'lucide-react'; 
import { useFirebase } from '../contexts/FirebaseContext'; 

const styles = {
    container: {
        fontFamily: 'Arial, sans-serif',
        padding: '20px',
        maxWidth: '1000px',
        margin: '0 auto',
        backgroundColor: '#f8f9fa',
        borderRadius: '10px',
        boxShadow: '0 4px 15px rgba(0,0,0,0.1)',
        minHeight: 'calc(100vh - 40px)',
    },
    title: {
        textAlign: 'center',
        color: '#2c3e50',
        marginBottom: '30px',
        fontSize: '2.5em',
        fontWeight: 'bold',
        borderBottom: '2px solid #3498db',
        paddingBottom: '10px',
    },
    section: {
        backgroundColor: '#ffffff',
        padding: '25px',
        borderRadius: '8px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
        marginBottom: '20px',
    },
    sectionTitle: {
        color: '#34495e',
        marginBottom: '20px',
        fontSize: '1.6em',
        borderBottom: '1px solid #eee',
        paddingBottom: '10px',
    },
    totalBalanceCard: {
        backgroundColor: '#eaf5ff',
        padding: '20px',
        borderRadius: '8px',
        textAlign: 'center',
        marginBottom: '25px',
        border: '1px solid #b3d7ff',
    },
    totalBalanceText: {
        fontSize: '1.2em',
        color: '#34495e',
        fontWeight: '600',
        display: 'block',
    },
    totalBalanceAmount: {
        fontSize: '2.2em',
        color: '#0056b3',
        fontWeight: 'bold',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: '5px',
    },
    form: {
        display: 'grid',
        gridTemplateColumns: '1fr',
        gap: '15px',
        maxWidth: '600px',
        margin: '0 auto',
    },
    inputGroup: {
        marginBottom: '10px',
    },
    label: {
        display: 'block',
        marginBottom: '5px',
        fontWeight: 'bold',
        color: '#555',
    },
    input: {
        width: '100%',
        padding: '10px',
        border: '1px solid #ddd',
        borderRadius: '4px',
        boxSizing: 'border-box',
    },
    select: {
        width: '100%',
        padding: '10px',
        border: '1px solid #ddd',
        borderRadius: '4px',
        backgroundColor: '#fff',
        boxSizing: 'border-box',
    },
    button: {
        backgroundColor: '#007bff',
        color: 'white',
        padding: '12px 20px',
        border: 'none',
        borderRadius: '5px',
        cursor: 'pointer',
        fontSize: '1em',
        fontWeight: 'bold',
        transition: 'background-color 0.3s ease',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
    },
    actionButtons: {
        display: 'flex',
        gap: '8px',
        justifyContent: 'center',
    },
    editButton: {
        backgroundColor: '#ffc107',
        color: 'white',
        padding: '8px 12px',
        border: 'none',
        borderRadius: '4px',
        cursor: 'pointer',
        transition: 'background-color 0.3s ease',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
    },
    deleteButton: {
        backgroundColor: '#dc3545',
        color: 'white',
        padding: '8px 12px',
        border: 'none',
        borderRadius: '4px',
        cursor: 'pointer',
        transition: 'background-color 0.3s ease',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
    },
    saveButton: {
        backgroundColor: '#28a745',
        color: 'white',
        padding: '8px 12px',
        border: 'none',
        borderRadius: '4px',
        cursor: 'pointer',
        transition: 'background-color 0.3s ease',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
    },
    cancelButton: {
        backgroundColor: '#6c757d',
        color: 'white',
        padding: '8px 12px',
        border: 'none',
        borderRadius: '4px',
        cursor: 'pointer',
        transition: 'background-color 0.3s ease',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
    },
    tableContainer: {
        overflowX: 'auto',
        marginTop: '20px',
    },
    table: {
        width: '100%',
        borderCollapse: 'collapse',
        marginTop: '15px',
        backgroundColor: '#fff',
        borderRadius: '8px',
        overflow: 'hidden',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    },
    tableHeader: {
        backgroundColor: '#3498db',
        color: 'white',
        padding: '12px 15px',
        textAlign: 'left',
        fontWeight: 'bold',
        fontSize: '0.9em',
        textTransform: 'uppercase',
    },
    tableRow: {
        borderBottom: '1px solid #eee',
        transition: 'background-color 0.2s ease',
    },
    tableCell: {
        padding: '10px 15px',
        textAlign: 'left',
        fontSize: '0.9em',
        color: '#333',
        verticalAlign: 'top',
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
    accessDenied: {
        textAlign: 'center',
        color: '#dc3545',
        fontSize: '1.8em',
        marginTop: '50px',
    },
    infoText: {
        textAlign: 'center',
        color: '#555',
        fontSize: '1.1em',
        marginTop: '10px',
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
    subBalanceSection: {
        marginTop: '15px',
        padding: '15px',
        backgroundColor: '#f0f0f0',
        borderRadius: '6px',
        border: '1px solid #e0e0e0',
    },
    subBalanceInputGroup: {
        display: 'flex',
        gap: '10px',
        alignItems: 'center',
        marginBottom: '10px',
    },
    subBalanceList: {
        listStyle: 'none',
        padding: '0',
        marginTop: '5px',
        fontSize: '0.85em',
        color: '#444'
    },
    detailsToggle: {
        background: 'none',
        border: 'none',
        cursor: 'pointer',
        marginLeft: '10px',
        color: '#007bff'
    }
};

const FinancialOverviewPage = () => {
    const { currentUser, userRole, loading: authLoading } = useAuth(); 
    const { db, firebaseLoading } = useFirebase(); 

    const [bankAccounts, setBankAccounts] = useState([]);
    const [transactions, setTransactions] = useState([]);
    const [newAccountName, setNewAccountName] = useState('');
    const [newAccountBalance, setNewAccountBalance] = useState('');
    const [newAccountType, setNewAccountType] = useState('checking'); 
    const [newSubBalances, setNewSubBalances] = useState([]);

    const [editingAccount, setEditingAccount] = useState(null);
    const [editAccountName, setEditAccountName] = useState('');
    const [editAccountBalance, setEditAccountBalance] = useState('');
    const [editAccountType, setEditAccountType] = useState('');
    const [editingSubBalances, setEditingSubBalances] = useState([]);

    const [newTransactionAmount, setNewTransactionAmount] = useState('');
    const [newTransactionDescription, setNewTransactionDescription] = useState('');
    const [newTransactionType, setNewTransactionType] = useState('deposit'); 
    const [newTransactionAccountId, setNewTransactionAccountId] = useState('');

    const [transferAmount, setTransferAmount] = useState('');
    const [transferFromAccount, setTransferFromAccount] = useState('');
    const [transferToAccount, setTransferToAccount] = useState('');

    const [errorMessage, setErrorMessage] = useState('');
    const [successMessage, setSuccessMessage] = useState('');
    const [visibleDetails, setVisibleDetails] = useState(null);

    const bankAccountsCollectionRef = useMemo(() => {
        if (db) return collection(db, 'bankAccounts');
        return null;
    }, [db]);

    const transactionsCollectionRef = useMemo(() => {
        if (db) return collection(db, 'transactions');
        return null;
    }, [db]);

    const globalTotalBalance = useMemo(() => {
        return bankAccounts.reduce((total, account) => {
            const mainBalance = account.balance || 0;
            const subBalancesTotal = (account.subBalances || []).reduce((subTotal, sub) => subTotal + (sub.amount || 0), 0);
            return total + mainBalance + subBalancesTotal;
        }, 0);
    }, [bankAccounts]);


    const formatCurrency = (value) => {
        const numericValue = parseFloat(value);
        if (isNaN(numericValue)) {
            return '0,00';
        }
        return numericValue.toFixed(2).replace('.', ',');
    };
    
    const fetchBankAccounts = useCallback(() => {
        if (!bankAccountsCollectionRef) {
            return () => {};
        }
        setErrorMessage('');
        const q = query(bankAccountsCollectionRef, orderBy('name', 'asc'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const accountsList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setBankAccounts(accountsList);
            if (accountsList.length > 0) {
                if (!newTransactionAccountId) setNewTransactionAccountId(accountsList[0].id);
                if (!transferFromAccount) setTransferFromAccount(accountsList[0].id);
                if (!transferToAccount && accountsList.length > 1) setTransferToAccount(accountsList[1].id);
            }
        }, (error) => {
            console.error("Erro ao buscar contas bancárias:", error);
            setErrorMessage("Erro ao carregar contas bancárias. Verifique as permissões do Firestore.");
        });
        return unsubscribe; 
    }, [bankAccountsCollectionRef, newTransactionAccountId, transferFromAccount, transferToAccount]);

    const fetchTransactions = useCallback(() => {
        if (!transactionsCollectionRef) {
            return () => {};
        }
        setErrorMessage('');
        const q = query(transactionsCollectionRef, orderBy('timestamp', 'desc')); 
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const txList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data(), timestamp: doc.data().timestamp.toDate() }));
            setTransactions(txList);
        }, (error) => {
            console.error("Erro ao buscar transações:", error);
            setErrorMessage("Erro ao carregar transações. Verifique as permissões do Firestore.");
        });
        return unsubscribe;
    }, [transactionsCollectionRef]);

    useEffect(() => {
        if (bankAccountsCollectionRef && transactionsCollectionRef) {
            const unsubscribeAccounts = fetchBankAccounts();
            const unsubscribeTransactions = fetchTransactions();

            return () => {
                unsubscribeAccounts();
                unsubscribeTransactions();
            };
        }
    }, [bankAccountsCollectionRef, transactionsCollectionRef, fetchBankAccounts, fetchTransactions]);

    const handleSubBalanceChange = (index, field, value, isEditing = false) => {
        const balances = isEditing ? [...editingSubBalances] : [...newSubBalances];
        balances[index][field] = field === 'amount' ? parseFloat(value) || 0 : value;
        if (isEditing) {
            setEditingSubBalances(balances);
        } else {
            setNewSubBalances(balances);
        }
    };

    const handleAddSubBalance = (isEditing = false) => {
        if (isEditing) {
            setEditingSubBalances([...editingSubBalances, { name: '', amount: 0 }]);
        } else {
            setNewSubBalances([...newSubBalances, { name: '', amount: 0 }]);
        }
    };

    const handleRemoveSubBalance = (index, isEditing = false) => {
        if (isEditing) {
            setEditingSubBalances(editingSubBalances.filter((_, i) => i !== index));
        } else {
            setNewSubBalances(newSubBalances.filter((_, i) => i !== index));
        }
    };

    const handleAddAccount = async (e) => {
        e.preventDefault();
        setErrorMessage('');
        setSuccessMessage('');

        if (!bankAccountsCollectionRef) {
            setErrorMessage("Serviço do Firebase não disponível. Tente novamente em alguns segundos.");
            return;
        }

        if (!newAccountName.trim() || isNaN(parseFloat(newAccountBalance))) {
            setErrorMessage("Por favor, preencha o nome e o saldo inicial da conta.");
            return;
        }

        try {
            const finalSubBalances = newSubBalances.filter(sub => sub.name.trim() !== '' && sub.amount > 0);

            await addDoc(bankAccountsCollectionRef, {
                name: newAccountName.trim(),
                balance: parseFloat(newAccountBalance),
                type: newAccountType,
                subBalances: finalSubBalances,
                createdAt: new Date(),
                createdBy: currentUser.email,
            });
            setNewAccountName('');
            setNewAccountBalance('');
            setNewSubBalances([]);
            setSuccessMessage("Conta bancária adicionada com sucesso!");
        } catch (error) {
            console.error("Erro ao adicionar conta:", error);
            setErrorMessage(`Erro ao adicionar conta bancária: ${error.message}`);
        }
    };
    
    const handleEditAccount = (account) => {
        setEditingAccount(account.id);
        setEditAccountName(account.name);
        setEditAccountBalance(account.balance.toString());
        setEditAccountType(account.type);
        setEditingSubBalances(account.subBalances || []);
    };

    const handleUpdateAccount = async (id) => {
        setErrorMessage('');
        setSuccessMessage('');

        if (!bankAccountsCollectionRef) {
            setErrorMessage("Serviço do Firebase não disponível.");
            return;
        }

        if (!editAccountName.trim() || isNaN(parseFloat(editAccountBalance))) {
            setErrorMessage("Por favor, preencha o nome e o saldo da conta.");
            return;
        }

        try {
            const finalSubBalances = editingSubBalances.filter(sub => sub.name.trim() !== '' && sub.amount > 0);
            const accountRef = doc(bankAccountsCollectionRef, id);
            await updateDoc(accountRef, {
                name: editAccountName.trim(),
                balance: parseFloat(editAccountBalance),
                type: editAccountType,
                subBalances: finalSubBalances,
                updatedAt: new Date(),
                updatedBy: currentUser.email,
            });
            setEditingAccount(null);
            setSuccessMessage("Conta bancária atualizada com sucesso!");
        } catch (error) {
            console.error("Erro ao atualizar conta:", error);
            setErrorMessage(`Erro ao atualizar conta bancária: ${error.message}`);
        }
    };

    const handleDeleteAccount = async (id) => {
        setErrorMessage('');
        setSuccessMessage('');

        if (!window.confirm("Tem certeza que deseja excluir esta conta bancária e todas as suas transações?")) {
            return;
        }
        if (!bankAccountsCollectionRef || !transactionsCollectionRef) {
            setErrorMessage("Serviço do Firebase não disponível.");
            return;
        }

        try {
            const accountTransactionsQuery = query(transactionsCollectionRef, where('accountId', '==', id));
            const transactionsSnapshot = await getDocs(accountTransactionsQuery);
            const batch = writeBatch(db); 

            transactionsSnapshot.docs.forEach((d) => {
                batch.delete(d.ref);
            });
            
            batch.delete(doc(bankAccountsCollectionRef, id));
            
            await batch.commit();

            setSuccessMessage("Conta bancária e transações associadas excluídas com sucesso!");
        } catch (error) {
            console.error("Erro ao excluir conta:", error);
            setErrorMessage(`Erro ao excluir conta bancária: ${error.message}`);
        }
    };

    const handleAddTransaction = async (e) => {
        e.preventDefault();
        setErrorMessage('');
        setSuccessMessage('');

        if (!transactionsCollectionRef || !bankAccountsCollectionRef) {
            setErrorMessage("Serviço do Firebase não disponível.");
            return;
        }

        if (!newTransactionAccountId || isNaN(parseFloat(newTransactionAmount)) || parseFloat(newTransactionAmount) <= 0 || !newTransactionDescription.trim()) {
            setErrorMessage("Preencha todos os campos para a transação.");
            return;
        }

        try {
            const amount = parseFloat(newTransactionAmount);
            const accountRef = doc(bankAccountsCollectionRef, newTransactionAccountId);

            await runTransaction(db, async (transaction) => {
                const accountDoc = await transaction.get(accountRef);
                if (!accountDoc.exists()) {
                    throw new Error("Conta bancária não encontrada.");
                }

                const currentBalance = accountDoc.data().balance;
                let newBalance;
                if (newTransactionType === 'deposit') {
                    newBalance = currentBalance + amount;
                } else {
                    if (currentBalance < amount) {
                        throw new Error("Saldo insuficiente para esta retirada.");
                    }
                    newBalance = currentBalance - amount;
                }

                transaction.update(accountRef, { balance: newBalance });
                transaction.set(doc(transactionsCollectionRef), {
                    accountId: newTransactionAccountId,
                    amount: amount,
                    type: newTransactionType,
                    description: newTransactionDescription.trim(),
                    timestamp: new Date(),
                    performedBy: currentUser.email,
                });
            });

            setNewTransactionAmount('');
            setNewTransactionDescription('');
            setSuccessMessage("Transação registrada com sucesso!");
        } catch (error) {
            console.error("Erro ao adicionar transação:", error);
            setErrorMessage(`Erro ao registrar transação: ${error.message}`);
        }
    };

    const handleTransfer = async (e) => {
        e.preventDefault();
        setErrorMessage('');
        setSuccessMessage('');

        if (!bankAccountsCollectionRef || !transactionsCollectionRef) {
            setErrorMessage("Serviço do Firebase não disponível.");
            return;
        }

        if (!transferFromAccount || !transferToAccount || isNaN(parseFloat(transferAmount)) || parseFloat(transferAmount) <= 0 || transferFromAccount === transferToAccount) {
            setErrorMessage("Selecione contas de origem e destino válidas e um valor de transferência positivo.");
            return;
        }

        try {
            const amount = parseFloat(transferAmount);
            const fromAccountRef = doc(bankAccountsCollectionRef, transferFromAccount);
            const toAccountRef = doc(bankAccountsCollectionRef, transferToAccount);

            await runTransaction(db, async (transaction) => {
                const fromDoc = await transaction.get(fromAccountRef);
                const toDoc = await transaction.get(toAccountRef);

                if (!fromDoc.exists() || !toDoc.exists()) {
                    throw new Error("Uma das contas de transferência não foi encontrada.");
                }

                const fromBalance = fromDoc.data().balance;
                if (fromBalance < amount) {
                    throw new Error("Saldo insuficiente na conta de origem para a transferência.");
                }

                transaction.update(fromAccountRef, { balance: fromBalance - amount });
                transaction.update(toAccountRef, { balance: toDoc.data().balance + amount });

                transaction.set(doc(transactionsCollectionRef), {
                    accountId: transferFromAccount,
                    amount: amount,
                    type: 'transfer_out',
                    description: `Transferência para ${toDoc.data().name}`,
                    timestamp: new Date(),
                    performedBy: currentUser.email,
                });

                transaction.set(doc(transactionsCollectionRef), {
                    accountId: transferToAccount,
                    amount: amount,
                    type: 'transfer_in',
                    description: `Transferência de ${fromDoc.data().name}`,
                    timestamp: new Date(),
                    performedBy: currentUser.email,
                });
            });

            setTransferAmount('');
            setSuccessMessage("Transferência realizada com sucesso!");
        } catch (error) {
            console.error("Erro ao realizar transferência:", error);
            setErrorMessage(`Erro ao realizar transferência: ${error.message}`);
        }
    };

    if (authLoading || firebaseLoading) {
        return (
            <div style={styles.loadingContainer}>
                <div style={styles.spinner}></div>
                <p>A carregar dados...</p>
            </div>
        );
    }

    if (!currentUser) {
        return (
            <div style={styles.container}>
                <h2 style={styles.accessDenied}>Acesso Negado</h2>
                <p style={styles.infoText}>Você precisa estar logado para aceder a esta página.</p>
            </div>
        );
    }
    
    if (userRole !== 'admin' && userRole !== 'finance') {
         return (
            <div style={styles.container}>
                <h2 style={styles.accessDenied}>Acesso Negado</h2>
                <p style={styles.infoText}>Você não tem permissão para aceder à área financeira.</p>
            </div>
        );
    }

    return (
        <div style={styles.container}>
            <h1 style={styles.title}>Visão Geral Financeira</h1>

            {errorMessage && <p style={styles.messageError}>{errorMessage}</p>}
            {successMessage && <p style={styles.messageSuccess}>{successMessage}</p>}

            <div style={styles.section}>
                <h2 style={styles.sectionTitle}>Contas Bancárias</h2>
                
                <div style={styles.totalBalanceCard}>
                    <span style={styles.totalBalanceText}>Saldo Total Global</span>
                    <span style={styles.totalBalanceAmount}>
                        <Scale className="inline-block mr-2" size={30} style={{ marginRight: '10px' }}/>
                        R$ {formatCurrency(globalTotalBalance)}
                    </span>
                </div>

                <form onSubmit={handleAddAccount} style={styles.form}>
                    <div style={styles.inputGroup}>
                        <label style={styles.label}>Nome da Conta:</label>
                        <input
                            type="text"
                            placeholder="Ex: Conta Principal, Caixa da Loja"
                            value={newAccountName}
                            onChange={(e) => setNewAccountName(e.target.value)}
                            required
                            style={styles.input}
                        />
                    </div>
                    <div style={styles.inputGroup}>
                        <label style={styles.label}>Saldo Principal (Disponível):</label>
                        <input
                            type="number"
                            placeholder="0.00"
                            value={newAccountBalance}
                            onChange={(e) => setNewAccountBalance(e.target.value)}
                            step="0.01"
                            required
                            style={styles.input}
                        />
                    </div>
                    <div style={styles.inputGroup}>
                        <label style={styles.label}>Tipo de Conta:</label>
                        <select value={newAccountType} onChange={(e) => setNewAccountType(e.target.value)} style={styles.select}>
                            <option value="checking">Corrente</option>
                            <option value="savings">Poupança</option>
                            <option value="cash">Caixa Físico</option>
                        </select>
                    </div>

                    <div style={styles.subBalanceSection}>
                        <label style={{...styles.label, display: 'flex', alignItems: 'center'}}><Layers size={16} style={{marginRight: '8px'}} /> Saldos Adicionais (opcional)</label>
                        {newSubBalances.map((sub, index) => (
                            <div key={index} style={styles.subBalanceInputGroup}>
                                <input
                                    type="text"
                                    placeholder="Nome (ex: Caixinha, Cashback)"
                                    value={sub.name}
                                    onChange={(e) => handleSubBalanceChange(index, 'name', e.target.value)}
                                    style={styles.input}
                                />
                                <input
                                    type="number"
                                    placeholder="Valor"
                                    value={sub.amount || ''}
                                    onChange={(e) => handleSubBalanceChange(index, 'amount', e.target.value)}
                                    step="0.01"
                                    style={styles.input}
                                />
                                <button type="button" onClick={() => handleRemoveSubBalance(index)} style={{...styles.deleteButton, padding: '8px'}}>
                                    <Trash2 size={16}/>
                                </button>
                            </div>
                        ))}
                        <button type="button" onClick={() => handleAddSubBalance()} style={{...styles.button, backgroundColor: '#6c757d', fontSize: '0.9em', padding: '8px'}}>Adicionar Saldo</button>
                    </div>

                    <button type="submit" style={styles.button}><Plus className="inline-block mr-2" /> Adicionar Conta</button>
                </form>

                <div style={styles.tableContainer}>
                    <table style={styles.table}>
                        <thead>
                            <tr>
                                <th style={styles.tableHeader}>Conta</th>
                                <th style={styles.tableHeader}>Tipo</th>
                                <th style={styles.tableHeader}>Saldo Total</th>
                                <th style={styles.tableHeader}>Ações</th>
                            </tr>
                        </thead>
                        <tbody>
                            {bankAccounts.length === 0 ? (
                                <tr>
                                    <td colSpan="4" style={{ ...styles.tableCell, textAlign: 'center' }}>Nenhuma conta bancária cadastrada.</td>
                                </tr>
                            ) : (
                                bankAccounts.map(account => {
                                    const totalAccountBalance = (account.balance || 0) + (account.subBalances || []).reduce((acc, sub) => acc + (sub.amount || 0), 0);
                                    
                                    return (
                                    <tr key={account.id} style={styles.tableRow}>
                                        <td style={styles.tableCell}>
                                            {editingAccount === account.id ? (
                                                <input type="text" value={editAccountName} onChange={(e) => setEditAccountName(e.target.value)} style={styles.input}/>
                                            ) : (
                                                <div style={{ display: 'flex', alignItems: 'flex-start' }}>
                                                    <Landmark className="mr-2 text-blue-600" size={18} style={{marginTop: '2px'}}/>
                                                    <div>
                                                        {account.name}
                                                        {visibleDetails === account.id && (
                                                            <ul style={styles.subBalanceList}>
                                                                <li>Saldo Principal: R$ {formatCurrency(account.balance)}</li>
                                                                {(account.subBalances || []).map((sub, i) => (
                                                                    <li key={i}>{sub.name}: R$ {formatCurrency(sub.amount)}</li>
                                                                ))}
                                                            </ul>
                                                        )}
                                                    </div>
                                                </div>
                                            )}
                                        </td>
                                        <td style={styles.tableCell}>
                                            {editingAccount === account.id ? (
                                                <select value={editAccountType} onChange={(e) => setEditAccountType(e.target.value)} style={styles.select}>
                                                    <option value="checking">Corrente</option>
                                                    <option value="savings">Poupança</option>
                                                     <option value="cash">Caixa Físico</option>
                                                </select>
                                            ) : (
                                                account.type === 'checking' ? 'Corrente' : (account.type === 'savings' ? 'Poupança' : 'Caixa Físico')
                                            )}
                                        </td>
                                        <td style={styles.tableCell}>
                                            {editingAccount === account.id ? (
                                                <div>
                                                    <label style={{fontSize: '0.8em'}}>Saldo Principal</label>
                                                    <input type="number" value={editAccountBalance} onChange={(e) => setEditAccountBalance(e.target.value)} step="0.01" style={styles.input}/>
                                                    <div style={styles.subBalanceSection}>
                                                        {editingSubBalances.map((sub, index) => (
                                                            <div key={index} style={styles.subBalanceInputGroup}>
                                                                <input type="text" placeholder="Nome" value={sub.name} onChange={(e) => handleSubBalanceChange(index, 'name', e.target.value, true)} style={styles.input}/>
                                                                <input type="number" placeholder="Valor" value={sub.amount || ''} onChange={(e) => handleSubBalanceChange(index, 'amount', e.target.value, true)} style={styles.input}/>
                                                                <button type="button" onClick={() => handleRemoveSubBalance(index, true)} style={{...styles.deleteButton, padding: '8px'}}><Trash2 size={16}/></button>
                                                            </div>
                                                        ))}
                                                        <button type="button" onClick={() => handleAddSubBalance(true)} style={{...styles.button, backgroundColor: '#6c757d', fontSize: '0.9em', padding: '8px'}}>Adicionar</button>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div style={{display: 'flex', alignItems: 'center'}}>
                                                    R$ {formatCurrency(totalAccountBalance)}
                                                    <button onClick={() => setVisibleDetails(visibleDetails === account.id ? null : account.id)} style={styles.detailsToggle} title="Ver detalhes">
                                                        <Eye size={16} />
                                                    </button>
                                                </div>
                                            )}
                                        </td>
                                        <td style={styles.tableCell}>
                                            {editingAccount === account.id ? (
                                                <div style={styles.actionButtons}>
                                                    <button onClick={() => handleUpdateAccount(account.id)} style={styles.saveButton} title="Salvar"><CheckCircle className="w-4 h-4" /></button>
                                                    <button onClick={() => setEditingAccount(null)} style={styles.cancelButton} title="Cancelar"><XCircle className="w-4 h-4" /></button>
                                                </div>
                                            ) : (
                                                <div style={styles.actionButtons}>
                                                    <button onClick={() => handleEditAccount(account)} style={styles.editButton} title="Editar"><Edit className="w-4 h-4" /></button>
                                                    <button onClick={() => handleDeleteAccount(account.id)} style={styles.deleteButton} title="Excluir"><Trash2 className="w-4 h-4" /></button>
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                    )
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <div style={styles.section}>
                <h2 style={styles.sectionTitle}>Registrar Transação</h2>
                <form onSubmit={handleAddTransaction} style={styles.form}>
                    <div style={styles.inputGroup}>
                        <label style={styles.label}>Conta (Saldo Principal):</label>
                        <select
                            value={newTransactionAccountId}
                            onChange={(e) => setNewTransactionAccountId(e.target.value)}
                            required
                            style={styles.select}
                        >
                            <option value="">Selecione uma conta</option>
                            {bankAccounts.map(acc => (
                                <option key={acc.id} value={acc.id}>{acc.name}</option>
                            ))}
                        </select>
                    </div>
                    <div style={styles.inputGroup}>
                        <label style={styles.label}>Tipo:</label>
                        <select value={newTransactionType} onChange={(e) => setNewTransactionType(e.target.value)} style={styles.select}>
                            <option value="deposit">Depósito (Entrada)</option>
                            <option value="withdrawal">Retirada (Saída)</option>
                        </select>
                    </div>
                    <div style={styles.inputGroup}>
                        <label style={styles.label}>Valor (R$):</label>
                        <input
                            type="number"
                            placeholder="0.00"
                            value={newTransactionAmount}
                            onChange={(e) => setNewTransactionAmount(e.target.value)}
                            min="0.01"
                            step="0.01"
                            required
                            style={styles.input}
                        />
                    </div>
                    <div style={styles.inputGroup}>
                        <label style={styles.label}>Descrição:</label>
                        <textarea
                            placeholder="Ex: Venda de produto, Pagamento de aluguel"
                            value={newTransactionDescription}
                            onChange={(e) => setNewTransactionDescription(e.target.value)}
                            required
                            rows="2"
                            style={{...styles.input, resize: 'vertical'}}
                        ></textarea>
                    </div>
                    <button type="submit" style={styles.button}><Plus className="inline-block mr-2" /> Registrar Transação</button>
                </form>
            </div>

            <div style={styles.section}>
                <h2 style={styles.sectionTitle}>Transferência entre Contas (Saldo Principal)</h2>
                <form onSubmit={handleTransfer} style={styles.form}>
                    <div style={styles.inputGroup}>
                        <label style={styles.label}>De:</label>
                        <select
                            value={transferFromAccount}
                            onChange={(e) => setTransferFromAccount(e.target.value)}
                            required
                            style={styles.select}
                        >
                            <option value="">Selecione a conta de origem</option>
                            {bankAccounts.map(acc => (
                                <option key={acc.id} value={acc.id}>{acc.name}</option>
                            ))}
                        </select>
                    </div>
                    <div style={styles.inputGroup}>
                        <label style={styles.label}>Para:</label>
                        <select
                            value={transferToAccount}
                            onChange={(e) => setTransferToAccount(e.target.value)}
                            required
                            style={styles.select}
                        >
                            <option value="">Selecione a conta de destino</option>
                            {bankAccounts.filter(acc => acc.id !== transferFromAccount).map(acc => (
                                <option key={acc.id} value={acc.id}>{acc.name}</option>
                            ))}
                        </select>
                    </div>
                    <div style={styles.inputGroup}>
                        <label style={styles.label}>Valor da Transferência (R$):</label>
                        <input
                            type="number"
                            placeholder="0.00"
                            value={transferAmount}
                            onChange={(e) => setTransferAmount(e.target.value)}
                            min="0.01"
                            step="0.01"
                            required
                            style={styles.input}
                        />
                    </div>
                    <button type="submit" style={styles.button}><Repeat className="inline-block mr-2" /> Transferir</button>
                </form>
            </div>

            <div style={styles.section}>
                <h2 style={styles.sectionTitle}>Histórico de Transações</h2>
                <div style={styles.tableContainer}>
                    <table style={styles.table}>
                        <thead>
                            <tr>
                                <th style={styles.tableHeader}>Data</th>
                                <th style={styles.tableHeader}>Conta</th>
                                <th style={styles.tableHeader}>Tipo</th>
                                <th style={styles.tableHeader}>Valor</th>
                                <th style={styles.tableHeader}>Descrição</th>
                            </tr>
                        </thead>
                        <tbody>
                            {transactions.length === 0 ? (
                                <tr>
                                    <td colSpan="5" style={{ ...styles.tableCell, textAlign: 'center' }}>Nenhuma transação registrada.</td>
                                </tr>
                            ) : (
                                transactions.map(tx => {
                                    const accountName = bankAccounts.find(acc => acc.id === tx.accountId)?.name || 'Desconhecida';
                                    const isDeposit = tx.type === 'deposit' || tx.type === 'transfer_in';
                                    return (
                                        <tr key={tx.id} style={styles.tableRow}>
                                            <td style={styles.tableCell}>{tx.timestamp.toLocaleString('pt-BR')}</td>
                                            <td style={styles.tableCell}>{accountName}</td>
                                            <td style={{ ...styles.tableCell, color: isDeposit ? '#28a745' : '#dc3545', fontWeight: 'bold' }}>
                                                <div style={{ display: 'flex', alignItems: 'center' }}>
                                                    {isDeposit ? <TrendingUp className="mr-1" size={16} /> : <TrendingDown className="mr-1" size={16} />}
                                                    {tx.type === 'deposit' && 'Depósito'}
                                                    {tx.type === 'withdrawal' && 'Retirada'}
                                                    {tx.type === 'transfer_in' && 'Transf. (Entrada)'}
                                                    {tx.type === 'transfer_out' && 'Transf. (Saída)'}
                                                </div>
                                            </td>
                                            <td style={styles.tableCell}>R$ {tx.amount.toFixed(2).replace('.', ',')}</td>
                                            <td style={styles.tableCell}>{tx.description}</td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

        </div>
    );
};

export default FinancialOverviewPage;
