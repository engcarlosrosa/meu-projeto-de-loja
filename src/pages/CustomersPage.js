// src/pages/CustomersPage.js
import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../components/AuthProvider';
import { useFirebase } from '../contexts/FirebaseContext';
// ATUALIZADO: Importado getDocs para buscar as lojas
import { collection, addDoc, onSnapshot, query, orderBy, doc, updateDoc, deleteDoc, getDocs } from 'firebase/firestore';
import { Users, PlusCircle, Trash2, Edit, Save, XCircle, Search } from 'lucide-react';

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
    select: { // NOVO: Estilo para o select de edição
        width: '100%',
        padding: '12px',
        border: '1px solid #ddd',
        borderRadius: '6px',
        fontSize: '1em',
        boxSizing: 'border-box',
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
    customerTable: {
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
    searchContainer: {
        marginBottom: '20px',
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        padding: '10px',
        backgroundColor: '#fff',
        borderRadius: '8px',
        border: '1px solid #eee',
    },
    searchInput: {
        flexGrow: 1,
        padding: '10px',
        border: 'none',
        borderRadius: '6px',
        fontSize: '1em',
        outline: 'none',
    },
    customerLink: {
        color: '#007bff',
        textDecoration: 'none',
        fontWeight: '500',
    }
};

const CustomersPage = () => {
    const { userRole, userStoreId } = useAuth();
    const { db } = useFirebase();

    const [customers, setCustomers] = useState([]);
    const [stores, setStores] = useState([]); // NOVO: Estado para armazenar as lojas
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [searchTerm, setSearchTerm] = useState('');

    const [newName, setNewName] = useState('');
    const [newPhone, setNewPhone] = useState('');
    const [newCpf, setNewCpf] = useState('');

    const [editingCustomerId, setEditingCustomerId] = useState(null);
    const [editName, setEditName] = useState('');
    const [editPhone, setEditPhone] = useState('');
    const [editCpf, setEditCpf] = useState('');
    const [editStoreId, setEditStoreId] = useState(''); // NOVO: Estado para a loja em edição

    const customersCollectionRef = collection(db, 'customers');
    const storesCollectionRef = collection(db, 'stores'); // NOVO: Referência para a coleção de lojas

    // Efeito para buscar clientes em tempo real
    useEffect(() => {
        const q = query(customersCollectionRef, orderBy('name', 'asc'));
        const unsubscribe = onSnapshot(q, (querySnapshot) => {
            const customersList = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setCustomers(customersList);
            setIsLoading(false);
        }, (err) => {
            console.error("Error fetching customers:", err);
            setError("Falha ao carregar clientes.");
            setIsLoading(false);
        });

        return () => unsubscribe();
    }, [db]);

    // NOVO: Efeito para buscar as lojas uma vez
    useEffect(() => {
        const fetchStores = async () => {
            if (!db) return;
            try {
                const storesSnapshot = await getDocs(storesCollectionRef);
                const storesList = storesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                setStores(storesList);
            } catch (err) {
                console.error("Error fetching stores:", err);
                setError(prev => prev + " Falha ao carregar a lista de lojas.");
            }
        };
        fetchStores();
    }, [db, storesCollectionRef]);

    const handleAddCustomer = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        if (!newName.trim() || !newPhone.trim()) {
            setError("Nome e Celular são obrigatórios.");
            return;
        }

        try {
            await addDoc(customersCollectionRef, {
                name: newName.trim(),
                name_lowercase: newName.trim().toLowerCase(),
                phone: newPhone.trim(),
                cpf: newCpf.trim(),
                createdAt: new Date(),
                registeredAtStore: userStoreId,
            });
            setSuccess("Cliente cadastrado com sucesso!");
            setNewName('');
            setNewPhone('');
            setNewCpf('');
        } catch (err) {
            console.error("Error adding customer:", err);
            setError(`Falha ao cadastrar cliente: ${err.message}`);
        }
    };

    const handleEditClick = (customer) => {
        setEditingCustomerId(customer.id);
        setEditName(customer.name);
        setEditPhone(customer.phone);
        setEditCpf(customer.cpf || '');
        setEditStoreId(customer.registeredAtStore || ''); // NOVO: Define a loja atual para edição
    };

    const handleCancelEdit = () => {
        setEditingCustomerId(null);
    };

    const handleUpdateCustomer = async (customerId) => {
        if (!editName.trim() || !editPhone.trim()) {
            setError("Nome e Celular são obrigatórios.");
            return;
        }
        try {
            const customerDocRef = doc(db, 'customers', customerId);
            // ATUALIZADO: Adiciona o campo registeredAtStore na atualização
            await updateDoc(customerDocRef, {
                name: editName.trim(),
                name_lowercase: editName.trim().toLowerCase(),
                phone: editPhone.trim(),
                cpf: editCpf.trim(),
                registeredAtStore: editStoreId,
            });
            setSuccess("Cliente atualizado com sucesso!");
            setEditingCustomerId(null);
        } catch (err) {
            console.error("Error updating customer:", err);
            setError(`Falha ao atualizar cliente: ${err.message}`);
        }
    };

    const handleDeleteCustomer = async (customerId) => {
        if (window.confirm("Tem certeza que deseja excluir este cliente? O histórico de compras dele será mantido, mas não será mais possível associar novas compras a ele.")) {
            try {
                await deleteDoc(doc(db, 'customers', customerId));
                setSuccess("Cliente excluído com sucesso.");
            } catch (err) {
                console.error("Error deleting customer:", err);
                setError(`Falha ao excluir cliente: ${err.message}`);
            }
        }
    };

    const filteredCustomers = useMemo(() => {
        if (!searchTerm) {
            return customers;
        }
        const lowerCaseSearchTerm = searchTerm.toLowerCase();
        return customers.filter(customer =>
            (customer.name && customer.name.toLowerCase().includes(lowerCaseSearchTerm)) ||
            (customer.cpf && customer.cpf.includes(lowerCaseSearchTerm))
        );
    }, [customers, searchTerm]);

    if (isLoading) {
        return <div style={styles.loadingContainer}>Carregando...</div>;
    }

    return (
        <div style={styles.container}>
            <h1 style={styles.header}>Gestão de Clientes</h1>

            {error && <div style={styles.messageError}>{error}</div>}
            {success && <div style={styles.messageSuccess}>{success}</div>}

            {userRole === 'admin' || userRole === 'manager' ? (
                <div style={styles.section}>
                    <h2 style={styles.sectionTitle}><PlusCircle /> Cadastrar Novo Cliente</h2>
                    <form onSubmit={handleAddCustomer} style={styles.form}>
                        <div style={styles.inputGroup}>
                            <label style={styles.label} htmlFor="name">Nome Completo</label>
                            <input id="name" type="text" value={newName} onChange={(e) => setNewName(e.target.value)} style={styles.input} placeholder="Nome do Cliente" />
                        </div>
                        <div style={styles.inputGroup}>
                            <label style={styles.label} htmlFor="phone">Celular</label>
                            <input id="phone" type="tel" value={newPhone} onChange={(e) => setNewPhone(e.target.value)} style={styles.input} placeholder="(11) 99999-9999" />
                        </div>
                        <div style={styles.inputGroup}>
                            <label style={styles.label} htmlFor="cpf">CPF (Opcional)</label>
                            <input id="cpf" type="text" value={newCpf} onChange={(e) => setNewCpf(e.target.value)} style={styles.input} placeholder="000.000.000-00" />
                        </div>
                        <button type="submit" style={styles.button}>Cadastrar Cliente</button>
                    </form>
                </div>
            ) : null}

            <div style={styles.section}>
                <h2 style={styles.sectionTitle}><Users /> Clientes Cadastrados</h2>
                
                <div style={styles.searchContainer}>
                    <Search color="#777" />
                    <input
                        type="text"
                        placeholder="Buscar cliente por nome ou CPF..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        style={styles.searchInput}
                    />
                </div>

                <table style={styles.customerTable}>
                    <thead>
                        <tr>
                            <th style={styles.tableHeader}>Nome</th>
                            <th style={styles.tableHeader}>Celular</th>
                            <th style={styles.tableHeader}>CPF</th>
                            {/* NOVO: Cabeçalho da coluna da loja */}
                            <th style={styles.tableHeader}>Loja de Cadastro</th>
                            <th style={styles.tableHeader}>Ações</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredCustomers.map(customer => (
                            <tr key={customer.id} style={styles.tableRow}>
                                {editingCustomerId === customer.id ? (
                                    <>
                                        <td style={styles.tableCell}><input type="text" value={editName} onChange={(e) => setEditName(e.target.value)} style={styles.input} /></td>
                                        <td style={styles.tableCell}><input type="tel" value={editPhone} onChange={(e) => setEditPhone(e.target.value)} style={styles.input} /></td>
                                        <td style={styles.tableCell}><input type="text" value={editCpf} onChange={(e) => setEditCpf(e.target.value)} style={styles.input} /></td>
                                        {/* NOVO: Select para editar a loja */}
                                        <td style={styles.tableCell}>
                                            <select value={editStoreId} onChange={(e) => setEditStoreId(e.target.value)} style={styles.select}>
                                                <option value="">Selecione a Loja</option>
                                                {stores.map(store => (
                                                    <option key={store.id} value={store.id}>{store.name}</option>
                                                ))}
                                            </select>
                                        </td>
                                        <td style={styles.tableCell}>
                                            <button onClick={() => handleUpdateCustomer(customer.id)} style={{...styles.actionButton, color: '#28a745'}} title="Salvar"><Save size={20} /></button>
                                            <button onClick={handleCancelEdit} style={{...styles.actionButton, color: '#6c757d'}} title="Cancelar"><XCircle size={20} /></button>
                                        </td>
                                    </>
                                ) : (
                                    <>
                                        <td style={styles.tableCell}>
                                            <Link to={`/customers/${customer.id}`} style={styles.customerLink}>
                                                {customer.name}
                                            </Link>
                                        </td>
                                        <td style={styles.tableCell}>{customer.phone}</td>
                                        <td style={styles.tableCell}>{customer.cpf || 'N/A'}</td>
                                        {/* NOVO: Célula para exibir o nome da loja */}
                                        <td style={styles.tableCell}>
                                            {stores.find(s => s.id === customer.registeredAtStore)?.name || 'N/A'}
                                        </td>
                                        <td style={styles.tableCell}>
                                            <button onClick={() => handleEditClick(customer)} style={{...styles.actionButton, color: '#007bff'}} title="Editar"><Edit size={18} /></button>
                                            <button onClick={() => handleDeleteCustomer(customer.id)} style={{...styles.actionButton, color: '#dc3545'}} title="Excluir"><Trash2 size={18} /></button>
                                        </td>
                                    </>
                                )}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default CustomersPage;
