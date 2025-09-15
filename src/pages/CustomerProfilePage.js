// src/pages/CustomerProfilePage.js
import React, { useState, useEffect, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { useFirebase } from '../contexts/FirebaseContext';
import { useAuth } from '../components/AuthProvider';
import { doc, getDoc, collection, query, where, getDocs, Timestamp, orderBy } from 'firebase/firestore';
// ATUALIZADO: Adicionado o ícone de Loja (Store)
import { User, Calendar, ShoppingBag, DollarSign, Filter, Store } from 'lucide-react';

const styles = {
    container: {
        padding: '20px',
        maxWidth: '1200px',
        margin: '20px auto',
        fontFamily: "'Inter', sans-serif",
    },
    header: {
        display: 'flex',
        alignItems: 'center',
        gap: '20px',
        marginBottom: '30px',
        paddingBottom: '20px',
        borderBottom: '2px solid #eee',
    },
    headerTitle: {
        margin: 0,
        fontSize: '2.5em',
        color: '#2c3e50',
        fontWeight: '700',
    },
    summarySection: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
        gap: '20px',
        marginBottom: '30px',
    },
    summaryCard: {
        backgroundColor: '#fff',
        padding: '25px',
        borderRadius: '10px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
        display: 'flex',
        alignItems: 'center',
        gap: '20px',
    },
    summaryIcon: {
        padding: '15px',
        borderRadius: '50%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
    },
    summaryInfo: {
        '& h3': {
            margin: '0 0 5px 0',
            fontSize: '1.1em',
            color: '#555',
        },
        '& p': {
            margin: 0,
            fontSize: '1.8em',
            fontWeight: 'bold',
            color: '#333',
        },
    },
    filterSection: {
        backgroundColor: '#fff',
        padding: '20px',
        borderRadius: '10px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
        marginBottom: '30px',
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        gap: '15px',
    },
    filterGroup: {
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
    },
    dateInput: {
        padding: '10px',
        border: '1px solid #ccc',
        borderRadius: '6px',
        fontSize: '1em',
    },
    filterButton: {
        padding: '10px 15px',
        border: 'none',
        borderRadius: '6px',
        backgroundColor: '#3498db',
        color: 'white',
        cursor: 'pointer',
        fontSize: '0.9em',
        fontWeight: '600',
        transition: 'background-color 0.2s',
    },
    salesHistorySection: {
        backgroundColor: '#fff',
        padding: '20px',
        borderRadius: '10px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
    },
    historyTable: {
        width: '100%',
        borderCollapse: 'collapse',
    },
    tableHeader: {
        textAlign: 'left',
        padding: '12px 15px',
        borderBottom: '2px solid #dee2e6',
        backgroundColor: '#f8f9fa',
        fontWeight: '600',
        color: '#333',
    },
    tableRow: {
        borderBottom: '1px solid #eee',
    },
    tableCell: {
        padding: '12px 15px',
        verticalAlign: 'top',
    },
    loadingContainer: {
        textAlign: 'center',
        padding: '50px',
        fontSize: '1.2em',
        color: '#777',
    },
    spinner: {
        border: '4px solid rgba(0, 0, 0, 0.1)',
        borderTop: '4px solid #3498db',
        borderRadius: '50%',
        width: '40px',
        height: '40px',
        animation: 'spin 1s linear infinite',
        margin: '0 auto 15px auto',
    },
    '@keyframes spin': {
        '0%': { transform: 'rotate(0deg)' },
        '100%': { transform: 'rotate(360deg)' },
    },
};

