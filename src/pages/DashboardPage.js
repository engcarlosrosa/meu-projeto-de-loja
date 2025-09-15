// src/pages/DashboardPage.js
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../components/AuthProvider';
import { useFirebase } from '../contexts/FirebaseContext';
import { collection, query, where, getDocs, Timestamp, orderBy, limit } from 'firebase/firestore';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { DollarSign, ShoppingBag, Package, AlertTriangle, TrendingUp, Calendar, Banknote, CheckSquare, Store } from 'lucide-react';

// Estilos para a página
const styles = {
    container: { padding: '20px', fontFamily: "'Inter', sans-serif", backgroundColor: '#f0f2f5' },
    header: { color: '#1f2937', marginBottom: '20px', fontSize: '2em', fontWeight: 'bold' },
    kpiGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px', marginBottom: '30px' },
    kpiCard: { backgroundColor: '#fff', padding: '20px', borderRadius: '10px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', display: 'flex', alignItems: 'center', gap: '20px' },
    cardIcon: { padding: '15px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' },
    cardInfo: { display: 'flex', flexDirection: 'column' },
    cardLabel: { color: '#6b7280', fontSize: '0.9em', marginBottom: '5px' },
    cardValue: { color: '#111827', fontSize: '1.75em', fontWeight: 'bold' },
    chartsGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '20px', marginBottom: '30px' },
    chartContainer: { backgroundColor: '#fff', padding: '20px', borderRadius: '10px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', height: '400px' },
    sectionTitle: { color: '#1f2937', fontSize: '1.25em', fontWeight: '600', marginBottom: '15px' },
    listGrid: { display: 'grid', gridTemplateColumns: '1fr', md: { gridTemplateColumns: '1fr 1fr' }, gap: '20px' },
    listContainer: { backgroundColor: '#fff', padding: '20px', borderRadius: '10px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' },
    stockTable: { width: '100%', borderCollapse: 'collapse', fontSize: '0.9em' },
    stockTableHeader: { textAlign: 'left', padding: '8px', borderBottom: '2px solid #e5e7eb', color: '#4b5563', fontWeight: '600' },
    stockTableCell: { padding: '8px', borderBottom: '1px solid #f3f4f6' },
    loadingContainer: { display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' },
    storeSelectorSection: { // NOVO
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        gap: '10px',
        marginBottom: '20px',
        padding: '10px',
        backgroundColor: '#fff',
        borderRadius: '8px',
        maxWidth: '500px',
        margin: '0 auto 30px auto',
    },
    select: {
        width: '100%',
        padding: '12px',
        border: '1px solid #ddd',
        borderRadius: '6px',
        backgroundColor: '#fff',
        fontSize: '1em',
    },
    label: {
        fontWeight: '600',
        color: '#555',
    },
};

