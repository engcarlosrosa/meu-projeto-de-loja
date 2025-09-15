// src/pages/StoresPage.js
import React, { useState, useEffect, useCallback } from 'react';
import { collection, addDoc, getDocs, doc, updateDoc, deleteDoc, onSnapshot, getDoc } from 'firebase/firestore'; // Adicionado onSnapshot e getDoc
import { useAuth } from '../components/AuthProvider';
import { useFirebase } from '../contexts/FirebaseContext';

// Estilos definidos fora do componente para evitar o erro de inicialização
const styles = {
    container: {
        padding: '20px',
        maxWidth: '900px',
        margin: '20px auto',
        backgroundColor: '#fff',
        borderRadius: '8px',
        boxShadow: '0 2px 10px rgba(0, 0, 0, 0.1)',
        fontFamily: "'Inter', sans-serif",
    },
    header: {
        color: '#34495e',
        textAlign: 'center',
        marginBottom: '30px',
        fontSize: '2em',
        fontWeight: '700',
    },
    form: {
        display: 'flex',
        flexDirection: 'column',
        gap: '15px',
        marginBottom: '30px',
        padding: '20px',
        border: '1px solid #e0e0e0',
        borderRadius: '8px',
        backgroundColor: '#f9f9f9',
    },
    input: {
        padding: '12px',
        border: '1px solid #ccc',
        borderRadius: '4px',
        fontSize: '1em',
        width: '100%',
        boxSizing: 'border-box',
    },
    button: {
        padding: '12px 20px',
        backgroundColor: '#007bff',
        color: 'white',
        border: 'none',
        borderRadius: '4px',
        cursor: 'pointer',
        fontSize: '1em',
        fontWeight: '600',
        transition: 'background-color 0.3s ease',
    },
    buttonHover: {
        backgroundColor: '#0056b3',
    },
    table: {
        width: '100%',
        borderCollapse: 'collapse',
        marginBottom: '30px',
    },
    th: {
        backgroundColor: '#34495e',
        color: 'white',
        padding: '12px',
        textAlign: 'left',
        borderBottom: '1px solid #ddd',
    },
    td: {
        padding: '12px',
        borderBottom: '1px solid #eee',
        color: '#555',
    },
    actionButtons: {
        display: 'flex',
        gap: '10px',
    },
    editButton: {
        backgroundColor: '#ffc107',
        color: 'white',
        padding: '8px 15px',
        border: 'none',
        borderRadius: '4px',
        cursor: 'pointer',
        transition: 'background-color 0.3s ease',
    },
    deleteButton: {
        backgroundColor: '#dc3545',
        color: 'white',
        padding: '8px 15px',
        border: 'none',
        borderRadius: '4px',
        cursor: 'pointer',
        transition: 'background-color 0.3s ease',
    },
    editContainer: {
        display: 'flex',
        flexGrow: 1,
        gap: '10px',
        flexWrap: 'wrap',
    },
    editInput: {
        flexGrow: 1,
        padding: '8px',
        border: '1px solid #ddd',
        borderRadius: '4px',
    },
    saveButton: {
        backgroundColor: '#28a745',
        color: 'white',
        padding: '8px 15px',
        border: 'none',
        borderRadius: '4px',
        cursor: 'pointer',
        transition: 'background-color 0.3s ease',
    },
    cancelButton: {
        backgroundColor: '#6c757d',
        color: 'white',
        padding: '8px 15px',
        border: 'none',
        borderRadius: '4px',
        cursor: 'pointer',
        transition: 'background-color 0.3s ease',
    },
    messageError: {
        backgroundColor: '#f8d7da',
        color: '#721c24',
        padding: '10px',
        borderRadius: '4px',
        marginBottom: '20px',
        textAlign: 'center',
        border: '1px solid #f5c6cb',
    },
    messageSuccess: {
        backgroundColor: '#d4edda',
        color: '#155724',
        padding: '10px',
        borderRadius: '4px',
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
};

function StoresPage() {
    const { currentUser, userRole, loading: authLoading } = useAuth();
    const { db, appId, firebaseLoading } = useFirebase();

    const [stores, setStores] = useState([]);
    const [newStoreName, setNewStoreName] = useState('');
    const [newStoreLocation, setNewStoreLocation] = useState('');
    const [editingStore, setEditingStore] = useState(null);
    const [editStoreName, setEditStoreName] = useState('');
    const [editStoreLocation, setEditStoreLocation] = useState('');
    const [error, setError] = useState(null);
    const [successMessage, setSuccessMessage] = useState(null);
    const [dataLoading, setDataLoading] = useState(true); // Estado para controlar o carregamento dos dados das lojas

    const canManageStores = currentUser && userRole === 'admin';

    // Usamos useCallback para memoizar a função e evitar recriações desnecessárias.
    // fetchStores agora vai usar onSnapshot para escutar em tempo real.
    const fetchStores = useCallback(() => {
        if (!db || !appId || !currentUser || firebaseLoading || authLoading) {
            console.log("fetchStores: Firebase ou Auth ainda não estão prontos. Abortando fetch.");
            setDataLoading(true); // Manter o loading se as dependências não estiverem prontas
            return;
        }

        setDataLoading(true);
        setError(null);

        // A coleção de lojas é de nível raiz, mas suas regras de segurança dependem
        // do papel do utilizador.
        // A regra de segurança para `/stores/{storeId}` é `allow read: if request.auth != null;`
        // e `allow create, update, delete: if request.auth != null && getUserData(request.auth.uid).role == 'admin';`
        // Portanto, qualquer utilizador autenticado pode ler, mas apenas admin pode gerir.
        const storesCollectionRef = collection(db, `stores`);

        console.log("fetchStores: Configurando listener onSnapshot para lojas...");
        const unsubscribe = onSnapshot(storesCollectionRef,
            (snapshot) => {
                const storesData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                setStores(storesData);
                setDataLoading(false);
                console.log("fetchStores: Dados de lojas atualizados via onSnapshot.");
            },
            (error) => {
                console.error("fetchStores: Erro ao carregar lojas:", error);
                setError(`Erro ao carregar lojas: ${error.message}`);
                setDataLoading(false);
            }
        );

        // Retorna a função de unsubscribe para limpar o listener
        return unsubscribe;

    }, [db, appId, currentUser, firebaseLoading, authLoading]); // Dependências do useCallback

    useEffect(() => {
        const unsubscribe = fetchStores();
        return () => {
            if (unsubscribe) {
                unsubscribe(); // Limpa o listener ao desmontar
            }
        };
    }, [fetchStores]);


    const handleAddStore = async (e) => {
        e.preventDefault();
        if (!canManageStores) {
            setError("Permissão negada. Apenas administradores podem adicionar lojas.");
            return;
        }
        if (!newStoreName || !newStoreLocation) {
            setError("Por favor, preencha o nome e a localização da loja.");
            return;
        }
        if (!db || !appId) {
            setError("Serviços Firebase não disponíveis.");
            return;
        }

        try {
            // A coleção de lojas está na raiz, de acordo com as regras de segurança atualizadas.
            const docRef = await addDoc(collection(db, `stores`), {
                name: newStoreName,
                location: newStoreLocation,
                createdAt: new Date(),
            });
            setNewStoreName('');
            setNewStoreLocation('');
            setSuccessMessage("Loja adicionada com sucesso!");
            setError(null); // Limpar qualquer erro anterior
            console.log("Loja adicionada com ID:", docRef.id);
        } catch (err) {
            console.error("Erro ao adicionar loja:", err);
            setError(`Erro ao adicionar loja: ${err.message}`);
            setSuccessMessage(null);
        }
    };

    const handleEditClick = (store) => {
        setEditingStore(store.id);
        setEditStoreName(store.name);
        setEditStoreLocation(store.location);
        setError(null);
        setSuccessMessage(null);
    };

    const handleSaveEdit = async (storeId) => {
        if (!canManageStores) {
            setError("Permissão negada. Apenas administradores podem editar lojas.");
            return;
        }
        if (!editStoreName || !editStoreLocation) {
            setError("Por favor, preencha o nome e a localização da loja.");
            return;
        }
        if (!db || !appId) {
            setError("Serviços Firebase não disponíveis.");
            return;
        }

        try {
            await updateDoc(doc(db, `stores`, storeId), {
                name: editStoreName,
                location: editStoreLocation,
            });
            setEditingStore(null);
            setEditStoreName('');
            setEditStoreLocation('');
            setSuccessMessage("Loja atualizada com sucesso!");
            setError(null); // Limpar qualquer erro anterior
            console.log("Loja atualizada:", storeId);
        } catch (err) {
            console.error("Erro ao atualizar loja:", err);
            setError(`Erro ao atualizar loja: ${err.message}`);
            setSuccessMessage(null);
        }
    };

    const handleDeleteStore = async (storeId) => {
        if (!canManageStores) {
            setError("Permissão negada. Apenas administradores podem excluir lojas.");
            return;
        }
        if (!db || !appId) {
            setError("Serviços Firebase não disponíveis.");
            return;
        }

        if (window.confirm("Tem certeza de que deseja excluir esta loja?")) { // Usando window.confirm para simplicidade, mas um modal customizado é melhor
            try {
                await deleteDoc(doc(db, `stores`, storeId));
                setSuccessMessage("Loja excluída com sucesso!");
                setError(null); // Limpar qualquer erro anterior
                console.log("Loja excluída:", storeId);
            } catch (err) {
                console.error("Erro ao excluir loja:", err);
                setError(`Erro ao excluir loja: ${err.message}`);
                setSuccessMessage(null);
            }
        }
    };

    // Renderiza um estado de carregamento enquanto autenticação e Firebase estão a carregar
    if (authLoading || firebaseLoading) {
        return (
            <div style={styles.loadingContainer}>
                <div style={styles.spinner}></div>
                <p>A carregar serviços...</p>
            </div>
        );
    }

    return (
        <div style={styles.container}>
            <h2 style={styles.header}>Gestão de Lojas</h2>

            {error && <div style={styles.messageError}>{error}</div>}
            {successMessage && <div style={styles.messageSuccess}>{successMessage}</div>}

            {canManageStores && (
                <form onSubmit={handleAddStore} style={styles.form}>
                    <h3>Adicionar Nova Loja</h3>
                    <input
                        type="text"
                        placeholder="Nome da Loja"
                        value={newStoreName}
                        onChange={(e) => setNewStoreName(e.target.value)}
                        style={styles.input}
                    />
                    <input
                        type="text"
                        placeholder="Localização da Loja"
                        value={newStoreLocation}
                        onChange={(e) => setNewStoreLocation(e.target.value)}
                        style={styles.input}
                    />
                    <button type="submit" style={styles.button}>Adicionar Loja</button>
                </form>
            )}

            <h3>Lojas Existentes</h3>
            {dataLoading ? (
                <div style={styles.loadingContainer}>
                    <div style={styles.spinner}></div>
                    <p>A carregar lojas...</p>
                </div>
            ) : (
                <>
                    {stores.length === 0 ? (
                        <p>Nenhuma loja encontrada.</p>
                    ) : (
                        <table style={styles.table}>
                            <thead>
                                <tr>
                                    <th style={styles.th}>Nome</th>
                                    <th style={styles.th}>Localização</th>
                                    {canManageStores && <th style={styles.th}>Ações</th>}
                                </tr>
                            </thead>
                            <tbody>
                                {stores.map((store) => (
                                    <tr key={store.id}>
                                        {editingStore === store.id ? (
                                            <>
                                                <td style={styles.td}>
                                                    <input
                                                        type="text"
                                                        value={editStoreName}
                                                        onChange={(e) => setEditStoreName(e.target.value)}
                                                        style={styles.editInput}
                                                    />
                                                </td>
                                                <td style={styles.td}>
                                                    <input
                                                        type="text"
                                                        value={editStoreLocation}
                                                        onChange={(e) => setEditStoreLocation(e.target.value)}
                                                        style={styles.editInput}
                                                    />
                                                </td>
                                                <td style={styles.td}>
                                                    <div style={styles.actionButtons}>
                                                        <button onClick={() => handleSaveEdit(store.id)} style={styles.saveButton}>Salvar</button>
                                                        <button onClick={() => setEditingStore(null)} style={styles.cancelButton}>Cancelar</button>
                                                    </div>
                                                </td>
                                            </>
                                        ) : (
                                            <>
                                                <td style={styles.td}>{store.name}</td>
                                                <td style={styles.td}>{store.location}</td>
                                                {canManageStores && (
                                                    <td style={styles.td}>
                                                        <div style={styles.actionButtons}>
                                                            <button onClick={() => handleEditClick(store)} style={styles.editButton}>Editar</button>
                                                            <button onClick={() => handleDeleteStore(store.id)} style={styles.deleteButton}>Excluir</button>
                                                        </div>
                                                    </td>
                                                )}
                                            </>
                                        )}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </>
            )}
        </div>
    );
}

export default StoresPage;
