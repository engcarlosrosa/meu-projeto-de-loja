// src/pages/PaymentSettingsPage.js
import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../components/AuthProvider';
import { useFirebase } from '../contexts/FirebaseContext';
import { doc, getDoc, setDoc, collection, getDocs } from 'firebase/firestore';
import { Save, Store } from 'lucide-react';

const styles = {
    container: {
        padding: '20px',
        maxWidth: '900px',
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
    },
    paymentMethodContainer: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
        gap: '20px',
    },
    paymentMethodCard: {
        border: '1px solid #e0e0e0',
        borderRadius: '8px',
        padding: '20px',
        backgroundColor: '#fdfdfd',
    },
    cardTitle: {
        fontWeight: '600',
        fontSize: '1.2em',
        color: '#333',
        marginBottom: '15px',
    },
    inputGroup: {
        marginBottom: '15px',
    },
    label: {
        display: 'block',
        marginBottom: '8px',
        fontWeight: '600',
        color: '#555',
    },
    input: {
        width: '100%',
        padding: '10px',
        border: '1px solid #ddd',
        borderRadius: '6px',
        fontSize: '1em',
        boxSizing: 'border-box',
    },
    select: {
        width: '100%',
        padding: '10px',
        border: '1px solid #ddd',
        borderRadius: '6px',
        backgroundColor: '#fff',
        boxSizing: 'border-box',
    },
    saveButton: {
        backgroundColor: '#28a745',
        color: 'white',
        padding: '12px 25px',
        border: 'none',
        borderRadius: '8px',
        cursor: 'pointer',
        fontSize: '1.1em',
        fontWeight: 'bold',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '10px',
        marginTop: '20px',
        width: '100%',
        transition: 'background-color 0.3s ease',
    },
    message: {
        padding: '12px',
        borderRadius: '8px',
        marginBottom: '20px',
        textAlign: 'center',
    },
    messageError: {
        backgroundColor: '#f8d7da',
        color: '#721c24',
        border: '1px solid #f5c6cb',
    },
    messageSuccess: {
        backgroundColor: '#d4edda',
        color: '#155724',
        border: '1px solid #c3e6cb',
    },
};

// CORREÇÃO: Lista de métodos de pagamento completa, com uma 'key' para o estado
// e um 'value' que corresponde exatamente ao valor usado em SalesPage.js
const PAYMENT_METHODS = [
    { key: 'dinheiro', value: 'Dinheiro', label: 'Dinheiro' },
    { key: 'pix', value: 'PIX', label: 'PIX' },
    { key: 'cartao_debito', value: 'Cartao de Debito', label: 'Cartão de Débito' },
    { key: 'cartao_credito_a_vista', value: 'Cartao de Credito a Vista', label: 'Crédito à Vista' },
    { key: 'cartao_credito_parcelado_2x', value: 'Cartao de Credito Parcelado 2x', label: 'Crédito 2x' },
    { key: 'cartao_credito_parcelado_3x', value: 'Cartao de Credito Parcelado 3x', label: 'Crédito 3x' },
    { key: 'cartao_credito_parcelado_4x', value: 'Cartao de Credito Parcelado 4x', label: 'Crédito 4x' },
    { key: 'cartao_credito_parcelado_5x', value: 'Cartao de Credito Parcelado 5x', label: 'Crédito 5x' },
    { key: 'cartao_credito_parcelado_6x', value: 'Cartao de Credito Parcelado 6x', label: 'Crédito 6x' },
];