const DashboardPage = () => {
    const { userRole, userStoreId, userStoreName, loading: authLoading } = useAuth();
    const { db, appId, firebaseLoading } = useFirebase();
    
    // NOVO: Estados para gerir a seleção de lojas pelo admin
    const [allStores, setAllStores] = useState([]);
    const [activeStoreId, setActiveStoreId] = useState(userStoreId);

    const [stats, setStats] = useState({
        salesToday: 0,
        salesMonth: 0,
        productsSoldMonth: 0,
        globalBalance: 0,
        payableToday: 0,
        payableMonth: 0,
        paidMonth: 0,
    });
    const [monthlySalesData, setMonthlySalesData] = useState([]);
    const [yearlySalesData, setYearlySalesData] = useState([]);
    const [yearlyPaidData, setYearlyPaidData] = useState([]);
    const [topSellers, setTopSellers] = useState([]);
    const [lowStockItems, setLowStockItems] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [storesMap, setStoresMap] = useState({});

    const formatCurrency = (value) => `R$ ${Number(value || 0).toFixed(2).replace('.', ',')}`;

    // NOVO: Efeito para buscar todas as lojas se o usuário for admin
    useEffect(() => {
        if (userRole === 'admin' && db) {
            const fetchStores = async () => {
                const storesCollectionRef = collection(db, 'stores');
                const storesSnapshot = await getDocs(storesCollectionRef);
                const storesList = storesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                setAllStores(storesList);
                if (!activeStoreId && storesList.length > 0) {
                    setActiveStoreId(storesList[0].id);
                }
            };
            fetchStores();
        }
    }, [db, userRole, activeStoreId]);
    
    // NOVO: Handler para a mudança de loja pelo admin
    const handleStoreChange = (e) => {
        setActiveStoreId(e.target.value);
    };

    const activeStoreName = useMemo(() => {
        if (userRole !== 'admin') {
            return userStoreName;
        }
        const activeStore = allStores.find(store => store.id === activeStoreId);
        return activeStore ? activeStore.name : '';
    }, [userRole, userStoreName, allStores, activeStoreId]);


    const fetchData = useCallback(async () => {
        if (!db || !appId || !userRole || authLoading || firebaseLoading || !activeStoreId) return;
        setIsLoading(true);

        try {
            const now = new Date();
            const startOfToday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
            const startOfMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
            const endOfMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0, 23, 59, 59));
            const startOfYear = new Date(Date.UTC(now.getUTCFullYear(), 0, 1));

            const isAdminOrFinance = userRole === 'admin' || userRole === 'finance';
            
            // ATUALIZADO: A busca de vendas é feita apenas para a loja ativa (activeStoreId)
            let allSalesMonth = [];
            let allSalesYear = [];

            const salesCollectionRef = collection(db, `artifacts/${appId}/stores/${activeStoreId}/sales`);
            const monthQuery = query(salesCollectionRef, where('date', '>=', startOfMonth), where('date', '<=', endOfMonth));
            const yearQuery = query(salesCollectionRef, where('date', '>=', startOfYear));

            const [monthSnapshot, yearSnapshot] = await Promise.all([getDocs(monthQuery), getDocs(yearQuery)]);
            
            monthSnapshot.forEach(doc => allSalesMonth.push(doc.data()));
            yearSnapshot.forEach(doc => allSalesYear.push(doc.data()));
            

            const salesToday = allSalesMonth
                .filter(s => s.date.toDate() >= startOfToday)
                .reduce((sum, s) => sum + s.totalAmount, 0);

            const salesMonth = allSalesMonth.reduce((sum, s) => sum + s.totalAmount, 0);
            
            const productsSoldMonth = allSalesMonth.reduce((sum, s) => {
                if (Array.isArray(s.items)) {
                    return sum + s.items.reduce((itemSum, item) => itemSum + item.quantity, 0);
                }
                return sum;
            }, 0);

            const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
            const monthlyChart = Array.from({ length: daysInMonth }, (_, i) => ({ day: i + 1, Vendas: 0 }));
            allSalesMonth.forEach(sale => {
                const day = sale.date.toDate().getUTCDate();
                if (monthlyChart[day - 1]) {
                    monthlyChart[day - 1].Vendas += sale.totalAmount;
                }
            });

            const yearlyChart = Array.from({ length: 12 }, (_, i) => ({ month: i + 1, Vendas: 0 }));
            allSalesYear.forEach(sale => {
                const month = sale.date.toDate().getUTCMonth();
                if (yearlyChart[month]) {
                    yearlyChart[month].Vendas += sale.totalAmount;
                }
            });
            
            setMonthlySalesData(monthlyChart);
            setYearlySalesData(yearlyChart.map(d => ({...d, month: new Date(now.getFullYear(), d.month - 1).toLocaleString('default', { month: 'short' }) })));

            let globalBalance = 0, payableToday = 0, payableMonth = 0, paidMonth = 0;
            let currentTopSellers = [];
            
            const inventoryCollectionRef = collection(db, 'inventory');
            // ATUALIZADO: A busca de estoque baixo agora também usa activeStoreId
            const lowStockQuery = query(inventoryCollectionRef, 
                where('storeId', '==', activeStoreId),
                where('quantity', '<=', 10), 
                orderBy('quantity', 'asc'), 
                limit(10)
            );
            const lowStockSnapshot = await getDocs(lowStockQuery);
            const currentLowStockItems = lowStockSnapshot.docs.map(doc => ({id: doc.id, ...doc.data()}));
            setLowStockItems(currentLowStockItems);
            
            // A lógica de Admin/Finance continua global, pois se refere a dados não específicos da loja.
            if (isAdminOrFinance) {
                // ... (a lógica global de contas e ranking de vendedores permanece a mesma)
                const bankAccountsSnapshot = await getDocs(collection(db, 'bankAccounts'));
                globalBalance = bankAccountsSnapshot.docs.reduce((sum, doc) => {
                    const accountData = doc.data();
                    const mainBalance = accountData.balance || 0;
                    const subBalancesTotal = (accountData.subBalances || []).reduce((subTotal, sub) => subTotal + (sub.amount || 0), 0);
                    return sum + mainBalance + subBalancesTotal;
                }, 0);
                 const pendingPayablesQuery = query(collection(db, 'accountsPayable'), where('status', '==', 'pending'));
                const monthlyPaidPayablesQuery = query(collection(db, 'accountsPayable'), where('status', '==', 'paid'), where('paidDate', '>=', startOfMonth), where('paidDate', '<=', endOfMonth));
                const yearlyPaidPayablesQuery = query(collection(db, 'accountsPayable'), where('status', '==', 'paid'), where('paidDate', '>=', startOfYear));
                
                const [pendingSnap, monthlyPaidSnap, yearlyPaidSnap] = await Promise.all([getDocs(pendingPayablesQuery), getDocs(monthlyPaidPayablesQuery), getDocs(yearlyPaidPayablesQuery)]);
                
                pendingSnap.forEach(doc => {
                    const p = doc.data();
                    const dueDate = p.dueDate.toDate();
                    if (dueDate >= startOfMonth && dueDate <= endOfMonth) {
                        payableMonth += p.totalAmount;
                        if (dueDate.toDateString() === now.toDateString()) payableToday += p.totalAmount;
                    }
                });
                paidMonth = monthlyPaidSnap.docs.reduce((sum, doc) => sum + doc.data().totalAmount, 0);

                const yearlyPaidChart = Array.from({ length: 12 }, (_, i) => ({ month: i + 1, Pagamentos: 0 }));
                yearlyPaidSnap.forEach(doc => {
                    const paidDate = doc.data().paidDate.toDate();
                    const month = paidDate.getUTCMonth();
                    if (yearlyPaidChart[month]) {
                        yearlyPaidChart[month].Pagamentos += doc.data().totalAmount;
                    }
                });
                setYearlyPaidData(yearlyPaidChart.map(d => ({...d, month: new Date(now.getFullYear(), d.month - 1).toLocaleString('default', { month: 'short' }) })));
                
                // ATUALIZADO: Ranking de vendedores agora considera apenas as vendas da loja ativa
                const usersSnapshot = await getDocs(query(collection(db, 'users'), where('storeId', '==', activeStoreId)));
                const sellers = usersSnapshot.docs.filter(doc => doc.data().role === 'employee');
                const sellersPerformance = sellers.map(userDoc => {
                    const user = { id: userDoc.id, ...userDoc.data() };
                    const userSales = allSalesMonth.filter(s => s.sellerInfo?.id === user.id).reduce((sum, s) => sum + s.totalAmount, 0);
                    return { name: user.username, totalSales: userSales };
                });
                currentTopSellers = sellersPerformance.sort((a, b) => b.totalSales - a.totalSales).slice(0, 5);
            }
            
            setTopSellers(currentTopSellers);
            setStats({ salesToday, salesMonth, productsSoldMonth, globalBalance, payableToday, payableMonth, paidMonth });

        } catch (error) {
            console.error("Error fetching dashboard data:", error);
        } finally {
            setIsLoading(false);
        }
    }, [db, appId, userRole, activeStoreId, authLoading, firebaseLoading]); // ATUALIZADO: activeStoreId é a dependência chave

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    if (isLoading) {
        return <div style={styles.loadingContainer}>Carregando Dashboard...</div>;
    }

    return (
        <div style={styles.container}>
            <h1 style={styles.header}>Dashboard {activeStoreName && `- ${activeStoreName}`}</h1>

            {/* NOVO: Seletor de Loja para Admins */}
            {userRole === 'admin' && (
                 <div style={styles.storeSelectorSection}>
                    <label style={styles.label}>
                        <Store size={20} style={{ marginRight: '8px' }}/>
                        Visualizando Dados da Loja:
                    </label>
                    <select value={activeStoreId || ''} onChange={handleStoreChange} style={styles.select}>
                        {allStores.map(store => (
                            <option key={store.id} value={store.id}>{store.name}</option>
                        ))}
                    </select>
                </div>
            )}

            <div style={styles.kpiGrid}>
                <KpiCard icon={<DollarSign />} title="Vendas Hoje" value={formatCurrency(stats.salesToday)} color="#3b82f6" />
                <KpiCard icon={<TrendingUp />} title="Vendas Mês" value={formatCurrency(stats.salesMonth)} color="#10b981" />
                <KpiCard icon={<ShoppingBag />} title="Produtos Vendidos (Mês)" value={stats.productsSoldMonth} color="#f59e0b" />
                
                {(userRole === 'admin' || userRole === 'finance') && (
                    <>
                        <KpiCard icon={<Banknote />} title="Saldo Global das Contas" value={formatCurrency(stats.globalBalance)} color="#8b5cf6" />
                        <KpiCard icon={<Calendar />} title="Contas a Pagar (Hoje)" value={formatCurrency(stats.payableToday)} color="#ef4444" />
                        <KpiCard icon={<Calendar />} title="Contas a Pagar (Mês)" value={formatCurrency(stats.payableMonth)} color="#f97316" />
                        <KpiCard icon={<CheckSquare />} title="Contas Pagas (Mês)" value={formatCurrency(stats.paidMonth)} color="#22c55e" />
                    </>
                )}
            </div>

            <div style={styles.chartsGrid}>
                <div style={styles.chartContainer}>
                    <h2 style={styles.sectionTitle}>Vendas Diárias (Mês Atual)</h2>
                    <ResponsiveContainer width="100%" height="90%">
                        <BarChart data={monthlySalesData}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="day" />
                            <YAxis tickFormatter={formatCurrency} />
                            <Tooltip formatter={(value) => formatCurrency(value)} />
                            <Bar dataKey="Vendas" fill="#3b82f6" />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
                 <div style={styles.chartContainer}>
                    <h2 style={styles.sectionTitle}>Vendas Mensais (Ano Atual)</h2>
                    <ResponsiveContainer width="100%" height="90%">
                        <BarChart data={yearlySalesData}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="month" />
                            <YAxis tickFormatter={formatCurrency} />
                            <Tooltip formatter={(value) => formatCurrency(value)} />
                            <Bar dataKey="Vendas" fill="#10b981" />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
                {(userRole === 'admin' || userRole === 'finance') && (
                    <div style={styles.chartContainer}>
                        <h2 style={styles.sectionTitle}>Contas Pagas (Ano Atual)</h2>
                        <ResponsiveContainer width="100%" height="90%">
                            <BarChart data={yearlyPaidData}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="month" />
                                <YAxis tickFormatter={formatCurrency} />
                                <Tooltip formatter={(value) => formatCurrency(value)} />
                                <Bar dataKey="Pagamentos" fill="#ef4444" />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                )}
            </div>

            <div style={styles.listGrid}>
                {(userRole === 'admin' || userRole === 'finance') && (
                    <div style={styles.listContainer}>
                        <h2 style={styles.sectionTitle}>Ranking de Vendedores (Mês na Loja)</h2>
                        {topSellers.length === 0 ? <p>Nenhuma venda registrada para vendedores nesta loja no período.</p> : topSellers.map((seller, index) => (
                            <div key={index} style={{...styles.listItem, padding: '12px 0', display: 'flex', justifyContent: 'space-between'}}>
                                <span>{index + 1}. {seller.name}</span>
                                <strong>{formatCurrency(seller.totalSales)}</strong>
                            </div>
                        ))}
                    </div>
                )}
                <div style={styles.listContainer}>
                    <h2 style={styles.sectionTitle}><AlertTriangle style={{color: '#ef4444'}}/> Alerta de Estoque Baixo</h2>
                    <div style={{overflowX: 'auto'}}>
                        <table style={styles.stockTable}>
                            <thead>
                                <tr>
                                    <th style={styles.stockTableHeader}>Produto</th>
                                    <th style={styles.stockTableHeader}>Variação</th>
                                    <th style={styles.stockTableHeader}>Estoque</th>
                                </tr>
                            </thead>
                            <tbody>
                                {lowStockItems.length === 0 ? (
                                    <tr><td colSpan={3} style={{textAlign: 'center', padding: '20px'}}>Nenhum produto com estoque baixo.</td></tr>
                                ) : (
                                    lowStockItems.map(item => (
                                        <tr key={item.id}>
                                            <td style={styles.stockTableCell}>{item.productName} ({item.productCode})</td>
                                            <td style={styles.stockTableCell}>{item.color} / {item.size}</td>
                                            <td style={{...styles.stockTableCell, color: '#ef4444', fontWeight: 'bold'}}>{item.quantity}</td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
};

const KpiCard = ({ icon, title, value, color }) => (
    <div style={styles.kpiCard}>
        <div style={{...styles.cardIcon, backgroundColor: color }}>
            {React.cloneElement(icon, { color: '#fff', size: 24 })}
        </div>
        <div style={styles.cardInfo}>
            <span style={styles.cardLabel}>{title}</span>
            <span style={styles.cardValue}>{value}</span>
        </div>
    </div>
);

export default DashboardPage;

