// src/pages/StockCountSessionPage.js
import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../components/AuthProvider';
import { useFirebase } from '../contexts/FirebaseContext';
import { doc, getDoc, updateDoc, runTransaction, serverTimestamp, collection, writeBatch } from 'firebase/firestore';
import { Save, Send, AlertTriangle, CheckCircle, X } from 'lucide-react';

const styles = {
    // ... (Estilos similares aos de outras páginas)
    container: { padding: '20px', maxWidth: '1200px', margin: '20px auto', fontFamily: "'Inter', sans-serif" },
    header: { textAlign: 'center', color: '#34495e', marginBottom: '30px', fontSize: '2.2em', fontWeight: '700' },
    section: { backgroundColor: '#fff', padding: '25px', borderRadius: '12px', marginBottom: '25px', boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)' },
    productRow: { display: 'grid', gridTemplateColumns: '3fr 1fr 1fr 1fr', gap: '15px', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid #eee' },
    productHeader: { fontWeight: 'bold', color: '#374151', padding: '10px 0' },
    input: { padding: '8px', border: '1px solid #d1d5db', borderRadius: '6px', width: '80px', textAlign: 'center' },
    actionsContainer: { display: 'flex', justifyContent: 'flex-end', gap: '15px', marginTop: '30px' },
    button: { padding: '12px 25px', borderRadius: '8px', border: 'none', color: 'white', fontSize: '1.1em', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '600' },
    modalOverlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0, 0, 0, 0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 },
    modalContent: { backgroundColor: 'white', padding: '30px', borderRadius: '10px', width: '90%', maxWidth: '800px', maxHeight: '80vh', overflowY: 'auto' },
};