const PaymentSettingsPage = () => {
    const { userRole } = useAuth();
    const { db, appId } = useFirebase();
    
    const [allStores, setAllStores] = useState([]);
    const [selectedStoreId, setSelectedStoreId] = useState('');

    const [bankAccounts, setBankAccounts] = useState([]);
    const [settings, setSettings] = useState({});
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const settingsDocRef = useMemo(() => {
        if (!db || !appId || !selectedStoreId) return null;
        return doc(db, `artifacts/${appId}/stores/${selectedStoreId}/settings/paymentConfig`);
    }, [db, appId, selectedStoreId]);

    const bankAccountsCollectionRef = useMemo(() => {
        if (!db) return null;
        return collection(db, 'bankAccounts');
    }, [db]);


    useEffect(() => {
        const fetchInitialData = async () => {
            if (!db) return;
            
            setIsLoading(true);
            setError('');
            
            try {
                // Fetch stores
                const storesRef = collection(db, 'stores');
                const storesSnapshot = await getDocs(storesRef);
                const storesList = storesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                setAllStores(storesList);

                // Fetch all bank accounts
                if(bankAccountsCollectionRef) {
                    const accountsSnapshot = await getDocs(bankAccountsCollectionRef);
                    const accountsList = accountsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                    setBankAccounts(accountsList);
                }
                
            } catch (err) {
                 console.error("Error fetching initial data:", err);
                 setError("Falha ao carregar dados. Verifique as permissões do Firestore.");
            } finally {
                setIsLoading(false);
            }
        };

        fetchInitialData();
    }, [db, bankAccountsCollectionRef]);

    useEffect(() => {
        const fetchSettingsForStore = async () => {
            if (!selectedStoreId || !settingsDocRef) {
                setSettings({});
                return;
            }
            setIsLoading(true);
            try {
                const settingsSnapshot = await getDoc(settingsDocRef);
                const defaultSettings = {};
                PAYMENT_METHODS.forEach(pm => {
                    defaultSettings[pm.key] = { accountId: '', fee: 0 };
                });

                if (settingsSnapshot.exists()) {
                    setSettings({ ...defaultSettings, ...settingsSnapshot.data() });
                } else {
                    setSettings(defaultSettings);
                }
            } catch (err) {
                console.error("Error fetching settings for store:", err);
                setError("Falha ao carregar configurações da loja selecionada.");
            }
            setIsLoading(false);
        };

        fetchSettingsForStore();
    }, [selectedStoreId, settingsDocRef]);
    
    const handleSettingChange = (methodKey, field, value) => {
        setSettings(prev => ({
            ...prev,
            [methodKey]: {
                ...prev[methodKey],
                [field]: field === 'fee' ? parseFloat(value) || 0 : value,
            }
        }));
    };

    const handleSaveSettings = async () => {
        if (!settingsDocRef) {
            setError("Selecione uma loja antes de salvar.");
            return;
        }
        setError('');
        setSuccess('');
        try {
            await setDoc(settingsDocRef, settings, { merge: true });
            setSuccess(`Configurações para a loja selecionada salvas com sucesso!`);
        } catch (err) {
            console.error("Error saving settings:", err);
            setError(`Falha ao salvar configurações: ${err.message}`);
        }
    };

    if (userRole !== 'admin' && userRole !== 'finance') {
        return (
            <div style={styles.container}>
                <h2 style={{...styles.header, color: '#dc3545'}}>Acesso Negado</h2>
                <p style={{textAlign: 'center'}}>Você não tem permissão para visualizar esta página.</p>
            </div>
        );
    }

    return (
        <div style={styles.container}>
            <h1 style={styles.header}>Configurações de Pagamento por Loja</h1>
            
            {error && <div style={{...styles.message, ...styles.messageError}}>{error}</div>}
            {success && <div style={{...styles.message, ...styles.messageSuccess}}>{success}</div>}

            <div style={styles.section}>
                <div style={styles.inputGroup}>
                    <label style={styles.label}>Selecione a Loja para Configurar:</label>
                    <div style={{display: 'flex', alignItems: 'center', gap: '10px'}}>
                        <Store />
                        <select 
                            style={styles.select}
                            value={selectedStoreId}
                            onChange={(e) => setSelectedStoreId(e.target.value)}
                        >
                            <option value="">-- Selecione uma loja --</option>
                            {allStores.map(store => (
                                <option key={store.id} value={store.id}>{store.name}</option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            {selectedStoreId && (
                <div style={styles.section}>
                    <h2 style={styles.sectionTitle}>Direcionamento e Taxas para: {allStores.find(s => s.id === selectedStoreId)?.name}</h2>
                    {isLoading ? <p>Carregando configurações...</p> : (
                        <>
                            <div style={styles.paymentMethodContainer}>
                                {PAYMENT_METHODS.map(method => (
                                    <div key={method.key} style={styles.paymentMethodCard}>
                                        <h3 style={styles.cardTitle}>{method.label}</h3>
                                        <div style={styles.inputGroup}>
                                            <label style={styles.label}>Conta de Destino:</label>
                                            <select 
                                                style={styles.select}
                                                value={settings[method.key]?.accountId || ''}
                                                onChange={(e) => handleSettingChange(method.key, 'accountId', e.target.value)}
                                            >
                                                <option value="">Nenhuma (Vai para o Caixa)</option>
                                                {bankAccounts.map(acc => (
                                                    <option key={acc.id} value={acc.id}>{acc.name}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div style={styles.inputGroup}>
                                            <label style={styles.label}>Taxa de Administração (%):</label>
                                            <input 
                                                type="number" 
                                                style={styles.input}
                                                placeholder="Ex: 1.99"
                                                step="0.01"
                                                value={settings[method.key]?.fee || ''}
                                                onChange={(e) => handleSettingChange(method.key, 'fee', e.target.value)}
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <button onClick={handleSaveSettings} style={styles.saveButton}>
                                <Save size={20} /> Salvar Configurações
                            </button>
                        </>
                    )}
                </div>
            )}
        </div>
    );
};

export default PaymentSettingsPage;
