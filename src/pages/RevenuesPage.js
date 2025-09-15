// src/pages/RevenuesPage.js
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '../components/AuthProvider';
import { useFirebase } from '../contexts/FirebaseContext';
import { collection, doc, addDoc, onSnapshot, query, orderBy, runTransaction, serverTimestamp, getDocs, getDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { DollarSign, PlusCircle, Calendar, Landmark, TrendingUp, Edit, Trash2, XCircle, Store } from 'lucide-react';

const styles = {
    container: { padding: '20px', maxWidth: '1200px', margin: '20px auto', fontFamily: "'Inter', sans-serif", color: '#333' },
    header: { textAlign: 'center', color: '#34495e', marginBottom: '30px', fontSize: '2.2em', fontWeight: '700' },
    section: { backgroundColor: '#fff', padding: '25px', borderRadius: '12px', marginBottom: '25px', boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)' },
    sectionTitle: { color: '#2c3e50', fontSize: '1.6em', marginBottom: '20px', borderBottom: '2px solid #eee', paddingBottom: '10px', display: 'flex', alignItems: 'center', gap: '10px' },
    formGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px' },
    inputGroup: { display: 'flex', flexDirection: 'column' },
    label: { marginBottom: '8px', fontWeight: '600', color: '#555' },
    input: { width: '100%', padding: '12px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '1em', boxSizing: 'border-box' },
    select: { width: '100%', padding: '12px', border: '1px solid #ddd', borderRadius: '6px', backgroundColor: '#fff' },
    button: { padding: '12px 20px', borderRadius: '6px', border: 'none', color: 'white', fontSize: '1em', cursor: 'pointer', transition: 'background-color 0.3s ease', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontWeight: '600' },
    table: { width: '100%', borderCollapse: 'collapse', marginTop: '20px' },
    tableHeader: { backgroundColor: '#f2f2f2', fontWeight: 'bold', textAlign: 'left', padding: '12px', borderBottom: '2px solid #ddd' },
    tableRow: { borderBottom: '1px solid #eee' },
    tableCell: { padding: '12px', verticalAlign: 'middle' },
    messageError: { backgroundColor: '#f8d7da', color: '#721c24', padding: '12px', borderRadius: '8px', marginBottom: '20px', textAlign: 'center' },
    messageSuccess: { backgroundColor: '#d4edda', color: '#155724', padding: '12px', borderRadius: '8px', marginBottom: '20px', textAlign: 'center' },
    loadingContainer: { textAlign: 'center', padding: '50px' },
    modalOverlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0, 0, 0, 0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 },
    modalContent: { backgroundColor: 'white', padding: '30px', borderRadius: '10px', boxShadow: '0 5px 15px rgba(0, 0, 0, 0.3)', width: '90%', maxWidth: '500px' },
    modalTitle: { fontSize: '1.5em', marginBottom: '20px', color: '#333' },
    modalActions: { display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '25px' },
    actionButton: { background: 'none', border: '1px solid', borderRadius: '5px', cursor: 'pointer', padding: '6px 10px', margin: '0 5px', display: 'inline-flex', alignItems: 'center', gap: '5px', transition: 'all 0.2s ease' },
};

function RevenuesPage() {
    const { currentUser, userRole } = useAuth();
    const { db } = useFirebase();

    const [revenues, setRevenues] = useState([]);
    const [revenueCategories, setRevenueCategories] = useState([]);
    const [bankAccounts, setBankAccounts] = useState([]);
    const [stores, setStores] = useState([]); // NOVO: Estado para armazenar as lojas
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const [categoryId, setCategoryId] = useState('');
    const [description, setDescription] = useState('');
    const [amount, setAmount] = useState('');
    const [receivedDate, setReceivedDate] = useState(new Date().toISOString().split('T')[0]);
    const [destinationAccountId, setDestinationAccountId] = useState('');
    const [storeId, setStoreId] = useState(''); // NOVO: Estado para a loja selecionada no formulário

    const [showEditModal, setShowEditModal] = useState(false);
    const [editingRevenue, setEditingRevenue] = useState(null);
    const [editData, setEditData] = useState({ category: '', description: '', amount: '', receivedDate: '', destinationAccountId: '', storeId: '' });

    const revenuesCollectionRef = useMemo(() => db ? collection(db, 'revenues') : null, [db]);
    const revenueCategoriesDocRef = useMemo(() => db ? doc(db, 'product_attributes', 'revenue_categories') : null, [db]);
    const bankAccountsCollectionRef = useMemo(() => db ? collection(db, 'bankAccounts') : null, [db]);
    const storesCollectionRef = useMemo(() => db ? collection(db, 'stores') : null, [db]); // NOVO: Referência para a coleção de lojas

    const fetchData = useCallback(async () => {
        let unsubscribe = () => {};
        setIsLoading(true);
        if (!db) {
            setError("A conexão com o Firebase não está pronta.");
            setIsLoading(false);
            return unsubscribe;
        }
        try {
            const [categoriesSnap, accountsSnap, storesSnap] = await Promise.all([
                getDoc(revenueCategoriesDocRef),
                getDocs(bankAccountsCollectionRef),
                getDocs(storesCollectionRef) // NOVO: Buscar lojas
            ]);

            if (categoriesSnap.exists()) setRevenueCategories(categoriesSnap.data().items || []);
            
            const accountsList = accountsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setBankAccounts(accountsList);
            if (accountsList.length > 0 && !destinationAccountId) setDestinationAccountId(accountsList[0].id);

            // NOVO: Processar e definir o estado das lojas
            const storesList = storesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setStores(storesList);
            if (storesList.length > 0 && !storeId) setStoreId(storesList[0].id);

            const q = query(revenuesCollectionRef, orderBy('receivedDate', 'desc'));
            unsubscribe = onSnapshot(q, (snapshot) => {
                setRevenues(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data(), receivedDate: doc.data().receivedDate.toDate() })));
                setIsLoading(false);
            }, (err) => {
                console.error("Erro ao carregar receitas:", err);
                setError("Falha ao carregar o histórico de receitas.");
                setIsLoading(false);
            });
        } catch (err) {
            setError("Falha ao carregar dados iniciais.");
            setIsLoading(false);
        }
        return unsubscribe;
    }, [db, destinationAccountId, storeId, revenueCategoriesDocRef, bankAccountsCollectionRef, revenuesCollectionRef, storesCollectionRef]);

    useEffect(() => {
        let unsubscribe = () => {};
        if (userRole === 'admin' || userRole === 'finance') {
            fetchData().then(unsub => { unsubscribe = unsub; });
        } else {
            setIsLoading(false);
        }
        return () => unsubscribe();
    }, [userRole, fetchData]);

    const handleSaveRevenue = async (e) => {
        e.preventDefault();
        setError(''); setSuccess('');
        // NOVO: Adicionada validação para storeId
        if (!categoryId || !description || !amount || !receivedDate || !destinationAccountId || !storeId) {
            setError("Por favor, preencha todos os campos, incluindo a loja.");
            return;
        }
        const revenueAmount = parseFloat(amount);
        if (revenueAmount <= 0) {
            setError("O valor da receita deve ser positivo.");
            return;
        }
        try {
            await runTransaction(db, async (transaction) => {
                const bankAccountRef = doc(db, 'bankAccounts', destinationAccountId);
                const bankAccountDoc = await transaction.get(bankAccountRef);
                if (!bankAccountDoc.exists()) throw new Error("Conta bancária de destino não encontrada.");

                // NOVO: Obter informações da loja
                const storeInfo = stores.find(s => s.id === storeId);
                if (!storeInfo) throw new Error("Loja selecionada não encontrada.");
                
                const currentBalance = bankAccountDoc.data().balance;
                transaction.update(bankAccountRef, { balance: currentBalance + revenueAmount });
                
                const newRevenueRef = doc(revenuesCollectionRef);
                const newTransactionRef = doc(collection(db, 'transactions'));
                
                const dateToSave = new Date(receivedDate + 'T03:00:00Z');

                transaction.set(newRevenueRef, {
                    category: categoryId, 
                    description, 
                    amount: revenueAmount,
                    receivedDate: dateToSave,
                    destinationAccountId, 
                    destinationAccountName: bankAccountDoc.data().name,
                    storeId: storeId, // NOVO: Salvar ID da loja
                    storeName: storeInfo.name, // NOVO: Salvar nome da loja
                    createdAt: serverTimestamp(), 
                    createdBy: currentUser.email,
                    transactionId: newTransactionRef.id 
                });
                transaction.set(newTransactionRef, {
                    accountId: destinationAccountId, 
                    amount: revenueAmount, 
                    type: 'deposit',
                    description: `Receita: ${description} (Loja: ${storeInfo.name})`, 
                    metadata: { revenueId: newRevenueRef.id, category: categoryId },
                    timestamp: dateToSave, 
                    performedBy: currentUser.email,
                });
            });
            setSuccess("Receita registrada com sucesso!");
            setCategoryId(''); 
            setDescription(''); 
            setAmount('');
            // NOVO: Limpar o campo de loja após salvar
            if (stores.length > 0) setStoreId(stores[0].id);
        } catch (err) {
            setError(`Falha ao registrar receita: ${err.message}`);
        }
    };

    const handleOpenEditModal = (revenue) => {
        if (!revenue.transactionId) {
            setError("Não é possível editar esta receita antiga pois não possui um ID de transação associado.");
            return;
        }
        setEditingRevenue(revenue);
        setEditData({
            category: revenue.category,
            description: revenue.description,
            amount: revenue.amount.toString(),
            receivedDate: new Date(revenue.receivedDate).toISOString().split('T')[0],
            destinationAccountId: revenue.destinationAccountId,
            storeId: revenue.storeId || '', // NOVO: Carregar storeId para o formulário de edição
        });
        setShowEditModal(true);
    };

    const handleUpdateRevenue = async () => {
        setError(''); setSuccess('');
        const { category, description, amount, receivedDate, destinationAccountId, storeId } = editData;
        // NOVO: Adicionar storeId à validação
        if (!category || !description || !amount || !receivedDate || !destinationAccountId || !storeId) {
            setError("Todos os campos de edição são obrigatórios.");
            return;
        }
        const newAmount = parseFloat(amount);
        if (newAmount <= 0) {
            setError("O valor da receita deve ser positivo.");
            return;
        }
        try {
            await runTransaction(db, async (transaction) => {
                const revenueRef = doc(db, 'revenues', editingRevenue.id);
                const originalAccountRef = doc(db, 'bankAccounts', editingRevenue.destinationAccountId);
                const newAccountRef = doc(db, 'bankAccounts', destinationAccountId);
                const transactionRef = doc(db, 'transactions', editingRevenue.transactionId);

                // NOVO: Obter informações da nova loja selecionada
                const newStoreInfo = stores.find(s => s.id === storeId);
                if (!newStoreInfo) throw new Error("Nova loja selecionada não encontrada.");

                const originalAccountDoc = await transaction.get(originalAccountRef);
                const newAccountDoc = await transaction.get(newAccountRef);

                if (!originalAccountDoc.exists()) throw new Error("Conta bancária original não encontrada.");
                if (!newAccountDoc.exists()) throw new Error("Nova conta bancária não encontrada.");

                // Reverter o valor da conta original (se a conta mudou)
                if (editingRevenue.destinationAccountId !== destinationAccountId) {
                    transaction.update(originalAccountRef, { balance: originalAccountDoc.data().balance - editingRevenue.amount });
                } else {
                    // Se a conta for a mesma, apenas ajusta a diferença
                    const balanceDifference = newAmount - editingRevenue.amount;
                    transaction.update(originalAccountRef, { balance: originalAccountDoc.data().balance + balanceDifference });
                }
                
                // Aplicar o novo valor na nova conta (se a conta mudou)
                if (editingRevenue.destinationAccountId !== destinationAccountId) {
                    transaction.update(newAccountRef, { balance: newAccountDoc.data().balance + newAmount });
                }

                const dateToSave = new Date(receivedDate + 'T03:00:00Z');

                transaction.update(revenueRef, {
                    category, description, amount: newAmount,
                    receivedDate: dateToSave,
                    destinationAccountId, destinationAccountName: newAccountDoc.data().name,
                    storeId: storeId, // NOVO: Atualizar ID da loja
                    storeName: newStoreInfo.name, // NOVO: Atualizar nome da loja
                });

                transaction.update(transactionRef, {
                    accountId: destinationAccountId, amount: newAmount,
                    description: `Receita: ${description} (Loja: ${newStoreInfo.name})`, metadata: { revenueId: revenueRef.id, category },
                    timestamp: dateToSave,
                });
            });
            setSuccess("Receita atualizada com sucesso!");
            setShowEditModal(false);
        } catch (err) {
            setError(`Falha ao atualizar receita: ${err.message}`);
        }
    };

    const handleDeleteRevenue = async (revenue) => {
        if (!revenue.transactionId) {
            setError("Não é possível excluir esta receita antiga pois não possui um ID de transação associado.");
            return;
        }
        if (!window.confirm(`Tem a certeza que deseja excluir a receita "${revenue.description}"? O valor será estornado da conta.`)) return;
        setError(''); setSuccess('');
        try {
            await runTransaction(db, async (transaction) => {
                const revenueRef = doc(db, 'revenues', revenue.id);
                const accountRef = doc(db, 'bankAccounts', revenue.destinationAccountId);
                const transactionRef = doc(db, 'transactions', revenue.transactionId);

                const accountDoc = await transaction.get(accountRef);
                if (!accountDoc.exists()) throw new Error("Conta bancária associada não encontrada.");

                const currentBalance = accountDoc.data().balance;
                transaction.update(accountRef, { balance: currentBalance - revenue.amount });
                transaction.delete(revenueRef);
                transaction.delete(transactionRef);
            });
            setSuccess("Receita excluída e valor estornado com sucesso!");
        } catch (err) {
            setError(`Falha ao excluir receita: ${err.message}`);
        }
    };

    if (isLoading) return <div style={styles.loadingContainer}>Carregando...</div>;
    if (userRole !== 'admin' && userRole !== 'finance') return <div style={styles.container}><h1 style={styles.header}>Acesso Negado</h1></div>;

    return (
        <div style={styles.container}>
            <h1 style={styles.header}>Lançamento de Receitas</h1>
            {error && <div style={styles.messageError}>{error}</div>}
            {success && <div style={styles.messageSuccess}>{success}</div>}

            <div style={styles.section}>
                <h2 style={styles.sectionTitle}><PlusCircle /> Registrar Nova Receita</h2>
                <form onSubmit={handleSaveRevenue}>
                    <div style={styles.formGrid}>
                        <div style={styles.inputGroup}><label style={styles.label}>Categoria</label><select value={categoryId} onChange={e => setCategoryId(e.target.value)} style={styles.select} required><option value="">-- Selecione --</option>{revenueCategories.map(c => <option key={c} value={c}>{c}</option>)}</select></div>
                        <div style={styles.inputGroup}><label style={styles.label}>Descrição</label><input type="text" value={description} onChange={e => setDescription(e.target.value)} style={styles.input} placeholder="Ex: Aluguel do Imóvel X" required /></div>
                        <div style={styles.inputGroup}><label style={styles.label}>Valor (R$)</label><input type="number" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} style={styles.input} required /></div>
                        <div style={styles.inputGroup}><label style={styles.label}>Data de Recebimento</label><input type="date" value={receivedDate} onChange={e => setReceivedDate(e.target.value)} style={styles.input} required /></div>
                        {/* NOVO: Campo de seleção de loja */}
                        <div style={styles.inputGroup}>
                            <label style={styles.label}>Loja da Receita</label>
                            <select value={storeId} onChange={e => setStoreId(e.target.value)} style={styles.select} required>
                                <option value="">-- Selecione a Loja --</option>
                                {stores.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                            </select>
                        </div>
                        <div style={styles.inputGroup}><label style={styles.label}>Conta de Destino</label><select value={destinationAccountId} onChange={e => setDestinationAccountId(e.target.value)} style={styles.select} required><option value="">-- Selecione --</option>{bankAccounts.map(acc => <option key={acc.id} value={acc.id}>{acc.name}</option>)}</select></div>
                    </div>
                    <button type="submit" style={{...styles.button, backgroundColor: '#28a745', width: '100%', marginTop: '20px'}}>Lançar Receita</button>
                </form>
            </div>

            <div style={styles.section}>
                <h2 style={styles.sectionTitle}><TrendingUp /> Histórico de Receitas</h2>
                <div style={{ overflowX: 'auto' }}>
                    <table style={styles.table}>
                        {/* NOVO: Adicionada a coluna "Loja" */}
                        <thead><tr><th style={styles.tableHeader}>Data</th><th style={styles.tableHeader}>Categoria</th><th style={styles.tableHeader}>Descrição</th><th style={styles.tableHeader}>Valor</th><th style={styles.tableHeader}>Loja</th><th style={styles.tableHeader}>Conta Destino</th><th style={styles.tableHeader}>Ações</th></tr></thead>
                        <tbody>
                            {revenues.length === 0 ? (<tr><td colSpan="7" style={{ textAlign: 'center', padding: '20px' }}>Nenhuma receita lançada.</td></tr>) : (
                                revenues.map(rev => (
                                    <tr key={rev.id} style={styles.tableRow}>
                                        <td style={styles.tableCell}>{new Date(rev.receivedDate).toLocaleDateString('pt-BR')}</td>
                                        <td style={styles.tableCell}>{rev.category}</td>
                                        <td style={styles.tableCell}>{rev.description}</td>
                                        <td style={styles.tableCell}>R$ {rev.amount.toFixed(2).replace('.', ',')}</td>
                                        {/* NOVO: Célula para exibir o nome da loja */}
                                        <td style={styles.tableCell}>{rev.storeName || 'N/A'}</td>
                                        <td style={styles.tableCell}>{rev.destinationAccountName}</td>
                                        <td style={styles.tableCell}>
                                            <button onClick={() => handleOpenEditModal(rev)} style={{...styles.actionButton, color: '#007bff', borderColor: '#007bff'}} title="Editar"><Edit size={16} /></button>
                                            <button onClick={() => handleDeleteRevenue(rev)} style={{...styles.actionButton, color: '#dc3545', borderColor: '#dc3545'}} title="Excluir"><Trash2 size={16} /></button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {showEditModal && editingRevenue && (
                <div style={styles.modalOverlay}>
                    <div style={styles.modalContent}>
                        <h2 style={styles.modalTitle}>Editar Receita</h2>
                        <div style={styles.formGrid}>
                            <div style={styles.inputGroup}><label style={styles.label}>Categoria</label><select value={editData.category} onChange={e => setEditData({...editData, category: e.target.value})} style={styles.select} required><option value="">-- Selecione --</option>{revenueCategories.map(c => <option key={c} value={c}>{c}</option>)}</select></div>
                            <div style={styles.inputGroup}><label style={styles.label}>Descrição</label><input type="text" value={editData.description} onChange={e => setEditData({...editData, description: e.target.value})} style={styles.input} required /></div>
                            <div style={styles.inputGroup}><label style={styles.label}>Valor (R$)</label><input type="number" step="0.01" value={editData.amount} onChange={e => setEditData({...editData, amount: e.target.value})} style={styles.input} required /></div>
                            <div style={styles.inputGroup}><label style={styles.label}>Data</label><input type="date" value={editData.receivedDate} onChange={e => setEditData({...editData, receivedDate: e.target.value})} style={styles.input} required /></div>
                            {/* NOVO: Campo de loja no modal de edição */}
                            <div style={styles.inputGroup}>
                                <label style={styles.label}>Loja</label>
                                <select value={editData.storeId} onChange={e => setEditData({...editData, storeId: e.target.value})} style={styles.select} required>
                                    <option value="">-- Selecione --</option>
                                    {stores.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                </select>
                            </div>
                            <div style={{...styles.inputGroup, gridColumn: '1 / -1'}}><label style={styles.label}>Conta de Destino</label><select value={editData.destinationAccountId} onChange={e => setEditData({...editData, destinationAccountId: e.target.value})} style={styles.select} required><option value="">-- Selecione --</option>{bankAccounts.map(acc => <option key={acc.id} value={acc.id}>{acc.name}</option>)}</select></div>
                        </div>
                        <div style={styles.modalActions}>
                            <button onClick={() => setShowEditModal(false)} style={{...styles.button, backgroundColor: '#6c757d'}}>Cancelar</button>
                            <button onClick={handleUpdateRevenue} style={{...styles.button, backgroundColor: '#28a745'}}>Salvar Alterações</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default RevenuesPage;
