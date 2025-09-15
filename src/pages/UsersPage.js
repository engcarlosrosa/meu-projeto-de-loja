// src/pages/UsersPage.js
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '../components/AuthProvider';
import { useFirebase } from '../contexts/FirebaseContext';
import { collection, getDocs, doc, deleteDoc, setDoc, onSnapshot, updateDoc, query, where, Timestamp, getDoc } from 'firebase/firestore';
import { Users, PlusCircle, Trash2, Edit, Save, XCircle, Target, BarChart3 } from 'lucide-react';
import { Link } from 'react-router-dom';

// CORREÇÃO: Componente ProgressBar atualizado para melhor visualização
const ProgressBar = ({ value, max }) => {
    const percentage = max > 0 ? (value / max) * 100 : 0;
    const displayPercentage = Math.min(percentage, 100);

    return (
        <div style={{ position: 'relative', width: '100%', backgroundColor: '#e9ecef', borderRadius: '4px', overflow: 'hidden' }}>
            <div style={{
                width: `${displayPercentage}%`,
                backgroundColor: percentage >= 100 ? '#28a745' : '#007bff',
                height: '20px',
                borderRadius: '4px',
                transition: 'width 0.5s ease-in-out'
            }}>
            </div>
            <span style={{
                position: 'absolute',
                width: '100%',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                color: displayPercentage > 40 ? 'white' : '#333', // Muda a cor do texto dinamicamente
                fontSize: '0.8em',
                fontWeight: 'bold',
                textAlign: 'center',
            }}>
                {Math.round(percentage)}%
            </span>
        </div>
    );
};

