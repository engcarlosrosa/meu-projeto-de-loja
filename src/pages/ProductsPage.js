import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { collection, addDoc, getDocs, doc, updateDoc, deleteDoc, query, onSnapshot, orderBy } from 'firebase/firestore';
import { useAuth } from '../components/AuthProvider';
import { useFirebase } from '../contexts/FirebaseContext';
import { Link } from 'react-router-dom';

// Constantes para os IDs dos documentos no Firestore
const CATEGORIES_DOC_ID = 'categories';
const SIZE_GRADES_DOC_ID = 'sizeGrades';
const COLORS_DOC_ID = 'colors';
const SUPPLIERS_DOC_ID = 'suppliers';

// Estilos
const styles = {
    container: {
        padding: '20px',
        maxWidth: '1200px',
        margin: '20px auto',
        backgroundColor: '#fff',
        borderRadius: '8px',
        boxShadow: '0 2px 10px rgba(0, 0, 0, 0.1)',
        fontFamily: "'Inter', sans-serif",
    },
    title: {
        textAlign: 'center',
        color: '#34495e',
        marginBottom: '30px',
        fontSize: '2.5em',
        fontWeight: 'bold',
    },
    form: {
        backgroundColor: '#ffffff',
        padding: '25px',
        borderRadius: '8px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        marginBottom: '30px',
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
        gap: '15px',
    },
    formTitle: {
        gridColumn: '1 / -1',
        textAlign: 'center',
        color: '#555',
        marginBottom: '20px',
        fontSize: '1.8em',
    },
    input: {
        width: '100%',
        padding: '10px',
        border: '1px solid #ddd',
        borderRadius: '4px',
        boxSizing: 'border-box',
    },
    textarea: {
        width: '100%',
        padding: '10px',
        border: '1px solid #ddd',
        borderRadius: '4px',
        boxSizing: 'border-box',
        minHeight: '80px',
        resize: 'vertical',
    },
    select: {
        width: '100%',
        padding: '10px',
        border: '1px solid #ddd',
        borderRadius: '4px',
        backgroundColor: '#fff',
        boxSizing: 'border-box',
    },
    button: {
        gridColumn: '1 / -1',
        backgroundColor: '#4CAF50',
        color: 'white',
        padding: '12px 20px',
        border: 'none',
        borderRadius: '4px',
        cursor: 'pointer',
        fontSize: '1em',
        fontWeight: 'bold',
        transition: 'background-color 0.3s ease',
        marginTop: '10px',
    },
    listTitle: {
        textAlign: 'center',
        color: '#333',
        marginBottom: '20px',
        fontSize: '2em',
    },
    productList: {
        width: '100%',
        borderCollapse: 'collapse',
        marginBottom: '30px',
        backgroundColor: '#ffffff',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        borderRadius: '8px',
        overflow: 'hidden',
        display: 'block',
        overflowX: 'auto',
        whiteSpace: 'normal',
    },
    tableRowHeader: {
        backgroundColor: '#e9ecef',
    },
    tableHeader: {
        fontWeight: 'bold',
        textAlign: 'center',
        padding: '12px 15px',
        borderBottom: '2px solid #dee2e6',
        color: '#333',
        cursor: 'pointer',
        whiteSpace: 'nowrap',
    },
    tableRow: {
        borderBottom: '1px solid #e0e0e0',
    },
    tableCell: {
        padding: '8px 15px',
        color: '#444',
        whiteSpace: 'normal',
        wordBreak: 'break-word',
        textAlign: 'center',
    },
    editForm: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '10px',
        padding: '10px',
        backgroundColor: '#f8f9fa',
        borderRadius: '5px',
        border: '1px solid #e0e0e0',
    },
    buttonGroup: {
        gridColumn: '1 / -1',
        display: 'flex',
        gap: '10px',
        marginTop: '15px',
        justifyContent: 'center',
    },
    tableActions: {
        display: 'flex',
        gap: '8px',
        justifyContent: 'center',
        alignItems: 'center',
        flexDirection: 'row',
        flexWrap: 'nowrap',
    },
    editButton: {
        backgroundColor: '#007bff',
        color: 'white',
        padding: '6px 10px',
        border: 'none',
        borderRadius: '4px',
        cursor: 'pointer',
        transition: 'background-color 0.3s ease',
        fontSize: '0.8em',
    },
    deleteButton: {
        backgroundColor: '#dc3545',
        color: 'white',
        padding: '6px 10px',
        border: 'none',
        borderRadius: '4px',
        cursor: 'pointer',
        transition: 'background-color 0.3s ease',
        fontSize: '0.8em',
    },
    saveButton: {
        backgroundColor: '#28a745',
        color: 'white',
        padding: '8px 15px',
        border: 'none',
        borderRadius: '4px',
        cursor: 'pointer',
        transition: 'background-color 0.3s ease',
        fontSize: '0.9em',
    },
    cancelButton: {
        backgroundColor: '#6c757d',
        color: 'white',
        padding: '8px 15px',
        border: 'none',
        borderRadius: '4px',
        cursor: 'pointer',
        transition: 'background-color 0.3s ease',
        fontSize: '0.9em',
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
    accessDenied: {
        textAlign: 'center',
        color: '#dc3545',
        fontSize: '1.5em',
        marginTop: '50px',
    },
    topActions: {
        display: 'flex',
        justifyContent: 'flex-end',
        marginBottom: '20px',
        flexWrap: 'wrap',
        gap: '10px',
    },
    manageAttributesButton: {
        backgroundColor: '#6f42c1',
        color: 'white',
        padding: '10px 15px',
        border: 'none',
        borderRadius: '4px',
        cursor: 'pointer',
        textDecoration: 'none',
        fontSize: '0.9em',
        transition: 'background-color 0.3s ease',
        display: 'inline-block',
    },
    variationsSection: {
        gridColumn: '1 / -1',
        border: '1px solid #e0e0e0',
        borderRadius: '8px',
        padding: '15px',
        backgroundColor: '#f0f0f0',
        marginBottom: '15px',
    },
    variationsTitle: {
        textAlign: 'center',
        marginBottom: '15px',
        color: '#444',
        fontSize: '1.4em',
    },
    colorVariationBlock: {
        border: '1px solid #c0c0c0',
        borderRadius: '8px',
        padding: '15px',
        marginBottom: '15px',
        backgroundColor: '#ffffff',
    },
    sizeQuantityGrid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
        gap: '10px',
        marginTop: '15px',
    },
    variationRow: {
        display: 'flex',
        gap: '8px',
        alignItems: 'center',
        flexWrap: 'wrap',
    },
    removeVariationButton: {
        backgroundColor: '#ffc107',
        color: '#333',
        padding: '6px 10px',
        border: 'none',
        borderRadius: '4px',
        cursor: 'pointer',
        transition: 'background-color 0.3s ease',
        fontWeight: 'bold',
        flexShrink: 0,
        fontSize: '0.8em',
    },
    addVariationButton: {
        backgroundColor: '#17a2b8',
        color: 'white',
        padding: '8px 12px',
        border: 'none',
        borderRadius: '4px',
        cursor: 'pointer',
        transition: 'background-color 0.3s ease',
        width: '100%',
        marginTop: '10px',
        fontSize: '0.9em',
    },
    removeColorBlockButton: {
        backgroundColor: '#dc3545',
        color: 'white',
        padding: '8px 12px',
        border: 'none',
        borderRadius: '4px',
        cursor: 'pointer',
        transition: 'background-color 0.3s ease',
        width: '100%',
        marginTop: '10px',
        fontSize: '0.9em',
    },
    addSectionButton: {
        backgroundColor: '#007bff',
        color: 'white',
        padding: '12px 20px',
        border: 'none',
        borderRadius: '8px',
        cursor: 'pointer',
        fontSize: '1em',
        fontWeight: 'bold',
        transition: 'background-color 0.3s ease',
        marginTop: '20px',
        width: '100%',
    },
    inputGroup: {
        display: 'flex',
        flexDirection: 'column',
        gap: '5px',
    },
    label: {
        fontWeight: 'bold',
        color: '#555',
        marginBottom: '5px',
    },
    helperText: {
        fontSize: '0.8em',
        color: '#888',
        marginTop: '5px',
    },
    linkText: {
        color: '#007bff',
        textDecoration: 'underline',
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
        width: '90%',
        maxWidth: '400px',
        textAlign: 'center',
    },
    modalButton: {
        padding: '10px 20px',
        borderRadius: '5px',
        border: 'none',
        cursor: 'pointer',
        fontSize: '1em',
        fontWeight: 'bold',
        transition: 'background-color 0.3s ease',
    },
    modalButtonConfirm: {
        backgroundColor: '#28a745',
        color: 'white',
    },
    modalButtonCancel: {
        backgroundColor: '#6c757d',
        color: 'white',
    },
    modalActions: {
        display: 'flex',
        justifyContent: 'center',
        gap: '15px',
        marginTop: '20px',
    },
};

