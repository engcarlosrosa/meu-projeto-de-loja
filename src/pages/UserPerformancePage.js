// src/pages/UserPerformancePage.js
import React, { useState, useEffect, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '../components/AuthProvider';
import { useFirebase } from '../contexts/FirebaseContext';
import { doc, getDoc, collection, query, where, getDocs, Timestamp } from 'firebase/firestore';
import { BarChart, User, Target, DollarSign, Percent } from 'lucide-react';

const styles = {
    // (Estilos similares aos de outras páginas para consistência)
    container: { padding: '20px', maxWidth: '1200px', margin: '20px auto', fontFamily: "'Inter', sans-serif" },
    header: { textAlign: 'center', color: '#34495e', marginBottom: '30px', fontSize: '2.2em', fontWeight: '700' },
    loadingContainer: { textAlign: 'center', padding: '50px', fontSize: '1.2em', color: '#555' },
    summaryGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px', marginBottom: '30px' },
    summaryCard: { backgroundColor: '#fff', padding: '20px', borderRadius: '10px', boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)', display: 'flex', alignItems: 'center', gap: '15px' },
    cardIcon: { padding: '15px', borderRadius: '50%', color: '#fff' },
    cardInfo: { display: 'flex', flexDirection: 'column' },
    cardLabel: { color: '#6c757d', fontSize: '0.9em', marginBottom: '5px' },
    cardValue: { color: '#2c3e50', fontSize: '1.5em', fontWeight: 'bold' },
    section: { backgroundColor: '#fff', padding: '25px', borderRadius: '10px', marginBottom: '20px', boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)' },
    sectionTitle: { color: '#2c3e50', fontSize: '1.5em', marginBottom: '20px', borderBottom: '2px solid #eee', paddingBottom: '10px' },
    salesTable: { width: '100%', borderCollapse: 'collapse', marginTop: '20px' },
    tableHeader: { backgroundColor: '#e9ecef', fontWeight: 'bold', textAlign: 'left', padding: '12px 15px', borderBottom: '2px solid #dee2e6' },
    tableRow: { borderBottom: '1px solid #eee' },
    tableCell: { padding: '12px 15px' },
};

const UserPerformancePage = () => {
    const { userId } = useParams();
    const { userRole } = useAuth();
    const { db, appId } = useFirebase();
    const [user, setUser] = useState(null);
    const [performanceData, setPerformanceData] = useState(null);
    const [sales, setSales] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');

    const currentMonthId = useMemo(() => {
        const now = new Date();
        return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    }, []);

    useEffect(() => {
        const fetchData = async () => {
            if (!userId || !db || !appId) return;
            setIsLoading(true);
            setError('');

            try {
                // Fetch user data
                const userDocRef = doc(db, 'users', userId);
                const userSnap = await getDoc(userDocRef);
                if (!userSnap.exists()) throw new Error("Funcionário não encontrado.");
                const userData = userSnap.data();
                setUser(userData);

                // Fetch performance data for the current month
                const performanceDocRef = doc(db, 'users', userId, 'performance', currentMonthId);
                const performanceSnap = await getDoc(performanceDocRef);
                setPerformanceData(performanceSnap.exists() ? performanceSnap.data() : { monthlyGoal: 0, commissionRate: 0, bonusCommissionRate: 0 });

                // Fetch sales for the current month
                const now = new Date();
                const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
                const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
                
                const salesQuery = query(
                    collection(db, `artifacts/${appId}/stores/${userData.storeId}/sales`),
                    where('sellerInfo.id', '==', userId),
                    where('date', '>=', Timestamp.fromDate(startOfMonth)),
                    where('date', '<=', Timestamp.fromDate(endOfMonth))
                );
                
                const salesSnapshot = await getDocs(salesQuery);
                const salesList = salesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                setSales(salesList);

            } catch (err) {
                console.error("Error fetching user performance data:", err);
                setError(err.message);
            } finally {
                setIsLoading(false);
            }
        };

        fetchData();
    }, [userId, db, appId, currentMonthId]);

    const totalSales = useMemo(() => {
        return sales.reduce((acc, sale) => acc + sale.totalAmount, 0);
    }, [sales]);

    const commission = useMemo(() => {
        if (!performanceData) return 0;
        const { monthlyGoal, commissionRate, bonusCommissionRate } = performanceData;
        const rate = totalSales >= monthlyGoal ? bonusCommissionRate : commissionRate;
        return (totalSales * rate) / 100;
    }, [totalSales, performanceData]);

    const formatCurrency = (value) => `R$ ${Number(value || 0).toFixed(2).replace('.', ',')}`;

    if (isLoading) return <div style={styles.loadingContainer}>Carregando dados de desempenho...</div>;
    if (error) return <div style={styles.loadingContainer}>{error}</div>;
    if (userRole !== 'admin' && userRole !== 'finance') return <div style={styles.container}><h1 style={styles.header}>Acesso Negado</h1></div>;

    return (
        <div style={styles.container}>
            <h1 style={styles.header}>Desempenho de {user?.username || 'Funcionário'}</h1>
            
            <div style={styles.summaryGrid}>
                <div style={styles.summaryCard}>
                    <div style={{...styles.cardIcon, backgroundColor: '#007bff'}}><DollarSign size={24} /></div>
                    <div style={styles.cardInfo}>
                        <span style={styles.cardLabel}>Vendas (Mês Atual)</span>
                        <span style={styles.cardValue}>{formatCurrency(totalSales)}</span>
                    </div>
                </div>
                <div style={styles.summaryCard}>
                    <div style={{...styles.cardIcon, backgroundColor: '#fd7e14'}}><Target size={24} /></div>
                    <div style={styles.cardInfo}>
                        <span style={styles.cardLabel}>Meta Mensal</span>
                        <span style={styles.cardValue}>{formatCurrency(performanceData?.monthlyGoal)}</span>
                    </div>
                </div>
                <div style={styles.summaryCard}>
                    <div style={{...styles.cardIcon, backgroundColor: '#28a745'}}><Percent size={24} /></div>
                    <div style={styles.cardInfo}>
                        <span style={styles.cardLabel}>Comissão Estimada</span>
                        <span style={styles.cardValue}>{formatCurrency(commission)}</span>
                    </div>
                </div>
            </div>

            <div style={styles.section}>
                <h2 style={styles.sectionTitle}>Vendas Realizadas no Mês</h2>
                <div style={{overflowX: 'auto'}}>
                    <table style={styles.salesTable}>
                        <thead>
                            <tr>
                                <th style={styles.tableHeader}>Data</th>
                                <th style={styles.tableHeader}>ID da Venda</th>
                                <th style={styles.tableHeader}>Cliente</th>
                                <th style={styles.tableHeader}>Valor Total</th>
                            </tr>
                        </thead>
                        <tbody>
                            {sales.length === 0 ? (
                                <tr><td colSpan="4" style={{textAlign: 'center', padding: '20px'}}>Nenhuma venda registrada este mês.</td></tr>
                            ) : (
                                sales.map(sale => (
                                    <tr key={sale.id} style={styles.tableRow}>
                                        <td style={styles.tableCell}>{sale.date.toDate().toLocaleDateString('pt-BR')}</td>
                                        <td style={styles.tableCell}>{sale.id.substring(0, 8)}...</td>
                                        <td style={styles.tableCell}>{sale.customerInfo.name}</td>
                                        <td style={styles.tableCell}>{formatCurrency(sale.totalAmount)}</td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default UserPerformancePage;