// Componente para o Modal de Metas e Comissões
const PerformanceModal = ({ isOpen, onClose, user, onSave }) => {
    const { db } = useFirebase();
    const [goal, setGoal] = useState('');
    const [rate, setRate] = useState('');
    const [bonusRate, setBonusRate] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');

    const currentMonthId = useMemo(() => {
        const now = new Date();
        return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    }, []);

    const performanceDocRef = useMemo(() => {
        if (!db || !user) return null;
        return doc(db, 'users', user.id, 'performance', currentMonthId);
    }, [db, user, currentMonthId]);

    useEffect(() => {
        const fetchPerformance = async () => {
            if (!performanceDocRef) return;
            setIsLoading(true);
            try {
                const docSnap = await getDoc(performanceDocRef);
                if (docSnap.exists()) {
                    const data = docSnap.data();
                    setGoal(data.monthlyGoal || '');
                    setRate(data.commissionRate || '');
                    setBonusRate(data.bonusCommissionRate || '');
                } else {
                    setGoal('');
                    setRate('');
                    setBonusRate('');
                }
            } catch (err) {
                setError("Falha ao carregar dados de desempenho.");
            } finally {
                setIsLoading(false);
            }
        };
        if (isOpen) {
            fetchPerformance();
        }
    }, [isOpen, performanceDocRef]);

    const handleSave = async () => {
        if (!performanceDocRef) return;
        const dataToSave = {
            monthlyGoal: parseFloat(goal) || 0,
            commissionRate: parseFloat(rate) || 0,
            bonusCommissionRate: parseFloat(bonusRate) || 0,
        };
        try {
            await setDoc(performanceDocRef, dataToSave, { merge: true });
            onSave();
        } catch (err) {
            setError("Falha ao salvar. Verifique as permissões.");
        }
    };

    if (!isOpen) return null;

    return (
        <div style={styles.modalOverlay}>
            <div style={styles.modalContent}>
                <h2 style={styles.modalTitle}>Definir Metas para {user.username}</h2>
                <p style={{textAlign: 'center', color: '#6c757d', marginTop: '-15px', marginBottom: '20px'}}>Mês: {currentMonthId}</p>
                {isLoading ? <p>Carregando...</p> : (
                    <>
                        <div style={styles.inputGroup}>
                            <label style={styles.label}>Meta Mensal (R$)</label>
                            <input type="number" value={goal} onChange={e => setGoal(e.target.value)} style={styles.input} placeholder="Ex: 10000" />
                        </div>
                        <div style={styles.inputGroup}>
                            <label style={styles.label}>Comissão Padrão (%)</label>
                            <input type="number" value={rate} onChange={e => setRate(e.target.value)} style={styles.input} placeholder="Ex: 5" />
                        </div>
                        <div style={styles.inputGroup}>
                            <label style={styles.label}>Comissão Bônus (ao atingir a meta) (%)</label>
                            <input type="number" value={bonusRate} onChange={e => setBonusRate(e.target.value)} style={styles.input} placeholder="Ex: 7" />
                        </div>
                        {error && <p style={styles.messageError}>{error}</p>}
                        <div style={styles.modalActions}>
                            <button onClick={onClose} style={{...styles.button, backgroundColor: '#6c757d', marginTop: 0}}>Cancelar</button>
                            <button onClick={handleSave} style={{...styles.button, backgroundColor: '#007bff', marginTop: 0}}>Salvar</button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};


const styles = {
    container: {
        padding: '20px',
        maxWidth: '1000px',
        margin: '20px auto',
        backgroundColor: '#f9f9f9',
        borderRadius: '12px',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)',
        fontFamily: "'Inter', sans-serif",
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
    },
    sectionTitle: {
        color: '#2c3e50',
        fontSize: '1.5em',
        marginBottom: '20px',
        borderBottom: '2px solid #eee',
        paddingBottom: '10px',
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
    },
    form: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
        gap: '20px',
    },
    inputGroup: {
        display: 'flex',
        flexDirection: 'column',
    },
    label: {
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
    },
    select: {
        width: '100%',
        padding: '12px',
        border: '1px solid #ddd',
        borderRadius: '6px',
        backgroundColor: '#fff',
    },
    button: {
        gridColumn: '1 / -1',
        padding: '12px 20px',
        borderRadius: '6px',
        border: 'none',
        color: 'white',
        fontSize: '1.1em',
        cursor: 'pointer',
        transition: 'background-color 0.3s ease',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px',
        fontWeight: '600',
        backgroundColor: '#28a745',
        marginTop: '10px',
    },
    userTable: {
        width: '100%',
        borderCollapse: 'collapse',
        marginTop: '20px',
        tableLayout: 'fixed',
    },
    tableHeader: {
        backgroundColor: '#e9ecef',
        fontWeight: 'bold',
        textAlign: 'left',
        padding: '12px 15px',
        borderBottom: '2px solid #dee2e6',
    },
    tableRow: {
        borderBottom: '1px solid #eee',
    },
    tableCell: {
        padding: '12px 15px',
        wordWrap: 'break-word',
    },
    actionButton: {
        background: 'none',
        border: 'none',
        cursor: 'pointer',
        padding: '5px',
        margin: '0 5px',
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
        textAlign: 'center',
        padding: '50px',
        fontSize: '1.2em',
        color: '#555',
    },
    modalOverlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0, 0, 0, 0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 },
    modalContent: { backgroundColor: 'white', padding: '30px', borderRadius: '10px', boxShadow: '0 5px 15px rgba(0, 0, 0, 0.3)', width: '90%', maxWidth: '500px' },
    modalTitle: { fontSize: '1.5em', marginBottom: '20px', color: '#333', textAlign: 'center' },
    modalActions: { display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '25px' },
};

