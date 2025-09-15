// src/pages/StockCountPage.js
import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../components/AuthProvider';
import { useFirebase } from '../contexts/FirebaseContext';
import { collection, query, where, addDoc, getDocs, serverTimestamp, orderBy, onSnapshot } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import { ClipboardCheck, PlusCircle, History, Store } from 'lucide-react';

const styles = {
    container: { padding: '20px', maxWidth: '1200px', margin: '20px auto', fontFamily: "'Inter', sans-serif" },
    header: { textAlign: 'center', color: '#34495e', marginBottom: '30px', fontSize: '2.2em', fontWeight: '700' },
    section: { backgroundColor: '#fff', padding: '25px', borderRadius: '12px', marginBottom: '25px', boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)' },
    sectionTitle: { color: '#2c3e50', fontSize: '1.6em', marginBottom: '20px', borderBottom: '2px solid #eee', paddingBottom: '10px', display: 'flex', alignItems: 'center', gap: '10px' },
    button: { padding: '12px 25px', borderRadius: '8px', border: 'none', color: 'white', fontSize: '1.1em', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '600', backgroundColor: '#007bff' },
    table: { width: '100%', borderCollapse: 'collapse', marginTop: '20px' },
    tableHeader: { backgroundColor: '#f2f2f2', fontWeight: 'bold', textAlign: 'left', padding: '12px', borderBottom: '2px solid #ddd' },
    tableRow: { borderBottom: '1px solid #eee' },
    tableCell: { padding: '12px', verticalAlign: 'middle' },
    statusBadge: { padding: '5px 12px', borderRadius: '15px', fontSize: '0.85em', fontWeight: 'bold', color: 'white' },
    storeSelectorContainer: {
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        marginBottom: '20px',
        maxWidth: '500px',
    },
    select: {
        width: '100%',
        padding: '12px',
        border: '1px solid #ddd',
        borderRadius: '6px',
        backgroundColor: '#fff',
        fontSize: '1em',
    },
};