const StockCountSessionPage = () => {
    const { countId } = useParams();
    const navigate = useNavigate();
    const { currentUser } = useAuth();
    const { db } = useFirebase();
    const [countSession, setCountSession] = useState(null);
    const [countedQuantities, setCountedQuantities] = useState({});
    const [isLoading, setIsLoading] = useState(true);
    const [discrepancyReport, setDiscrepancyReport] = useState(null);
    const [showDiscrepancyModal, setShowDiscrepancyModal] = useState(false);

    const countDocRef = useCallback(() => doc(db, 'stock_counts', countId), [db, countId]);

    useEffect(() => {
        const fetchSession = async () => {
            const docSnap = await getDoc(countDocRef());
            if (docSnap.exists()) {
                const data = docSnap.data();
                setCountSession(data);
                
                const initialQuantities = {};
                const itemsSource = data.countedItems && data.countedItems.length > 0 ? data.countedItems : data.snapshot;
                
                itemsSource.forEach(item => {
                    const key = `${item.productId}-${item.color}-${item.size}`;
                    initialQuantities[key] = item.countedQuantity !== undefined ? item.countedQuantity : '';
                });
                
                data.snapshot.forEach(item => {
                    const key = `${item.productId}-${item.color}-${item.size}`;
                    if(initialQuantities[key] === undefined){
                        initialQuantities[key] = '';
                    }
                });

                setCountedQuantities(initialQuantities);

                if (data.status === 'completed') {
                    setDiscrepancyReport(data.discrepancyReport);
                }
            } else {
                alert("Sessão de contagem não encontrada.");
                navigate('/stock-count');
            }
            setIsLoading(false);
        };
        fetchSession();
    }, [countDocRef, navigate]);

    const handleQuantityChange = (productId, color, size, value) => {
        const key = `${productId}-${color}-${size}`;
        setCountedQuantities(prev => ({ ...prev, [key]: value }));
    };

    const handleSaveChanges = async () => {
        const countedItems = countSession.snapshot.map(item => {
             const key = `${item.productId}-${item.color}-${item.size}`;
             const countedQuantity = countedQuantities[key] !== '' ? parseInt(countedQuantities[key], 10) : null;
             return {
                 ...item,
                 countedQuantity: countedQuantity
             };
        }).filter(item => item.countedQuantity !== null);

        try {
            await updateDoc(countDocRef(), { 
                countedItems,
                lastSavedAt: serverTimestamp(),
                lastSavedBy: currentUser.email
            });
            alert("Progresso salvo com sucesso!");
        } catch (error) {
            console.error("Erro ao salvar progresso:", error);
            alert("Falha ao salvar. Tente novamente.");
        }
    };

    const handleFinalizeCount = () => {
        const report = countSession.snapshot.map(item => {
            const key = `${item.productId}-${item.color}-${item.size}`;
            const countedQuantity = countedQuantities[key] !== '' ? parseInt(countedQuantities[key], 10) : 0;
            return {
                ...item,
                countedQuantity,
                difference: countedQuantity - item.systemQuantity,
            };
        });
        setDiscrepancyReport(report);
        setShowDiscrepancyModal(true);
    };

    const handleConfirmAdjustment = async () => {
        if (!window.confirm("Esta ação irá ATUALIZAR o estoque no sistema para corresponder às quantidades contadas. Esta ação é irreversível. Deseja continuar?")) return;

        try {
            // REFACTOR: A lógica de atualização agora modifica a coleção 'inventory'
            const batch = writeBatch(db);

            const itemsToAdjust = discrepancyReport.filter(item => item.difference !== 0);
            const totalUnitDifference = discrepancyReport.reduce((sum, item) => sum + item.difference, 0);
            const totalCostDifference = discrepancyReport.reduce((sum, item) => sum + (item.difference * item.costPrice), 0);

            for (const item of itemsToAdjust) {
                // Se o item do snapshot tem um inventoryDocId, a atualização é direta.
                if (item.inventoryDocId) {
                    const inventoryRef = doc(db, 'inventory', item.inventoryDocId);
                    batch.update(inventoryRef, { 
                        quantity: item.countedQuantity,
                        updatedAt: serverTimestamp(),
                    });
                } else {
                    // Caso um item não tenha ID (cenário de fallback, menos provável com a nova lógica),
                    // seria necessário fazer uma query para encontrá-lo, o que não é ideal aqui.
                    // A melhor prática é garantir que o snapshot sempre contenha o ID.
                    console.warn(`Item ${item.productName} sem inventoryDocId, ajuste não aplicado.`);
                }
            }

            // Atualiza o documento da sessão de contagem com os resultados finais
            batch.update(countDocRef(), {
                status: 'completed',
                finishedAt: serverTimestamp(),
                finishedBy: currentUser.email,
                discrepancyReport: discrepancyReport,
                countedItems: countSession.snapshot.map(item => {
                    const key = `${item.productId}-${item.color}-${item.size}`;
                    return { ...item, countedQuantity: parseInt(countedQuantities[key]) || 0 };
                }),
                totalUnitDifference: totalUnitDifference,
                totalCostDifference: totalCostDifference,
            });

            await batch.commit();

            alert("Estoque ajustado com sucesso!");
            navigate('/stock-count');

        } catch (error) {
            console.error("Erro ao ajustar estoque:", error);
            alert(`Falha ao ajustar estoque: ${error.message}`);
        }
    };

    if (isLoading) return <div style={styles.container}><h1>A carregar...</h1></div>;
    if (!countSession) return null;

    return (
        <div style={styles.container}>
            <h1 style={styles.header}>Contagem de Estoque: {countSession.storeName}</h1>
            <p style={{textAlign: 'center'}}>Iniciada em: {countSession.startedAt?.toDate().toLocaleString('pt-BR')} por {countSession.startedBy}</p>

            <div style={styles.section}>
                <div style={{...styles.productRow, ...styles.productHeader}}>
                    <span>Produto (Cor / Tamanho)</span>
                    <span>Estoque (Sistema)</span>
                    <span>Contagem Física</span>
                    <span>Diferença</span>
                </div>
                {countSession.snapshot.map((item, index) => {
                    const key = `${item.productId}-${item.color}-${item.size}`;
                    const countedQty = countedQuantities[key] === undefined ? '' : countedQuantities[key];
                    const difference = countedQty !== '' ? parseInt(countedQty, 10) - item.systemQuantity : '';
                    return (
                        <div key={index} style={styles.productRow}>
                            <span>{item.productName} ({item.code}) - {item.color} / {item.size}</span>
                            <span style={{textAlign: 'center'}}>{item.systemQuantity}</span>
                            <input
                                type="number"
                                value={countedQty}
                                onChange={(e) => handleQuantityChange(item.productId, item.color, item.size, e.target.value)}
                                style={styles.input}
                                disabled={countSession.status === 'completed'}
                            />
                            <span style={{textAlign: 'center', color: difference > 0 ? 'green' : (difference < 0 ? 'red' : 'inherit'), fontWeight: 'bold' }}>
                                {difference > 0 ? `+${difference}` : difference}
                            </span>
                        </div>
                    );
                })}
            </div>

            {countSession.status === 'in_progress' && (
                <div style={styles.actionsContainer}>
                    <button onClick={handleSaveChanges} style={{...styles.button, backgroundColor: '#6c757d'}}><Save/> Salvar Progresso</button>
                    <button onClick={handleFinalizeCount} style={{...styles.button, backgroundColor: '#28a745'}}><Send/> Finalizar e Gerar Relatório</button>
                </div>
            )}

            {countSession.status === 'completed' && (
                 <div style={styles.actionsContainer}>
                    <button onClick={() => setShowDiscrepancyModal(true)} style={{...styles.button, backgroundColor: '#007bff'}}>Ver Relatório de Discrepância</button>
                </div>
            )}

            {showDiscrepancyModal && discrepancyReport && (
                <div style={styles.modalOverlay}>
                    <div style={styles.modalContent}>
                        <h2 style={{textAlign: 'center'}}>Relatório de Discrepância</h2>
                        <div style={{...styles.productRow, ...styles.productHeader}}>
                            <span>Produto</span>
                            <span>Sistema</span>
                            <span>Contado</span>
                            <span>Diferença</span>
                        </div>
                        {discrepancyReport.filter(item => item.difference !== 0).length === 0 ? (
                            <p style={{textAlign: 'center', padding: '20px', color: 'green'}}>Nenhuma divergência encontrada!</p>
                        ) : (
                            discrepancyReport.filter(item => item.difference !== 0).map((item, index) => (
                                <div key={index} style={styles.productRow}>
                                    <span>{item.productName} ({item.color}/{item.size})</span>
                                    <span style={{textAlign: 'center'}}>{item.systemQuantity}</span>
                                    <span style={{textAlign: 'center'}}>{item.countedQuantity}</span>
                                    <span style={{textAlign: 'center', color: item.difference > 0 ? 'green' : 'red', fontWeight: 'bold'}}>{item.difference > 0 ? `+${item.difference}` : item.difference}</span>
                                </div>
                            ))
                        )}
                        <div style={styles.actionsContainer}>
                            {countSession.status === 'in_progress' ? (
                                <>
                                    <button onClick={() => setShowDiscrepancyModal(false)} style={{...styles.button, backgroundColor: '#6c757d'}}>Voltar à Contagem</button>
                                    <button onClick={handleConfirmAdjustment} style={{...styles.button, backgroundColor: '#dc3545'}}><AlertTriangle/> Confirmar e Ajustar Estoque</button>
                                </>
                            ) : (
                                <button onClick={() => setShowDiscrepancyModal(false)} style={{...styles.button, backgroundColor: '#6c757d'}}><X/> Fechar</button>
                            )}
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
};

export default StockCountSessionPage;