const UsersPage = () => {
    const { userRole, register } = useAuth();
    const { db, appId } = useFirebase();

    const [usersWithPerformance, setUsersWithPerformance] = useState([]);
    const [stores, setStores] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const [newUsername, setNewUsername] = useState('');
    const [newEmail, setNewEmail] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [newRole, setNewRole] = useState('employee');
    const [newStoreId, setNewStoreId] = useState('');

    const [editingUserId, setEditingUserId] = useState(null);
    const [editUsername, setEditUsername] = useState('');
    const [editRole, setEditRole] = useState('');
    const [editStoreId, setEditStoreId] = useState('');

    const [isPerformanceModalOpen, setIsPerformanceModalOpen] = useState(false);
    const [selectedUserForPerformance, setSelectedUserForPerformance] = useState(null);

    const currentMonthId = useMemo(() => {
        const now = new Date();
        return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    }, []);

    const fetchUsersAndPerformance = useCallback(async () => {
        if (userRole !== 'admin' || !db || !appId) {
            setIsLoading(false);
            return;
        }
        setIsLoading(true);

        try {
            const usersCollectionRef = collection(db, 'users');
            const usersSnapshot = await getDocs(usersCollectionRef);
            const usersList = usersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

            const now = new Date();
            const startOfMonth = Timestamp.fromDate(new Date(now.getFullYear(), now.getMonth(), 1));
            const endOfMonth = Timestamp.fromDate(new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59));

            const performancePromises = usersList.map(async (user) => {
                const performanceDocRef = doc(db, 'users', user.id, 'performance', currentMonthId);
                const performanceSnap = await getDoc(performanceDocRef);
                const performanceData = performanceSnap.exists() ? performanceSnap.data() : { monthlyGoal: 0, commissionRate: 0, bonusCommissionRate: 0 };

                let totalSales = 0;
                if (user.storeId && user.storeId !== 'ALL_STORES') {
                    const salesQuery = query(
                        collection(db, `artifacts/${appId}/stores/${user.storeId}/sales`),
                        where('sellerInfo.id', '==', user.id),
                        where('date', '>=', startOfMonth),
                        where('date', '<=', endOfMonth)
                    );
                    const salesSnapshot = await getDocs(salesQuery);
                    totalSales = salesSnapshot.docs.reduce((sum, doc) => sum + doc.data().totalAmount, 0);
                }

                const { monthlyGoal, commissionRate, bonusCommissionRate } = performanceData;
                const rateToApply = totalSales >= monthlyGoal && monthlyGoal > 0 ? bonusCommissionRate : commissionRate;
                const commission = (totalSales * rateToApply) / 100;

                return {
                    ...user,
                    monthlyGoal,
                    totalSales,
                    commission,
                };
            });

            const combinedData = await Promise.all(performancePromises);
            setUsersWithPerformance(combinedData);

        } catch (err) {
            console.error("Error fetching users and performance:", err);
            setError("Falha ao carregar dados de desempenho dos funcionários.");
        } finally {
            setIsLoading(false);
        }
    }, [db, userRole, appId, currentMonthId]);


    useEffect(() => {
        fetchUsersAndPerformance();
    }, [fetchUsersAndPerformance]);

    useEffect(() => {
        const fetchStores = async () => {
            if (userRole !== 'admin' || !db) return;
            try {
                const storesCollectionRef = collection(db, 'stores');
                const storesSnapshot = await getDocs(storesCollectionRef);
                const storesList = storesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                setStores(storesList);
                if (storesList.length > 0) {
                    setNewStoreId(storesList[0].id);
                }
            } catch (err) {
                console.error("Error fetching stores:", err);
                setError("Falha ao carregar lojas.");
            }
        };

        fetchStores();
    }, [db, userRole]);

    const handleRoleChange = (e) => {
        const selectedRole = e.target.value;
        setNewRole(selectedRole);
        
        if (selectedRole === 'admin') {
            setNewStoreId('ALL_STORES');
        } else {
            if (stores.length > 0) {
                setNewStoreId(stores[0].id);
            } else {
                setNewStoreId('');
            }
        }
    };

    const handleRegisterUser = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        if (!newUsername || !newEmail || !newPassword || !newRole || !newStoreId) {
            setError("Todos os campos são obrigatórios.");
            return;
        }

        try {
            await register(newEmail, newPassword, newRole, newStoreId, newUsername);
            setSuccess(`Funcionário ${newUsername} cadastrado com sucesso!`);
            setNewUsername('');
            setNewEmail('');
            setNewPassword('');
            setNewRole('employee');
            if (stores.length > 0) {
                setNewStoreId(stores[0].id);
            }
            fetchUsersAndPerformance();
        } catch (err) {
            console.error("Error registering user:", err);
            setError(`Falha ao cadastrar funcionário: ${err.message}`);
        }
    };
    
    const handleEditClick = (user) => {
        setEditingUserId(user.id);
        setEditUsername(user.username);
        setEditRole(user.role);
        setEditStoreId(user.storeId);
    };

    const handleCancelEdit = () => {
        setEditingUserId(null);
    };

    const handleUpdateUser = async (userId) => {
        setError('');
        setSuccess('');
        if (!editUsername || !editRole || !editStoreId) {
            setError("Todos os campos são obrigatórios para a edição.");
            return;
        }
        try {
            const userDocRef = doc(db, 'users', userId);
            await updateDoc(userDocRef, {
                username: editUsername,
                role: editRole,
                storeId: editStoreId,
            });
            setSuccess("Funcionário atualizado com sucesso!");
            setEditingUserId(null);
            fetchUsersAndPerformance();
        } catch (err) {
            console.error("Error updating user:", err);
            setError(`Falha ao atualizar funcionário: ${err.message}`);
        }
    };

    const handleDeleteUser = async (userId, userEmail) => {
        if (!window.confirm(`Tem certeza que deseja excluir o funcionário ${userEmail}? Esta ação não pode ser desfeita e o usuário de autenticação NÃO será removido.`)) {
            return;
        }
        setError('');
        setSuccess('');
        try {
            await deleteDoc(doc(db, "users", userId));
            setSuccess("Documento do funcionário excluído com sucesso.");
            fetchUsersAndPerformance();
        } catch(err) {
            console.error("Error deleting user document:", err);
            setError(`Falha ao excluir documento do funcionário: ${err.message}`);
        }
    };

    const handleOpenPerformanceModal = (user) => {
        setSelectedUserForPerformance(user);
        setIsPerformanceModalOpen(true);
    };

    const handleClosePerformanceModal = () => {
        setIsPerformanceModalOpen(false);
        setSelectedUserForPerformance(null);
        fetchUsersAndPerformance();
    };

    const formatCurrency = (value) => `R$ ${Number(value || 0).toFixed(2).replace('.', ',')}`;

    if (userRole !== 'admin') {
        return (
            <div style={styles.container}>
                <h1 style={styles.header}>Acesso Negado</h1>
                <p style={{ textAlign: 'center' }}>Você não tem permissão para gerenciar funcionários.</p>
            </div>
        );
    }

    if (isLoading) {
        return <div style={styles.loadingContainer}>Carregando...</div>;
    }

    return (
        <div style={styles.container}>
            <PerformanceModal 
                isOpen={isPerformanceModalOpen}
                onClose={handleClosePerformanceModal}
                user={selectedUserForPerformance}
                onSave={handleClosePerformanceModal}
            />

            <h1 style={styles.header}>Gestão de Funcionários</h1>

            {error && <div style={styles.messageError}>{error}</div>}
            {success && <div style={styles.messageSuccess}>{success}</div>}

            <div style={styles.section}>
                <h2 style={styles.sectionTitle}><PlusCircle /> Cadastrar Novo Funcionário</h2>
                <form onSubmit={handleRegisterUser} style={styles.form}>
                    <div style={styles.inputGroup}>
                        <label style={styles.label} htmlFor="username">Nome Completo</label>
                        <input id="username" type="text" value={newUsername} onChange={(e) => setNewUsername(e.target.value)} style={styles.input} placeholder="Nome do Funcionário" />
                    </div>
                    <div style={styles.inputGroup}>
                        <label style={styles.label} htmlFor="email">Email</label>
                        <input id="email" type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} style={styles.input} placeholder="email@dominio.com" />
                    </div>
                    <div style={styles.inputGroup}>
                        <label style={styles.label} htmlFor="password">Senha</label>
                        <input id="password" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} style={styles.input} placeholder="Mínimo 6 caracteres" />
                    </div>
                    <div style={styles.inputGroup}>
                        <label style={styles.label} htmlFor="role">Função (Permissão)</label>
                        <select id="role" value={newRole} onChange={handleRoleChange} style={styles.select}>
                            <option value="employee">Funcionário (Vendedor)</option>
                            <option value="manager">Gerente</option>
                            <option value="finance">Financeiro</option>
                            <option value="admin">Administrador</option>
                        </select>
                    </div>
                    <div style={styles.inputGroup}>
                        <label style={styles.label} htmlFor="store">Loja</label>
                        <select 
                            id="store" 
                            value={newStoreId} 
                            onChange={(e) => setNewStoreId(e.target.value)} 
                            style={styles.select}
                            disabled={newRole === 'admin'}
                        >
                            {newRole === 'admin' ? (
                                <option value="ALL_STORES">Todas as Lojas (Acesso Global)</option>
                            ) : (
                                stores.map(store => (
                                    <option key={store.id} value={store.id}>{store.name}</option>
                                ))
                            )}
                        </select>
                    </div>
                    <button type="submit" style={styles.button}>Cadastrar Funcionário</button>
                </form>
            </div>

            <div style={styles.section}>
                <h2 style={styles.sectionTitle}><Users /> Funcionários Cadastrados</h2>
                <div style={{overflowX: 'auto'}}>
                    <table style={styles.userTable}>
                        <thead>
                            <tr>
                                <th style={styles.tableHeader}>Nome</th>
                                <th style={styles.tableHeader}>Vendas (Mês)</th>
                                <th style={styles.tableHeader}>Meta (Mês)</th>
                                <th style={styles.tableHeader}>Progresso</th>
                                <th style={styles.tableHeader}>Comissão (Mês)</th>
                                <th style={styles.tableHeader}>Ações</th>
                            </tr>
                        </thead>
                        <tbody>
                            {usersWithPerformance.map(user => (
                                <tr key={user.id} style={styles.tableRow}>
                                    {editingUserId === user.id ? (
                                        <>
                                            <td style={styles.tableCell}><input type="text" value={editUsername} onChange={(e) => setEditUsername(e.target.value)} style={styles.input} /></td>
                                            <td colSpan="4">
                                                <div style={{display: 'flex', gap: '10px'}}>
                                                    <select value={editRole} onChange={(e) => setEditRole(e.target.value)} style={styles.select}>
                                                        <option value="employee">Funcionário</option>
                                                        <option value="manager">Gerente</option>
                                                        <option value="finance">Financeiro</option>
                                                        <option value="admin">Administrador</option>
                                                    </select>
                                                    <select value={editStoreId} onChange={(e) => setEditStoreId(e.target.value)} style={styles.select} disabled={editRole === 'admin'}>
                                                        {editRole === 'admin' ? (
                                                            <option value="ALL_STORES">Todas as Lojas</option>
                                                        ) : (
                                                            stores.map(store => (
                                                                <option key={store.id} value={store.id}>{store.name}</option>
                                                            ))
                                                        )}
                                                    </select>
                                                </div>
                                            </td>
                                            <td style={styles.tableCell}>
                                                <button onClick={() => handleUpdateUser(user.id)} style={{...styles.actionButton, color: '#28a745'}} title="Salvar"><Save size={20} /></button>
                                                <button onClick={handleCancelEdit} style={{...styles.actionButton, color: '#6c757d'}} title="Cancelar"><XCircle size={20} /></button>
                                            </td>
                                        </>
                                    ) : (
                                        <>
                                            <td style={styles.tableCell}>
                                                <div>{user.username || 'N/A'}</div>
                                                <small style={{color: '#6c757d'}}>{user.email}</small>
                                            </td>
                                            <td style={styles.tableCell}>{formatCurrency(user.totalSales)}</td>
                                            <td style={styles.tableCell}>{formatCurrency(user.monthlyGoal)}</td>
                                            <td style={styles.tableCell}><ProgressBar value={user.totalSales} max={user.monthlyGoal} /></td>
                                            <td style={styles.tableCell}>{formatCurrency(user.commission)}</td>
                                            <td style={styles.tableCell}>
                                                <Link to={`/users/${user.id}/performance`} style={{...styles.actionButton, color: '#17a2b8', textDecoration: 'none'}} title="Ver Desempenho">
                                                    <BarChart3 size={18} />
                                                </Link>
                                                <button onClick={() => handleOpenPerformanceModal(user)} style={{...styles.actionButton, color: '#fd7e14'}} title="Definir Metas">
                                                    <Target size={18} />
                                                </button>
                                                <button onClick={() => handleEditClick(user)} style={{...styles.actionButton, color: '#007bff'}} title="Editar Usuário"><Edit size={18} /></button>
                                                <button onClick={() => handleDeleteUser(user.id, user.email)} style={{...styles.actionButton, color: '#dc3545'}} title="Excluir"><Trash2 size={18} /></button>
                                            </td>
                                        </>
                                    )}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default UsersPage;