const StockCountPage = () => {
    const { userRole, userStoreId, currentUser } = useAuth();
    const { db } = useFirebase();
    const navigate = useNavigate();
    
    const [allStores, setAllStores] = useState([]);
    const [selectedStoreId, setSelectedStoreId] = useState(userStoreId);
    
    const [history, setHistory] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isCountInProgress, setIsCountInProgress] = useState(false);

    useEffect(() => {
        if (userRole === 'admin' && db) {
            const fetchStores = async () => {
                const storesCollectionRef = collection(db, 'stores');
                const storesSnapshot = await getDocs(storesCollectionRef);
                const storesList = storesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                setAllStores(storesList);
                if (!userStoreId && storesList.length > 0) {
                    setSelectedStoreId(storesList[0].id);
                }
            };
            fetchStores();
        }
    }, [db, userRole, userStoreId]);

    useEffect(() => {
        if (!db || !selectedStoreId) return;

        const countsCollectionRef = collection(db, 'stock_counts');
        const q = query(
            countsCollectionRef, 
            where('storeId', '==', selectedStoreId), 
            orderBy('startedAt', 'desc')
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const counts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setHistory(counts);
            setIsCountInProgress(counts.some(c => c.status === 'in_progress'));
            setIsLoading(false);
        });

        return () => unsubscribe();
    }, [db, selectedStoreId]);

    const handleStartNewCount = async () => {
        if (!window.confirm("Tem a certeza que deseja iniciar uma nova contagem de estoque? O estoque atual do sistema será 'congelado' para comparação.")) return;

        const selectedStore = allStores.find(store => store.id === selectedStoreId) || { name: 'Loja Padrão' };
        const selectedStoreName = selectedStore.name;

        setIsLoading(true);
        try {
            // REFACTOR: Snapshot do estoque agora vem da coleção 'inventory'
            const inventoryRef = collection(db, 'inventory');
            const inventoryQuery = query(inventoryRef, where('storeId', '==', selectedStoreId));
            const inventorySnapshot = await getDocs(inventoryQuery);
            
            const stockSnapshot = [];
            inventorySnapshot.forEach(doc => {
                const item = doc.data();
                stockSnapshot.push({
                    inventoryDocId: doc.id, // Armazena o ID do documento de inventário para facilitar a atualização
                    productId: item.productId,
                    productName: item.productName,
                    productCode: item.productCode,
                    color: item.color,
                    size: item.size,
                    systemQuantity: item.quantity,
                    costPrice: item.costPrice || 0, // Assume que costPrice está no inventário
                });
            });

            const newCountRef = await addDoc(collection(db, 'stock_counts'), {
                storeId: selectedStoreId,
                storeName: selectedStoreName,
                startedAt: serverTimestamp(),
                startedBy: currentUser.email,
                status: 'in_progress',
                snapshot: stockSnapshot,
                countedItems: [],
            });

            navigate(`/stock-count/${newCountRef.id}`);

        } catch (error) {
            console.error("Erro ao iniciar contagem de estoque: ", error);
            alert("Falha ao iniciar contagem. Tente novamente.");
            setIsLoading(false);
        }
    };
    
    const formatCurrency = (value) => `R$ ${Number(value || 0).toFixed(2).replace('.', ',')}`;

    if (userRole !== 'admin' && userRole !== 'manager') {
        return <div style={styles.container}><h1>Acesso Negado</h1></div>;
    }

    return (
        <div style={styles.container}>
            <h1 style={styles.header}>Contagem de Estoque</h1>

            <div style={styles.section}>
                <h2 style={styles.sectionTitle}><PlusCircle /> Nova Contagem</h2>
                
                {userRole === 'admin' && (
                    <div style={styles.storeSelectorContainer}>
                        <Store />
                        <select
                            value={selectedStoreId}
                            onChange={(e) => setSelectedStoreId(e.target.value)}
                            style={styles.select}
                        >
                            {allStores.map(store => (
                                <option key={store.id} value={store.id}>{store.name}</option>
                            ))}
                        </select>
                    </div>
                )}

                <p>Inicie uma nova contagem para registar o inventário físico da sua loja. As vendas podem continuar normalmente durante o processo.</p>
                <button 
                    onClick={handleStartNewCount} 
                    style={{...styles.button, marginTop: '15px'}}
                    disabled={isCountInProgress || isLoading}
                >
                    {isLoading ? 'Aguarde...' : (isCountInProgress ? 'Contagem em Andamento' : 'Iniciar Nova Contagem')}
                </button>
                {isCountInProgress && <p style={{color: '#f97316', marginTop: '10px'}}>Já existe uma contagem em andamento para a loja selecionada. Finalize-a antes de iniciar uma nova.</p>}
            </div>

            <div style={styles.section}>
                <h2 style={styles.sectionTitle}><History /> Histórico de Contagens da Loja Selecionada</h2>
                <div style={{overflowX: 'auto'}}>
                    <table style={styles.table}>
                        <thead>
                            <tr>
                                <th style={styles.tableHeader}>Data de Início</th>
                                <th style={styles.tableHeader}>Iniciado Por</th>
                                <th style={styles.tableHeader}>Status</th>
                                <th style={styles.tableHeader}>Diferença (Un.)</th>
                                <th style={styles.tableHeader}>Diferença (R$)</th>
                                <th style={styles.tableHeader}>Ações</th>
                            </tr>
                        </thead>
                        <tbody>
                            {isLoading ? (
                                <tr><td colSpan="6" style={{textAlign: 'center', padding: '20px'}}>A carregar histórico...</td></tr>
                            ) : history.length === 0 ? (
                                <tr><td colSpan="6" style={{textAlign: 'center', padding: '20px'}}>Nenhuma contagem encontrada.</td></tr>
                            ) : (
                                history.map(count => {
                                    const unitDiff = count.totalUnitDifference || 0;
                                    const costDiff = count.totalCostDifference || 0;
                                    return (
                                    <tr key={count.id} style={styles.tableRow}>
                                        <td style={styles.tableCell}>{count.startedAt?.toDate().toLocaleString('pt-BR')}</td>
                                        <td style={styles.tableCell}>{count.startedBy}</td>
                                        <td style={styles.tableCell}>
                                            <span style={{...styles.statusBadge, backgroundColor: count.status === 'completed' ? '#28a745' : '#f59e0b'}}>
                                                {count.status === 'in_progress' ? 'Em Andamento' : 'Concluída'}
                                            </span>
                                        </td>
                                        <td style={{...styles.tableCell, color: unitDiff > 0 ? 'green' : (unitDiff < 0 ? 'red' : 'inherit'), fontWeight: 'bold' }}>
                                            {unitDiff > 0 ? `+${unitDiff}` : unitDiff}
                                        </td>
                                        <td style={{...styles.tableCell, color: costDiff > 0 ? 'green' : (costDiff < 0 ? 'red' : 'inherit'), fontWeight: 'bold' }}>
                                            {formatCurrency(costDiff)}
                                        </td>
                                        <td style={styles.tableCell}>
                                            <button onClick={() => navigate(`/stock-count/${count.id}`)} style={{...styles.button, fontSize: '0.9em', padding: '8px 15px'}}>
                                                {count.status === 'in_progress' ? 'Continuar' : 'Ver Detalhes'}
                                            </button>
                                        </td>
                                    </tr>
                                )})
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default StockCountPage;
