// src/pages/SalesPage.js
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../components/AuthProvider';
import { useFirebase } from '../contexts/FirebaseContext';
import { collection, doc, updateDoc, query, where, onSnapshot, runTransaction, getDoc, serverTimestamp, orderBy, limit, addDoc, getDocs } from 'firebase/firestore';
import { Search, ShoppingCart, DollarSign, XCircle, Trash2, CheckCircle, PlusCircle, MinusCircle, History, RefreshCcw, UserCheck, UserSearch, UserX, UserPlus, List, Grid, Store, BadgePercent } from 'lucide-react';

// Componente para o Modal de Cadastro Rápido de Cliente
const QuickAddCustomerModal = ({ isOpen, onClose, onCustomerAdded, userStoreId }) => {
    const { db } = useFirebase();
    const [newName, setNewName] = useState('');
    const [newPhone, setNewPhone] = useState('');
    const [newCpf, setNewCpf] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const customersCollectionRef = useMemo(() => collection(db, 'customers'), [db]);

    const handleAddCustomer = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        if (!newName.trim() || !newPhone.trim()) {
            setError("Nome e Celular são obrigatórios.");
            return;
        }

        setIsSubmitting(true);

        try {
            const newCustomerData = {
                name: newName.trim(),
                name_lowercase: newName.trim().toLowerCase(),
                phone: newPhone.trim(),
                cpf: newCpf.trim(),
                createdAt: serverTimestamp(),
                registeredAtStore: userStoreId,
            };

            const docRef = await addDoc(customersCollectionRef, newCustomerData);
            
            setSuccess("Cliente cadastrado com sucesso!");
            
            onCustomerAdded({ id: docRef.id, ...newCustomerData });

            setTimeout(() => {
                setNewName('');
                setNewPhone('');
                setNewCpf('');
                onClose();
            }, 1000);

        } catch (err) {
            console.error("Error adding customer:", err);
            setError(`Falha ao cadastrar cliente: ${err.message}`);
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div style={styles.modalOverlay}>
            <div style={{...styles.modalContent, maxWidth: '500px'}}>
                <button onClick={onClose} style={styles.modalCloseButton} disabled={isSubmitting}><XCircle size={24} /></button>
                <h2 style={styles.modalTitle}>Cadastro Rápido de Cliente</h2>
                
                {error && <p style={{...styles.messageError, gridColumn: '1 / -1'}}>{error}</p>}
                {success && <p style={{...styles.messageSuccess, gridColumn: '1 / -1'}}>{success}</p>}

                <form onSubmit={handleAddCustomer}>
                    <div style={styles.inputGroup}>
                        <label style={styles.label} htmlFor="quick-name">Nome Completo</label>
                        <input id="quick-name" type="text" value={newName} onChange={(e) => setNewName(e.target.value)} style={styles.input} placeholder="Nome do Cliente" required />
                    </div>
                    <div style={styles.inputGroup}>
                        <label style={styles.label} htmlFor="quick-phone">Celular</label>
                        <input id="quick-phone" type="tel" value={newPhone} onChange={(e) => setNewPhone(e.target.value)} style={styles.input} placeholder="(11) 99999-9999" required />
                    </div>
                    <div style={styles.inputGroup}>
                        <label style={styles.label} htmlFor="quick-cpf">CPF (Opcional)</label>
                        <input id="quick-cpf" type="text" value={newCpf} onChange={(e) => setNewCpf(e.target.value)} style={styles.input} placeholder="000.000.000-00" />
                    </div>
                    <div style={styles.modalActions}>
                        <button type="submit" style={styles.modalAddButton} disabled={isSubmitting}>
                            {isSubmitting ? 'Salvando...' : 'Salvar Cliente'}
                        </button>
                        <button type="button" onClick={onClose} style={styles.modalCancelButton} disabled={isSubmitting}>
                            Cancelar
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

// NOVO: Componente para o Modal de Desconto
const DiscountModal = ({ isOpen, onClose, userRole, onApplyDiscount, onRequestDiscount, subtotal, requestStatus }) => {
    const [type, setType] = useState('%');
    const [value, setValue] = useState('');
    const [modalError, setModalError] = useState('');

    useEffect(() => {
        if (isOpen) {
            setType('%');
            setValue('');
            setModalError('');
        }
    }, [isOpen]);
    
    const validateDiscount = () => {
        const numericValue = parseFloat(value);
        if (isNaN(numericValue) || numericValue <= 0) {
            setModalError('Por favor, insira um valor de desconto válido.');
            return false;
        }
        if (type === '%' && (numericValue > 100)) {
            setModalError('O desconto percentual não pode ser maior que 100%.');
            return false;
        }
        if (type === 'R$' && (numericValue > subtotal)) {
            setModalError('O desconto em R$ não pode ser maior que o subtotal da venda.');
            return false;
        }
        setModalError('');
        return true;
    };

    const handleApply = () => {
        if(validateDiscount()) {
            onApplyDiscount({ type, value: parseFloat(value) });
        }
    };
    
    const handleRequest = () => {
        if(validateDiscount()) {
            onRequestDiscount({ type, value: parseFloat(value) });
        }
    };

    if (!isOpen) return null;

    return (
        <div style={styles.modalOverlay}>
            <div style={{...styles.modalContent, maxWidth: '450px'}}>
                <button onClick={onClose} style={styles.modalCloseButton} disabled={requestStatus === 'pending'}><XCircle size={24} /></button>
                <h2 style={styles.modalTitle}>Aplicar Desconto na Venda</h2>

                {requestStatus === 'pending' ? (
                    <div style={{textAlign: 'center', padding: '20px'}}>
                        <div style={styles.spinner}></div>
                        <p>Aguardando aprovação do administrador...</p>
                    </div>
                ) : (
                    <>
                        <p style={{textAlign: 'center', marginTop: '-20px', marginBottom: '20px', color: '#666'}}>Subtotal: R$ {subtotal.toFixed(2).replace('.', ',')}</p>
                        
                        <div style={{display: 'flex', gap: '10px'}}>
                            <div style={{...styles.inputGroup, flex: 1}}>
                                <label style={styles.label}>Tipo</label>
                                <select value={type} onChange={(e) => setType(e.target.value)} style={styles.select}>
                                    <option value="%">Percentual (%)</option>
                                    <option value="R$">Valor Fixo (R$)</option>
                                </select>
                            </div>
                            <div style={{...styles.inputGroup, flex: 2}}>
                                <label style={styles.label}>Valor</label>
                                <input type="number" value={value} onChange={(e) => setValue(e.target.value)} style={styles.input} placeholder="Ex: 10 ou 25,50" />
                            </div>
                        </div>

                        {modalError && <p style={styles.modalErrorMessage}>{modalError}</p>}

                        <div style={styles.modalActions}>
                            {userRole === 'admin' ? (
                                <button onClick={handleApply} style={styles.modalAddButton}>Aplicar Desconto</button>
                            ) : (
                                <button onClick={handleRequest} style={{...styles.modalAddButton, backgroundColor: '#ffc107', color: '#333'}}>Solicitar Aprovação</button>
                            )}
                            <button onClick={onClose} style={styles.modalCancelButton}>Cancelar</button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};


// Estilos para a página de Vendas
const styles = {
// ... Estilos existentes ... (Omitido por brevidade, mas está presente no código final)
    container: {
        padding: '20px',
        maxWidth: '1200px',
        margin: '20px auto',
        backgroundColor: '#fff',
        borderRadius: '8px',
        boxShadow: '0 2px 10px rgba(0, 0, 0, 0.1)',
        fontFamily: "'Inter', sans-serif",
        display: 'grid',
        gridTemplateColumns: '2fr 1fr',
        gap: '30px',
        minHeight: '80vh',
        position: 'relative',
    },
    header: {
        gridColumn: '1 / -1',
        color: '#34495e',
        textAlign: 'center',
        marginBottom: '10px', // Reduzido
        fontSize: '2.5em',
        fontWeight: '700',
    },
    storeSelectorSection: { // NOVO
        gridColumn: '1 / -1',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        gap: '10px',
        marginBottom: '20px',
        padding: '10px',
        backgroundColor: '#f0f4f7',
        borderRadius: '8px',
    },
    productsSection: {
        paddingRight: '20px',
        borderRight: '1px solid #eee',
        display: 'flex',
        flexDirection: 'column',
    },
    productsHeader: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '10px',
    },
    viewToggleButtons: {
        display: 'flex',
        gap: '5px',
    },
    toggleButton: {
        background: 'none',
        border: '1px solid #ccc',
        borderRadius: '4px',
        padding: '5px',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
    },
    toggleButtonActive: {
        backgroundColor: '#007bff',
        color: 'white',
        borderColor: '#007bff',
    },
    cartSection: {
        paddingLeft: '20px',
        display: 'flex',
        flexDirection: 'column',
    },
    searchContainer: {
        marginBottom: '20px',
        display: 'flex',
        gap: '10px',
        alignItems: 'center',
    },
    searchInput: {
        flexGrow: 1,
        padding: '12px',
        border: '1px solid #ccc',
        borderRadius: '4px',
        fontSize: '1em',
    },
    productListGrid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
        gap: '20px',
        flexGrow: 1,
        overflowY: 'auto',
        paddingRight: '10px',
    },
    productListTable: {
        width: '100%',
        borderCollapse: 'collapse',
        flexGrow: 1,
    },
    productListContainer: {
        flexGrow: 1,
        overflowY: 'auto',
        maxHeight: '65vh',
    },
    tableHeader: {
        position: 'sticky',
        top: 0,
        backgroundColor: '#f8f9fa',
        zIndex: 1,
        textAlign: 'left',
        padding: '10px',
        borderBottom: '2px solid #dee2e6',
        fontSize: '0.9em',
    },
    tableRow: {
        '&:hover': {
            backgroundColor: '#f1f3f5',
        },
    },
    tableCell: {
        padding: '10px',
        borderBottom: '1px solid #e9ecef',
        verticalAlign: 'middle',
    },
    productCard: {
        border: '1px solid #e0e0e0',
        borderRadius: '8px',
        padding: '15px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        textAlign: 'center',
        boxShadow: '0 2px 5px rgba(0,0,0,0.05)',
        transition: 'transform 0.2s ease, box-shadow 0.2s ease',
        cursor: 'pointer',
    },
    productCardHover: {
        transform: 'translateY(-5px)',
        boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
    },
    productName: {
        fontWeight: '600',
        color: '#34495e',
        marginBottom: '5px',
    },
    productCode: {
        fontSize: '0.8em',
        color: '#777',
        marginBottom: '10px',
    },
    productPrice: {
        fontSize: '1.2em',
        fontWeight: 'bold',
        color: '#28a745',
        marginBottom: '10px',
    },
    selectVariationButton: {
        backgroundColor: '#007bff',
        color: 'white',
        border: 'none',
        borderRadius: '4px',
        padding: '8px 15px',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: '5px',
        transition: 'background-color 0.3s ease',
        fontSize: '0.9em',
    },
    cartItem: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '10px 0',
        borderBottom: '1px dashed #eee',
    },
    cartItemDetails: {
        flexGrow: 1,
    },
    cartItemName: {
        fontWeight: 'bold',
    },
    cartItemPrice: {
        fontSize: '0.9em',
        color: '#555',
    },
    quantityControls: {
        display: 'flex',
        alignItems: 'center',
        gap: '5px',
    },
    quantityButton: {
        background: 'none',
        border: '1px solid #ccc',
        borderRadius: '4px',
        padding: '5px 8px',
        cursor: 'pointer',
        fontSize: '0.9em',
    },
    removeButton: {
        backgroundColor: '#dc3545',
        color: 'white',
        border: 'none',
        borderRadius: '4px',
        padding: '5px 8px',
        cursor: 'pointer',
        marginLeft: '10px',
    },
    cartTotalSection: { // NOVO
        marginTop: 'auto',
        textAlign: 'right',
        fontSize: '1.1em',
        color: '#34495e',
    },
    cartTotalRow: { // NOVO
        display: 'flex',
        justifyContent: 'space-between',
        padding: '5px 0',
    },
    cartFinalTotal: { // NOVO
        fontSize: '1.5em',
        fontWeight: 'bold',
        marginTop: '10px',
        borderTop: '2px solid #34495e',
        paddingTop: '10px',
    },
    discountLink: { // NOVO
        color: '#007bff',
        textDecoration: 'underline',
        cursor: 'pointer',
        fontSize: '0.9em',
        background: 'none',
        border: 'none',
        padding: 0,
        textAlign: 'right',
        width: '100%',
        marginBottom: '10px',
    },
    checkoutButton: {
        backgroundColor: '#28a745',
        color: 'white',
        border: 'none',
        borderRadius: '8px',
        padding: '15px 25px',
        fontSize: '1.2em',
        fontWeight: 'bold',
        cursor: 'pointer',
        marginTop: '20px',
        width: '100%',
        transition: 'background-color 0.3s ease',
    },
    emptyCartMessage: {
        textAlign: 'center',
        color: '#888',
        marginTop: '20px',
    },
    noProductsMessage: {
        textAlign: 'center',
        color: '#888',
        marginTop: '20px',
        gridColumn: '1 / -1',
        padding: '20px',
    },
    messageError: {
        backgroundColor: '#f8d7da',
        color: '#721c24',
        padding: '10px',
        borderRadius: '4px',
        marginBottom: '20px',
        textAlign: 'center',
        border: '1px solid #f5c6cb',
        gridColumn: '1 / -1',
    },
    messageSuccess: {
        backgroundColor: '#d4edda',
        color: '#155724',
        padding: '10px',
        borderRadius: '4px',
        marginBottom: '20px',
        textAlign: 'center',
        border: '1px solid #c3e6cb',
        gridColumn: '1 / -1',
    },
    loadingContainer: {
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '200px',
        color: '#34495e',
        gridColumn: '1 / -1',
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
    modalOverlay: {
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1000,
    },
    modalContent: {
        backgroundColor: 'white',
        padding: '30px',
        borderRadius: '10px',
        boxShadow: '0 5px 15px rgba(0, 0, 0, 0.3)',
        width: '80%',
        maxWidth: '900px',
        textAlign: 'center',
        position: 'relative',
        maxHeight: '90vh',
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
    },
    modalCloseButton: {
        position: 'absolute',
        top: '10px',
        right: '10px',
        backgroundColor: 'transparent',
        border: 'none',
        fontSize: '1.5em',
        cursor: 'pointer',
        color: '#555',
    },
    modalTitle: {
        fontSize: '1.8em',
        marginBottom: '25px',
        color: '#333',
    },
    modalErrorMessage: {
        color: '#dc3545',
        marginTop: '15px',
        marginBottom: '10px',
        fontSize: '0.9em',
    },
    modalActions: {
        display: 'flex',
        justifyContent: 'flex-end',
        gap: '10px',
        marginTop: '20px',
        flexShrink: 0,
        paddingTop: '10px',
        borderTop: '1px solid #eee',
    },
    modalAddButton: {
        backgroundColor: '#28a745',
        color: 'white',
        padding: '10px 20px',
        border: 'none',
        borderRadius: '5px',
        cursor: 'pointer',
        fontSize: '1em',
        transition: 'background-color 0.3s ease',
    },
    modalCancelButton: {
        backgroundColor: '#6c757d',
        color: 'white',
        padding: '10px 20px',
        border: 'none',
        borderRadius: '5px',
        cursor: 'pointer',
        transition: 'background-color 0.3s ease',
    },
    inputGroup: {
        marginBottom: '15px',
        textAlign: 'left',
    },
    label: {
        display: 'block',
        marginBottom: '5px',
        fontWeight: 'bold',
        color: '#555',
    },
    select: {
        width: '100%',
        padding: '10px',
        border: '1px solid #ccc',
        borderRadius: '5px',
        fontSize: '1em',
        backgroundColor: '#fff',
    },
    input: {
        width: 'calc(100% - 22px)',
        padding: '10px',
        border: '1px solid #ccc',
        borderRadius: '5px',
        fontSize: '1em',
    },
    paymentSection: {
        border: '1px solid #bde0fe',
        borderRadius: '8px',
        padding: '15px',
        backgroundColor: '#f0f8ff',
        marginTop: '20px',
    },
    paymentSectionTitle: {
        fontSize: '1.2em',
        fontWeight: '600',
        color: '#034078',
        marginBottom: '15px',
    },
    paymentAddContainer: {
        display: 'flex',
        gap: '10px',
        marginBottom: '15px',
        alignItems: 'center',
    },
    paymentInput: {
        flex: 1,
        padding: '10px',
        border: '1px solid #ccc',
        borderRadius: '4px',
        boxSizing: 'border-box',
    },
    paymentSelect: {
        flex: 2,
        padding: '10px',
        border: '1px solid #ccc',
        borderRadius: '4px',
        boxSizing: 'border-box',
    },
    paymentAddButton: {
        padding: '10px 15px',
        backgroundColor: '#007bff',
        color: 'white',
        border: 'none',
        borderRadius: '4px',
        cursor: 'pointer',
    },
    paymentList: {
        listStyle: 'none',
        padding: 0,
        marginBottom: '15px',
    },
    paymentListItem: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '8px',
        backgroundColor: '#e7f3ff',
        borderRadius: '4px',
        marginBottom: '5px',
    },
    paymentListItemRemove: {
        background: 'none',
        border: 'none',
        cursor: 'pointer',
        color: '#dc3545'
    },
    paymentSummary: {
        marginTop: '15px',
        textAlign: 'right',
        fontSize: '1.1em',
    },
    paymentRemaining: {
        fontWeight: 'bold',
        color: '#dc3545',
    },
    paymentPaid: {
        color: '#28a745',
    },
    clientInput: {
        width: '100%',
        padding: '10px',
        border: '1px solid #ccc',
        borderRadius: '5px',
        marginBottom: '15px',
        fontSize: '1em',
        boxSizing: 'border-box',
    },
    cashRegisterClosedOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 999,
        flexDirection: 'column',
        borderRadius: '8px',
    },
    cashRegisterClosedMessage: {
        fontSize: '1.8em',
        fontWeight: 'bold',
        color: '#dc3545',
        textAlign: 'center',
        marginBottom: '20px',
        padding: '15px',
        backgroundColor: '#f8d7da',
        border: '1px solid #f5c6cb',
        borderRadius: '8px',
    },
    cashRegisterClosedInstructions: {
        fontSize: '1.1em',
        color: '#555',
        textAlign: 'center',
        lineHeight: '1.5',
    },
    debugInfo: {
        position: 'absolute',
        top: '10px',
        right: '10px',
        backgroundColor: 'rgba(0,0,0,0.7)',
        color: 'white',
        padding: '5px 10px',
        borderRadius: '5px',
        fontSize: '0.8em',
        zIndex: 1001,
    },
    salesHistorySection: {
        gridColumn: '1 / -1',
        marginTop: '30px',
        padding: '20px',
        backgroundColor: '#f0f4f7',
        borderRadius: '8px',
        boxShadow: '0 1px 5px rgba(0,0,0,0.05)',
    },
    salesHistoryTitle: {
        color: '#34495e',
        marginBottom: '15px',
        textAlign: 'center',
        fontSize: '2em',
    },
    salesHistoryList: {
        listStyle: 'none',
        padding: 0,
    },
    salesHistoryItem: {
        backgroundColor: '#fff',
        padding: '15px',
        marginBottom: '10px',
        borderRadius: '5px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
    },
    exchangeHistoryItem: {
        backgroundColor: '#fff9e6',
        padding: '15px',
        marginBottom: '10px',
        borderRadius: '5px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderLeft: '5px solid #ffc107',
    },
    salesHistoryItemHeader: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        fontWeight: 'bold',
        color: '#333',
        borderBottom: '1px solid #eee',
        paddingBottom: '8px',
        marginBottom: '8px',
    },
    salesHistoryProductsList: {
        listStyle: 'disc',
        marginLeft: '20px',
        fontSize: '0.9em',
        color: '#555',
    },
    salesHistoryProductItem: {
        marginBottom: '5px',
    },
    historyDetailButton: {
        backgroundColor: '#17a2b8',
        color: 'white',
        padding: '8px 12px',
        border: 'none',
        borderRadius: '5px',
        cursor: 'pointer',
        fontSize: '0.85em',
        transition: 'background-color 0.3s ease',
    },
    returnExchangeButton: {
        backgroundColor: '#ffc107',
        color: '#333',
        padding: '8px 12px',
        border: 'none',
        borderRadius: '5px',
        cursor: 'pointer',
        fontSize: '0.85em',
        transition: 'background-color 0.3s ease',
        display: 'flex',
        alignItems: 'center',
        gap: '5px',
    },
    returnedItemInfo: {
        fontSize: '0.85em',
        color: '#dc3545',
        fontStyle: 'italic',
        marginLeft: '10px',
        display: 'inline-block'
    },
    returnExchangeModalActions: {
        display: 'flex',
        justifyContent: 'space-around',
        marginTop: '20px',
    },
    returnExchangeOptionButton: {
        backgroundColor: '#007bff',
        color: 'white',
        padding: '10px 15px',
        borderRadius: '5px',
        border: 'none',
        cursor: 'pointer',
        transition: 'background-color 0.3s ease',
        fontSize: '0.95em',
        display: 'flex',
        alignItems: 'center',
        gap: '5px',
    },
    returnExchangeOptionButtonReturn: {
        backgroundColor: '#dc3545',
    },
    returnExchangeOptionButtonExchange: {
        backgroundColor: '#28a745',
    },
    searchButton: {
        backgroundColor: '#007bff',
        color: 'white',
        border: 'none',
        borderRadius: '4px',
        padding: '12px 15px',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: '5px',
        transition: 'background-color 0.3s ease',
    },
    searchResultsContainer: {
        marginTop: '15px',
        overflowY: 'auto',
        border: '1px solid #ccc',
        borderRadius: '5px',
        padding: '10px',
        backgroundColor: '#fdfdfd',
        flexGrow: 1,
        maxHeight: '40vh',
    },
    searchResultItem: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#e9f7ff',
        padding: '10px',
        borderRadius: '5px',
        marginBottom: '8px',
        border: '1px solid #b3e0ff',
    },
    selectProductButton: {
        backgroundColor: '#007bff',
        color: 'white',
        border: 'none',
        borderRadius: '5px',
        padding: '8px 12px',
        cursor: 'pointer',
        fontSize: '0.9em',
        transition: 'background-color 0.3s ease',
    },
    clearSearchButton: {
        backgroundColor: '#ffc107',
        color: '#333',
        border: 'none',
        borderRadius: '5px',
        padding: '8px 12px',
        cursor: 'pointer',
        fontSize: '0.9em',
        transition: 'background-color 0.3s ease',
        marginTop: '10px',
        width: '100%',
    },
    exchangeCartSection: {
        marginTop: '20px',
        borderTop: '1px solid #eee',
        paddingTop: '20px',
        textAlign: 'left',
        flexGrow: 1,
        overflowY: 'auto',
    },
    exchangeCartTitle: {
        fontSize: '1.4em',
        marginBottom: '10px',
        color: '#34495e',
    },
    exchangeCartItem: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '8px 0',
        borderBottom: '1px dashed #eee',
    },
    exchangeCartTotal: {
        fontSize: '1.2em',
        fontWeight: 'bold',
        marginTop: '10px',
        textAlign: 'right',
        color: '#34495e',
    },
    exchangeDifference: {
        fontSize: '1.3em',
        fontWeight: 'bold',
        marginTop: '10px',
        textAlign: 'right',
        color: '#dc3545',
    },
    sellerSection: {
        marginTop: '15px',
        padding: '15px',
        backgroundColor: '#f8f9fa',
        border: '1px solid #dee2e6',
        borderRadius: '8px',
    },
    customerSection: {
        marginTop: '15px',
        padding: '15px',
        backgroundColor: '#f8f9fa',
        border: '1px solid #dee2e6',
        borderRadius: '8px',
    },
    customerSearchModalList: {
        listStyle: 'none',
        padding: 0,
        maxHeight: '300px',
        overflowY: 'auto',
    },
    customerSearchModalItem: {
        padding: '10px',
        borderBottom: '1px solid #eee',
        cursor: 'pointer',
        textAlign: 'left',
        '&:hover': {
            backgroundColor: '#f0f0f0',
        }
    },
};