function ProductsPage() {
    const { currentUser, userRole, loading: authLoading } = useAuth();
    const { db, firebaseLoading } = useFirebase();

    const [products, setProducts] = useState([]);
    const [categories, setCategories] = useState([]);
    const [sizeGrades, setSizeGrades] = useState({});
    const [colors, setColors] = useState([]);
    const [suppliers, setSuppliers] = useState([]);

    const [newProductCode, setNewProductCode] = useState('');
    const [newProductName, setNewProductName] = useState('');
    const [newProductDescription, setNewProductDescription] = useState('');
    const [newProductPrice, setNewProductPrice] = useState('');
    const [newProductCostPrice, setNewProductCostPrice] = useState('');
    const [newProductBarcode, setNewProductBarcode] = useState('');
    const [newProductGender, setNewProductGender] = useState('');
    const [newProductCategory, setNewProductCategory] = useState('');
    const [newProductSupplier, setNewProductSupplier] = useState('');
    const [newProductColorVariations, setNewProductColorVariations] = useState([]);

    const [editingProduct, setEditingProduct] = useState(null);
    const [editProductCode, setEditProductCode] = useState('');
    const [editProductName, setEditProductName] = useState('');
    const [editProductDescription, setEditProductDescription] = useState('');
    const [editProductPrice, setEditProductPrice] = useState('');
    const [editProductCostPrice, setEditProductCostPrice] = useState('');
    const [editProductBarcode, setEditProductBarcode] = useState('');
    const [editProductGender, setEditProductGender] = useState('');
    const [editProductCategory, setEditProductCategory] = useState('');
    const [editProductSupplier, setEditProductSupplier] = useState('');
    const [editProductColorVariations, setEditProductColorVariations] = useState([]);

    const [error, setError] = useState(null);
    const [successMessage, setSuccessMessage] = useState(null);
    const [dataLoading, setDataLoading] = useState(true);
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [confirmModalMessage, setConfirmModalMessage] = useState('');
    const [confirmAction, setConfirmAction] = useState(null);
    const [variationError, setVariationError] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);

    const [sortColumn, setSortColumn] = useState('code');
    const [sortDirection, setSortDirection] = useState('asc');

    const canManageProducts = currentUser && (userRole === 'admin' || userRole === 'manager' || userRole === 'employee');
    const canCreateEditDelete = currentUser && (userRole === 'admin' || userRole === 'manager');

    const productsCollectionRef = useMemo(() => db ? collection(db, 'products') : null, [db]);
    const productAttributesCollectionRef = useMemo(() => db ? collection(db, 'product_attributes') : null, [db]);

    const fetchProducts = useCallback(() => {
        if (!productsCollectionRef || authLoading || firebaseLoading || !currentUser) {
            setDataLoading(true);
            return;
        }

        if (!canManageProducts) {
            setProducts([]);
            setDataLoading(false);
            return;
        }

        setDataLoading(true);
        setError(null);

        // REFACTOR: A query agora busca todos os produtos, pois esta é uma página de catálogo global.
        const productsQuery = query(productsCollectionRef, orderBy("name"));

        const unsubscribe = onSnapshot(productsQuery,
            (snapshot) => {
                const productsData = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data(),
                    // Garante que variations seja um array para evitar erros
                    variations: doc.data().variations || []
                }));
                setProducts(productsData);
                setDataLoading(false);
                setError(null);
            },
            (error) => {
                console.error("ProductsPage (fetchProducts): Erro ao carregar produtos:", error);
                setError(`Erro ao carregar o catálogo de produtos: ${error.message}.`);
                setDataLoading(false);
            }
        );

        return unsubscribe;
    }, [productsCollectionRef, authLoading, firebaseLoading, canManageProducts, currentUser]);

    // Funções para buscar atributos (sem alterações)
    const fetchCategories = useCallback(async () => {
        if (!productAttributesCollectionRef) return;
        try {
            const docRef = doc(productAttributesCollectionRef, CATEGORIES_DOC_ID);
            const docSnap = await getDocs(docRef);
            if (docSnap.exists()) {
                setCategories(docSnap.data().items || []);
            }
        } catch (err) {
            setError("Erro ao carregar categorias.");
        }
    }, [productAttributesCollectionRef]);

    const fetchSizeGrades = useCallback(async () => {
        if (!productAttributesCollectionRef) return;
        try {
            const docRef = doc(productAttributesCollectionRef, SIZE_GRADES_DOC_ID);
            const docSnap = await getDocs(docRef);
            if (docSnap.exists()) {
                setSizeGrades(docSnap.data() || {});
            }
        } catch (err) {
            setError("Erro ao carregar grades de tamanho.");
        }
    }, [productAttributesCollectionRef]);

    const fetchColors = useCallback(async () => {
        if (!productAttributesCollectionRef) return;
        try {
            const docRef = doc(productAttributesCollectionRef, COLORS_DOC_ID);
            const docSnap = await getDocs(docRef);
            if (docSnap.exists()) {
                setColors(docSnap.data().items || []);
            }
        } catch (err) {
            setError("Erro ao carregar cores.");
        }
    }, [productAttributesCollectionRef]);

    const fetchSuppliers = useCallback(async () => {
        if (!productAttributesCollectionRef) return;
        try {
            const docRef = doc(productAttributesCollectionRef, SUPPLIERS_DOC_ID);
            const docSnap = await getDocs(docRef);
            if (docSnap.exists()) {
                setSuppliers(docSnap.data().items || []);
            }
        } catch (err) {
            setError("Erro ao carregar fornecedores.");
        }
    }, [productAttributesCollectionRef]);

    useEffect(() => {
        if (!authLoading && !firebaseLoading && db && currentUser) {
            const unsubProducts = fetchProducts();
            fetchCategories();
            fetchSizeGrades();
            fetchColors();
            fetchSuppliers();
            return () => {
                if (unsubProducts) unsubProducts();
            };
        }
    }, [authLoading, firebaseLoading, db, currentUser, fetchProducts, fetchCategories, fetchSizeGrades, fetchColors, fetchSuppliers]);

    useEffect(() => {
        if (newProductColorVariations.length === 0 && colors.length > 0) {
            setNewProductColorVariations([{
                id: Date.now(),
                selectedColor: '',
                selectedSizeGrade: '',
                sizes: [''] // REFACTOR: Apenas armazena os tamanhos, sem quantidade
            }]);
        }
    }, [colors, newProductColorVariations.length]);

    // --- Lógica de Variações (REATORADA para não gerir quantidade) ---
    const handleAddColorVariationBlock = () => {
        setNewProductColorVariations([...newProductColorVariations, { id: Date.now(), selectedColor: '', selectedSizeGrade: '', sizes: [''] }]);
    };

    const handleRemoveColorVariationBlock = (idToRemove) => {
        setNewProductColorVariations(newProductColorVariations.filter(block => block.id !== idToRemove));
    };

    const handleColorSelectionChange = (id, color) => {
        setNewProductColorVariations(prev => prev.map(block =>
            block.id === id ? { ...block, selectedColor: color } : block
        ));
    };

    const handleSizeGradeChangeForColorBlock = (id, gradeName) => {
        setNewProductColorVariations(prev => prev.map(block => {
            if (block.id === id) {
                const newSizes = gradeName && gradeName !== 'custom' && sizeGrades[gradeName] ? [...sizeGrades[gradeName]] : [''];
                return { ...block, selectedSizeGrade: gradeName, sizes: newSizes };
            }
            return block;
        }));
    };

    const handleSizeChangeForColorBlock = (blockId, sizeIndex, value) => {
        setNewProductColorVariations(prev => prev.map(block => {
            if (block.id === blockId) {
                const updatedSizes = [...block.sizes];
                updatedSizes[sizeIndex] = value;
                return { ...block, sizes: updatedSizes };
            }
            return block;
        }));
    };

    const handleAddCustomSizeForColorBlock = (blockId) => {
        setNewProductColorVariations(prev => prev.map(block =>
            block.id === blockId ? { ...block, sizes: [...block.sizes, ''] } : block
        ));
    };

    const handleRemoveCustomSizeForColorBlock = (blockId, sizeIndexToRemove) => {
        setNewProductColorVariations(prev => prev.map(block =>
            block.id === blockId ? { ...block, sizes: block.sizes.filter((_, idx) => idx !== sizeIndexToRemove) } : block
        ));
    };
    
    // Funções de edição de variações (semelhantes às de criação)
    const handleEditColorVariationBlock = (id, field, value) => {
        setEditProductColorVariations(prev => prev.map(block => {
            if (block.id === id) {
                if (field === 'selectedSizeGrade') {
                    const newSizes = value && value !== 'custom' && sizeGrades[value] ? [...sizeGrades[value]] : [''];
                    return { ...block, [field]: value, sizes: newSizes };
                } else if (field === 'selectedColor') {
                    return { ...block, selectedColor: value };
                }
            }
            return block;
        }));
    };

    const handleEditSizeChangeForColorBlock = (blockId, sizeIndex, value) => {
        setEditProductColorVariations(prev => prev.map(block => {
            if (block.id === blockId) {
                const updatedSizes = [...block.sizes];
                updatedSizes[sizeIndex] = value;
                return { ...block, sizes: updatedSizes };
            }
            return block;
        }));
    };
    
    const handleAddEditCustomSizeForColorBlock = (blockId) => {
        setEditProductColorVariations(prev => prev.map(block => block.id === blockId ? { ...block, sizes: [...block.sizes, ''] } : block));
    };

    const handleRemoveEditCustomSizeForColorBlock = (blockId, sizeIndex) => {
        setEditProductColorVariations(prev => prev.map(block => block.id === blockId ? { ...block, sizes: block.sizes.filter((_, i) => i !== sizeIndex) } : block));
    };
    
    const handleRemoveEditColorVariationBlock = (id) => {
        setEditProductColorVariations(editProductColorVariations.filter(b => b.id !== id));
    };


    const handleAddProduct = async (e) => {
        e.preventDefault();
        setError(null);
        setIsProcessing(true);

        if (!canCreateEditDelete) {
            setError("Não tem permissão para adicionar produtos.");
            setIsProcessing(false);
            return;
        }

        if (!newProductCode.trim() || !newProductName.trim() || !newProductCategory || !newProductSupplier) {
            setError("Código, Nome, Categoria e Fornecedor são obrigatórios.");
            setIsProcessing(false);
            return;
        }
        
        // Validação das variações
        for (const block of newProductColorVariations) {
            if (!block.selectedColor.trim()) {
                setError("Todas as variações devem ter uma cor selecionada.");
                setIsProcessing(false);
                return;
            }
            for (const size of block.sizes) {
                if (!size.trim()) {
                    setError(`A cor ${block.selectedColor} tem um tamanho em branco. Por favor, preencha ou remova.`);
                    setIsProcessing(false);
                    return;
                }
            }
        }

        try {
            // REFACTOR: Monta o objeto do produto sem storeIds e sem quantity
            const flattenedVariations = [];
            newProductColorVariations.forEach(colorBlock => {
                colorBlock.sizes.forEach(size => {
                    if (size.trim()) { // Apenas adiciona se o tamanho não estiver em branco
                        flattenedVariations.push({
                            color: colorBlock.selectedColor.trim(),
                            size: size.trim(),
                        });
                    }
                });
            });

            const productData = {
                code: newProductCode.trim(),
                name: newProductName.trim(),
                name_lowercase: newProductName.trim().toLowerCase(),
                description: newProductDescription.trim(),
                price: parseFloat(newProductPrice) || 0,
                costPrice: parseFloat(newProductCostPrice) || 0,
                barcode: newProductBarcode.trim() || null,
                category: newProductCategory,
                gender: newProductGender,
                supplier: newProductSupplier,
                createdAt: new Date(),
                createdBy: currentUser.email,
                variations: flattenedVariations, // Contém apenas {color, size}
            };

            await addDoc(productsCollectionRef, productData);
            setSuccessMessage("Produto adicionado ao catálogo com sucesso!");

            // Limpa o formulário
            setNewProductCode('');
            setNewProductName('');
            setNewProductDescription('');
            setNewProductPrice('');
            setNewProductCostPrice('');
            setNewProductBarcode('');
            setNewProductGender('');
            setNewProductCategory('');
            setNewProductSupplier('');
            setNewProductColorVariations([{ id: Date.now(), selectedColor: '', selectedSizeGrade: '', sizes: [''] }]);

        } catch (err) {
            setError(`Erro ao adicionar produto: ${err.message}`);
        } finally {
            setIsProcessing(false);
        }
    };

    const handleEditClick = (product) => {
        setEditingProduct(product.id);
        setEditProductCode(product.code || '');
        setEditProductName(product.name);
        setEditProductDescription(product.description || '');
        setEditProductPrice(product.price !== undefined ? product.price.toString() : '');
        setEditProductCostPrice(product.costPrice !== undefined ? product.costPrice.toString() : '');
        setEditProductGender(product.gender || '');
        setEditProductBarcode(product.barcode || '');
        setEditProductCategory(product.category || '');
        setEditProductSupplier(product.supplier || '');

        // REFACTOR: Agrupa as variações sem quantidade
        if (product.variations && product.variations.length > 0) {
            const grouped = product.variations.reduce((acc, v) => {
                if (!acc[v.color]) {
                    acc[v.color] = { id: Date.now() + Math.random(), selectedColor: v.color, selectedSizeGrade: 'custom', sizes: [] };
                }
                acc[v.color].sizes.push(v.size);
                return acc;
            }, {});
            setEditProductColorVariations(Object.values(grouped));
        } else {
            setEditProductColorVariations([{ id: Date.now(), selectedColor: '', selectedSizeGrade: '', sizes: [''] }]);
        }

        setError(null);
        setSuccessMessage(null);
    };


    const handleUpdateProduct = async (id) => {
        setError(null);
        setIsProcessing(true);

        if (!canCreateEditDelete) {
            setError("Não tem permissão para atualizar produtos.");
            setIsProcessing(false);
            return;
        }

        // Validações... (semelhantes a handleAddProduct)
        if (!editProductCode.trim() || !editProductName.trim() || !editProductCategory || !editProductSupplier) {
            setError("Código, Nome, Categoria e Fornecedor são obrigatórios.");
            setIsProcessing(false);
            return;
        }
        
        try {
            const productRef = doc(productsCollectionRef, id);
            
            // REFACTOR: Monta o objeto de atualização
            const flattenedVariations = [];
            editProductColorVariations.forEach(colorBlock => {
                colorBlock.sizes.forEach(size => {
                     if (size.trim()) {
                        flattenedVariations.push({
                            color: colorBlock.selectedColor.trim(),
                            size: size.trim(),
                        });
                    }
                });
            });

            const updatedProductData = {
                code: editProductCode.trim(),
                name: editProductName.trim(),
                name_lowercase: editProductName.trim().toLowerCase(),
                description: editProductDescription.trim(),
                price: parseFloat(editProductPrice) || 0,
                costPrice: parseFloat(editProductCostPrice) || 0,
                barcode: editProductBarcode.trim() || null,
                category: editProductCategory,
                gender: editProductGender,
                supplier: editProductSupplier,
                updatedAt: new Date(),
                updatedBy: currentUser.email,
                variations: flattenedVariations,
            };

            await updateDoc(productRef, updatedProductData);
            setSuccessMessage("Produto atualizado com sucesso!");
            setEditingProduct(null);
        } catch (err) {
            setError(`Erro ao atualizar produto: ${err.message}`);
        } finally {
            setIsProcessing(false);
        }
    };

    const handleDeleteProduct = async (id) => {
        // A lógica de exclusão pode permanecer, mas precisa-se considerar o que fazer com o estoque associado.
        // Por agora, apenas deletamos do catálogo. Uma estratégia mais robusta seria arquivar.
        setShowConfirmModal(true);
        setConfirmModalMessage("Tem a certeza que deseja apagar este produto do catálogo? Esta ação não pode ser desfeita e não removerá o histórico de estoque ou vendas.");
        setConfirmAction(() => async () => {
            if (!canCreateEditDelete) {
                setError("Não tem permissão para apagar produtos.");
                return;
            }
            try {
                await deleteDoc(doc(productsCollectionRef, id));
                setSuccessMessage("Produto apagado do catálogo com sucesso!");
            } catch (err) {
                setError(`Erro ao apagar produto: ${err.message}`);
            }
        });
    };
    
    const handleConfirmModalResponse = (response) => {
        if (response && confirmAction) {
            confirmAction();
        }
        setShowConfirmModal(false);
        setConfirmModalMessage('');
        setConfirmAction(null);
    };

    const handleSort = (column) => {
        if (sortColumn === column) {
            setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
        } else {
            setSortColumn(column);
            setSortDirection('asc');
        }
    };
    
    // REFACTOR: A ordenação não inclui mais 'totalQuantity' ou 'stores'
    const sortedProducts = useMemo(() => {
        return [...products].sort((a, b) => {
            let valA = a[sortColumn] || '';
            let valB = b[sortColumn] || '';

            if (typeof valA === 'number' && typeof valB === 'number') {
                return sortDirection === 'asc' ? valA - valB : valB - valA;
            } else {
                return sortDirection === 'asc' ? String(valA).localeCompare(String(valB)) : String(valB).localeCompare(String(valA));
            }
        });
    }, [products, sortColumn, sortDirection]);

    if (authLoading || firebaseLoading) {
        return <div style={styles.loadingContainer}><div style={styles.spinner}></div><p>A carregar...</p></div>;
    }

    if (!canManageProducts) {
        return <div style={styles.container}><h2 style={styles.accessDenied}>Acesso negado.</h2></div>;
    }

    return (
        <div style={styles.container}>
            <h1 style={styles.title}>Catálogo Global de Produtos</h1>

            {error && <p style={styles.messageError}>{error}</p>}
            {successMessage && <p style={styles.messageSuccess}>{successMessage}</p>}
            {isProcessing && <div style={styles.loadingContainer}><div style={styles.spinner}></div><p>A processar...</p></div>}

            <div style={styles.topActions}>
                <Link to="/settings/product-attributes" style={styles.manageAttributesButton}>Gerir Atributos</Link>
            </div>

            {canCreateEditDelete && (
                <form onSubmit={editingProduct ? () => handleUpdateProduct(editingProduct) : handleAddProduct} style={styles.form}>
                    <h2 style={styles.formTitle}>{editingProduct ? `Editar Produto: ${editProductName}` : "Adicionar Novo Produto ao Catálogo"}</h2>
                    
                    {/* Campos Comuns */}
                    <div style={styles.inputGroup}><label style={styles.label}>Código/SKU:</label><input type="text" value={editingProduct ? editProductCode : newProductCode} onChange={(e) => editingProduct ? setEditProductCode(e.target.value) : setNewProductCode(e.target.value)} style={styles.input} required /></div>
                    <div style={styles.inputGroup}><label style={styles.label}>Nome do Produto:</label><input type="text" value={editingProduct ? editProductName : newProductName} onChange={(e) => editingProduct ? setEditProductName(e.target.value) : setNewProductName(e.target.value)} style={styles.input} required /></div>
                    <div style={styles.inputGroup}><label style={styles.label}>Descrição:</label><textarea value={editingProduct ? editProductDescription : newProductDescription} onChange={(e) => editingProduct ? setEditProductDescription(e.target.value) : setNewProductDescription(e.target.value)} style={styles.textarea}></textarea></div>
                    <div style={styles.inputGroup}><label style={styles.label}>Preço de Venda (R$):</label><input type="number" step="0.01" value={editingProduct ? editProductPrice : newProductPrice} onChange={(e) => editingProduct ? setEditProductPrice(e.target.value) : setNewProductPrice(e.target.value)} style={styles.input} /></div>
                    <div style={styles.inputGroup}><label style={styles.label}>Preço de Custo (R$):</label><input type="number" step="0.01" value={editingProduct ? editProductCostPrice : newProductCostPrice} onChange={(e) => editingProduct ? setEditProductCostPrice(e.target.value) : setNewProductCostPrice(e.target.value)} style={styles.input} /></div>
                    <div style={styles.inputGroup}><label style={styles.label}>Código de Barras:</label><input type="text" value={editingProduct ? editProductBarcode : newProductBarcode} onChange={(e) => editingProduct ? setEditProductBarcode(e.target.value) : setNewProductBarcode(e.target.value)} style={styles.input} /></div>
                    <div style={styles.inputGroup}><label style={styles.label}>Categoria:</label><select value={editingProduct ? editProductCategory : newProductCategory} onChange={(e) => editingProduct ? setEditProductCategory(e.target.value) : setNewProductCategory(e.target.value)} style={styles.select} required><option value="">Selecione</option>{categories.map(c => <option key={c} value={c}>{c}</option>)}</select></div>
                    <div style={styles.inputGroup}><label style={styles.label}>Gênero:</label><select value={editingProduct ? editProductGender : newProductGender} onChange={(e) => editingProduct ? setEditProductGender(e.target.value) : setNewProductGender(e.target.value)} required style={styles.select}><option value="">Selecione</option><option value="Masculino">Masculino</option><option value="Feminino">Feminino</option><option value="Unissex">Unissex</option></select></div>
                    <div style={styles.inputGroup}><label style={styles.label}>Fornecedor:</label><select value={editingProduct ? editProductSupplier : newProductSupplier} onChange={(e) => editingProduct ? setEditProductSupplier(e.target.value) : setNewProductSupplier(e.target.value)} style={styles.select} required><option value="">Selecione</option>{suppliers.map(s => <option key={s} value={s}>{s}</option>)}</select></div>

                    {/* REFACTOR: Seção de Variações sem quantidade */}
                    <div style={styles.variationsSection}>
                        <h3 style={styles.variationsTitle}>Variações de Cor e Tamanho</h3>
                        {(editingProduct ? editProductColorVariations : newProductColorVariations).map((colorBlock) => (
                            <div key={colorBlock.id} style={styles.colorVariationBlock}>
                                <div style={styles.inputGroup}><label style={styles.label}>Cor:</label><select value={colorBlock.selectedColor} onChange={(e) => editingProduct ? handleEditColorVariationBlock(colorBlock.id, 'selectedColor', e.target.value) : handleColorSelectionChange(colorBlock.id, e.target.value)} required style={styles.select}><option value="">Selecione</option>{colors.map(c => <option key={c} value={c}>{c}</option>)}</select></div>
                                <div style={styles.inputGroup}><label style={styles.label}>Grade de Tamanhos:</label><select value={colorBlock.selectedSizeGrade} onChange={(e) => editingProduct ? handleEditColorVariationBlock(colorBlock.id, 'selectedSizeGrade', e.target.value) : handleSizeGradeChangeForColorBlock(colorBlock.id, e.target.value)} style={styles.select}><option value="">Selecione uma Grade</option>{Object.keys(sizeGrades).map(g => <option key={g} value={g}>{g}</option>)}<option value="custom">Personalizada</option></select></div>
                                <div style={styles.sizeQuantityGrid}>
                                    {colorBlock.sizes.map((size, sizeIndex) => (
                                        <div key={sizeIndex} style={styles.variationRow}>
                                            <input type="text" placeholder="Tamanho (P, 38)" value={size} onChange={(e) => (editingProduct ? handleEditSizeChangeForColorBlock : handleSizeChangeForColorBlock)(colorBlock.id, sizeIndex, e.target.value)} style={{...styles.input, flex: 1}} required />
                                            {colorBlock.sizes.length > 1 && (<button type="button" onClick={() => (editingProduct ? handleRemoveEditCustomSizeForColorBlock : handleRemoveCustomSizeForColorBlock)(colorBlock.id, sizeIndex)} style={styles.removeVariationButton}>X</button>)}
                                        </div>
                                    ))}
                                    {colorBlock.selectedSizeGrade === 'custom' && (<button type="button" onClick={() => (editingProduct ? handleAddEditCustomSizeForColorBlock : handleAddCustomSizeForColorBlock)(colorBlock.id)} style={styles.addVariationButton}>+ Adicionar Tamanho</button>)}
                                </div>
                                {(editingProduct ? editProductColorVariations.length > 1 : newProductColorVariations.length > 1) && (<button type="button" onClick={() => editingProduct ? handleRemoveEditColorVariationBlock(colorBlock.id) : handleRemoveColorVariationBlock(colorBlock.id)} style={styles.removeColorBlockButton}>Remover Cor</button>)}
                            </div>
                        ))}
                        <button type="button" onClick={editingProduct ? () => setEditProductColorVariations(p => [...p, {id: Date.now(), selectedColor:'', selectedSizeGrade:'', sizes:['']}]) : handleAddColorVariationBlock} style={styles.addSectionButton}>+ Adicionar Cor</button>
                    </div>

                    <button type="submit" style={styles.button} disabled={isProcessing}>{isProcessing ? 'A salvar...' : (editingProduct ? 'Atualizar Produto' : 'Adicionar Produto')}</button>
                    {editingProduct && <button type="button" onClick={() => setEditingProduct(null)} style={{...styles.button, backgroundColor: '#6c757d'}} disabled={isProcessing}>Cancelar Edição</button>}
                </form>
            )}

            <h2 style={styles.listTitle}>Catálogo de Produtos</h2>
            <table style={styles.productList}>
                <thead>
                    <tr style={styles.tableRowHeader}>
                        {/* REFACTOR: Colunas de Estoque e Lojas removidas */}
                        <th style={styles.tableHeader} onClick={() => handleSort('code')}>Código</th>
                        <th style={styles.tableHeader} onClick={() => handleSort('name')}>Nome</th>
                        <th style={styles.tableHeader} onClick={() => handleSort('price')}>Preço Venda</th>
                        <th style={styles.tableHeader} onClick={() => handleSort('costPrice')}>Preço Custo</th>
                        <th style={styles.tableHeader} onClick={() => handleSort('category')}>Categoria</th>
                        <th style={styles.tableHeader} onClick={() => handleSort('supplier')}>Fornecedor</th>
                        <th style={styles.tableHeader}>Variações</th>
                        <th style={styles.tableHeader}>Ações</th>
                    </tr>
                </thead>
                <tbody>
                    {dataLoading ? (
                        <tr><td colSpan="8" style={{textAlign: 'center', padding: '20px'}}>A carregar catálogo...</td></tr>
                    ) : sortedProducts.length === 0 ? (
                        <tr><td colSpan="8" style={{textAlign: 'center', padding: '20px'}}>Nenhum produto no catálogo.</td></tr>
                    ) : (
                        sortedProducts.map(product => (
                            <tr key={product.id}>
                                <td style={styles.tableCell}>{product.code}</td>
                                <td style={styles.tableCell}>{product.name}</td>
                                <td style={styles.tableCell}>R$ {product.price ? product.price.toFixed(2) : 'N/A'}</td>
                                <td style={styles.tableCell}>R$ {product.costPrice ? product.costPrice.toFixed(2) : 'N/A'}</td>
                                <td style={styles.tableCell}>{product.category || 'N/A'}</td>
                                <td style={styles.tableCell}>{product.supplier || 'N/A'}</td>
                                <td style={styles.tableCell}>
                                    {product.variations && product.variations.length > 0
                                        ? [...new Set(product.variations.map(v => v.color))].join(', ')
                                        : 'Nenhuma'}
                                </td>
                                <td style={styles.tableCell}>
                                    <div style={styles.tableActions}>
                                        <button onClick={() => handleEditClick(product)} style={styles.editButton}>Editar</button>
                                        {canCreateEditDelete && <button onClick={() => handleDeleteProduct(product.id)} style={styles.deleteButton}>Apagar</button>}
                                    </div>
                                </td>
                            </tr>
                        ))
                    )}
                </tbody>
            </table>
            
            {showConfirmModal && (
                <div style={styles.modalOverlay}>
                    <div style={styles.modalContent}>
                        <h3>Confirmação</h3>
                        <p>{confirmModalMessage}</p>
                        <div style={styles.modalActions}>
                            <button onClick={() => handleConfirmModalResponse(true)} style={styles.modalButtonConfirm}>Sim, Apagar</button>
                            <button onClick={() => handleConfirmModalResponse(false)} style={styles.modalButtonCancel}>Não</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default ProductsPage;