const CustomerProfilePage = () => {
    const { customerId } = useParams();
    const { db, appId } = useFirebase();
    const { userStoreId, userRole } = useAuth();

    const [customer, setCustomer] = useState(null);
    const [sales, setSales] = useState([]);
    const [stores, setStores] = useState([]); // NOVO: Estado para as lojas
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    
    const today = new Date();
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const startOfYear = new Date(today.getFullYear(), 0, 1);

    useEffect(() => {
        if (!customerId || !db) {
            setLoading(false);
            setError("ID do cliente ou conexão com banco de dados não disponível.");
            return;
        }

        const fetchCustomerData = async () => {
            setLoading(true);
            setError('');
            try {
                // Busca os detalhes do cliente
                const customerDocRef = doc(db, 'customers', customerId);
                const customerSnap = await getDoc(customerDocRef);

                if (customerSnap.exists()) {
                    setCustomer({ id: customerSnap.id, ...customerSnap.data() });
                } else {
                    setError("Cliente não encontrado.");
                    setLoading(false);
                    return;
                }

                // NOVO: Busca a lista de lojas para encontrar o nome da loja de origem
                const storesCollectionRef = collection(db, 'stores');
                const storesSnapshot = await getDocs(storesCollectionRef);
                const storesList = storesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                setStores(storesList);


                // Determina de quais lojas buscar as vendas com base na permissão do usuário
                let storeIdsToQuery = [];
                if (userRole === 'admin') {
                    storeIdsToQuery = storesList.map(doc => doc.id);
                } else if (userStoreId) {
                    storeIdsToQuery = [userStoreId];
                } else {
                    setError("ID da loja do usuário não encontrado para buscar o histórico de vendas.");
                    setLoading(false);
                    return;
                }

                let allSales = [];

                for (const storeId of storeIdsToQuery) {
                    if (appId) {
                        const salesCollectionRef = collection(db, `artifacts/${appId}/stores/${storeId}/sales`);
                        const q = query(
                            salesCollectionRef, 
                            where('customerInfo.id', '==', customerId),
                            orderBy('date', 'desc')
                        );
                        const salesSnap = await getDocs(q);
                        const salesList = salesSnap.docs.map(doc => ({
                            id: doc.id,
                            ...doc.data(),
                            date: doc.data().date.toDate()
                        }));
                        allSales.push(...salesList);
                    }
                }
                
                allSales.sort((a, b) => b.date - a.date);
                setSales(allSales);

            } catch (err) {
                console.error("Error fetching customer data:", err);
                if (err.code === 'permission-denied') {
                    setError("Você não tem permissão para acessar estes dados. Verifique as regras de segurança do Firestore.");
                } else {
                    setError("Falha ao carregar dados do cliente.");
                }
            } finally {
                setLoading(false);
            }
        };

        fetchCustomerData();
    }, [customerId, db, appId, userRole, userStoreId]);

    const filteredSales = useMemo(() => {
        if (!startDate || !endDate) {
            return sales;
        }
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);

        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);

        return sales.filter(sale => {
            const saleDate = sale.date;
            return saleDate >= start && saleDate <= end;
        });
    }, [sales, startDate, endDate]);

    // NOVO: Calcula o nome da loja de origem do cliente
    const originStoreName = useMemo(() => {
        if (!customer || !stores.length) return 'N/A';
        const store = stores.find(s => s.id === customer.registeredAtStore);
        return store ? store.name : 'Loja não encontrada';
    }, [customer, stores]);


    const summary = useMemo(() => {
        const totalSpent = filteredSales.reduce((acc, sale) => acc + sale.totalAmount, 0);
        const totalPurchases = filteredSales.length;
        return { totalSpent, totalPurchases };
    }, [filteredSales]);
    
    const formatDate = (date) => date ? new Date(date).toISOString().split('T')[0] : '';
    
    const handleSetFilter = (start, end) => {
        setStartDate(formatDate(start));
        setEndDate(formatDate(end));
    };

    if (loading) {
        return (
            <div style={styles.loadingContainer}>
                <div style={styles.spinner}></div>
                Carregando perfil do cliente...
            </div>
        );
    }

    if (error) {
        return <div style={{...styles.loadingContainer, color: 'red'}}>{error}</div>;
    }

    return (
        <div style={styles.container}>
            <div style={styles.header}>
                <User size={48} color="#3498db" />
                <h1 style={styles.headerTitle}>{customer?.name || 'Perfil do Cliente'}</h1>
            </div>

            <div style={styles.summarySection}>
                <div style={styles.summaryCard}>
                    <div style={{...styles.summaryIcon, backgroundColor: '#d4edda', color: '#155724'}}><DollarSign/></div>
                    <div style={styles.summaryInfo}>
                        <h3>Total Gasto no Período</h3>
                        <p>R$ {summary.totalSpent.toFixed(2).replace('.', ',')}</p>
                    </div>
                </div>
                <div style={styles.summaryCard}>
                    <div style={{...styles.summaryIcon, backgroundColor: '#cce5ff', color: '#004085'}}><ShoppingBag/></div>
                    <div style={styles.summaryInfo}>
                        <h3>Total de Compras no Período</h3>
                        <p>{summary.totalPurchases}</p>
                    </div>
                </div>
                {/* NOVO: Card para exibir a loja de origem */}
                <div style={styles.summaryCard}>
                    <div style={{...styles.summaryIcon, backgroundColor: '#e2d9f3', color: '#4c2a85'}}><Store/></div>
                    <div style={styles.summaryInfo}>
                        <h3>Loja de Origem</h3>
                        <p style={{fontSize: '1.2em'}}>{originStoreName}</p>
                    </div>
                </div>
            </div>

            <div style={styles.filterSection}>
                <Filter size={20} />
                <div style={styles.filterGroup}>
                    <label>De:</label>
                    <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} style={styles.dateInput} />
                    <label>Até:</label>
                    <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} style={styles.dateInput} />
                </div>
                <button onClick={() => handleSetFilter(startOfMonth, today)} style={styles.filterButton}>Este Mês</button>
                <button onClick={() => handleSetFilter(startOfYear, today)} style={styles.filterButton}>Este Ano</button>
                <button onClick={() => { setStartDate(''); setEndDate(''); }} style={styles.filterButton}>Limpar Filtro</button>
            </div>

            <div style={styles.salesHistorySection}>
                <h2 style={{color: '#34495e'}}>Histórico de Compras</h2>
                <table style={styles.historyTable}>
                    <thead>
                        <tr>
                            <th style={styles.tableHeader}>Data</th>
                            <th style={styles.tableHeader}>Loja</th>
                            <th style={styles.tableHeader}>Itens</th>
                            <th style={styles.tableHeader}>Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredSales.length > 0 ? (
                            filteredSales.map(sale => (
                                <tr key={sale.id} style={styles.tableRow}>
                                    <td style={styles.tableCell}>{sale.date.toLocaleDateString('pt-BR')}</td>
                                    <td style={styles.tableCell}>{sale.storeName || 'N/A'}</td>
                                    <td style={styles.tableCell}>
                                        <ul>
                                            {sale.items.map((item, index) => (
                                                <li key={index}>{item.productName} ({item.selectedColor} - {item.selectedSize}) x {item.quantity}</li>
                                            ))}
                                        </ul>
                                    </td>
                                    <td style={styles.tableCell}>R$ {sale.totalAmount.toFixed(2).replace('.', ',')}</td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan="4" style={{textAlign: 'center', padding: '20px'}}>Nenhuma compra encontrada para o período selecionado.</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default CustomerProfilePage;
