// src/pages/PurchasesPage.js
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '../components/AuthProvider';
import { useFirebase } from '../contexts/FirebaseContext';
import {
    collection,
    doc,
    addDoc,
    updateDoc,
    deleteDoc,
    onSnapshot,
    query,
    orderBy,
    runTransaction,
    serverTimestamp,
    getDocs,
    getDoc,
    setDoc,
    where,
    writeBatch
} from 'firebase/firestore';
import { ShoppingCart, DollarSign, PlusCircle, Trash2, Calendar, CheckCircle, XCircle, Package, Landmark, Search, PackagePlus, Zap, Edit, FileText, Repeat, Archive, ClipboardList, Eraser } from 'lucide-react';

// --- Componentes de Modal ---
const QuickAddSupplierModal = ({ isOpen, onClose, onSupplierAdded }) => {
    const { db } = useFirebase();
    const [newSupplierName, setNewSupplierName] = useState('');
    const [error, setError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const suppliersDocRef = useMemo(() => db ? doc(db, 'product_attributes', 'suppliers') : null, [db]);

    const handleSaveSupplier = async (e) => {
        e.preventDefault();
        if (!newSupplierName.trim()) {
            setError("O nome do fornecedor é obrigatório.");
            return;
        }
        setIsSubmitting(true);
        setError('');
        try {
            const docSnap = await getDoc(suppliersDocRef);
            const existingSuppliers = docSnap.exists() ? docSnap.data().items || [] : [];
            if (existingSuppliers.includes(newSupplierName.trim())) {
                setError("Este fornecedor já existe.");
                setIsSubmitting(false);
                return;
            }
            const newSuppliers = [...existingSuppliers, newSupplierName.trim()];
            await setDoc(suppliersDocRef, { items: newSuppliers });
            onSupplierAdded({ id: newSupplierName.trim(), name: newSupplierName.trim() });
            setNewSupplierName('');
            onClose();
        } catch (err) {
            console.error("Erro ao adicionar fornecedor:", err);
            setError("Falha ao salvar fornecedor.");
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div style={styles.modalOverlay}>
            <div style={styles.modalContent}>
                <h2 style={styles.modalTitle}>Cadastrar Novo Fornecedor</h2>
                {error && <p style={styles.messageError}>{error}</p>}
                <form onSubmit={handleSaveSupplier}>
                    <div style={styles.inputGroup}>
                        <label style={styles.label}>Nome do Fornecedor</label>
                        <input type="text" value={newSupplierName} onChange={e => setNewSupplierName(e.target.value)} style={styles.input} required />
                    </div>
                    <div style={styles.modalActions}>
                        <button type="button" onClick={onClose} style={{...styles.button, backgroundColor: '#6c757d'}}>Cancelar</button>
                        <button type="submit" style={{...styles.button, backgroundColor: '#28a745'}} disabled={isSubmitting}>{isSubmitting ? 'Salvando...' : 'Salvar'}</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

// NOVO: Componente do Modal de Cadastro Rápido de Categoria de Despesa
const QuickAddExpenseCategoryModal = ({ isOpen, onClose, onCategoryAdded }) => {
    const { db } = useFirebase();
    const [newCategoryName, setNewCategoryName] = useState('');
    const [error, setError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const categoriesDocRef = useMemo(() => db ? doc(db, 'product_attributes', 'expense_categories') : null, [db]);

    const handleSaveCategory = async (e) => {
        e.preventDefault();
        if (!newCategoryName.trim()) {
            setError("O nome da categoria é obrigatório.");
            return;
        }
        setIsSubmitting(true);
        setError('');
        try {
            const docSnap = await getDoc(categoriesDocRef);
            const existingCategories = docSnap.exists() ? docSnap.data().items || [] : [];
            if (existingCategories.includes(newCategoryName.trim())) {
                setError("Esta categoria já existe.");
                setIsSubmitting(false);
                return;
            }
            const newCategories = [...existingCategories, newCategoryName.trim()];
            await setDoc(categoriesDocRef, { items: newCategories }, { merge: true });
            onCategoryAdded(newCategoryName.trim());
            setNewCategoryName('');
            onClose();
        } catch (err) {
            console.error("Erro ao adicionar categoria de despesa:", err);
            setError("Falha ao salvar categoria.");
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div style={styles.modalOverlay}>
            <div style={styles.modalContent}>
                <h2 style={styles.modalTitle}>Cadastrar Nova Categoria de Despesa</h2>
                {error && <p style={styles.messageError}>{error}</p>}
                <form onSubmit={handleSaveCategory}>
                    <div style={styles.inputGroup}>
                        <label style={styles.label}>Nome da Categoria</label>
                        <input type="text" value={newCategoryName} onChange={e => setNewCategoryName(e.target.value)} style={styles.input} required />
                    </div>
                    <div style={styles.modalActions}>
                        <button type="button" onClick={onClose} style={{...styles.button, backgroundColor: '#6c757d'}}>Cancelar</button>
                        <button type="submit" style={{...styles.button, backgroundColor: '#28a745'}} disabled={isSubmitting}>{isSubmitting ? 'Salvando...' : 'Salvar'}</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

const QuickAddProductModal = ({ isOpen, onClose, onProductAdded, suppliers, categories, colors, sizeGrades, stores }) => {
    const { currentUser } = useAuth();
    const { db } = useFirebase();
    const productsCollectionRef = useMemo(() => db ? collection(db, 'products') : null, [db]);
    const [newProductCode, setNewProductCode] = useState('');
    const [newProductName, setNewProductName] = useState('');
    const [newProductPrice, setNewProductPrice] = useState('');
    const [newProductCostPrice, setNewProductCostPrice] = useState('');
    const [newProductCategory, setNewProductCategory] = useState('');
    const [newProductSupplier, setNewProductSupplier] = useState('');
    const [newProductGender, setNewProductGender] = useState('');
    const [newProductColorVariations, setNewProductColorVariations] = useState([]);
    const [error, setError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setNewProductCode(''); setNewProductName(''); setNewProductPrice(''); setNewProductCostPrice('');
            setNewProductCategory(categories[0] || ''); setNewProductSupplier(suppliers[0]?.id || '');
            setNewProductGender('Unissex');
            setNewProductColorVariations([{ id: Date.now(), selectedColor: colors[0] || '', selectedSizeGrade: '', sizes: [''] }]);
            setError('');
        }
    }, [isOpen, categories, suppliers, colors]);

    const handleAddColorVariationBlock = () => setNewProductColorVariations([...newProductColorVariations, { id: Date.now(), selectedColor: '', selectedSizeGrade: '', sizes: [''] }]);
    const handleRemoveColorVariationBlock = (id) => setNewProductColorVariations(newProductColorVariations.filter(block => block.id !== id));
    const handleVariationChange = (blockId, field, value) => {
        setNewProductColorVariations(prev => prev.map(block => {
            if (block.id === blockId) {
                if (field === 'selectedSizeGrade') {
                    const newSizes = value && value !== 'custom' && sizeGrades[value] ? sizeGrades[value].map(size => size) : [''];
                    return { ...block, selectedSizeGrade: value, sizes: newSizes };
                }
                return { ...block, [field]: value };
            }
            return block;
        }));
    };
    
    const handleSaveProduct = async (e) => {
        e.preventDefault();
        setError('');
        if (!newProductCode || !newProductName || !newProductCategory || !newProductSupplier) {
            setError("Código, Nome, Categoria e Fornecedor são obrigatórios.");
            return;
        }
        setIsSubmitting(true);
        try {
            const flattenedVariations = [];
            newProductColorVariations.forEach(colorBlock => {
                colorBlock.sizes.forEach(size => {
                    if (size.trim()) {
                        flattenedVariations.push({ color: colorBlock.selectedColor.trim(), size: size.trim() });
                    }
                });
            });

            const productData = {
                code: newProductCode.trim(), name: newProductName.trim(), name_lowercase: newProductName.trim().toLowerCase(),
                price: parseFloat(newProductPrice) || 0, costPrice: parseFloat(newProductCostPrice) || 0,
                category: newProductCategory, supplier: newProductSupplier, gender: newProductGender,
                createdAt: serverTimestamp(), createdBy: currentUser.email, variations: flattenedVariations,
            };

            const docRef = await addDoc(productsCollectionRef, productData);
            onProductAdded({ id: docRef.id, ...productData });
            onClose();
        } catch (err) {
            console.error("Erro ao adicionar produto:", err);
            setError(`Falha ao salvar: ${err.message}`);
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div style={styles.modalOverlay}>
            <div style={{...styles.modalContent, maxWidth: '800px'}}>
                <button onClick={onClose} style={{position: 'absolute', top: 15, right: 15, background: 'none', border: 'none', cursor: 'pointer'}}><XCircle size={24} /></button>
                <h2 style={styles.modalTitle}>Cadastrar Novo Produto Rápido</h2>
                {error && <p style={styles.messageError}>{error}</p>}
                <form onSubmit={handleSaveProduct} style={{maxHeight: '70vh', overflowY: 'auto', padding: '10px'}}>
                    <div style={styles.formGrid}>
                        <div style={styles.inputGroup}><label style={styles.label}>Código/SKU</label><input type="text" value={newProductCode} onChange={e => setNewProductCode(e.target.value)} style={styles.input} required /></div>
                        <div style={styles.inputGroup}><label style={styles.label}>Nome do Produto</label><input type="text" value={newProductName} onChange={e => setNewProductName(e.target.value)} style={styles.input} required /></div>
                        <div style={styles.inputGroup}><label style={styles.label}>Preço de Venda (R$)</label><input type="number" step="0.01" value={newProductPrice} onChange={e => setNewProductPrice(e.target.value)} style={styles.input} /></div>
                        <div style={styles.inputGroup}><label style={styles.label}>Preço de Custo (R$)</label><input type="number" step="0.01" value={newProductCostPrice} onChange={e => setNewProductCostPrice(e.target.value)} style={styles.input} /></div>
                        <div style={styles.inputGroup}><label style={styles.label}>Categoria</label><select value={newProductCategory} onChange={e => setNewProductCategory(e.target.value)} style={styles.select} required><option value="">Selecione</option>{categories.map(c => <option key={c} value={c}>{c}</option>)}</select></div>
                        <div style={styles.inputGroup}><label style={styles.label}>Fornecedor</label><select value={newProductSupplier} onChange={e => setNewProductSupplier(e.target.value)} style={styles.select} required><option value="">Selecione</option>{suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></div>
                        <div style={styles.inputGroup}><label style={styles.label}>Gênero</label><select value={newProductGender} onChange={e => setNewProductGender(e.target.value)} style={styles.select} required><option value="Unissex">Unissex</option><option value="Masculino">Masculino</option><option value="Feminino">Feminino</option></select></div>
                    </div>
                    <div style={{marginTop: '20px'}}>
                        <h3 style={{...styles.sectionTitle, fontSize: '1.2em'}}>Variações (Apenas Cadastro)</h3>
                        {newProductColorVariations.map(block => (
                            <div key={block.id} style={{...styles.productItem, borderLeftColor: '#6c757d'}}>
                                <div style={styles.productItemHeader}>
                                    <select value={block.selectedColor} onChange={e => handleVariationChange(block.id, 'selectedColor', e.target.value)} style={styles.select}><option value="">Selecione a Cor</option>{colors.map(c => <option key={c} value={c}>{c}</option>)}</select>
                                    <button type="button" onClick={() => handleRemoveColorVariationBlock(block.id)} style={{...styles.button, backgroundColor: '#dc3545', padding: '5px 10px', fontSize: '0.8em'}}>X</button>
                                </div>
                                <select value={block.selectedSizeGrade} onChange={e => handleVariationChange(block.id, 'selectedSizeGrade', e.target.value)} style={styles.select}><option value="">Selecione a Grade</option>{Object.keys(sizeGrades).map(g => <option key={g} value={g}>{g}</option>)}</select>
                            </div>
                        ))}
                        <button type="button" onClick={handleAddColorVariationBlock} style={{...styles.button, backgroundColor: '#17a2b8', width: '100%', marginTop: '10px'}}>Adicionar Cor</button>
                    </div>
                    <div style={styles.modalActions}>
                        <button type="button" onClick={onClose} style={{...styles.button, backgroundColor: '#6c757d'}}>Cancelar</button>
                        <button type="submit" style={{...styles.button, backgroundColor: '#28a745'}} disabled={isSubmitting}>{isSubmitting ? 'Salvando...' : 'Salvar Produto'}</button>
                    </div>
                </form>
            </div>
        </div>
    );
};
const PurchaseDetailsModal = ({ isOpen, onClose, purchase }) => {
    if (!isOpen || !purchase) return null;

    const formatCurrency = (value) => `R$ ${parseFloat(value || 0).toFixed(2).replace('.', ',')}`;

    const totalItems = purchase.items.reduce((acc, item) => {
        return acc + item.variations.reduce((subAcc, v) => subAcc + (parseInt(v.purchaseQty) || 0), 0);
    }, 0);

    return (
        <div style={styles.modalOverlay}>
            <div style={{...styles.modalContent, maxWidth: '800px'}}>
                <button onClick={onClose} style={{position: 'absolute', top: 15, right: 15, background: 'none', border: 'none', cursor: 'pointer'}}><XCircle size={24} /></button>
                <h2 style={styles.modalTitle}>Detalhes da Compra</h2>
                <div style={{textAlign: 'left', marginBottom: '20px'}}>
                    <p><strong>Fornecedor:</strong> {purchase.supplierName}</p>
                    <p><strong>Descrição/NF:</strong> {purchase.description}</p>
                    <p><strong>Data da Compra:</strong> {new Date(purchase.issueDate).toLocaleDateString('pt-BR')}</p>
                    <p><strong>Custo Total:</strong> {formatCurrency(purchase.totalAmount)}</p>
                    <p><strong>Quantidade Total de Itens:</strong> {totalItems}</p>
                </div>

                <h3 style={{...styles.sectionTitle, fontSize: '1.2em'}}>Itens Inclusos:</h3>
                <div style={{maxHeight: '40vh', overflowY: 'auto'}}>
                    {purchase.items.map(item => (
                        <div key={item.productId} style={{...styles.productItem, borderLeftColor: '#6c757d'}}>
                            <div style={styles.productItemHeader}>
                                <span>{item.name} ({item.code})</span>
                            </div>
                            <table style={{...styles.table, marginTop: '10px'}}>
                                <thead>
                                    <tr>
                                        <th style={styles.tableHeader}>Cor</th>
                                        <th style={styles.tableHeader}>Tamanho</th>
                                        <th style={styles.tableHeader}>Quantidade</th>
                                        <th style={styles.tableHeader}>Custo Unit.</th>
                                        <th style={styles.tableHeader}>Subtotal</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {item.variations.map((v, index) => {
                                        const qty = parseInt(v.purchaseQty) || 0;
                                        const cost = parseFloat(v.purchaseCost) || 0;
                                        return (
                                            <tr key={index} style={styles.tableRow}>
                                                <td style={styles.tableCell}>{v.color}</td>
                                                <td style={styles.tableCell}>{v.size}</td>
                                                <td style={styles.tableCell}>{qty}</td>
                                                <td style={styles.tableCell}>{formatCurrency(cost)}</td>
                                                <td style={styles.tableCell}>{formatCurrency(qty * cost)}</td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    ))}
                </div>
                <div style={styles.modalActions}>
                    <button onClick={onClose} style={{...styles.button, backgroundColor: '#6c757d'}}>Fechar</button>
                </div>
            </div>
        </div>
    );
};

// --- Estilos ---
const styles = {
    container: {
        padding: '20px',
        maxWidth: '1200px',
        margin: '20px auto',
        fontFamily: "'Inter', sans-serif",
        color: '#333',
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
        borderRadius: '12px',
        marginBottom: '25px',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
    },
    sectionTitle: {
        color: '#2c3e50',
        fontSize: '1.6em',
        marginBottom: '20px',
        borderBottom: '2px solid #eee',
        paddingBottom: '10px',
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
    },
    formGrid: {
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
        padding: '12px 20px',
        borderRadius: '6px',
        border: 'none',
        color: 'white',
        fontSize: '1em',
        cursor: 'pointer',
        transition: 'background-color 0.3s ease',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px',
        fontWeight: '600',
    },
    table: {
        width: '100%',
        borderCollapse: 'collapse',
        marginTop: '20px',
    },
    tableHeader: {
        backgroundColor: '#f2f2f2',
        fontWeight: 'bold',
        textAlign: 'left',
        padding: '12px',
        borderBottom: '2px solid #ddd',
    },
    tableRow: {
        borderBottom: '1px solid #eee',
    },
    tableCell: {
        padding: '12px',
        verticalAlign: 'middle',
    },
    statusBadge: {
        padding: '4px 10px',
        borderRadius: '12px',
        fontSize: '0.8em',
        fontWeight: 'bold',
        color: 'white',
        textAlign: 'center',
    },
    actionButton: {
        background: 'none',
        border: '1px solid',
        borderRadius: '5px',
        cursor: 'pointer',
        padding: '6px 10px',
        margin: '0 5px',
        display: 'inline-flex',
        alignItems: 'center',
        gap: '5px',
        transition: 'all 0.2s ease',
    },
    messageError: {
        backgroundColor: '#f8d7da',
        color: '#721c24',
        padding: '12px',
        borderRadius: '8px',
        marginBottom: '20px',
        textAlign: 'center',
    },
    messageSuccess: {
        backgroundColor: '#d4edda',
        color: '#155724',
        padding: '12px',
        borderRadius: '8px',
        marginBottom: '20px',
        textAlign: 'center',
    },
    loadingContainer: {
        textAlign: 'center',
        padding: '50px',
    },
    modalOverlay: {
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
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
        width: '90%',
        maxWidth: '500px',
    },
    modalTitle: {
        fontSize: '1.5em',
        marginBottom: '20px',
        color: '#333',
    },
    modalActions: {
        display: 'flex',
        justifyContent: 'flex-end',
        gap: '10px',
        marginTop: '25px',
    },
    purchaseProductsSection: {
        border: '1px solid #e0e0e0',
        borderRadius: '8px',
        padding: '20px',
        marginTop: '20px',
    },
    productSearchContainer: {
        display: 'flex',
        gap: '10px',
        marginBottom: '15px',
    },
    productItem: {
        backgroundColor: '#f9f9f9',
        padding: '15px',
        borderRadius: '6px',
        marginBottom: '10px',
        borderLeft: '4px solid #007bff',
    },
    productItemHeader: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        fontWeight: 'bold',
        marginBottom: '15px',
    },
    variationInputGrid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
        gap: '10px',
        marginTop: '10px',
    },
    variationInputGroup: {
        display: 'flex',
        flexDirection: 'column',
        fontSize: '0.9em',
    },
    bulkApplyContainer: {
        display: 'flex',
        gap: '10px',
        alignItems: 'center',
        backgroundColor: '#e9ecef',
        padding: '10px',
        borderRadius: '6px',
        marginBottom: '15px',
    },
    installmentDatesContainer: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '15px',
        marginTop: '10px',
    },
    launchTypeSelector: {
        display: 'flex',
        justifyContent: 'center',
        gap: '10px',
        marginBottom: '20px',
        padding: '10px',
        backgroundColor: '#f0f4f8',
        borderRadius: '8px',
    },
    launchTypeButton: {
        padding: '10px 20px',
        border: '2px solid transparent',
        borderRadius: '6px',
        cursor: 'pointer',
        backgroundColor: '#fff',
        color: '#333',
        fontWeight: '600',
        transition: 'all 0.3s ease',
    },
    launchTypeButtonActive: {
        backgroundColor: '#007bff',
        color: 'white',
        borderColor: '#0056b3',
    },
    checkboxContainer: {
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        marginTop: '10px',
    },
    filtersContainer: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '15px',
        padding: '15px',
        backgroundColor: '#f8f9fa',
        borderRadius: '8px',
        marginBottom: '20px',
        alignItems: 'flex-end',
    },
    filterButtonsContainer: {
        display: 'flex',
        gap: '10px',
    }
};

// --- Componente Principal ---
const PurchasesPage = () => {
    // --- Hooks e Estados ---
    const { currentUser, userRole } = useAuth();
    const { db } = useFirebase();

    const [launchType, setLaunchType] = useState('merchandise');
    const [accountsPayable, setAccountsPayable] = useState([]);
    const [suppliers, setSuppliers] = useState([]);
    const [users, setUsers] = useState([]);
    const [bankAccounts, setBankAccounts] = useState([]);
    const [allProducts, setAllProducts] = useState([]);
    const [categories, setCategories] = useState([]);
    const [expenseCategories, setExpenseCategories] = useState([]);
    const [colors, setColors] = useState([]);
    const [sizeGrades, setSizeGrades] = useState({});
    const [stores, setStores] = useState([]);
    
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const [supplierId, setSupplierId] = useState('');
    const [description, setDescription] = useState('');
    const [issueDate, setIssueDate] = useState(new Date().toISOString().split('T')[0]);
    const [installments, setInstallments] = useState(1);
    const [paymentMethod, setPaymentMethod] = useState('Boleto');
    const [installmentDueDates, setInstallmentDueDates] = useState(['']);
    
    const [merchandiseStoreId, setMerchandiseStoreId] = useState('');
    const [expenseStoreId, setExpenseStoreId] = useState('');

    const [expenseAmount, setExpenseAmount] = useState('');
    const [employeeId, setEmployeeId] = useState('');
    const [expenseCategoryId, setExpenseCategoryId] = useState('');
    const [isRecurring, setIsRecurring] = useState(false);
    const [recurrenceMonths, setRecurrenceMonths] = useState(1);

    const [productSearchTerm, setProductSearchTerm] = useState('');
    const [productSearchResults, setProductSearchResults] = useState([]);
    const [purchasedProducts, setPurchasedProducts] = useState([]);

    const [showPayModal, setShowPayModal] = useState(false);
    const [payableToPay, setPayableToPay] = useState(null);
    const [paymentAccountId, setPaymentAccountId] = useState('');

    const [isQuickAddProductModalOpen, setIsQuickAddProductModalOpen] = useState(false);
    const [isQuickAddSupplierModalOpen, setIsQuickAddSupplierModalOpen] = useState(false);
    const [isQuickAddExpenseCategoryModalOpen, setIsQuickAddExpenseCategoryModalOpen] = useState(false);
    
    const [showEditPayableModal, setShowEditPayableModal] = useState(false);
    const [editingPayable, setEditingPayable] = useState(null);
    const [editDescription, setEditDescription] = useState('');
    const [editAmount, setEditAmount] = useState('');
    const [editDueDate, setEditDueDate] = useState('');

    const [purchaseHistory, setPurchaseHistory] = useState([]);
    const [showDetailsModal, setShowDetailsModal] = useState(false);
    const [selectedPurchase, setSelectedPurchase] = useState(null);

    const [inputFilterStartDate, setInputFilterStartDate] = useState('');
    const [inputFilterEndDate, setInputFilterEndDate] = useState('');
    const [inputFilterSupplier, setInputFilterSupplier] = useState('');
    const [inputFilterDescription, setInputFilterDescription] = useState('');
    
    const [activeFilters, setActiveFilters] = useState({
        startDate: '',
        endDate: '',
        supplier: '',
        description: ''
    });

    // --- Referências do Firestore ---
    const accountsPayableCollectionRef = useMemo(() => db ? collection(db, 'accountsPayable') : null, [db]);
    const purchasesCollectionRef = useMemo(() => db ? collection(db, 'purchases') : null, [db]);
    const bankAccountsCollectionRef = useMemo(() => db ? collection(db, 'bankAccounts') : null, [db]);
    const productsCollectionRef = useMemo(() => db ? collection(db, 'products') : null, [db]);
    // REFACTOR: Adicionada referência para a nova coleção de inventário
    const inventoryCollectionRef = useMemo(() => db ? collection(db, 'inventory') : null, [db]);
    const suppliersDocRef = useMemo(() => db ? doc(db, 'product_attributes', 'suppliers') : null, [db]);
    const categoriesDocRef = useMemo(() => db ? doc(db, 'product_attributes', 'categories') : null, [db]);
    const expenseCategoriesDocRef = useMemo(() => db ? doc(db, 'product_attributes', 'expense_categories') : null, [db]);
    const colorsDocRef = useMemo(() => db ? doc(db, 'product_attributes', 'colors') : null, [db]);
    const sizeGradesDocRef = useMemo(() => db ? doc(db, 'product_attributes', 'sizeGrades') : null, [db]);
    const storesCollectionRef = useMemo(() => db ? collection(db, 'stores') : null, [db]);
    const usersCollectionRef = useMemo(() => db ? collection(db, 'users') : null, [db]);

    // --- Hooks de Efeito ---
    useEffect(() => {
        const numInstallments = isRecurring ? parseInt(recurrenceMonths) || 1 : parseInt(installments) || 1;
        setInstallmentDueDates(currentDates => {
            const newDates = new Array(numInstallments).fill('');
            for (let i = 0; i < Math.min(numInstallments, currentDates.length); i++) {
                newDates[i] = currentDates[i];
            }
            return newDates;
        });
    }, [installments, isRecurring, recurrenceMonths]);

    const fetchData = useCallback(async () => {
        let unsubscribePayables = () => {};
        let unsubscribeHistory = () => {};
        setIsLoading(true);
        if (!db) {
            setError("A conexão com o Firebase não está pronta.");
            setIsLoading(false);
            return () => {};
        }
        try {
            const [suppliersDocSnap, bankAccountsSnapshot, productsSnapshot, categoriesDocSnap, colorsDocSnap, sizeGradesDocSnap, storesSnapshot, usersSnapshot, expenseCategoriesDocSnap] = await Promise.all([
                getDoc(suppliersDocRef), getDocs(bankAccountsCollectionRef), getDocs(productsCollectionRef),
                getDoc(categoriesDocRef), getDoc(colorsDocRef), getDoc(sizeGradesDocRef), getDocs(storesCollectionRef),
                getDocs(usersCollectionRef), getDoc(expenseCategoriesDocRef)
            ]);
            if (suppliersDocSnap.exists()) {
                const suppliersData = suppliersDocSnap.data().items || [];
                setSuppliers(suppliersData.map(name => ({ id: name, name: name })));
            }
            const accountsList = bankAccountsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setBankAccounts(accountsList);
            if (accountsList.length > 0 && !paymentAccountId) setPaymentAccountId(accountsList[0].id);
            setAllProducts(productsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
            if (categoriesDocSnap.exists()) setCategories(categoriesDocSnap.data().items || []);
            if (colorsDocSnap.exists()) setColors(colorsDocSnap.data().items || []);
            if (sizeGradesDocSnap.exists()) setSizeGrades(sizeGradesDocSnap.data() || {});
            if (expenseCategoriesDocSnap.exists()) setExpenseCategories(expenseCategoriesDocSnap.data().items || []);
            
            const storesList = storesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setStores(storesList);
            if (storesList.length > 0) {
                if (!expenseStoreId) setExpenseStoreId(storesList[0].id);
                if (!merchandiseStoreId) setMerchandiseStoreId(storesList[0].id);
            }

            setUsers(usersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
            
            const qPayables = query(accountsPayableCollectionRef, orderBy('dueDate', 'asc'));
            unsubscribePayables = onSnapshot(qPayables, (querySnapshot) => {
                setAccountsPayable(querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data(), dueDate: doc.data().dueDate.toDate(), issueDate: doc.data().issueDate.toDate() })));
                setIsLoading(false);
            }, (err) => {
                setError("Falha ao carregar contas a pagar.");
                setIsLoading(false);
            });

            const qHistory = query(purchasesCollectionRef, orderBy('issueDate', 'desc'));
            unsubscribeHistory = onSnapshot(qHistory, (querySnapshot) => {
                setPurchaseHistory(querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data(), issueDate: doc.data().issueDate.toDate() })));
            }, (err) => {
                setError("Falha ao carregar o histórico de compras.");
            });

        } catch (err) {
            setError("Falha ao carregar dados iniciais.");
            setIsLoading(false);
        }
        return () => {
            unsubscribePayables();
            unsubscribeHistory();
        };
    }, [db, paymentAccountId, expenseStoreId, merchandiseStoreId]);

    useEffect(() => {
        let unsubscribe = () => {};
        if (userRole === 'admin' || userRole === 'finance') {
            fetchData().then(unsub => { unsubscribe = unsub; });
        } else {
            setIsLoading(false);
        }
        return () => unsubscribe();
    }, [userRole, fetchData]);

    // --- Manipuladores de Eventos e Lógica ---
    const handleProductSearch = (term) => {
        setProductSearchTerm(term);
        if (term.length < 2) {
            setProductSearchResults([]);
            return;
        }
        const lowerCaseTerm = term.toLowerCase();
        const results = allProducts.filter(p => p.name.toLowerCase().includes(lowerCaseTerm) || p.code.toLowerCase().includes(lowerCaseTerm));
        setProductSearchResults(results);
    };

    const handleAddProductToPurchase = (product) => {
        if (purchasedProducts.some(p => p.id === product.id)) return;
        const productWithPurchaseDetails = { ...product, purchaseVariations: product.variations.map(v => ({...v, purchaseQty: '', purchaseCost: ''})), bulkQty: '', bulkCost: '' };
        setPurchasedProducts([...purchasedProducts, productWithPurchaseDetails]);
        setProductSearchTerm('');
        setProductSearchResults([]);
    };

    const handleRemoveProductFromPurchase = (productId) => {
        setPurchasedProducts(purchasedProducts.filter(p => p.id !== productId));
    };

    const handlePurchaseVariationChange = (productId, variationIndex, field, value) => {
        setPurchasedProducts(purchasedProducts.map(p => {
            if (p.id === productId) {
                const updatedVariations = [...p.purchaseVariations];
                updatedVariations[variationIndex][field] = value;
                return { ...p, purchaseVariations: updatedVariations };
            }
            return p;
        }));
    };

    const handleBulkFieldChange = (productId, field, value) => {
        setPurchasedProducts(purchasedProducts.map(p => p.id === productId ? { ...p, [field]: value } : p));
    };

    const applyBulkValues = (productId) => {
        setPurchasedProducts(purchasedProducts.map(p => {
            if (p.id === productId) {
                const { bulkQty, bulkCost } = p;
                if (bulkQty === '' && bulkCost === '') return p;
                const updatedVariations = p.purchaseVariations.map(v => ({ ...v, purchaseQty: bulkQty !== '' ? bulkQty : v.purchaseQty, purchaseCost: bulkCost !== '' ? bulkCost : v.purchaseCost }));
                return { ...p, purchaseVariations: updatedVariations };
            }
            return p;
        }));
    };

    const calculateTotalAmount = useMemo(() => {
        if (launchType === 'expense') {
            return parseFloat(expenseAmount) || 0;
        }
        return purchasedProducts.reduce((total, product) => {
            return total + product.purchaseVariations.reduce((subTotal, variation) => {
                const qty = parseInt(variation.purchaseQty) || 0;
                const cost = parseFloat(variation.purchaseCost) || 0;
                return subTotal + (qty * cost);
            }, 0);
        }, 0);
    }, [purchasedProducts, launchType, expenseAmount]);

    const handleSavePurchase = async (e) => {
        e.preventDefault();
        setError(''); setSuccess('');
        if (installmentDueDates.some(date => date === '')) {
            setError("Por favor, preencha todas as datas de vencimento.");
            return;
        }
        if (!description) {
            setError("A descrição é obrigatória.");
            return;
        }
        const total = calculateTotalAmount;
        if (total <= 0) {
            setError("O valor total deve ser maior que zero.");
            return;
        }
        if (launchType === 'merchandise' && (!supplierId || !merchandiseStoreId || purchasedProducts.length === 0)) {
            setError("Para mercadoria, fornecedor, loja e produtos são obrigatórios.");
            return;
        }
        if (launchType === 'expense' && !expenseCategoryId) {
            setError("A categoria da despesa é obrigatória.");
        }
        if (launchType === 'expense' && !expenseStoreId) {
            setError("Para despesas, a loja é obrigatória.");
            return;
        }

        try {
            await runTransaction(db, async (transaction) => {
                const supplierInfo = suppliers.find(s => s.id === supplierId);
                const employeeInfo = users.find(u => u.id === employeeId);
                const storeInfo = stores.find(s => s.id === (launchType === 'merchandise' ? merchandiseStoreId : expenseStoreId));
                const numInstallments = isRecurring ? parseInt(recurrenceMonths) || 1 : parseInt(installments) || 1;
                
                if (launchType === 'merchandise') {
                    const newPurchaseRef = doc(purchasesCollectionRef);
                    
                    // REFACTOR: Lógica de atualização de estoque
                    for (const product of purchasedProducts) {
                        for (const variation of product.purchaseVariations) {
                            const addedQty = parseInt(variation.purchaseQty, 10);
                            if (isNaN(addedQty) || addedQty <= 0) {
                                continue; // Pula para a próxima variação se não houver quantidade
                            }

                            // Query para encontrar o documento de inventário existente
                            const inventoryQuery = query(
                                inventoryCollectionRef,
                                where("productId", "==", product.id),
                                where("storeId", "==", merchandiseStoreId),
                                where("color", "==", variation.color),
                                where("size", "==", variation.size)
                            );
                            
                            const inventorySnapshot = await getDocs(inventoryQuery);

                            if (inventorySnapshot.empty) {
                                // Se não existe, cria um novo documento de inventário
                                const newInventoryRef = doc(inventoryCollectionRef);
                                transaction.set(newInventoryRef, {
                                    productId: product.id,
                                    productName: product.name,
                                    productCode: product.code,
                                    productPrice: product.price || 0,
                                    storeId: merchandiseStoreId,
                                    color: variation.color,
                                    size: variation.size,
                                    quantity: addedQty,
                                    createdAt: serverTimestamp(),
                                    updatedAt: serverTimestamp(),
                                });
                            } else {
                                // Se existe, atualiza a quantidade
                                const inventoryDoc = inventorySnapshot.docs[0];
                                const currentQuantity = inventoryDoc.data().quantity || 0;
                                transaction.update(inventoryDoc.ref, {
                                    quantity: currentQuantity + addedQty,
                                    updatedAt: serverTimestamp(),
                                });
                            }
                        }
                    }

                    const purchaseData = {
                        description,
                        totalAmount: total,
                        issueDate: new Date(issueDate + 'T03:00:00Z'),
                        supplierId,
                        supplierName: supplierInfo?.name || null,
                        storeId: merchandiseStoreId,
                        storeName: storeInfo?.name || null,
                        items: purchasedProducts.map(p => ({ 
                            productId: p.id, name: p.name, code: p.code, 
                            variations: p.purchaseVariations.filter(v => parseInt(v.purchaseQty) > 0) 
                        })),
                        installments: numInstallments,
                        createdAt: serverTimestamp(),
                        createdBy: currentUser.email,
                    };
                    transaction.set(newPurchaseRef, purchaseData);

                    const amountPerInstallment = total / numInstallments;
                    for (let i = 0; i < numInstallments; i++) {
                        const installmentDueDate = new Date(installmentDueDates[i] + 'T03:00:00Z');
                        if (isNaN(installmentDueDate.getTime())) throw new Error(`Data inválida para a parcela ${i + 1}.`);
                        
                        const newPayableRef = doc(accountsPayableCollectionRef);
                        const payableData = {
                            description: `${description} (${i + 1}/${numInstallments})`,
                            totalAmount: amountPerInstallment,
                            issueDate: new Date(issueDate + 'T03:00:00Z'),
                            dueDate: installmentDueDate,
                            status: 'pending',
                            paymentMethod,
                            installmentsInfo: { current: i + 1, total: numInstallments },
                            createdAt: serverTimestamp(),
                            createdBy: currentUser.email,
                            type: 'merchandise',
                            supplierId,
                            supplierName: supplierInfo?.name || null,
                            purchaseId: newPurchaseRef.id,
                            storeId: merchandiseStoreId,
                            storeName: storeInfo?.name || null,
                        };
                        transaction.set(newPayableRef, payableData);
                    }
                } else { 
                    const amountPerInstallment = total / (launchType === 'expense' && !isRecurring ? numInstallments : 1);
                    for (let i = 0; i < numInstallments; i++) {
                        const installmentDueDate = new Date(installmentDueDates[i] + 'T03:00:00Z');
                        if (isNaN(installmentDueDate.getTime())) throw new Error(`Data inválida para a parcela ${i + 1}.`);
                        
                        const newPayableRef = doc(accountsPayableCollectionRef);
                        const payableData = {
                            description: `${description} ${numInstallments > 1 ? `(${i + 1}/${numInstallments})` : ''}`,
                            totalAmount: isRecurring ? total : amountPerInstallment,
                            issueDate: new Date(issueDate + 'T03:00:00Z'),
                            dueDate: installmentDueDate,
                            status: 'pending',
                            paymentMethod,
                            installmentsInfo: { current: i + 1, total: numInstallments },
                            createdAt: serverTimestamp(),
                            createdBy: currentUser.email,
                            type: 'expense',
                            category: expenseCategoryId,
                            isRecurring,
                            supplierId: supplierId || null,
                            supplierName: supplierInfo?.name || null,
                            employeeId: employeeId || null,
                            employeeName: employeeInfo?.username || null,
                            storeId: expenseStoreId,
                            storeName: storeInfo?.name || null,
                        };
                        transaction.set(newPayableRef, payableData);
                    }
                }
            });
            setSuccess(`Lançamento registrado com sucesso!`);
            setSupplierId(''); setDescription(''); setInstallments(1); setPurchasedProducts([]); setInstallmentDueDates(['']); setExpenseAmount(''); setEmployeeId(''); setExpenseCategoryId(''); setIsRecurring(false); setRecurrenceMonths(1);
        } catch (err) {
            setError(`Falha ao salvar: ${err.message}`);
        }
    };

    const handleOpenPayModal = (payable) => {
        if (payable.status === 'paid') return;
        setPayableToPay(payable);
        setShowPayModal(true);
    };

    const handleOpenEditPayableModal = (payable) => {
        setEditingPayable(payable);
        setEditDescription(payable.description);
        setEditAmount(payable.totalAmount.toFixed(2));
        setEditDueDate(new Date(payable.dueDate).toISOString().split('T')[0]);
        setShowEditPayableModal(true);
    };

    const handleCloseEditPayableModal = () => {
        setShowEditPayableModal(false);
        setEditingPayable(null);
    };

    const handleUpdatePayable = async () => {
        if (!editingPayable || !editDescription || !editAmount || !editDueDate) {
            setError("Todos os campos são obrigatórios para a edição.");
            return;
        }
        setError('');
        try {
            const payableRef = doc(db, 'accountsPayable', editingPayable.id);
            await updateDoc(payableRef, {
                description: editDescription,
                totalAmount: parseFloat(editAmount),
                dueDate: new Date(editDueDate + 'T03:00:00Z'),
            });
            setSuccess("Conta a pagar atualizada com sucesso!");
            handleCloseEditPayableModal();
        } catch (err) {
            setError(`Falha ao atualizar a conta: ${err.message}`);
        }
    };

    const handleDeletePayable = async (payableId) => {
        if (!window.confirm("Tem certeza que deseja excluir esta conta a pagar? Esta ação não pode ser desfeita.")) {
            return;
        }
        setError('');
        setSuccess('');
        try {
            const payableRef = doc(db, 'accountsPayable', payableId);
            await deleteDoc(payableRef);
            setSuccess("Conta a pagar excluída com sucesso!");
        } catch (err) {
            setError(`Falha ao excluir a conta: ${err.message}`);
        }
    };

    const handleConfirmPayment = async () => {
        if (!payableToPay || !paymentAccountId) {
            setError("Selecione a conta para pagamento.");
            return;
        }
        setError('');
        try {
            await runTransaction(db, async (transaction) => {
                const payableRef = doc(db, 'accountsPayable', payableToPay.id);
                const bankAccountRef = doc(db, 'bankAccounts', paymentAccountId);
                const bankAccountDoc = await transaction.get(bankAccountRef);
                if (!bankAccountDoc.exists()) throw new Error("Conta bancária não encontrada.");
                
                // CORREÇÃO: Calcula o saldo total da conta (principal + sub-saldos)
                const accountData = bankAccountDoc.data();
                const mainBalance = accountData.balance || 0;
                const subBalancesTotal = (accountData.subBalances || []).reduce((acc, sub) => acc + (sub.amount || 0), 0);
                const totalBalance = mainBalance + subBalancesTotal;

                if (totalBalance < payableToPay.totalAmount) throw new Error("Saldo total insuficiente na conta.");
                
                // Debita o valor do saldo principal
                transaction.update(bankAccountRef, { balance: mainBalance - payableToPay.totalAmount });
                
                transaction.update(payableRef, { status: 'paid', paidDate: serverTimestamp(), paidFromAccountId: paymentAccountId, paidFromAccountName: bankAccountDoc.data().name });
                const newTransactionRef = doc(collection(db, 'transactions'));
                transaction.set(newTransactionRef, {
                    accountId: paymentAccountId, amount: payableToPay.totalAmount, type: 'withdrawal', description: `Pagamento: ${payableToPay.description}`,
                    metadata: { accountsPayableId: payableToPay.id }, timestamp: serverTimestamp(), performedBy: currentUser.email,
                });
            });
            setSuccess("Conta paga com sucesso!");
            setShowPayModal(false);
            setPayableToPay(null);
        } catch (err) {
            setError(`Falha ao processar pagamento: ${err.message}`);
        }
    };
    
    const handleProductAdded = (newProduct) => {
        setAllProducts(prev => [...prev, newProduct]);
        handleAddProductToPurchase(newProduct);
    };

    const handleSupplierAdded = (newSupplier) => {
        setSuppliers(prev => [...prev, newSupplier]);
        setSupplierId(newSupplier.id);
    };

    const handleExpenseCategoryAdded = (newCategory) => {
        setExpenseCategories(prev => [...prev, newCategory].sort());
        setExpenseCategoryId(newCategory);
    };

    const getStatusStyle = (status, dueDate) => {
        const today = new Date(); today.setHours(0, 0, 0, 0);
        if (status === 'paid') return { backgroundColor: '#28a745', ...styles.statusBadge };
        if (status === 'pending' && dueDate < today) return { backgroundColor: '#dc3545', ...styles.statusBadge };
        if (status === 'pending') return { backgroundColor: '#ffc107', color: '#333', ...styles.statusBadge };
        return { backgroundColor: '#6c757d', ...styles.statusBadge };
    };

    const getStatusText = (status, dueDate) => {
        const today = new Date(); today.setHours(0, 0, 0, 0);
        if (status === 'paid') return 'Paga';
        if (status === 'pending' && dueDate < today) return 'Vencida';
        return 'Pendente';
    };
    
    const { pendingPayables, paidPayables } = useMemo(() => {
        const pending = accountsPayable.filter(p => p.status !== 'paid');
        const paid = accountsPayable.filter(p => p.status === 'paid');
        return { pendingPayables: pending, paidPayables: paid };
    }, [accountsPayable]);

    const filteredPurchaseHistory = useMemo(() => {
        return purchaseHistory.filter(purchase => {
            const issueDate = new Date(purchase.issueDate);
            issueDate.setUTCHours(0, 0, 0, 0);

            if (activeFilters.startDate) {
                const startDate = new Date(activeFilters.startDate);
                startDate.setUTCHours(0, 0, 0, 0);
                if (issueDate < startDate) return false;
            }
            if (activeFilters.endDate) {
                const endDate = new Date(activeFilters.endDate);
                endDate.setUTCHours(0, 0, 0, 0);
                if (issueDate > endDate) return false;
            }
            if (activeFilters.supplier && purchase.supplierName !== activeFilters.supplier) {
                return false;
            }
            if (activeFilters.description && !purchase.description.toLowerCase().includes(activeFilters.description.toLowerCase())) {
                return false;
            }
            return true;
        });
    }, [purchaseHistory, activeFilters]);

    const handleSearch = () => {
        setError('');
        if (inputFilterStartDate && inputFilterEndDate && new Date(inputFilterStartDate) > new Date(inputFilterEndDate)) {
            setError("A data de início não pode ser posterior à data de fim.");
            return;
        }
        setActiveFilters({
            startDate: inputFilterStartDate,
            endDate: inputFilterEndDate,
            supplier: inputFilterSupplier,
            description: inputFilterDescription,
        });
    };

    const handleClearFilters = () => {
        setInputFilterStartDate('');
        setInputFilterEndDate('');
        setInputFilterSupplier('');
        setInputFilterDescription('');
        setActiveFilters({
            startDate: '',
            endDate: '',
            supplier: '',
            description: '',
        });
        setError('');
    };

    const handleOpenDetailsModal = (purchase) => {
        setSelectedPurchase(purchase);
        setShowDetailsModal(true);
    };

    const handleDeletePurchase = async (purchase) => {
        if (!window.confirm(`Tem certeza que deseja excluir a compra "${purchase.description}" e todas as suas ${purchase.installments} parcela(s)? Esta ação não pode ser desfeita.`)) {
            return;
        }
        setError('');
        setSuccess('');
        try {
            const batch = writeBatch(db);

            const payablesQuery = query(accountsPayableCollectionRef, where("purchaseId", "==", purchase.id));
            const payablesSnapshot = await getDocs(payablesQuery);
            
            payablesSnapshot.forEach(doc => {
                batch.delete(doc.ref);
            });

            const purchaseRef = doc(db, 'purchases', purchase.id);
            batch.delete(purchaseRef);

            await batch.commit();
            setSuccess("Compra e todas as parcelas associadas foram excluídas com sucesso!");

        } catch (err) {
            console.error("Erro ao excluir compra:", err);
            setError(`Falha ao excluir a compra: ${err.message}`);
        }
    };

    if (isLoading) return <div style={styles.loadingContainer}>Carregando...</div>;
    if (userRole !== 'admin' && userRole !== 'finance') return <div style={styles.container}><h1 style={styles.header}>Acesso Negado</h1></div>;

    return (
        <div style={styles.container}>
            <h1 style={styles.header}>Lançamentos e Contas a Pagar</h1>
            {error && <div style={styles.messageError}>{error}</div>}
            {success && <div style={styles.messageSuccess}>{success}</div>}
            <QuickAddProductModal isOpen={isQuickAddProductModalOpen} onClose={() => setIsQuickAddProductModalOpen(false)} onProductAdded={handleProductAdded} suppliers={suppliers} categories={categories} colors={colors} sizeGrades={sizeGrades} stores={stores}/>
            <QuickAddSupplierModal isOpen={isQuickAddSupplierModalOpen} onClose={() => setIsQuickAddSupplierModalOpen(false)} onSupplierAdded={handleSupplierAdded} />
            <QuickAddExpenseCategoryModal isOpen={isQuickAddExpenseCategoryModalOpen} onClose={() => setIsQuickAddExpenseCategoryModalOpen(false)} onCategoryAdded={handleExpenseCategoryAdded} />
            <PurchaseDetailsModal 
                isOpen={showDetailsModal}
                onClose={() => setShowDetailsModal(false)}
                purchase={selectedPurchase}
            />

            <div style={styles.section}>
                <h2 style={styles.sectionTitle}><PlusCircle /> Novo Lançamento</h2>
                <div style={styles.launchTypeSelector}>
                    <button onClick={() => setLaunchType('merchandise')} style={{...styles.launchTypeButton, ...(launchType === 'merchandise' && styles.launchTypeButtonActive)}}>Entrada de Mercadoria</button>
                    <button onClick={() => setLaunchType('expense')} style={{...styles.launchTypeButton, ...(launchType === 'expense' && styles.launchTypeButtonActive)}}>Despesa Operacional / Outros</button>
                </div>
                <form onSubmit={handleSavePurchase}>
                    {launchType === 'merchandise' ? (
                        <>
                            <div style={styles.formGrid}>
                                <div style={styles.inputGroup}><label style={styles.label}>Fornecedor</label><div style={{display: 'flex', gap: '10px'}}><select id="supplier" value={supplierId} onChange={(e) => setSupplierId(e.target.value)} style={styles.select} required><option value="">-- Selecione --</option>{suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select><button type="button" onClick={() => setIsQuickAddSupplierModalOpen(true)} style={{...styles.button, backgroundColor: '#17a2b8', flexShrink: 0}}>Novo</button></div></div>
                                
                                <div style={styles.inputGroup}>
                                    <label style={styles.label}>Loja de Destino</label>
                                    <select value={merchandiseStoreId} onChange={(e) => setMerchandiseStoreId(e.target.value)} style={styles.select} required>
                                        <option value="">-- Selecione a Loja --</option>
                                        {stores.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                    </select>
                                </div>
                                
                                <div style={styles.inputGroup}><label style={styles.label}>Descrição (Nº Nota Fiscal)</label><input id="description" type="text" value={description} onChange={(e) => setDescription(e.target.value)} style={styles.input} placeholder="Ex: NF 12345" required /></div>
                            </div>
                            <div style={styles.purchaseProductsSection}>
                                <h3 style={{...styles.sectionTitle, border: 'none', fontSize: '1.3em'}}><PackagePlus /> Itens da Compra</h3>
                                <div style={styles.productSearchContainer}><input type="text" placeholder="Buscar produto..." value={productSearchTerm} onChange={(e) => handleProductSearch(e.target.value)} style={{...styles.input, flexGrow: 1}}/><button type="button" onClick={() => setIsQuickAddProductModalOpen(true)} style={{...styles.button, backgroundColor: '#28a745', flexShrink: 0}}>Novo Produto</button></div>
                                {productSearchResults.length > 0 && (<ul style={{listStyle: 'none', padding: 0, border: '1px solid #ccc', borderRadius: '5px', maxHeight: '200px', overflowY: 'auto'}}>{productSearchResults.map(p => <li key={p.id} onClick={() => handleAddProductToPurchase(p)} style={{padding: '10px', cursor: 'pointer', borderBottom: '1px solid #eee'}}>{p.name} ({p.code})</li>)}</ul>)}
                                <div style={{marginTop: '20px'}}>
                                    {purchasedProducts.map(product => (
                                        <div key={product.id} style={styles.productItem}>
                                            <div style={styles.productItemHeader}><span>{product.name} ({product.code})</span><button type="button" onClick={() => handleRemoveProductFromPurchase(product.id)} style={{...styles.button, backgroundColor: '#dc3545', padding: '5px 10px', fontSize: '0.8em'}}>Remover</button></div>
                                            <div style={styles.bulkApplyContainer}><input type="number" placeholder="Qtde Padrão" value={product.bulkQty} onChange={(e) => handleBulkFieldChange(product.id, 'bulkQty', e.target.value)} style={{...styles.input, padding: '8px'}} /><input type="number" step="0.01" placeholder="Custo Padrão" value={product.bulkCost} onChange={(e) => handleBulkFieldChange(product.id, 'bulkCost', e.target.value)} style={{...styles.input, padding: '8px'}} /><button type="button" onClick={() => applyBulkValues(product.id)} style={{...styles.button, backgroundColor: '#17a2b8', padding: '8px 12px', fontSize: '0.9em'}}><Zap size={16}/> Aplicar</button></div>
                                            <div style={styles.variationInputGrid}>{product.purchaseVariations.map((variation, index) => (<div key={index} style={styles.variationInputGroup}><label>{variation.color} / {variation.size}</label><input type="number" placeholder="Qtde" value={variation.purchaseQty} onChange={(e) => handlePurchaseVariationChange(product.id, index, 'purchaseQty', e.target.value)} style={{...styles.input, padding: '8px'}}/><input type="number" placeholder="Custo (R$)" step="0.01" value={variation.purchaseCost} onChange={(e) => handlePurchaseVariationChange(product.id, index, 'purchaseCost', e.target.value)} style={{...styles.input, padding: '8px', marginTop: '5px'}}/></div>))}</div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </>
                    ) : (
                        <div style={styles.formGrid}>
                            <div style={styles.inputGroup}><label style={styles.label}>Descrição da Despesa</label><input type="text" value={description} onChange={(e) => setDescription(e.target.value)} style={styles.input} placeholder="Ex: Aluguel, Comissão, Vale Transporte" required /></div>
                            <div style={styles.inputGroup}>
                                <label style={styles.label}>Categoria da Despesa</label>
                                <div style={{display: 'flex', gap: '10px'}}>
                                    <select value={expenseCategoryId} onChange={(e) => setExpenseCategoryId(e.target.value)} style={styles.select} required>
                                        <option value="">-- Selecione --</option>
                                        {expenseCategories.map(c => <option key={c} value={c}>{c}</option>)}
                                    </select>
                                    <button type="button" onClick={() => setIsQuickAddExpenseCategoryModalOpen(true)} style={{...styles.button, backgroundColor: '#17a2b8', flexShrink: 0}}>Novo</button>
                                </div>
                            </div>
                            
                            <div style={styles.inputGroup}>
                                <label style={styles.label}>Loja da Despesa</label>
                                <select value={expenseStoreId} onChange={(e) => setExpenseStoreId(e.target.value)} style={styles.select} required>
                                    <option value="">-- Selecione a Loja --</option>
                                    {stores.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                </select>
                            </div>

                            <div style={styles.inputGroup}><label style={styles.label}>Fornecedor (Opcional)</label><div style={{display: 'flex', gap: '10px'}}><select value={supplierId} onChange={(e) => setSupplierId(e.target.value)} style={styles.select}><option value="">-- Selecione --</option>{suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select><button type="button" onClick={() => setIsQuickAddSupplierModalOpen(true)} style={{...styles.button, backgroundColor: '#17a2b8', flexShrink: 0}}>Novo</button></div></div>
                            <div style={styles.inputGroup}><label style={styles.label}>Funcionário (Opcional)</label><select value={employeeId} onChange={(e) => setEmployeeId(e.target.value)} style={styles.select}><option value="">-- Selecione --</option>{users.map(u => <option key={u.id} value={u.id}>{u.username}</option>)}</select></div>
                            <div style={styles.inputGroup}><label style={styles.label}>Valor Total da Despesa (R$)</label><input type="number" step="0.01" value={expenseAmount} onChange={(e) => setExpenseAmount(e.target.value)} style={styles.input} required /></div>
                            <div style={{...styles.inputGroup, gridColumn: '1 / -1'}}>
                                <label style={styles.checkboxContainer}><input type="checkbox" checked={isRecurring} onChange={(e) => setIsRecurring(e.target.checked)} />Despesa Recorrente?</label>
                                {isRecurring && <div style={styles.inputGroup}><label style={styles.label}>Repetir por (meses)</label><input type="number" min="1" value={recurrenceMonths} onChange={(e) => setRecurrenceMonths(e.target.value)} style={styles.input} /></div>}
                            </div>
                        </div>
                    )}

                    <div style={{gridColumn: '1 / -1', marginTop: '20px'}}>
                        <h3 style={{...styles.sectionTitle, border: 'none', fontSize: '1.3em'}}><DollarSign /> Detalhes Financeiros</h3>
                        <div style={styles.formGrid}>
                            <div style={styles.inputGroup}><label style={styles.label}>Valor Total (R$)</label><input id="totalAmount" type="number" value={calculateTotalAmount.toFixed(2)} style={styles.input} readOnly /></div>
                            {!isRecurring && <div style={styles.inputGroup}><label style={styles.label}>Nº de Parcelas</label><input id="installments" type="number" min="1" value={installments} onChange={(e) => setInstallments(e.target.value)} style={styles.input} required /></div>}
                            <div style={styles.inputGroup}><label style={styles.label}>Data de Emissão</label><input id="issueDate" type="date" value={issueDate} onChange={(e) => setIssueDate(e.target.value)} style={styles.input} required /></div>
                        </div>
                        <div style={{marginTop: '15px'}}>
                            <label style={styles.label}>{isRecurring ? 'Vencimentos das Recorrências' : 'Vencimentos das Parcelas'}</label>
                            <div style={styles.installmentDatesContainer}>{installmentDueDates.map((date, index) => (<div key={index} style={styles.inputGroup}><label style={{fontSize: '0.9em', color: '#666'}}>Vencimento {index + 1}</label><input type="date" value={date} onChange={(e) => {const newDates = [...installmentDueDates]; newDates[index] = e.target.value; setInstallmentDueDates(newDates);}} style={styles.input} required /></div>))}</div>
                        </div>
                    </div>
                    <div style={{ ...styles.inputGroup, gridColumn: '1 / -1' }}><button type="submit" style={{ ...styles.button, backgroundColor: '#007bff', width: '100%', marginTop: '10px' }}><FileText /> Lançar Conta(s)</button></div>
                </form>
            </div>
            
            <div style={styles.section}>
                <h2 style={styles.sectionTitle}><Calendar /> Contas Pendentes e Vencidas</h2>
                <div style={{ overflowX: 'auto' }}>
                    <table style={styles.table}>
                        <thead><tr><th style={styles.tableHeader}>Favorecido</th><th style={styles.tableHeader}>Descrição</th><th style={styles.tableHeader}>Vencimento</th><th style={styles.tableHeader}>Valor</th><th style={styles.tableHeader}>Status</th><th style={styles.tableHeader}>Ações</th></tr></thead>
                        <tbody>
                            {pendingPayables.length === 0 ? (<tr><td colSpan="6" style={{ textAlign: 'center', padding: '20px' }}>Nenhuma conta pendente.</td></tr>) : (pendingPayables.map(payable => (<tr key={payable.id} style={styles.tableRow}><td style={styles.tableCell}>{payable.supplierName || payable.employeeName}</td><td style={styles.tableCell}>{payable.description}</td><td style={styles.tableCell}>{new Date(payable.dueDate).toLocaleDateString('pt-BR')}</td><td style={styles.tableCell}>R$ {parseFloat(payable.totalAmount).toFixed(2).replace('.', ',')}</td><td style={styles.tableCell}><span style={getStatusStyle(payable.status, payable.dueDate)}>{getStatusText(payable.status, payable.dueDate)}</span></td>
                                <td style={styles.tableCell}>
                                    <button onClick={() => handleOpenEditPayableModal(payable)} style={{...styles.actionButton, color: '#ffc107', borderColor: '#ffc107'}} title="Editar Conta"><Edit size={16} /> Editar</button>
                                    <button onClick={() => handleOpenPayModal(payable)} style={{...styles.actionButton, color: '#28a745', borderColor: '#28a745'}} title="Marcar como Paga"><CheckCircle size={16} /> Pagar</button>
                                    <button onClick={() => handleDeletePayable(payable.id)} style={{...styles.actionButton, color: '#dc3545', borderColor: '#dc3545'}} title="Excluir Conta"><Trash2 size={16} /> Excluir</button>
                                </td>
                            </tr>)))}
                        </tbody>
                    </table>
                </div>
            </div>

            <div style={styles.section}>
                <h2 style={styles.sectionTitle}><CheckCircle /> Contas Pagas</h2>
                <div style={{ overflowX: 'auto' }}>
                    <table style={styles.table}>
                        <thead><tr><th style={styles.tableHeader}>Favorecido</th><th style={styles.tableHeader}>Descrição</th><th style={styles.tableHeader}>Vencimento</th><th style={styles.tableHeader}>Valor</th><th style={styles.tableHeader}>Status</th></tr></thead>
                        <tbody>
                            {paidPayables.length === 0 ? (<tr><td colSpan="5" style={{ textAlign: 'center', padding: '20px' }}>Nenhuma conta paga encontrada.</td></tr>) : (paidPayables.map(payable => (<tr key={payable.id} style={styles.tableRow}><td style={styles.tableCell}>{payable.supplierName || payable.employeeName}</td><td style={styles.tableCell}>{payable.description}</td><td style={styles.tableCell}>{new Date(payable.dueDate).toLocaleDateString('pt-BR')}</td><td style={styles.tableCell}>R$ {parseFloat(payable.totalAmount).toFixed(2).replace('.', ',')}</td><td style={styles.tableCell}><span style={getStatusStyle(payable.status, payable.dueDate)}>{getStatusText(payable.status, payable.dueDate)}</span></td></tr>)))}
                        </tbody>
                    </table>
                </div>
            </div>
            
            <div style={styles.section}>
                <h2 style={styles.sectionTitle}><Archive /> Histórico de Compras de Mercadoria</h2>
                
                <div style={styles.filtersContainer}>
                    <div style={styles.inputGroup}>
                        <label style={styles.label}>Data Início</label>
                        <input type="date" value={inputFilterStartDate} onChange={e => setInputFilterStartDate(e.target.value)} style={styles.input} />
                    </div>
                    <div style={styles.inputGroup}>
                        <label style={styles.label}>Data Fim</label>
                        <input type="date" value={inputFilterEndDate} onChange={e => setInputFilterEndDate(e.target.value)} style={styles.input} />
                    </div>
                    <div style={styles.inputGroup}>
                        <label style={styles.label}>Fornecedor</label>
                        <select value={inputFilterSupplier} onChange={e => setInputFilterSupplier(e.target.value)} style={styles.select}>
                            <option value="">Todos</option>
                            {suppliers.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                        </select>
                    </div>
                    <div style={styles.inputGroup}>
                        <label style={styles.label}>Descrição / Nº Nota</label>
                        <input type="text" value={inputFilterDescription} onChange={e => setInputFilterDescription(e.target.value)} style={styles.input} placeholder="Pesquisar..." />
                    </div>
                    <div style={styles.filterButtonsContainer}>
                        <button onClick={handleSearch} style={{...styles.button, backgroundColor: '#007bff', flexGrow: 1}}>
                            <Search size={18} /> Procurar
                        </button>
                        <button onClick={handleClearFilters} style={{...styles.button, backgroundColor: '#6c757d', flexGrow: 1}}>
                            <Eraser size={18} /> Limpar
                        </button>
                    </div>
                </div>

                <div style={{ overflowX: 'auto' }}>
                    <table style={styles.table}>
                        <thead>
                            <tr>
                                <th style={styles.tableHeader}>Data</th>
                                <th style={styles.tableHeader}>Fornecedor</th>
                                <th style={styles.tableHeader}>Descrição/NF</th>
                                <th style={styles.tableHeader}>Custo Total</th>
                                <th style={styles.tableHeader}>Qtd. Itens</th>
                                <th style={styles.tableHeader}>Status Pgto.</th>
                                <th style={styles.tableHeader}>Ações</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredPurchaseHistory.length === 0 ? (
                                <tr><td colSpan="7" style={{ textAlign: 'center', padding: '20px' }}>Nenhuma compra encontrada com os filtros atuais.</td></tr>
                            ) : (
                                filteredPurchaseHistory.map(purchase => {
                                    const totalItems = purchase.items.reduce((acc, item) => {
                                        return acc + item.variations.reduce((subAcc, v) => subAcc + (parseInt(v.purchaseQty) || 0), 0);
                                    }, 0);

                                    const relatedPayables = accountsPayable.filter(p => p.purchaseId === purchase.id);
                                    let purchaseStatus = 'Pendente';
                                    if (relatedPayables.length > 0) {
                                        if (relatedPayables.every(p => p.status === 'paid')) {
                                            purchaseStatus = 'Pago';
                                        } else if (relatedPayables.some(p => p.status === 'pending' && p.dueDate < new Date())) {
                                            purchaseStatus = 'Vencido';
                                        }
                                    }

                                    return (
                                        <tr key={purchase.id} style={styles.tableRow}>
                                            <td style={styles.tableCell}>{new Date(purchase.issueDate).toLocaleDateString('pt-BR')}</td>
                                            <td style={styles.tableCell}>{purchase.supplierName}</td>
                                            <td style={styles.tableCell}>{purchase.description}</td>
                                            <td style={styles.tableCell}>R$ {parseFloat(purchase.totalAmount).toFixed(2).replace('.', ',')}</td>
                                            <td style={styles.tableCell}>{totalItems}</td>
                                            <td style={styles.tableCell}>
                                                <span style={getStatusStyle(purchaseStatus === 'Pago' ? 'paid' : 'pending', purchaseStatus === 'Vencido' ? new Date(0) : new Date())}>
                                                    {purchaseStatus}
                                                </span>
                                            </td>
                                            <td style={styles.tableCell}>
                                                <button onClick={() => handleOpenDetailsModal(purchase)} style={{...styles.actionButton, color: '#17a2b8', borderColor: '#17a2b8'}} title="Ver Detalhes">
                                                    <ClipboardList size={16} />
                                                </button>
                                                <button onClick={() => handleDeletePurchase(purchase)} style={{...styles.actionButton, color: '#dc3545', borderColor: '#dc3545'}} title="Excluir Compra">
                                                    <Trash2 size={16} />
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {showPayModal && payableToPay && (
                <div style={styles.modalOverlay}>
                    <div style={styles.modalContent}>
                        <h3 style={styles.modalTitle}>Confirmar Pagamento</h3><p><strong>Favorecido:</strong> {payableToPay.supplierName || payableToPay.employeeName}</p><p><strong>Descrição:</strong> {payableToPay.description}</p><p><strong>Valor:</strong> R$ {parseFloat(payableToPay.totalAmount).toFixed(2).replace('.', ',')}</p>
                        <div style={styles.inputGroup}><label style={styles.label} htmlFor="paymentAccount">Pagar com a conta:</label>
                            <select id="paymentAccount" value={paymentAccountId} onChange={(e) => setPaymentAccountId(e.target.value)} style={styles.select} required>
                                <option value="">-- Selecione a conta de origem --</option>
                                {bankAccounts.map(acc => {
                                    // CORREÇÃO: Calcula o saldo total para exibição
                                    const mainBalance = acc.balance || 0;
                                    const subBalancesTotal = (acc.subBalances || []).reduce((total, sub) => total + (sub.amount || 0), 0);
                                    const totalBalance = mainBalance + subBalancesTotal;
                                    return (
                                        <option key={acc.id} value={acc.id}>
                                            {acc.name} (Saldo Total: R$ {parseFloat(totalBalance).toFixed(2).replace('.', ',')})
                                        </option>
                                    );
                                })}
                            </select>
                        </div>
                        <div style={styles.modalActions}><button onClick={() => setShowPayModal(false)} style={{ ...styles.button, backgroundColor: '#6c757d' }}>Cancelar</button><button onClick={handleConfirmPayment} style={{ ...styles.button, backgroundColor: '#28a745' }}>Confirmar Pagamento</button></div>
                    </div>
                </div>
            )}
            
            {showEditPayableModal && editingPayable && (
                <div style={styles.modalOverlay}>
                    <div style={styles.modalContent}>
                        <h3 style={styles.modalTitle}>Editar Conta a Pagar</h3>
                        <div style={styles.inputGroup}><label style={styles.label}>Descrição</label><input type="text" value={editDescription} onChange={(e) => setEditDescription(e.target.value)} style={styles.input} /></div>
                        <div style={styles.inputGroup}><label style={styles.label}>Valor (R$)</label><input type="number" step="0.01" value={editAmount} onChange={(e) => setEditAmount(e.target.value)} style={styles.input} /></div>
                        <div style={styles.inputGroup}><label style={styles.label}>Data de Vencimento</label><input type="date" value={editDueDate} onChange={(e) => setEditDueDate(e.target.value)} style={styles.input} /></div>
                        <div style={styles.modalActions}>
                            <button onClick={handleCloseEditPayableModal} style={{ ...styles.button, backgroundColor: '#6c757d' }}>Cancelar</button>
                            <button onClick={handleUpdatePayable} style={{ ...styles.button, backgroundColor: '#007bff' }}>Salvar Alterações</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PurchasesPage;