// Helper function to map payment method labels to keys used in settings
const getPaymentMethodKey = (paymentMethodValue) => {
    const mapping = {
        'Dinheiro': 'dinheiro',
        'PIX': 'pix',
        'Cartao de Debito': 'cartao_debito',
        'Cartao de Credito a Vista': 'cartao_credito_a_vista',
        'Cartao de Credito Parcelado 2x': 'cartao_credito_parcelado_2x',
        'Cartao de Credito Parcelado 3x': 'cartao_credito_parcelado_3x',
        'Cartao de Credito Parcelado 4x': 'cartao_credito_parcelado_4x',
        'Cartao de Credito Parcelado 5x': 'cartao_credito_parcelado_5x',
        'Cartao de Credito Parcelado 6x': 'cartao_credito_parcelado_6x',
    };
    return mapping[paymentMethodValue];
};

const UNIDENTIFIED_CUSTOMER = { id: 'unidentified', name: 'Cliente não identificado' };

function SalesPage() {
    // ALTERAÇÃO: Renomeado userStoreId/Name para defaultStoreId/Name para clareza
    const { currentUser, userRole, userStoreId: defaultStoreId, userStoreName: defaultStoreName, loading: authLoading } = useAuth();
    const { db, appId, firebaseLoading } = useFirebase();
    
    // NOVO: Estados para gerir a seleção de lojas pelo admin
    const [allStores, setAllStores] = useState([]);
    const [activeStoreId, setActiveStoreId] = useState(defaultStoreId);
    const [activeStoreName, setActiveStoreName] = useState(defaultStoreName);


    // REFACTOR: 'products' agora é o catálogo. 'inventory' é o estoque. 'productsForSale' é a junção dos dois.
    const [products, setProducts] = useState([]); // Catálogo global
    const [inventory, setInventory] = useState([]); // Estoque da loja ativa
    const [productsForSale, setProductsForSale] = useState([]); // Catálogo + Estoque

    const [searchTerm, setSearchTerm] = useState('');
    const [cart, setCart] = useState([]);
    const [error, setError] = useState(null);
    const [successMessage, setSuccessMessage] = useState(null);
    const [dataLoading, setDataLoading] = useState(true);

    const [viewMode, setViewMode] = useState(() => localStorage.getItem('salesViewMode') || 'list'); 
    
    const [showVariationModal, setShowVariationModal] = useState(false);
    const [selectedProductForVariation, setSelectedProductForVariation] = useState(null);
    const [selectedVariation, setSelectedVariation] = useState({ color: '', size: '', quantity: 1 });

    const [paymentMethods, setPaymentMethods] = useState([]);
    const [currentPaymentMethod, setCurrentPaymentMethod] = useState('');
    const [currentPaymentAmount, setCurrentPaymentAmount] = useState('');

    const [isProcessingSale, setIsProcessingSale] = useState(false);

    const [cashRegisterStatus, setCashRegisterStatus] = useState('closed');
    const [currentCashRegisterSessionId, setCurrentCashRegisterSessionId] = useState(null);

    const [salesHistory, setSalesHistory] = useState([]);
    const [showSaleDetailModal, setShowSaleDetailModal] = useState(false);
    const [selectedSaleDetail, setSelectedSaleDetail] = useState(null);

    const [isReturnExchangeModalOpen, setIsReturnExchangeModalOpen] = useState(false);
    const [saleItemForReturnExchange, setSaleItemForReturnExchange] = useState(null);
    const [returnQuantity, setReturnQuantity] = useState(1);
    const [returnReason, setReturnReason] = useState('');
    const [isExchangeFlow, setIsExchangeFlow] = useState(false);
    const [exchangeCart, setExchangeCart] = useState([]);
    const [exchangeSearchTerm, setExchangeSearchTerm] = useState('');
    const [exchangeSearchResults, setExchangeSearchResults] = useState([]);
    const [showingExchangeVariationSelection, setShowingExchangeVariationSelection] = useState(false);
    const [exchangePayments, setExchangePayments] = useState([]);
    const [currentExchangePaymentMethod, setCurrentExchangePaymentMethod] = useState('');
    const [currentExchangePaymentAmount, setCurrentExchangePaymentAmount] = useState('');
    const [quantityAlreadyReturned, setQuantityAlreadyReturned] = useState(0);

    const [paymentConfig, setPaymentConfig] = useState(null);

    const [employees, setEmployees] = useState([]);
    const [selectedSellerId, setSelectedSellerId] = useState('');
    
    const [showCustomerSearchModal, setShowCustomerSearchModal] = useState(false);
    const [customerSearchTerm, setCustomerSearchTerm] = useState('');
    const [customerSearchResults, setCustomerSearchResults] = useState([]);
    const [selectedCustomer, setSelectedCustomer] = useState(UNIDENTIFIED_CUSTOMER);
    const [isQuickAddModalOpen, setIsQuickAddModalOpen] = useState(false);
    
    // NOVO: Estados para o fluxo de desconto
    const [isDiscountModalOpen, setIsDiscountModalOpen] = useState(false);
    const [discount, setDiscount] = useState({ type: '%', value: 0 });
    const [discountRequestId, setDiscountRequestId] = useState(null);
    const [discountRequestStatus, setDiscountRequestStatus] = useState(null); // 'pending', 'approved', 'rejected'

    const productsCollectionRef = useMemo(() => collection(db, 'products'), [db]);
    // REFACTOR: Adicionada referência para a nova coleção de inventário
    const inventoryCollectionRef = useMemo(() => collection(db, 'inventory'), [db]);
    const salesCollectionRef = useMemo(() => {
        return db && appId && activeStoreId ? collection(db, `artifacts/${appId}/stores/${activeStoreId}/sales`) : null;
    }, [db, appId, activeStoreId]);
    const usersCollectionRef = useMemo(() => collection(db, 'users'), [db]);
    const customersCollectionRef = useMemo(() => collection(db, 'customers'), [db]);
    const discountRequestsCollectionRef = useMemo(() => collection(db, 'discount_requests'), [db]);

    const formatCurrency = (value) => {
        const numericValue = parseFloat(value);
        if (isNaN(numericValue)) {
            return '0,00';
        }
        return numericValue.toFixed(2).replace('.', ',');
    };
    
    const formatDateTime = (timestamp) => {
        if (!timestamp) return 'N/A';
        const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
        return date.toLocaleString('pt-BR');
    };

    useEffect(() => {
        localStorage.setItem('salesViewMode', viewMode);
    }, [viewMode]);

    useEffect(() => {
        if (userRole === 'admin' && db) {
            const storesRef = collection(db, 'stores');
            getDocs(storesRef).then(snapshot => {
                const storesList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                setAllStores(storesList);
                if (!defaultStoreId && storesList.length > 0) {
                    setActiveStoreId(storesList[0].id);
                    setActiveStoreName(storesList[0].name);
                }
            });
        }
    }, [db, userRole, defaultStoreId]);

    useEffect(() => {
        if (!activeStoreId || !usersCollectionRef) return;
        const fetchEmployees = async () => {
            try {
                const q = userRole === 'admin' 
                    ? query(usersCollectionRef, where("storeId", "==", activeStoreId))
                    : query(usersCollectionRef, where("storeId", "==", defaultStoreId));
                
                const snapshot = await getDocs(q);
                const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                setEmployees(list);
                
                if (currentUser && list.some(e => e.id === currentUser.uid)) {
                    setSelectedSellerId(currentUser.uid);
                } else if (list.length > 0) {
                    setSelectedSellerId(list[0].id);
                } else {
                    setSelectedSellerId('');
                }
            } catch (err) {
                setError("Falha ao carregar vendedores.");
            }
        };
        fetchEmployees();
    }, [activeStoreId, defaultStoreId, userRole, usersCollectionRef, currentUser]);

    useEffect(() => {
        if (!db || !appId || !activeStoreId) return;
        const fetchPaymentConfig = async () => {
            const settingsDocRef = doc(db, `artifacts/${appId}/stores/${activeStoreId}/settings/paymentConfig`);
            try {
                const settingsSnap = await getDoc(settingsDocRef);
                if (settingsSnap.exists()) {
                    setPaymentConfig(settingsSnap.data());
                } else {
                    setError("AVISO: Configurações de pagamento não encontradas para esta loja.");
                    setPaymentConfig({});
                }
            } catch (err) {
                setError("Falha ao carregar configurações de pagamento.");
            }
        };
        fetchPaymentConfig();
    }, [db, appId, activeStoreId]);

    // REFACTOR: Função de busca agora pega o catálogo global e o inventário da loja.
    const fetchStoreData = useCallback(() => {
        if (!db || !currentUser || firebaseLoading || authLoading || !activeStoreId) {
            setDataLoading(true);
            return () => {};
        }

        setDataLoading(true);
        setError(null);
        
        // Listener para o catálogo global de produtos
        // ALTERAÇÃO: A ordenação agora é feita no lado do cliente para garantir a ordem numérica correta dos códigos.
        const productsQuery = query(productsCollectionRef);
        const unsubscribeProducts = onSnapshot(productsQuery,
            (snapshot) => {
                let productsData = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data(),
                    price: doc.data().price ? parseFloat(doc.data().price) : 0, 
                    variations: doc.data().variations || []
                }));

                // NOVO: Ordena os produtos pelo código em ordem crescente.
                // Usa localeCompare com a opção 'numeric' para tratar corretamente códigos como "1", "2", "10".
                productsData.sort((a, b) => {
                    const codeA = String(a.code || '');
                    const codeB = String(b.code || '');
                    return codeA.localeCompare(codeB, undefined, { numeric: true, sensitivity: 'base' });
                });
                
                setProducts(productsData);
            },
            (error) => {
                setError(`Erro ao carregar catálogo: ${error.message}.`);
                setDataLoading(false);
            }
        );

        // Listener para o inventário da loja ativa
        const inventoryQuery = query(inventoryCollectionRef, where('storeId', '==', activeStoreId));
        const unsubscribeInventory = onSnapshot(inventoryQuery,
            (snapshot) => {
                const inventoryData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                setInventory(inventoryData);
            },
            (error) => {
                setError(`Erro ao carregar inventário: ${error.message}.`);
                setDataLoading(false);
            }
        );

        return () => {
            unsubscribeProducts();
            unsubscribeInventory();
        };
    }, [db, currentUser, firebaseLoading, authLoading, activeStoreId, productsCollectionRef, inventoryCollectionRef]);

    useEffect(() => {
        const unsubscribe = fetchStoreData();
        return unsubscribe;
    }, [fetchStoreData]);

    // REFACTOR: Efeito para mesclar o catálogo com o inventário
    useEffect(() => {
        if (products.length === 0 && inventory.length === 0) {
            setDataLoading(false); // Evita ficar em loading se não houver produtos/estoque
            return;
        }

        const inventoryMap = new Map();
        inventory.forEach(item => {
            const key = `${item.productId}-${item.color}-${item.size}`;
            inventoryMap.set(key, item.quantity);
        });

        const mergedProducts = products.map(product => {
            const variationsWithStock = (product.variations || []).map(variation => {
                const key = `${product.id}-${variation.color}-${variation.size}`;
                return {
                    ...variation,
                    quantity: inventoryMap.get(key) || 0
                };
            });
            const totalQuantity = variationsWithStock.reduce((sum, v) => sum + v.quantity, 0);
            
            return {
                ...product,
                variations: variationsWithStock,
                totalQuantity: totalQuantity
            };
        });

        setProductsForSale(mergedProducts);
        setDataLoading(false);

    }, [products, inventory]);


    // ALTERAÇÃO: Efeito para ouvir o caixa da loja ativa
    useEffect(() => {
        let unsubscribeCashRegister = () => {};
        if (db && appId && currentUser && activeStoreId && !firebaseLoading && !authLoading) {
            const sessionsCollectionRef = collection(db, 'stores', activeStoreId, 'cash_register_sessions');
            const q = query(
                sessionsCollectionRef,
                where('status', '==', 'open'),
                orderBy('openedAt', 'desc'),
                limit(1)
            );

            unsubscribeCashRegister = onSnapshot(q, (snapshot) => {
                if (!snapshot.empty) {
                    const docSnap = snapshot.docs[0];
                    const data = docSnap.data();
                    const newStatus = data.status || 'closed';
                    setCashRegisterStatus(newStatus);
                    setCurrentCashRegisterSessionId(docSnap.id);
                    if (newStatus !== 'open') {
                        setCart([]);
                        setPaymentMethods([]);
                        setSelectedCustomer(UNIDENTIFIED_CUSTOMER);
                        setError("O caixa foi fechado. Nao e possivel realizar vendas.");
                    } else {
                        setError(prevError => prevError && prevError.includes("caixa") ? null : prevError);
                    }
                } else {
                    setCashRegisterStatus('closed');
                    setCurrentCashRegisterSessionId(null);
                    setCart([]);
                    setPaymentMethods([]);
                    setSelectedCustomer(UNIDENTIFIED_CUSTOMER);
                    setError("O caixa esta fechado ou nao foi aberto para esta loja.");
                }
            }, (error) => {
                setError(`Erro ao carregar status do caixa: ${error.message}.`);
                setCashRegisterStatus('closed');
                setCurrentCashRegisterSessionId(null);
            });
        } else {
            setCashRegisterStatus('closed');
            setCurrentCashRegisterSessionId(null);
        }

        return () => {
            if (unsubscribeCashRegister) {
                unsubscribeCashRegister();
            }
        };
    }, [db, appId, currentUser, activeStoreId, firebaseLoading, authLoading]);
    
    // ALTERAÇÃO: Callback para buscar histórico da loja ativa
    const fetchSalesHistory = useCallback(() => {
        if (authLoading || firebaseLoading || !salesCollectionRef || !activeStoreId) return;
        const q = query(salesCollectionRef, where('storeId', '==', activeStoreId), orderBy('date', 'desc'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const historyList = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                timestamp: doc.data().date ? doc.data().date.toDate() : new Date(),
            }));
            setSalesHistory(historyList);
        }, (err) => {
            setError("Erro ao carregar histórico de vendas.");
        });
        return () => unsubscribe();
    }, [authLoading, firebaseLoading, salesCollectionRef, activeStoreId]);

    // Efeitos principais que disparam as buscas
    useEffect(() => {
        const unsubscribeSalesHistory = fetchSalesHistory();
        return () => {
            if (unsubscribeSalesHistory) unsubscribeSalesHistory();
        };
    }, [fetchSalesHistory]);
    
    // NOVO: Efeito para ouvir a resposta de uma solicitação de desconto
    useEffect(() => {
        if (!db || !discountRequestId) return;

        const requestRef = doc(db, 'discount_requests', discountRequestId);
        const unsubscribe = onSnapshot(requestRef, (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data();
                setDiscountRequestStatus(data.status);
                if (data.status === 'approved') {
                    setDiscount(data.discount);
                    setIsDiscountModalOpen(false);
                    setSuccessMessage('Desconto aprovado e aplicado!');
                    setDiscountRequestId(null); // Limpa o ID após tratar
                } else if (data.status === 'rejected') {
                    setIsDiscountModalOpen(false);
                    setError('Solicitação de desconto foi rejeitada.');
                    setDiscountRequestId(null); // Limpa o ID após tratar
                }
            }
        });

        return () => unsubscribe();
    }, [db, discountRequestId]);


    const filteredProducts = useMemo(() => {
        if (!searchTerm) {
            return productsForSale;
        }
        const lowerCaseSearchTerm = searchTerm.toLowerCase();
        return productsForSale.filter(product =>
            (product.name && product.name.toLowerCase().includes(lowerCaseSearchTerm)) ||
            (product.code && product.code.toLowerCase().includes(lowerCaseSearchTerm)) ||
            (product.barcode && product.barcode.toLowerCase().includes(lowerCaseSearchTerm))
        );
    }, [productsForSale, searchTerm]);

    const handleAddToCart = (product, color, size, quantity) => {
        if (cashRegisterStatus !== 'open') {
            setError("O caixa está fechado. Não é possível adicionar produtos ao carrinho.");
            return;
        }
        if (quantity <= 0) {
            setError("A quantidade deve ser maior que zero.");
            return;
        }
        const existingItemIndex = cart.findIndex(
            item => item.id === product.id && item.selectedColor === color && item.selectedSize === size
        );
        if (existingItemIndex > -1) {
            const updatedCart = [...cart];
            updatedCart[existingItemIndex].quantity += quantity;
            setCart(updatedCart);
        } else {
            setCart([
                ...cart, {
                    id: product.id,
                    name: product.name,
                    code: product.code,
                    price: product.price,
                    costPrice: product.costPrice || 0,
                    selectedColor: color,
                    selectedSize: size,
                    quantity: quantity,
                    originalProductId: product.id
                }
            ]);
        }
        setSuccessMessage(`${quantity} unidade(s) de ${product.name} (${color} ${size}) adicionada(s) ao carrinho.`);
        setError(null);
    };

    const handleQuantityChange = (productId, color, size, amount) => {
        if (cashRegisterStatus !== 'open') {
            setError("O caixa está fechado. Não é possível modificar o carrinho.");
            return;
        }
        setCart(prevCart => {
            const updatedCart = prevCart.map(item => {
                if (item.id === productId && item.selectedColor === color && item.selectedSize === size) {
                    const newQuantity = Math.max(0, item.quantity + amount);
                    const productInStock = productsForSale.find(p => p.id === productId);
                    if (productInStock) {
                        const variationInStock = (productInStock.variations || []).find(v => v.color === color && v.size === size);
                        if (variationInStock && newQuantity > variationInStock.quantity) {
                             setError(`Estoque insuficiente para ${productInStock.name} (${color} ${size}). Disponível: ${variationInStock.quantity}.`);
                             return item;
                        }
                    }
                    return { ...item, quantity: newQuantity };
                }
                return item;
            }).filter(item => item.quantity > 0);
            return updatedCart;
        });
        setError(null);
        setSuccessMessage(null);
    };

    const handleRemoveFromCart = (productId, color, size) => {
        if (cashRegisterStatus !== 'open') {
            setError("O caixa está fechado. Não é possível remover produtos do carrinho.");
            return;
        }
        setCart(prevCart => prevCart.filter(item => !(item.id === productId && item.selectedColor === color && item.selectedSize === size)));
        setSuccessMessage("Produto removido do carrinho.");
        setError(null);
    };

    const calculateSubtotal = useMemo(() => {
        return cart.reduce((acc, item) => acc + (parseFloat(item.price || 0) * item.quantity), 0);
    }, [cart]);

    const discountAmount = useMemo(() => {
        if (discount.value === 0) return 0;
        if (discount.type === '%') {
            return calculateSubtotal * (discount.value / 100);
        }
        return discount.value;
    }, [calculateSubtotal, discount]);

    const calculateTotal = useMemo(() => {
        return calculateSubtotal - discountAmount;
    }, [calculateSubtotal, discountAmount]);

    const totalPaid = useMemo(() => {
        return paymentMethods.reduce((acc, p) => acc + p.amount, 0);
    }, [paymentMethods]);

    const amountRemaining = useMemo(() => {
        return calculateTotal - totalPaid;
    }, [calculateTotal, totalPaid]);

    const handleAddPayment = () => {
        setError(null);
        const amount = parseFloat(currentPaymentAmount);
        if (!currentPaymentMethod) {
            setError("Selecione um método de pagamento.");
            return;
        }
        if (isNaN(amount) || amount <= 0) {
            setError("Insira um valor de pagamento válido e positivo.");
            return;
        }
        if (amount > amountRemaining + 0.001) { // Pequena tolerância para floats
            setError(`O valor do pagamento (R$ ${formatCurrency(amount)}) não pode exceder o valor restante (R$ ${formatCurrency(amountRemaining)}).`);
            return;
        }
        setPaymentMethods(prevMethods => [...prevMethods, { method: currentPaymentMethod, amount: amount }]);
        setCurrentPaymentMethod('');
        setCurrentPaymentAmount('');
    };

    const handleRemovePayment = (indexToRemove) => {
        setPaymentMethods(prevMethods => prevMethods.filter((_, index) => index !== indexToRemove));
    };

    const handleOpenVariationModal = (product) => {
        if (cashRegisterStatus !== 'open') {
            setError("O caixa está fechado. Não é possível selecionar variações.");
            return;
        }
        const uniqueColors = [...new Set((product.variations || []).map(v => v.color))];
        let initialVariationState = { color: '', size: '', quantity: 1 };

        if (uniqueColors.length === 1) {
            initialVariationState.color = uniqueColors[0];
            const uniqueSizesForColor = [...new Set((product.variations || [])
                .filter(v => v.color === uniqueColors[0])
                .map(v => v.size))];
                
            if (uniqueSizesForColor.length === 1) {
                initialVariationState.size = uniqueSizesForColor[0];
            }
        }

        setSelectedProductForVariation(product);
        setSelectedVariation(initialVariationState);
        setShowVariationModal(true);
        setError(null);
        setSuccessMessage(null);
    };

    const handleCloseVariationModal = () => {
        setShowVariationModal(false);
        setSelectedProductForVariation(null);
        setSelectedVariation({ color: '', size: '', quantity: 1 });
        setError(null);
        setSuccessMessage(null);
    };

    const handleSelectedVariationChange = (field, value) => {
        setSelectedVariation(prev => ({
            ...prev,
            [field]: value
        }));
    };

    const handleAddVariationToCart = () => {
        if (cashRegisterStatus !== 'open') {
            setError("O caixa está fechado. Não é possível adicionar produtos ao carrinho.");
            return;
        }
        if (!selectedProductForVariation || !selectedVariation.color || !selectedVariation.size || selectedVariation.quantity <= 0) {
            setError("Por favor, selecione a cor, o tamanho e a quantidade da variação.");
            return;
        }
        const product = selectedProductForVariation;
        const color = selectedVariation.color;
        const size = selectedVariation.size;
        const quantity = selectedVariation.quantity;
        const selectedProductFullVariation = (product.variations || []).find(
            v => v.color === color && v.size === size
        );
        if (!selectedProductFullVariation) {
            setError("Variação selecionada não encontrada para este produto.");
            return;
        }
        const quantityInCart = cart.reduce((sum, item) => {
            if (item.id === product.id && item.selectedColor === color && item.selectedSize === size) {
                return sum + item.quantity;
            }
            return sum;
        }, 0);
        if ((quantityInCart + quantity) > selectedProductFullVariation.quantity) {
            setError(`Estoque insuficiente para ${product.name} (${color} ${size}). Disponível: ${selectedProductFullVariation.quantity - quantityInCart}.`);
            return;
        }
        handleAddToCart(product, color, size, quantity);
        handleCloseVariationModal();
    };
    
    // NOVO: Funções de Desconto
    const handleApplyDiscount = (appliedDiscount) => {
        setDiscount(appliedDiscount);
        setIsDiscountModalOpen(false);
        setSuccessMessage("Desconto aplicado com sucesso!");
    };
    
    const handleRequestDiscount = async (requestedDiscount) => {
        if (!db || !currentUser || !activeStoreId || !discountRequestsCollectionRef) {
            setError("Não foi possível criar a solicitação. Faltam dados do usuário/loja.");
            return;
        }

        setDiscountRequestStatus('pending');
        
        try {
            const newRequest = {
                requesterInfo: {
                    id: currentUser.uid,
                    name: currentUser.displayName || currentUser.email,
                },
                storeId: activeStoreId,
                storeName: activeStoreName,
                cartSnapshot: cart,
                discount: requestedDiscount,
                status: 'pending',
                createdAt: serverTimestamp(),
            };
            const docRef = await addDoc(discountRequestsCollectionRef, newRequest);
            setDiscountRequestId(docRef.id);
        } catch (err) {
            setError("Falha ao enviar solicitação de desconto.");
            setDiscountRequestStatus(null);
        }
    };
    
    const handleRemoveDiscount = () => {
        setDiscount({ type: '%', value: 0 });
    };

    const handleFinalizeSale = async () => {
        if (!selectedSellerId) {
            setError("Por favor, selecione o vendedor responsável pela venda.");
            return;
        }
        if (!currentUser || !activeStoreId || !db) {
            setError("Informações do usuário, loja ou Firebase não disponíveis.");
            return;
        }
        if (cashRegisterStatus !== 'open' || !currentCashRegisterSessionId) {
            setError("O caixa está fechado ou nenhuma sessão ativa foi encontrada.");
            return;
        }
        if (cart.length === 0) {
            setError("O carrinho está vazio.");
            return;
        }
        if (Math.abs(amountRemaining) > 0.01) {
            setError("O valor pago não corresponde ao total da venda.");
            return;
        }
        if (!selectedCustomer || !selectedCustomer.id) {
            setError("Por favor, selecione um cliente para a venda.");
            return;
        }
        if (!paymentConfig) {
            setError("As configurações de pagamento ainda não foram carregadas. Tente novamente.");
            return;
        }

        setIsProcessingSale(true);
        setError(null);
        setSuccessMessage(null);

        try {
            const newSaleRef = doc(salesCollectionRef); 

            await runTransaction(db, async (transaction) => {
                // **CORREÇÃO: FASE 1 - LEITURA**
                // Coleta todas as referências de documentos que precisamos ler.
                const cashRegisterDocRef = doc(db, 'stores', activeStoreId, 'cash_register_sessions', currentCashRegisterSessionId);
                const inventoryRefs = cart.map(item => {
                    const inventoryItem = inventory.find(inv => 
                        inv.productId === item.id &&
                        inv.color === item.selectedColor &&
                        inv.size === item.selectedSize
                    );
                    if (!inventoryItem) {
                        throw new Error(`Item de estoque para ${item.name} (${item.selectedColor} ${item.selectedSize}) não foi encontrado.`);
                    }
                    return doc(db, 'inventory', inventoryItem.id);
                });
    
                const bankAccountRefs = {};
                paymentMethods.forEach(payment => {
                    const methodKey = getPaymentMethodKey(payment.method);
                    const config = paymentConfig[methodKey];
                    if (config && config.accountId) {
                        if (!bankAccountRefs[config.accountId]) {
                            bankAccountRefs[config.accountId] = doc(db, 'bankAccounts', config.accountId);
                        }
                    }
                });
    
                // Executa todas as leituras de uma vez.
                const allRefsToRead = [cashRegisterDocRef, ...Object.values(bankAccountRefs), ...inventoryRefs];
                const allDocsSnap = await Promise.all(allRefsToRead.map(ref => transaction.get(ref)));
    
                // Separa os documentos lidos para facilitar o acesso.
                const cashRegisterDoc = allDocsSnap[0];
                const bankAccountDocs = {};
                let docIndex = 1;
                for (const accId in bankAccountRefs) {
                    bankAccountDocs[accId] = allDocsSnap[docIndex++];
                }
                const inventoryDocs = allDocsSnap.slice(docIndex);
    
                // **CORREÇÃO: FASE 2 - VALIDAÇÃO**
                // Valida todos os documentos lidos antes de qualquer escrita.
                if (!cashRegisterDoc.exists() || cashRegisterDoc.data().status !== 'open') {
                    throw new Error("O caixa foi fechado ou não está mais ativo. A venda foi cancelada.");
                }
                for (const accId in bankAccountRefs) {
                    if (!bankAccountDocs[accId].exists()) {
                        throw new Error(`Conta bancária configurada (ID: ${accId}) não foi encontrada.`);
                    }
                }
                for (let i = 0; i < cart.length; i++) {
                    const item = cart[i];
                    const inventoryDocSnap = inventoryDocs[i];
                    if (!inventoryDocSnap.exists()) {
                        throw new Error(`O item de estoque para ${item.name} (${item.selectedColor} ${item.selectedSize}) não existe mais.`);
                    }
                    if (inventoryDocSnap.data().quantity < item.quantity) {
                        throw new Error(`Estoque insuficiente para ${item.name} (${item.selectedColor} ${item.selectedSize}). Disponível: ${inventoryDocSnap.data().quantity}`);
                    }
                }
    
                // **CORREÇÃO: FASE 3 - ESCRITA**
                // Se todas as validações passaram, executa todas as escritas.
    
                // 1. Debita o estoque
                for (let i = 0; i < cart.length; i++) {
                    const item = cart[i];
                    const inventoryDocSnap = inventoryDocs[i];
                    const newQuantity = inventoryDocSnap.data().quantity - item.quantity;
                    transaction.update(inventoryDocSnap.ref, { quantity: newQuantity });
                }
    
                // 2. Processa pagamentos e atualiza contas
                const cashRegisterData = cashRegisterDoc.data();
                let updatedCashCount = cashRegisterData.currentCashCount || 0;
                let updatedDailySalesSummary = { ...(cashRegisterData.dailySalesSummary || {}) };
                
                for (const payment of paymentMethods) {
                    const methodKey = getPaymentMethodKey(payment.method);
                    const config = paymentConfig[methodKey];
                    
                    updatedDailySalesSummary.totalSales = (updatedDailySalesSummary.totalSales || 0) + payment.amount;
                    if (payment.method.includes('Credito')) updatedDailySalesSummary.creditCardSales = (updatedDailySalesSummary.creditCardSales || 0) + payment.amount;
                    else if (payment.method === 'Cartao de Debito') updatedDailySalesSummary.debitCardSales = (updatedDailySalesSummary.debitCardSales || 0) + payment.amount;
                    else if (payment.method === 'PIX') updatedDailySalesSummary.pixSales = (updatedDailySalesSummary.pixSales || 0) + payment.amount;
                    else if (payment.method === 'Dinheiro') updatedDailySalesSummary.cashSales = (updatedDailySalesSummary.cashSales || 0) + payment.amount;
    
                    if (payment.method === 'Dinheiro') {
                        updatedCashCount += payment.amount;
                    } else if (config && config.accountId) {
                        const accountId = config.accountId;
                        const fee = config.fee || 0;
                        const netAmount = payment.amount * (1 - (fee / 100));
                        const feeAmount = payment.amount - netAmount;
    
                        const bankAccountRef = bankAccountRefs[accountId];
                        const currentBalance = bankAccountDocs[accountId].data().balance;
                        transaction.update(bankAccountRef, { balance: currentBalance + netAmount });
    
                        const financialTxRef = doc(collection(db, 'transactions'));
                        transaction.set(financialTxRef, {
                            accountId: accountId,
                            amount: netAmount,
                            type: 'deposit',
                            description: `Recebimento da Venda #${newSaleRef.id.substring(0, 5)} (${payment.method})`,
                            metadata: { saleId: newSaleRef.id, storeId: activeStoreId, grossAmount: payment.amount, feeAmount: feeAmount, feePercentage: fee },
                            timestamp: serverTimestamp(),
                            performedBy: currentUser.email,
                        });
                    } else {
                        throw new Error(`O método de pagamento '${payment.method}' não tem uma conta de destino configurada.`);
                    }
                }
                transaction.update(cashRegisterDocRef, { currentCashCount: updatedCashCount, dailySalesSummary: updatedDailySalesSummary });
    
                // 3. Cria o documento da venda
                const selectedSeller = employees.find(emp => emp.id === selectedSellerId);
                const saleData = {
                    date: serverTimestamp(),
                    totalAmount: calculateTotal,
                    subtotal: calculateSubtotal,
                    discountInfo: {
                        applied: discount.value > 0,
                        type: discount.type,
                        value: discount.value,
                        amount: discountAmount,
                        requestId: discountRequestId,
                    },
                    paymentMethods: paymentMethods,
                    storeId: activeStoreId,
                    storeName: activeStoreName,
                    cashRegisterSessionId: currentCashRegisterSessionId,
                    items: cart.map(item => ({
                        productId: item.id, productCode: item.code, productName: item.name,
                        pricePerUnit: item.price, costPricePerUnit: item.costPrice,
                        selectedColor: item.selectedColor, selectedSize: item.selectedSize,
                        quantity: item.quantity, subtotal: parseFloat(item.price) * item.quantity,
                    })),
                    sellerInfo: {
                        id: selectedSellerId,
                        name: selectedSeller?.username || 'N/A',
                        email: selectedSeller?.email || 'N/A',
                    },
                    customerInfo: {
                        id: selectedCustomer.id,
                        name: selectedCustomer.name,
                        phone: selectedCustomer.phone || null,
                        cpf: selectedCustomer.cpf || null,
                    },
                    returnedItems: [],
                    status: 'completed',
                };
                transaction.set(newSaleRef, saleData);
            });

            setSuccessMessage("Venda finalizada com sucesso!");
            setCart([]);
            setPaymentMethods([]);
            setCurrentPaymentAmount('');
            setCurrentPaymentMethod('');
            setSelectedCustomer(UNIDENTIFIED_CUSTOMER);
            setDiscount({ type: '%', value: 0 });
            setDiscountRequestId(null);
            setDiscountRequestStatus(null);

        } catch (err) {
            console.error("Erro ao finalizar venda:", err);
            setError(`Falha na transação: ${err.message}`);
        } finally {
            setIsProcessingSale(false);
        }
    };


    const handleShowSaleDetail = (sale) => {
        setSelectedSaleDetail(sale);
        setShowSaleDetailModal(true);
    };

    const handleCloseSaleDetailModal = () => {
        setSelectedSaleDetail(null);
        setShowSaleDetailModal(false);
    };

    const handleOpenReturnExchangeModal = (saleItem, currentlyReturned) => {
        setSaleItemForReturnExchange(saleItem);
        setReturnQuantity(1); 
        setReturnReason('');
        setIsExchangeFlow(false); 
        setExchangeSearchTerm('');
        setExchangeSearchResults([]);
        setExchangeCart([]);
        setShowingExchangeVariationSelection(false); 
        setExchangePayments([]);
        setCurrentExchangePaymentMethod('');
        setCurrentExchangePaymentAmount('');
        setQuantityAlreadyReturned(currentlyReturned);
        setIsReturnExchangeModalOpen(true);
        setError(null); 
        setSuccessMessage(null);
    };

    const handleCloseReturnExchangeModal = () => {
        setIsReturnExchangeModalOpen(false);
        setSaleItemForReturnExchange(null);
        setError(null);
        setSuccessMessage(null);
        setIsExchangeFlow(false);
        setExchangeSearchTerm('');
        setExchangeSearchResults([]);
        setExchangeCart([]); 
        setShowingExchangeVariationSelection(false); 
        setSelectedProductForVariation(null);
        setSelectedVariation({ color: '', size: '', quantity: 1 }); 
        setExchangePayments([]);
        setCurrentExchangePaymentMethod('');
        setCurrentExchangePaymentAmount('');
    };

    const handleReturnConfirm = async () => {
        setError(null);
        setSuccessMessage(null);
        if (!saleItemForReturnExchange || returnQuantity <= 0 || returnQuantity > saleItemForReturnExchange.quantity) {
            setError("Quantidade de devolução inválida.");
            return;
        }
        if (!returnReason.trim()) {
            setError("Por favor, insira um motivo para a devolução.");
            return;
        }
        if (!salesCollectionRef || !productsCollectionRef || !currentUser || !currentUser.uid || !activeStoreId) {
            setError("Erro de inicialização (usuário/loja/Firebase). Recarregue a página ou faça login novamente.");
            return;
        }
        try {
            const returnTimestamp = new Date();
            await runTransaction(db, async (transaction) => {
                const originalProductRef = doc(productsCollectionRef, saleItemForReturnExchange.productId); 
                const originalProductSnap = await transaction.get(originalProductRef);
                if (!originalProductSnap.exists()) {
                    throw new Error(`Produto original "${saleItemForReturnExchange.productName}" não encontrado para reverter estoque.`);
                }
                const originalProductData = originalProductSnap.data();
                let updatedOriginalVariations = [...(originalProductData.variations || [])];
                const originalVariationIndex = updatedOriginalVariations.findIndex(v =>
                    v.color === saleItemForReturnExchange.selectedColor && v.size === saleItemForReturnExchange.selectedSize
                );
                if (originalVariationIndex > -1) {
                    updatedOriginalVariations[originalVariationIndex].quantity += returnQuantity;
                    originalProductData.totalQuantity = (originalProductData.totalQuantity || 0) + returnQuantity;
                } else {
                    if (!originalProductData.hasVariations || !(originalProductData.variations && originalProductData.variations.length > 0)) { 
                         originalProductData.totalQuantity = (originalProductData.totalQuantity || 0) + returnQuantity;
                    } else {
                       throw new Error(`Variação do produto (${saleItemForReturnExchange.selectedColor} ${saleItemForReturnExchange.selectedSize}) para ${saleItemForReturnExchange.productName} não encontrada no estoque.`);
                    }
                }
                const saleRef = doc(salesCollectionRef, selectedSaleDetail.id);
                const saleSnap = await transaction.get(saleRef);
                if (!saleSnap.exists()) {
                    throw new Error("Venda original não encontrada para registrar devolução.");
                }
                const saleData = saleSnap.data();
                const updatedReturnedItems = [
                    ...(saleData.returnedItems || []),
                    {
                        originalItemId: saleItemForReturnExchange.productId,
                        originalItemName: saleItemForReturnExchange.productName,
                        color: saleItemForReturnExchange.selectedColor,
                        size: saleItemForReturnExchange.selectedSize,
                        quantityReturned: returnQuantity,
                        reason: returnReason,
                        returnDate: returnTimestamp,
                        processedBy: currentUser.email,
                    }
                ];
                transaction.update(originalProductRef, {
                    variations: originalProductData.hasVariations ? updatedOriginalVariations : null,
                    totalQuantity: originalProductData.totalQuantity,
                    updatedAt: serverTimestamp(),
                });
                transaction.update(saleRef, {
                    returnedItems: updatedReturnedItems,
                    status: 'partially_returned',
                    updatedAt: serverTimestamp(),
                });
            });
            setSuccessMessage("Devolução registrada com sucesso!");
            handleCloseReturnExchangeModal();
        } catch (err) {
            console.error("Erro ao processar devolução:", err);
            setError(`Erro ao processar devolução: ${err.message}`);
        }
    };

    const handleExchangeSearch = async () => {
        setError(null);
        setExchangeSearchResults([]); 
        if (!exchangeSearchTerm.trim()) {
            setError("Por favor, digite um termo de busca para o produto de troca.");
            return;
        }
        if (!productsCollectionRef || !activeStoreId) {
            setError("Serviços do Firebase não inicializados ou ID da loja não disponível.");
            return;
        }
        const lowerCaseSearchTerm = exchangeSearchTerm.trim().toLowerCase();
        let searchResults = [];
        try {
            const nameQuery = query(
                productsCollectionRef,
                where('name_lowercase', '>=', lowerCaseSearchTerm),
                where('name_lowercase', '<=', lowerCaseSearchTerm + '\uf8ff'),
                where('storeIds', 'array-contains', activeStoreId)
            );
            const nameSnapshot = await getDocs(nameQuery);
            const nameResults = nameSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            searchResults.push(...nameResults);
            const codeQuery = query(
                productsCollectionRef,
                where('code', '==', exchangeSearchTerm.trim()),
                where('storeIds', 'array-contains', activeStoreId)
            );
            const codeSnapshot = await getDocs(codeQuery);
            const codeResults = codeSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            searchResults.push(...codeResults);
            if (exchangeSearchTerm.trim().length > 5) {
                const barcodeQuery = query(
                    productsCollectionRef,
                    where('barcode', '==', exchangeSearchTerm.trim()),
                    where('storeIds', 'array-contains', activeStoreId)
                );
                const barcodeSnapshot = await getDocs(barcodeQuery);
                const barcodeResults = barcodeSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                searchResults.push(...barcodeResults);
            }
            const uniqueResults = Array.from(new Map(searchResults.map(item => [item.id, item])).values());
            setExchangeSearchResults(uniqueResults);
            if (uniqueResults.length === 0) {
                setError("Nenhum produto encontrado com o termo de busca fornecido.");
            } else if (uniqueResults.length === 1) {
                handleAddProductToExchangeCart(uniqueResults[0]);
                setExchangeSearchTerm(''); 
            }
        } catch (err) {
            console.error("Erro na busca de produtos para troca:", err);
            setError(`Erro ao buscar produto para troca: ${err.message}.`);
        }
    };

    const handleClearExchangeSearch = () => {
        setExchangeSearchResults([]);
        setExchangeSearchTerm('');
        setError(null);
    };

    const handleAddProductToExchangeCart = (product) => {
        const uniqueColors = [...new Set((product.variations || []).map(v => v.color))];
        let initialVariationState = { color: '', size: '', quantity: 1 };

        if (uniqueColors.length === 1) {
            initialVariationState.color = uniqueColors[0];
            const uniqueSizesForColor = [...new Set((product.variations || [])
                .filter(v => v.color === uniqueColors[0])
                .map(v => v.size))];
                
            if (uniqueSizesForColor.length === 1) {
                initialVariationState.size = uniqueSizesForColor[0];
            }
        }

        setSelectedProductForVariation(product);
        setSelectedVariation(initialVariationState);
        setShowingExchangeVariationSelection(true); 
        setError(null); 
        setSuccessMessage(null);
    };

    const handleAddVariationToExchangeCart = () => {
        if (!selectedProductForVariation || !selectedVariation.color || !selectedVariation.size || selectedVariation.quantity <= 0) {
            setError("Por favor, selecione cor, tamanho e uma quantidade válida para o item de troca.");
            return;
        }
        const product = selectedProductForVariation;
        const color = selectedVariation.color;
        const size = selectedVariation.size;
        const quantity = selectedVariation.quantity;
        const selectedProductFullVariation = (product.variations || []).find(
            v => v.color === color && v.size === size
        );
        if (!selectedProductFullVariation) {
            setError("Variação selecionada não encontrada para este produto.");
            return;
        }
        const quantityInExchangeCart = exchangeCart.reduce((sum, item) => {
            if (item.id === product.id && item.selectedColor === color && item.selectedSize === size) {
                return sum + item.quantity;
            }
            return sum;
        }, 0);
        if ((quantityInExchangeCart + quantity) > selectedProductFullVariation.quantity) {
            setError(`Estoque insuficiente para ${product.name} (${color} ${size}). Disponível: ${selectedProductFullVariation.quantity - quantityInExchangeCart}.`);
            return;
        }
        const existingItemIndex = exchangeCart.findIndex(
            item => item.id === product.id && item.selectedColor === color && item.selectedSize === size
        );
        if (existingItemIndex > -1) {
            const updatedCart = [...exchangeCart];
            updatedCart[existingItemIndex].quantity += quantity;
            setExchangeCart(updatedCart);
        } else {
            setExchangeCart([
                ...exchangeCart, {
                    id: product.id,
                    name: product.name,
                    code: product.code,
                    price: product.price,
                    costPrice: product.costPrice || 0,
                    selectedColor: color,
                    selectedSize: size,
                    quantity: quantity,
                    originalProductId: product.id
                }
            ]);
        }
        setSuccessMessage(`${quantity} unidade(s) de ${product.name} (${color} ${size}) adicionada(s) ao carrinho de troca.`);
        setSelectedProductForVariation(null);
        setSelectedVariation({ color: '', size: '', quantity: 1 });
        setShowingExchangeVariationSelection(false);
        setExchangeSearchTerm(''); 
        setExchangeSearchResults([]);
    };

    const handleExchangeCartQuantityChange = (productId, color, size, amount) => {
        setExchangeCart(prevCart => {
            const updatedCart = prevCart.map(item => {
                if (item.id === productId && item.selectedColor === color && item.selectedSize === size) {
                    const newQuantity = Math.max(0, item.quantity + amount);
                    const productInStock = products.find(p => p.id === productId);
                    if (productInStock) {
                        const variationInStock = (productInStock.variations || []).find(v => v.color === color && v.size === size); 
                        if (variationInStock && newQuantity > variationInStock.quantity) {
                             setError(`Estoque insuficiente para ${productInStock.name} (${color} ${size}). Disponível: ${variationInStock.quantity}.`);
                             return item;
                        }
                        if (!productInStock.hasVariations && productInStock.totalQuantity !== undefined && newQuantity > productInStock.totalQuantity) {
                            setError(`Estoque insuficiente para ${productInStock.name}. Disponível: ${productInStock.totalQuantity}.`);
                            return item;
                        }
                    }
                    return { ...item, quantity: newQuantity };
                }
                return item;
            }).filter(item => item.quantity > 0);
            return updatedCart;
        });
        setError(null);
        setSuccessMessage(null);
    };

    const handleRemoveFromExchangeCart = (productId, color, size) => {
        setExchangeCart(prevCart => prevCart.filter(item => !(item.id === productId && item.selectedColor === color && item.selectedSize === size)));
        setSuccessMessage("Produto removido do carrinho de troca.");
        setError(null);
    };

    const calculateExchangeCartTotal = useMemo(() => {
        return exchangeCart.reduce((acc, item) => acc + (parseFloat(item.price || 0) * item.quantity), 0);
    }, [exchangeCart]);

    const calculatePriceDifference = useMemo(() => {
        if (!saleItemForReturnExchange) return 0;
        const originalItemValue = (parseFloat(saleItemForReturnExchange.pricePerUnit) || 0) * returnQuantity;
        const newItemValue = calculateExchangeCartTotal;
        return parseFloat((newItemValue - originalItemValue).toFixed(2));
    }, [saleItemForReturnExchange, returnQuantity, calculateExchangeCartTotal]);
    
    const totalExchangePaid = useMemo(() => {
        return exchangePayments.reduce((acc, p) => acc + p.amount, 0);
    }, [exchangePayments]);

    const exchangeAmountRemaining = useMemo(() => {
        return calculatePriceDifference - totalExchangePaid;
    }, [calculatePriceDifference, totalExchangePaid]);

    const handleAddExchangePayment = () => {
        setError(null);
        const amount = parseFloat(currentExchangePaymentAmount);
        if (!currentExchangePaymentMethod) {
            setError("Selecione um método de pagamento para a troca.");
            return;
        }
        if (isNaN(amount) || amount <= 0) {
            setError("Insira um valor de pagamento válido e positivo para a troca.");
            return;
        }
        if (amount > exchangeAmountRemaining + 0.001) {
            setError(`O valor do pagamento (R$ ${formatCurrency(amount)}) não pode exceder o valor restante da troca (R$ ${formatCurrency(exchangeAmountRemaining)}).`);
            return;
        }
        setExchangePayments([...exchangePayments, { method: currentExchangePaymentMethod, amount: amount }]);
        setCurrentExchangePaymentMethod('');
        setCurrentExchangePaymentAmount('');
    };

    const handleRemoveExchangePayment = (indexToRemove) => {
        setExchangePayments(exchangePayments.filter((_, index) => index !== indexToRemove));
    };


    const handleFinalizeExchange = async () => {
        setError(null);
        setIsProcessingSale(true);
        const priceDifference = calculatePriceDifference;
        
        if (priceDifference > 0 && Math.abs(exchangeAmountRemaining) > 0.01) {
            setError("O valor pago para a diferença da troca não está correto.");
            setIsProcessingSale(false);
            return;
        }
        if (exchangeCart.length === 0 && priceDifference > 0) {
            setError("Adicione produtos ao carrinho de troca ou revise a quantidade de devolução.");
            setIsProcessingSale(false);
            return;
        }
        if (!currentUser || !currentUser.uid || !activeStoreId || !db || firebaseLoading || authLoading) {
            setError("Informações do usuário, loja ou Firebase não disponíveis. Tente novamente ou faça login novamente.");
            return;
        }
        if (!currentCashRegisterSessionId) {
            setError("Nenhuma sessão de caixa ativa encontrada. Por favor, abra o caixa antes de finalizar a troca.");
            setIsProcessingSale(false);
            return;
        }
        let exchangeItemsToSave = []; 
        try {
            await runTransaction(db, async (transaction) => {
                const saleRef = doc(salesCollectionRef, selectedSaleDetail.id);
                const cashRegisterDocRef = doc(db, 'stores', activeStoreId, 'cash_register_sessions', currentCashRegisterSessionId);
                
                const bankAccountRefs = {};
                if (priceDifference > 0) {
                    for (const payment of exchangePayments) {
                        const methodKey = getPaymentMethodKey(payment.method);
                        const config = paymentConfig[methodKey];
                        if (config && config.accountId) {
                            if (!bankAccountRefs[config.accountId]) {
                                bankAccountRefs[config.accountId] = doc(db, 'bankAccounts', config.accountId);
                            }
                        }
                    }
                }
                
                const bankAccountDocs = {};
                const allReads = [
                    transaction.get(saleRef),
                    transaction.get(cashRegisterDocRef),
                    ...Object.values(bankAccountRefs).map(ref => transaction.get(ref))
                ];
                
                const [saleSnap, cashRegisterDocSnap, ...bankAccountSnaps] = await Promise.all(allReads);
                
                let snapIndex = 0;
                for (const accId in bankAccountRefs) {
                    const docSnap = bankAccountSnaps[snapIndex++];
                    if (!docSnap.exists()) throw new Error(`Conta bancária configurada (ID: ${accId}) não foi encontrada.`);
                    bankAccountDocs[accId] = docSnap;
                }

                if (!saleSnap.exists()) throw new Error("Venda original não encontrada.");
                if (!cashRegisterDocSnap.exists() || cashRegisterDocSnap.data().status !== 'open') throw new Error("O caixa está fechado.");

                // Debita estoque dos novos itens
                for (const item of exchangeCart) {
                    const inventoryItem = inventory.find(inv => inv.productId === item.id && inv.color === item.selectedColor && inv.size === item.selectedSize);
                    if (!inventoryItem) throw new Error(`Item de estoque para ${item.name} não encontrado.`);
                    
                    const inventoryDocRef = doc(db, 'inventory', inventoryItem.id);
                    const inventoryDocSnap = await transaction.get(inventoryDocRef);
                    if (!inventoryDocSnap.exists()) throw new Error(`Item de estoque para ${item.name} não existe mais.`);
                    
                    const newQuantity = inventoryDocSnap.data().quantity - item.quantity;
                    if (newQuantity < 0) throw new Error(`Estoque insuficiente para ${item.name}.`);
                    
                    transaction.update(inventoryDocRef, { quantity: newQuantity });
                }

                // Devolve estoque do item original
                const returnedInventoryItem = inventory.find(inv => inv.productId === saleItemForReturnExchange.productId && inv.color === saleItemForReturnExchange.selectedColor && inv.size === saleItemForReturnExchange.selectedSize);
                if (returnedInventoryItem) {
                    const returnedInventoryRef = doc(db, 'inventory', returnedInventoryItem.id);
                    const returnedInventorySnap = await transaction.get(returnedInventoryRef);
                    if (returnedInventorySnap.exists()) {
                        const newQuantity = returnedInventorySnap.data().quantity + returnQuantity;
                        transaction.update(returnedInventoryRef, { quantity: newQuantity });
                    }
                }
                
                const saleData = saleSnap.data();
                const updatedReturnedItems = [
                    ...(saleData.returnedItems || []),
                    { /* ... dados do item devolvido e dos itens de troca ... */ }
                ];
                transaction.update(saleRef, { returnedItems: updatedReturnedItems, status: 'partially_exchanged' });

                // Atualiza o caixa se houver diferença de preço
                if (priceDifference !== 0) {
                    let currentCashRegisterData = cashRegisterDocSnap.data();
                    let updatedCashCount = currentCashRegisterData.currentCashCount || 0;
                    let updatedDailySalesSummary = { ...(currentCashRegisterData.dailySalesSummary || {}) };
                    
                    updatedDailySalesSummary.totalSales = (updatedDailySalesSummary.totalSales || 0) + priceDifference;

                    if (priceDifference > 0) { // Cliente paga a diferença
                        for (const payment of exchangePayments) {
                            const methodKey = getPaymentMethodKey(payment.method);
                            const config = paymentConfig[methodKey];

                            if (payment.method === 'Dinheiro') {
                                updatedDailySalesSummary.cashSales = (updatedDailySalesSummary.cashSales || 0) + payment.amount;
                                updatedCashCount += payment.amount;
                            } else {
                                if (payment.method.includes('Credito')) updatedDailySalesSummary.creditCardSales = (updatedDailySalesSummary.creditCardSales || 0) + payment.amount;
                                else if (payment.method === 'Cartao de Debito') updatedDailySalesSummary.debitCardSales = (updatedDailySalesSummary.debitCardSales || 0) + payment.amount;
                                else if (payment.method === 'PIX') updatedDailySalesSummary.pixSales = (updatedDailySalesSummary.pixSales || 0) + payment.amount;

                                if (config && config.accountId) {
                                    const accountId = config.accountId;
                                    const fee = config.fee || 0;
                                    const netAmount = payment.amount * (1 - (fee / 100));
                                    
                                    const bankAccountRef = bankAccountRefs[accountId];
                                    const currentBalance = bankAccountDocs[accountId].data().balance;
                                    transaction.update(bankAccountRef, { balance: currentBalance + netAmount });

                                    const financialTxRef = doc(collection(db, 'transactions'));
                                    transaction.set(financialTxRef, {
                                        accountId: accountId, amount: netAmount, type: 'deposit',
                                        description: `Pagamento de diferença de troca (Venda: ${selectedSaleDetail.id.substring(0,5)})`,
                                        metadata: { saleId: selectedSaleDetail.id, exchange: true, grossAmount: payment.amount, feePercentage: fee },
                                        timestamp: serverTimestamp(), performedBy: currentUser.email,
                                    });
                                } else {
                                    throw new Error(`Método '${payment.method}' não tem conta de destino configurada.`);
                                }
                            }
                        }
                    } else { // Loja devolve troco
                        const refundAmount = Math.abs(priceDifference);
                        updatedCashCount -= refundAmount;
                        updatedDailySalesSummary.cashSales = (updatedDailySalesSummary.cashSales || 0) - refundAmount;
                    }

                    transaction.update(cashRegisterDocRef, {
                        currentCashCount: updatedCashCount,
                        dailySalesSummary: updatedDailySalesSummary,
                    });
                }
            });

            setSuccessMessage("Troca finalizada com sucesso!");
            handleCloseReturnExchangeModal();
        } catch (err) {
            console.error("Erro ao finalizar troca:", err);
            setError(`Falha na transação de troca: ${err.message}`);
        } finally {
            setIsProcessingSale(false);
        }
    };

    const handleSearchCustomers = async () => {
        setError(null);
        if (!customerSearchTerm.trim()) {
            setError("Digite um nome ou CPF para buscar.");
            return;
        }
        if (!customersCollectionRef) {
            setError("Serviço de busca de clientes indisponível.");
            return;
        }

        try {
            const searchTermLower = customerSearchTerm.toLowerCase().trim();
            const allCustomersSnapshot = await getDocs(customersCollectionRef);
            
            const results = [];
            allCustomersSnapshot.forEach(doc => {
                const customerData = { id: doc.id, ...doc.data() };
                const name = customerData.name || '';
                const cpf = customerData.cpf || '';
    
                if (name.toLowerCase().includes(searchTermLower) || cpf.includes(searchTermLower)) {
                    results.push(customerData);
                }
            });
            
            setCustomerSearchResults(results);
    
            if (results.length === 0) {
                setError("Nenhum cliente encontrado.");
            }
        } catch (err) {
            console.error("Erro ao buscar clientes:", err);
            setError(`Erro ao buscar clientes: ${err.message}`);
        }
    };

    const handleSelectCustomer = (customer) => {
        setSelectedCustomer(customer);
        setShowCustomerSearchModal(false);
        setCustomerSearchTerm('');
        setCustomerSearchResults([]);
        setError(null);
    };

    const handleClearCustomer = () => {
        setSelectedCustomer(UNIDENTIFIED_CUSTOMER);
    };

    const handleCustomerAdded = (newCustomer) => {
        setSelectedCustomer(newCustomer);
        setIsQuickAddModalOpen(false);
    };
    
    // NOVO: Handler para a mudança de loja pelo admin
    const handleStoreChange = (e) => {
        const newStoreId = e.target.value;
        const store = allStores.find(s => s.id === newStoreId);
        setActiveStoreId(newStoreId);
        setActiveStoreName(store ? store.name : '');
        // Reseta o estado da venda para evitar inconsistências
        setCart([]);
        setPaymentMethods([]);
        setSelectedCustomer(UNIDENTIFIED_CUSTOMER);
        setError(null);
        setSuccessMessage(null);
        setProducts([]); // Limpa produtos para mostrar o loading
    };


    if (authLoading || firebaseLoading) {
        return (
            <div style={styles.loadingContainer}>
                <div style={styles.spinner}></div>
                <p>A carregar informações de autenticação e Firebase...</p>
            </div>
        );
    }
    if (!currentUser) {
        return (
            <div style={styles.loadingContainer}>
                <p>Você precisa estar logado para acessar a página de Vendas.</p>
            </div>
        );
    }
    if (!activeStoreId) {
        return (
            <div style={styles.loadingContainer}>
                <p>Sua conta não está associada a uma loja ou nenhuma loja foi selecionada.</p>
                <p>Administrador: Selecione uma loja para começar.</p>
                {/* Permite ao admin selecionar uma loja se nenhuma estiver ativa */}
                {userRole === 'admin' && allStores.length > 0 && (
                     <div style={{...styles.storeSelectorSection, gridColumn: '1 / -1'}}>
                        <label style={styles.label}>
                            <Store size={16} style={{ marginRight: '8px' }}/>
                            Operando na Loja:
                        </label>
                        <select value={activeStoreId} onChange={handleStoreChange} style={styles.select}>
                            <option value="">-- Selecione uma Loja --</option>
                            {allStores.map(store => (
                                <option key={store.id} value={store.id}>{store.name}</option>
                            ))}
                        </select>
                    </div>
                )}
            </div>
        );
    }

    const renderProductList = () => {
        if (filteredProducts.length === 0) {
            return <p style={styles.noProductsMessage}>Nenhum produto encontrado ou disponível nesta loja.</p>;
        }
    
        if (viewMode === 'grid') {
            return (
                <div style={styles.productListGrid}>
                    {filteredProducts.map(product => {
                        const isOutOfStock = product.totalQuantity <= 0;
                        const cardStyle = {
                            ...styles.productCard,
                            ...(isOutOfStock && { opacity: 0.5, cursor: 'not-allowed' })
                        };
                        return (
                            <div
                                key={product.id}
                                style={cardStyle}
                                onClick={() => !isOutOfStock && handleOpenVariationModal(product)}
                            >
                                <p style={styles.productName}>{product.name}</p>
                                <p style={styles.productCode}>Cod: {product.code}</p>
                                <p style={styles.productPrice}>R$ {formatCurrency(product.price)}</p>
                                <p style={{ fontSize: '0.8em', color: isOutOfStock ? '#dc3545' : '#888' }}>
                                    {isOutOfStock ? "Sem Estoque" : `Estoque Total: ${product.totalQuantity || 0}`}
                                </p>
                                <button
                                    onClick={(e) => { e.stopPropagation(); !isOutOfStock && handleOpenVariationModal(product); }}
                                    style={styles.selectVariationButton}
                                    disabled={cashRegisterStatus !== 'open' || isOutOfStock}
                                >
                                    <PlusCircle size={16} /> Selecionar
                                </button>
                            </div>
                        );
                    })}
                </div>
            );
        }
    
        return (
            <div style={styles.productListContainer}>
                <table style={styles.productListTable}>
                    <thead>
                        <tr>
                            <th style={styles.tableHeader}>Código</th>
                            <th style={styles.tableHeader}>Produto</th>
                            <th style={styles.tableHeader}>Preço</th>
                            <th style={styles.tableHeader}>Estoque</th>
                            <th style={styles.tableHeader}>Ação</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredProducts.map(product => {
                             const isOutOfStock = product.totalQuantity <= 0;
                             const rowStyle = {
                                 ...styles.tableRow,
                                 ...(isOutOfStock && { backgroundColor: '#f8f9fa', color: '#6c757d' })
                             };
                            return (
                                <tr key={product.id} style={rowStyle}>
                                    <td style={styles.tableCell}>{product.code}</td>
                                    <td style={styles.tableCell}>{product.name}</td>
                                    <td style={styles.tableCell}>R$ {formatCurrency(product.price)}</td>
                                    <td style={{...styles.tableCell, color: isOutOfStock ? '#dc3545' : 'inherit' }}>
                                        {product.totalQuantity || 0}
                                    </td>
                                    <td style={styles.tableCell}>
                                        <button
                                            onClick={() => handleOpenVariationModal(product)}
                                            style={styles.selectVariationButton}
                                            disabled={cashRegisterStatus !== 'open' || isOutOfStock}
                                        >
                                            <PlusCircle size={16} /> Selecionar
                                        </button>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        );
    };

    return (
        <div style={styles.container}>
            <QuickAddCustomerModal 
                isOpen={isQuickAddModalOpen}
                onClose={() => setIsQuickAddModalOpen(false)}
                onCustomerAdded={handleCustomerAdded}
                userStoreId={activeStoreId}
            />
            
            <DiscountModal
                isOpen={isDiscountModalOpen}
                onClose={() => setIsDiscountModalOpen(false)}
                userRole={userRole}
                subtotal={calculateSubtotal}
                onApplyDiscount={handleApplyDiscount}
                onRequestDiscount={handleRequestDiscount}
                requestStatus={discountRequestStatus}
            />


            <div style={styles.debugInfo}>
                <p>Loja Ativa ID: {activeStoreId}</p>
                <p>Caixa: {cashRegisterStatus.toUpperCase()}</p>
                <p>UID: {currentUser.uid}</p>
            </div>

            <h2 style={styles.header}>Ponto de Venda</h2>
            
            {userRole === 'admin' && (
                 <div style={styles.storeSelectorSection}>
                    <label style={styles.label}>
                        <Store size={20} style={{ marginRight: '8px' }}/>
                        Operando na Loja:
                    </label>
                    <select value={activeStoreId || ''} onChange={handleStoreChange} style={{...styles.select, maxWidth: '300px'}}>
                        {allStores.map(store => (
                            <option key={store.id} value={store.id}>{store.name}</option>
                        ))}
                    </select>
                </div>
            )}


            {error && <div style={styles.messageError}>{error}</div>}
            {successMessage && <div style={styles.messageSuccess}>{successMessage}</div>}

            {cashRegisterStatus !== 'open' && (
                <div style={styles.cashRegisterClosedOverlay}>
                    <p style={styles.cashRegisterClosedMessage}>
                        CAIXA FECHADO
                    </p>
                    <p style={styles.cashRegisterClosedInstructions}>
                        Para realizar vendas, o caixa da loja "{activeStoreName}" precisa estar aberto.
                        <br />Por favor, vá para a página de Caixa e abra a sessão correspondente.
                    </p>
                </div>
            )}

            <div style={styles.productsSection}>
                <div style={styles.productsHeader}>
                    <h3>Produtos Disponíveis em "{activeStoreName}"</h3>
                    <div style={styles.viewToggleButtons}>
                        <button 
                            onClick={() => setViewMode('list')} 
                            style={viewMode === 'list' ? {...styles.toggleButton, ...styles.toggleButtonActive} : styles.toggleButton}
                            title="Visualizar em Lista"
                        >
                            <List size={18} />
                        </button>
                        <button 
                            onClick={() => setViewMode('grid')} 
                            style={viewMode === 'grid' ? {...styles.toggleButton, ...styles.toggleButtonActive} : styles.toggleButton}
                            title="Visualizar em Grade"
                        >
                            <Grid size={18} />
                        </button>
                    </div>
                </div>

                <div style={styles.searchContainer}>
                    <Search color="#555" />
                    <input
                        type="text"
                        placeholder="Buscar produto por nome, código ou barras..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        style={styles.searchInput}
                        disabled={cashRegisterStatus !== 'open'}
                    />
                </div>

                {dataLoading ? (
                    <div style={styles.loadingContainer}>
                        <div style={styles.spinner}></div>
                        <p>A carregar produtos de {activeStoreName}...</p>
                    </div>
                ) : (
                    renderProductList()
                )}
            </div>

            <div style={styles.cartSection}>
                <div style={{display: 'flex', flexDirection: 'column', flexGrow: 1}}>
                    <h3><ShoppingCart size={24}/> Carrinho de Compras</h3>
                    {cart.length === 0 ? (
                        <p style={styles.emptyCartMessage}>O carrinho está vazio.</p>
                    ) : (
                        <div style={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
                            <div style={{ overflowY: 'auto', maxHeight: '30vh', flexShrink: 1, paddingRight: '5px' }}>
                                {cart.map(item => (
                                    <div key={`${item.id}-${item.selectedColor}-${item.selectedSize}`} style={styles.cartItem}>
                                        <div style={styles.cartItemDetails}>
                                            <p style={styles.cartItemName}>{item.name} ({item.selectedColor} - {item.selectedSize})</p>
                                            <p style={styles.cartItemPrice}>R$ {formatCurrency(item.price)}</p>
                                        </div>
                                        <div style={styles.quantityControls}>
                                            <button onClick={() => handleQuantityChange(item.id, item.selectedColor, item.selectedSize, -1)} style={styles.quantityButton} disabled={cashRegisterStatus !== 'open'}><MinusCircle size={16} /></button>
                                            <span>{item.quantity}</span>
                                            <button onClick={() => handleQuantityChange(item.id, item.selectedColor, item.selectedSize, 1)} style={styles.quantityButton} disabled={cashRegisterStatus !== 'open'}><PlusCircle size={16} /></button>
                                            <button onClick={() => handleRemoveFromCart(item.id, item.selectedColor, item.selectedSize)} style={styles.removeButton} disabled={cashRegisterStatus !== 'open'}><XCircle size={16} /></button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            
                            <div style={{marginTop: 'auto'}}>
                                {cart.length > 0 ? (
                                    <div style={styles.cartTotalSection}>
                                        <div style={styles.cartTotalRow}>
                                            <span>Subtotal:</span>
                                            <span>R$ {formatCurrency(calculateSubtotal)}</span>
                                        </div>
                                        <button onClick={() => setIsDiscountModalOpen(true)} style={styles.discountLink} disabled={isDiscountModalOpen || discountRequestStatus === 'pending' || cart.length === 0}>
                                            <BadgePercent size={14} style={{ marginRight: '4px' }}/>
                                            {discount.value > 0 ? 'Editar Desconto' : 'Aplicar Desconto'}
                                        </button>
                                        {discount.value > 0 && (
                                            <div style={styles.cartTotalRow}>
                                                <span>Desconto ({discount.value}{discount.type}):</span>
                                                <span style={{color: '#dc3545'}}>- R$ {formatCurrency(discountAmount)} <XCircle size={14} style={{cursor: 'pointer', marginLeft: '5px'}} onClick={handleRemoveDiscount} /></span>
                                            </div>
                                        )}
                                        <div style={{...styles.cartTotalRow, ...styles.cartFinalTotal}}>
                                            <span>Total Final:</span>
                                            <span>R$ {formatCurrency(calculateTotal)}</span>
                                        </div>
                                    </div>
                                ) : null}
                                
                                <div style={styles.customerSection}>
                                    <div style={styles.inputGroup}>
                                        <label style={styles.label}>
                                            <UserSearch size={16} style={{ marginRight: '8px' }}/>
                                            Cliente
                                        </label>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                            <p style={{ flexGrow: 1, padding: '10px', backgroundColor: '#e9ecef', borderRadius: '6px' }}>
                                                {selectedCustomer.name}
                                            </p>
                                            <button onClick={() => setIsQuickAddModalOpen(true)} style={{...styles.selectProductButton, backgroundColor: '#28a745', flexShrink: 0}} title="Adicionar Novo Cliente">
                                                <UserPlus size={16}/>
                                            </button>
                                            <button onClick={() => setShowCustomerSearchModal(true)} style={{...styles.selectProductButton, flexShrink: 0}} title="Buscar Cliente">
                                                Buscar
                                            </button>
                                            <button onClick={handleClearCustomer} style={{...styles.removeButton, flexShrink: 0}} title="Limpar Cliente">
                                                <UserX size={16}/>
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                <div style={styles.sellerSection}>
                                    <div style={styles.inputGroup}>
                                        <label style={styles.label} htmlFor="seller">
                                            <UserCheck size={16} style={{ marginRight: '8px' }}/>
                                            Vendedor(a) Responsável
                                        </label>
                                        <select
                                            id="seller"
                                            value={selectedSellerId}
                                            onChange={(e) => setSelectedSellerId(e.target.value)}
                                            style={styles.select}
                                            disabled={cashRegisterStatus !== 'open'}
                                            required
                                        >
                                            <option value="">-- Selecione o Vendedor --</option>
                                            {employees.map(emp => (
                                                <option key={emp.id} value={emp.id}>
                                                    {emp.username || emp.email}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                </div>


                                <div style={styles.paymentSection}>
                                    <h4 style={styles.paymentSectionTitle}>Pagamento</h4>
                                    <div style={styles.paymentAddContainer}>
                                        <select value={currentPaymentMethod} onChange={(e) => setCurrentPaymentMethod(e.target.value)} style={styles.paymentSelect} disabled={cashRegisterStatus !== 'open' || amountRemaining <= 0}>
                                            <option value="">Selecione o Método</option>
                                            <option value="Dinheiro">Dinheiro</option>
                                            <option value="Cartao de Debito">Cartão de Débito</option>
                                            <option value="Cartao de Credito a Vista">Crédito à Vista</option>
                                            <option value="Cartao de Credito Parcelado 2x">Crédito 2x</option>
                                            <option value="Cartao de Credito Parcelado 3x">Crédito 3x</option>
                                            <option value="Cartao de Credito Parcelado 4x">Crédito 4x</option>
                                            <option value="Cartao de Credito Parcelado 5x">Crédito 5x</option>
                                            <option value="Cartao de Credito Parcelado 6x">Crédito 6x</option>
                                            <option value="PIX">PIX</option>
                                        </select>
                                        <input type="number" placeholder="Valor" value={currentPaymentAmount} onChange={(e) => setCurrentPaymentAmount(e.target.value)} style={styles.paymentInput} disabled={cashRegisterStatus !== 'open' || amountRemaining <= 0} />
                                        <button onClick={handleAddPayment} style={styles.paymentAddButton} disabled={cashRegisterStatus !== 'open' || amountRemaining <= 0}><PlusCircle size={18}/></button>
                                    </div>

                                    {paymentMethods.length > 0 && (
                                        <ul style={styles.paymentList}>
                                            {paymentMethods.map((p, index) => (
                                                <li key={index} style={styles.paymentListItem}>
                                                    <span>{p.method}: R$ {formatCurrency(p.amount)}</span>
                                                    <button onClick={() => handleRemovePayment(index)} style={styles.paymentListItemRemove}><Trash2 size={16}/></button>
                                                </li>
                                            ))}
                                        </ul>
                                    )}

                                    <div style={styles.paymentSummary}>
                                        <p>Total Pago: <span style={styles.paymentPaid}>R$ {formatCurrency(totalPaid)}</span></p>
                                        <p>Restante: <span style={styles.paymentRemaining}>R$ {formatCurrency(amountRemaining)}</span></p>
                                    </div>
                                </div>
                            </div>

                        </div>
                    )}
                    <button
                        onClick={handleFinalizeSale}
                        style={styles.checkoutButton}
                        disabled={isProcessingSale || cart.length === 0 || Math.abs(amountRemaining) > 0.01 || !selectedSellerId || !selectedCustomer.id || cashRegisterStatus !== 'open' || discountRequestStatus === 'pending'}
                    >
                        <DollarSign size={24} style={{ marginRight: '10px' }} />
                        {isProcessingSale ? 'Processando...' : 'Finalizar Venda'}
                    </button>
                </div>
            </div>

            <div style={styles.salesHistorySection}>
                <h2 style={styles.salesHistoryTitle}><History size={24} /> Histórico de Transações</h2>
                <ul style={styles.salesHistoryList}>
                    {salesHistory.length === 0 ? (
                        <p style={{ textAlign: 'center', color: '#666' }}>Nenhuma transação registrada ainda.</p>
                    ) : (
                        salesHistory.map(transaction => {
                            if (transaction.status === 'exchange_adjustment') {
                                return (
                                    <li key={transaction.id} style={styles.exchangeHistoryItem}>
                                        <div>
                                            <p><strong>Registro de Troca</strong> (Venda: {transaction.originalSaleId.substring(0, 8)}...)</p>
                                            <p style={{fontSize: '0.9em', color: '#555'}}>Data: {formatDateTime(transaction.date)}</p>
                                        </div>
                                        <div>
                                            <p style={{fontWeight: 'bold', color: transaction.type.includes('positive') ? '#28a745' : '#dc3545'}}>
                                                Diferença: R$ {formatCurrency(transaction.amount)}
                                            </p>
                                            <p style={{fontSize: '0.9em', color: '#555'}}>{Array.isArray(transaction.paymentMethods) ? transaction.paymentMethods.map(p => p.method).join(', ') : transaction.paymentMethod}</p>
                                        </div>
                                    </li>
                                );
                            } else {
                                return (
                                    <li key={transaction.id} style={styles.salesHistoryItem}>
                                        <div style={styles.salesHistoryItemHeader}>
                                            <span>Venda ID: {transaction.id.substring(0, 8)}...</span>
                                            <span>Vendedor: {transaction.sellerInfo?.name || 'N/A'}</span>
                                            <span>Total: R$ {formatCurrency(transaction.totalAmount)}</span>
                                            <span>Status: {transaction.status === 'completed' ? 'Completa' : transaction.status === 'partially_returned' ? 'Dev. Parcial' : transaction.status === 'partially_exchanged' ? 'Troc. Parcial' : transaction.status}</span>
                                        </div>
                                        <button
                                            onClick={() => handleShowSaleDetail(transaction)}
                                            style={styles.historyDetailButton}
                                        >
                                            Ver Detalhes
                                        </button>
                                    </li>
                                );
                            }
                        })
                    )}
                </ul>
            </div>

            {showVariationModal && selectedProductForVariation && (
                <div style={styles.modalOverlay}>
                    <div style={styles.modalContent}>
                        <button onClick={handleCloseVariationModal} style={styles.modalCloseButton}><XCircle size={24} /></button>
                        <h3 style={styles.modalTitle}>Selecionar Variação de {selectedProductForVariation.name}</h3>
                        <div style={styles.inputGroup}>
                            <label style={styles.label}>Cor:</label>
                            <select value={selectedVariation.color} onChange={(e) => handleSelectedVariationChange('color', e.target.value)} style={styles.select} required>
                                <option value="">Selecione uma cor</option>
                                {[...new Set((selectedProductForVariation.variations || []).map(v => v.color))].map(color => (
                                    <option key={color} value={color}>{color}</option>
                                ))}
                            </select>
                        </div>
                        {selectedVariation.color && (
                            <div style={styles.inputGroup}>
                                <label style={styles.label}>Tamanho:</label>
                                <select value={selectedVariation.size} onChange={(e) => handleSelectedVariationChange('size', e.target.value)} style={styles.select} required>
                                    <option value="">Selecione um tamanho</option>
                                    {(selectedProductForVariation.variations || []).filter(v => v.color === selectedVariation.color).sort((a, b) => { const sizeOrder = { 'PP': 1, 'P': 2, 'M': 3, 'G': 4, 'GG': 5, 'XG': 6, 'XXG': 7, 'Único': 100 }; const numA = parseInt(a.size); const numB = parseInt(b.size); if (!isNaN(numA) && !isNaN(numB)) return numA - numB; if (isNaN(numA) && isNaN(numB)) return (sizeOrder[a.size] || 99) - (sizeOrder[b.size] || 99); return isNaN(numA) ? 1 : -1; }).map(v => (
                                        <option key={`${v.color}-${v.size}`} value={v.size} disabled={v.quantity <= 0}>
                                            {v.size} (Estoque: {v.quantity})
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )}
                        {selectedVariation.color && selectedVariation.size && (
                            <div style={styles.inputGroup}>
                                <label style={styles.label}>Quantidade:</label>
                                <input type="number" min="1" value={selectedVariation.quantity} onChange={(e) => handleSelectedVariationChange('quantity', parseInt(e.target.value))} style={styles.input} />
                            </div>
                        )}
                        {error && <p style={styles.modalErrorMessage}>{error}</p>}
                        <div style={styles.modalActions}>
                            {isExchangeFlow ? (
                                <button onClick={handleAddVariationToExchangeCart} style={styles.modalAddButton}>Adicionar ao Carrinho de Troca</button>
                            ) : (
                                <button onClick={handleAddVariationToCart} style={styles.modalAddButton}>Adicionar ao Carrinho</button>
                            )}
                            <button onClick={handleCloseVariationModal} style={styles.modalCancelButton}>Cancelar</button>
                        </div>
                    </div>
                </div>
            )}
            {showSaleDetailModal && selectedSaleDetail && (
                <div style={styles.modalOverlay}>
                    <div style={styles.modalContent}>
                        <button onClick={handleCloseSaleDetailModal} style={styles.modalCloseButton}><XCircle size={24} /></button>
                        <h2 style={styles.modalTitle}>Detalhes da Venda</h2>
                        <p><strong>ID da Venda:</strong> {selectedSaleDetail.id}</p>
                        <p><strong>Data:</strong> {formatDateTime(selectedSaleDetail.date)}</p>
                        <p><strong>Vendedor:</strong> {selectedSaleDetail.sellerInfo?.name || 'N/A'}</p>
                        <p><strong>Cliente:</strong> {selectedSaleDetail.customerInfo?.name || 'N/A'}</p>
                        <p><strong>Método(s) de Pagamento:</strong> 
                            {Array.isArray(selectedSaleDetail.paymentMethods) 
                                ? selectedSaleDetail.paymentMethods.map(p => `${p.method} (R$ ${formatCurrency(p.amount)})`).join(' + ') 
                                : 'N/A'
                            }
                        </p>
                        <p><strong>Total:</strong> R$ {formatCurrency(selectedSaleDetail.totalAmount)}</p>
                        <p><strong>Loja:</strong> {selectedSaleDetail.storeName}</p>

                        <h3 style={{ marginTop: '20px', marginBottom: '10px', color: '#333' }}>Itens Vendidos:</h3>
                        <ul style={styles.salesHistoryProductsList}>
                            {selectedSaleDetail.items.map((item, index) => {
                                const currentlyReturned = (selectedSaleDetail.returnedItems || []).reduce((acc, returned) => {
                                    if (
                                        returned.originalItemId === item.productId &&
                                        returned.color === item.selectedColor &&
                                        returned.size === item.selectedSize
                                    ) {
                                        return acc + returned.quantityReturned;
                                    }
                                    return acc;
                                }, 0);
                                const remainingQuantity = item.quantity - currentlyReturned;

                                return (
                                    <li key={index} style={styles.salesHistoryProductItem}>
                                        {item.productName} ({item.selectedColor} - {item.selectedSize}) x {item.quantity} = R$ {formatCurrency(item.subtotal)}
                                        {remainingQuantity > 0 ? (
                                            <button
                                                onClick={() => handleOpenReturnExchangeModal(item, currentlyReturned)}
                                                style={{ ...styles.returnExchangeButton, marginLeft: '10px' }}
                                                title="Devolver ou Trocar este item"
                                            >
                                                <RefreshCcw size={16} /> Trocar/Devolver
                                            </button>
                                        ) : (
                                            <span style={styles.returnedItemInfo}>(Item já devolvido/trocado)</span>
                                        )}
                                    </li>
                                )
                            })}
                        </ul>
                        {selectedSaleDetail.returnedItems && selectedSaleDetail.returnedItems.length > 0 && (
                            <>
                                <h3 style={{ marginTop: '20px', marginBottom: '10px', color: '#333' }}>Histórico de Devoluções/Trocas:</h3>
                                <ul style={styles.salesHistoryProductsList}>
                                    {selectedSaleDetail.returnedItems.map((returned, index) => (
                                        <li key={index} style={styles.salesHistoryProductItem}>
                                            Devolvido: {returned.originalItemName} ({returned.color} - {returned.size}) x {returned.quantityReturned} em {formatDateTime(returned.returnDate)} - Motivo: {returned.reason}
                                            {returned.exchange && (
                                                <p style={{ marginLeft: '20px', fontStyle: 'italic', fontSize: '0.9em' }}>
                                                    Trocado por: {returned.exchange.newItems.map(ni => `${ni.productName} (${ni.selectedColor} - ${ni.selectedSize}) x ${ni.quantity}`).join(', ')} (Dif: R$ {formatCurrency(returned.exchange.priceDifference)}) - Pgto: {Array.isArray(returned.exchange.paymentMethods) ? returned.exchange.paymentMethods.map(p => p.method).join(', ') : 'N/A'}
                                                </p>
                                            )}
                                        </li>
                                    ))}
                                </ul>
                            </>
                        )}
                        <div style={styles.modalActions}>
                            <button onClick={handleCloseSaleDetailModal} style={styles.modalCancelButton}>Fechar</button>
                        </div>
                    </div>
                </div>
            )}
            {isReturnExchangeModalOpen && saleItemForReturnExchange && (
                <div style={styles.modalOverlay}>
                    <div style={styles.modalContent}>
                       <button onClick={handleCloseReturnExchangeModal} style={styles.modalCloseButton}><XCircle size={24} /></button>
                        <h2 style={styles.modalTitle}>Ação para: {saleItemForReturnExchange.productName} ({saleItemForReturnExchange.selectedColor} - {saleItemForReturnExchange.selectedSize})</h2>
                        <p>Quantidade vendida original: {saleItemForReturnExchange.quantity} | Já devolvido: {quantityAlreadyReturned} | **Disponível para troca: {saleItemForReturnExchange.quantity - quantityAlreadyReturned}**</p>
                        <p>Valor do item devolvido: R$ {formatCurrency(saleItemForReturnExchange.pricePerUnit * returnQuantity)}</p>
                        <div style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', gap: '15px' }}>
                            <div style={styles.inputGroup}>
                                <label style={styles.label}>Quantidade a Devolver:</label>
                                <input type="number" min="1" max={saleItemForReturnExchange.quantity - quantityAlreadyReturned} value={returnQuantity} onChange={(e) => setReturnQuantity(parseInt(e.target.value, 10) || 1)} style={styles.input} />
                            </div>
                            <div style={styles.inputGroup}>
                                <label style={styles.label}>Motivo da Devolução/Troca:</label>
                                <textarea value={returnReason} onChange={(e) => setReturnReason(e.target.value)} rows="3" placeholder="Ex: Tamanho errado, Defeito, Cliente não gostou" style={{...styles.input, width: '100%', boxSizing: 'border-box'}}></textarea>
                            </div>
                            {error && <p style={styles.modalErrorMessage}>{error}</p>}
                            {successMessage && <p style={styles.messageSuccess}>{successMessage}</p>}
                            {!isExchangeFlow ? (
                                <div style={styles.returnExchangeModalActions}>
                                    <button onClick={handleReturnConfirm} style={{ ...styles.returnExchangeOptionButton, ...styles.returnExchangeOptionButtonReturn }} disabled={isProcessingSale}> <Trash2 size={18} /> Confirmar Devolução </button>
                                    <button onClick={() => setIsExchangeFlow(true)} style={{ ...styles.returnExchangeOptionButton, ...styles.returnExchangeOptionButtonExchange }} disabled={isProcessingSale}> <RefreshCcw size={18} /> Iniciar Troca </button>
                                </div>
                            ) : (
                                <>
                                    {showingExchangeVariationSelection && selectedProductForVariation ? (
                                        <>
                                            <h3 style={styles.modalTitle}>Selecionar Variação de {selectedProductForVariation.name}</h3>
                                            <div style={styles.inputGroup}>
                                                <label style={styles.label}>Cor:</label>
                                                <select value={selectedVariation.color} onChange={(e) => handleSelectedVariationChange('color', e.target.value)} style={styles.select} required disabled={isProcessingSale}>
                                                    <option value="">Selecione uma cor</option>
                                                    {[...new Set((selectedProductForVariation.variations || []).map(v => v.color))].map(color => (
                                                        <option key={color} value={color}>{color}</option>
                                                    ))}
                                                </select>
                                            </div>
                                            {selectedVariation.color && (
                                                <div style={styles.inputGroup}>
                                                    <label style={styles.label}>Tamanho:</label>
                                                    <select value={selectedVariation.size} onChange={(e) => handleSelectedVariationChange('size', e.target.value)} style={styles.select} required disabled={isProcessingSale}>
                                                        <option value="">Selecione um tamanho</option>
                                                        {(selectedProductForVariation.variations || []).filter(v => v.color === selectedVariation.color).sort((a, b) => { const sizeOrder = { 'PP': 1, 'P': 2, 'M': 3, 'G': 4, 'GG': 5, 'XG': 6, 'XXG': 7, 'Único': 100 }; const numA = parseInt(a.size); const numB = parseInt(b.size); if (!isNaN(numA) && !isNaN(numB)) return numA - numB; if (isNaN(numA) && isNaN(numB)) return (sizeOrder[a.size] || 99) - (sizeOrder[b.size] || 99); return isNaN(numA) ? 1 : -1; }).map(v => (
                                                            <option key={`${v.color}-${v.size}`} value={v.size}>
                                                                {v.size} (Estoque: {v.quantity})
                                                            </option>
                                                        ))}
                                                    </select>
                                                </div>
                                            )}
                                            {selectedVariation.color && selectedVariation.size && (
                                                <div style={styles.inputGroup}>
                                                    <label style={styles.label}>Quantidade:</label>
                                                    <input type="number" min="1" value={selectedVariation.quantity} onChange={(e) => handleSelectedVariationChange('quantity', parseInt(e.target.value, 10) || 1)} style={styles.input} disabled={isProcessingSale}/>
                                                </div>
                                            )}
                                            <div style={styles.modalActions}>
                                                <button onClick={handleAddVariationToExchangeCart} style={styles.modalAddButton} disabled={isProcessingSale}>Adicionar ao Carrinho de Troca</button>
                                                <button onClick={() => { setSelectedProductForVariation(null); setSelectedVariation({ color: '', size: '', quantity: 1 }); setShowingExchangeVariationSelection(false); }} style={styles.modalCancelButton} disabled={isProcessingSale}>Voltar à Busca</button>
                                            </div>
                                        </>
                                    ) : (
                                        <>
                                            <h3 style={styles.modalTitle}>Adicionar Produtos para Troca</h3>
                                            <div style={styles.inputGroup}>
                                                <label style={styles.label}>Buscar Novo Produto:</label>
                                                <div style={styles.searchContainer}>
                                                    <input type="text" placeholder="Nome, código ou código de barras" value={exchangeSearchTerm} onChange={(e) => setExchangeSearchTerm(e.target.value)} style={styles.searchInput} disabled={isProcessingSale} />
                                                    <button onClick={handleExchangeSearch} style={styles.searchButton} disabled={isProcessingSale}> <Search size={20} /> Buscar </button>
                                                </div>
                                            </div>
                                            {exchangeSearchResults.length > 0 && (
                                                <div style={styles.searchResultsContainer}>
                                                    {exchangeSearchResults.map(product => (
                                                        <div key={product.id} style={styles.searchResultItem}>
                                                            <span>{product.name} (SKU: {product.code}) - R$ {formatCurrency(product.price)}</span>
                                                            <button onClick={() => handleAddProductToExchangeCart(product)} style={styles.selectProductButton} disabled={isProcessingSale}>Selecionar e Adicionar</button>
                                                        </div>
                                                    ))}
                                                    <button onClick={handleClearExchangeSearch} style={styles.clearSearchButton} disabled={isProcessingSale}>Limpar Busca</button>
                                                </div>
                                            )}
                                        </>
                                    )}
                                    {exchangeCart.length > 0 && (
                                        <div style={styles.exchangeCartSection}>
                                            <h4 style={styles.exchangeCartTitle}>Itens no Carrinho de Troca:</h4>
                                            <ul>
                                                {exchangeCart.map(item => (
                                                    <li key={`${item.id}-${item.selectedColor}-${item.selectedSize}`} style={styles.exchangeCartItem}>
                                                        <div>
                                                            <p><strong>{item.name} ({item.selectedColor} - {item.selectedSize})</strong></p>
                                                            <p>R$ {formatCurrency(item.price)} x {item.quantity} = R$ {formatCurrency(item.price * item.quantity)}</p>
                                                        </div>
                                                        <div style={styles.quantityControls}>
                                                            <button onClick={() => handleExchangeCartQuantityChange(item.id, item.selectedColor, item.selectedSize, -1)} style={styles.quantityButton} disabled={isProcessingSale}><MinusCircle size={16} /></button>
                                                            <span>{item.quantity}</span>
                                                            <button onClick={() => handleExchangeCartQuantityChange(item.id, item.selectedColor, item.selectedSize, 1)} style={styles.quantityButton} disabled={isProcessingSale}><PlusCircle size={16} /></button>
                                                            <button onClick={() => handleRemoveFromExchangeCart(item.id, item.selectedColor, item.selectedSize)} style={styles.removeButton} disabled={isProcessingSale}><XCircle size={16} /></button>
                                                        </div>
                                                    </li>
                                                ))}
                                            </ul>
                                            <p style={styles.exchangeCartTotal}>Total do Carrinho de Troca: R$ {formatCurrency(calculateExchangeCartTotal)}</p>
                                            <p style={{ ...styles.exchangeDifference, color: calculatePriceDifference >= 0 ? '#28a745' : '#dc3545' }}>
                                                Diferença: R$ {formatCurrency(Math.abs(calculatePriceDifference))} ({calculatePriceDifference >= 0 ? 'Cliente Paga' : 'Loja Devolve'})
                                            </p>
                                        </div>
                                    )}
                                    {(calculatePriceDifference > 0) && (
                                        <div style={styles.paymentSection}>
                                            <h4 style={styles.paymentSectionTitle}>Pagamento da Diferença</h4>
                                            <div style={styles.paymentAddContainer}>
                                                <select value={currentExchangePaymentMethod} onChange={(e) => setCurrentExchangePaymentMethod(e.target.value)} style={styles.paymentSelect} disabled={isProcessingSale || exchangeAmountRemaining <= 0}>
                                                    <option value="">Selecione o Método</option>
                                                    <option value="Dinheiro">Dinheiro</option>
                                                    <option value="Cartao de Debito">Cartão de Débito</option>
                                                    <option value="Cartao de Credito a Vista">Crédito à Vista</option>
                                                    <option value="Cartao de Credito Parcelado 2x">Crédito 2x</option>
                                                    <option value="Cartao de Credito Parcelado 3x">Crédito 3x</option>
                                                    <option value="Cartao de Credito Parcelado 4x">Crédito 4x</option>
                                                    <option value="Cartao de Credito Parcelado 5x">Crédito 5x</option>
                                                    <option value="Cartao de Credito Parcelado 6x">Crédito 6x</option>
                                                    <option value="PIX">PIX</option>
                                                </select>
                                                <input type="number" placeholder="Valor" value={currentExchangePaymentAmount} onChange={(e) => setCurrentExchangePaymentAmount(e.target.value)} style={styles.paymentInput} disabled={isProcessingSale || exchangeAmountRemaining <= 0} />
                                                <button onClick={handleAddExchangePayment} style={styles.paymentAddButton} disabled={isProcessingSale || exchangeAmountRemaining <= 0}><PlusCircle size={18}/></button>
                                            </div>

                                            {exchangePayments.length > 0 && (
                                                <ul style={styles.paymentList}>
                                                    {exchangePayments.map((p, index) => (
                                                        <li key={index} style={styles.paymentListItem}>
                                                            <span>{p.method}: R$ {formatCurrency(p.amount)}</span>
                                                            <button onClick={() => handleRemoveExchangePayment(index)} style={styles.paymentListItemRemove}><Trash2 size={16}/></button>
                                                        </li>
                                                    ))}
                                                </ul>
                                            )}

                                            <div style={styles.paymentSummary}>
                                                <p>Total Pago: <span style={styles.paymentPaid}>R$ {formatCurrency(totalExchangePaid)}</span></p>
                                                <p>Restante: <span style={styles.paymentRemaining}>R$ {formatCurrency(exchangeAmountRemaining)}</span></p>
                                            </div>
                                        </div>
                                    )}
                                    <div style={styles.modalActions}>
                                        <button onClick={handleFinalizeExchange} style={styles.modalAddButton} disabled={isProcessingSale || (calculatePriceDifference > 0 && Math.abs(exchangeAmountRemaining) > 0.01)}>Finalizar Troca</button>
                                        <button onClick={() => setIsExchangeFlow(false)} style={styles.modalCancelButton} disabled={isProcessingSale}>Voltar para Devolução</button>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {showCustomerSearchModal && (
                <div style={styles.modalOverlay}>
                    <div style={styles.modalContent}>
                        <button onClick={() => setShowCustomerSearchModal(false)} style={styles.modalCloseButton}><XCircle size={24} /></button>
                        <h2 style={styles.modalTitle}>Buscar Cliente</h2>
                        <div style={styles.searchContainer}>
                            <input
                                type="text"
                                placeholder="Buscar por nome ou CPF"
                                value={customerSearchTerm}
                                onChange={(e) => setCustomerSearchTerm(e.target.value)}
                                style={styles.searchInput}
                            />
                            <button onClick={handleSearchCustomers} style={styles.searchButton}>
                                <Search size={20} /> Buscar
                            </button>
                        </div>

                        {error && <p style={styles.modalErrorMessage}>{error}</p>}
                        
                        {customerSearchResults.length > 0 && (
                            <ul style={styles.customerSearchModalList}>
                                {customerSearchResults.map(customer => (
                                    <li 
                                        key={customer.id} 
                                        style={styles.customerSearchModalItem}
                                        onClick={() => handleSelectCustomer(customer)}
                                    >
                                        <strong>{customer.name}</strong>
                                        <br />
                                        <small>CPF: {customer.cpf || 'Não informado'} - Tel: {customer.phone || 'Não informado'}</small>
                                    </li>
                                ))}
                            </ul>
                        )}

                        <div style={styles.modalActions}>
                            <button onClick={() => setShowCustomerSearchModal(false)} style={styles.modalCancelButton}>Cancelar</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default SalesPage;


