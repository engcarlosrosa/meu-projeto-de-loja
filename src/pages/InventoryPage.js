import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../components/AuthProvider';
import { useFirebase } from '../contexts/FirebaseContext';
import { collection, query, where, getDocs, writeBatch, doc, onSnapshot, orderBy, serverTimestamp } from 'firebase/firestore';
import { Store, Package, Save, Search, AlertTriangle } from 'lucide-react';

const styles = {
    container: { padding: '20px', maxWidth: '1400px', margin: '20px auto', fontFamily: "'Inter', sans-serif" },
    header: { textAlign: 'center', color: '#34495e', marginBottom: '30px', fontSize: '2.2em', fontWeight: '700' },
    section: { backgroundColor: '#fff', padding: '25px', borderRadius: '12px', marginBottom: '25px', boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)' },
    sectionTitle: { color: '#2c3e50', fontSize: '1.6em', marginBottom: '20px', borderBottom: '2px solid #eee', paddingBottom: '10px', display: 'flex', alignItems: 'center', gap: '10px' },
    filtersContainer: { display: 'flex', gap: '20px', marginBottom: '20px', alignItems: 'center', flexWrap: 'wrap' },
    inputGroup: { display: 'flex', alignItems: 'center', gap: '10px', flexGrow: 1 },
    select: { padding: '10px', border: '1px solid #ddd', borderRadius: '6px', backgroundColor: '#fff', minWidth: '250px' },
    input: { padding: '10px', border: '1px solid #ddd', borderRadius: '6px', flexGrow: 1 },
    tableContainer: { overflowX: 'auto', maxHeight: '70vh' },
    table: { width: '100%', borderCollapse: 'collapse' },
    tableHeader: { backgroundColor: '#f2f2f2', fontWeight: 'bold', textAlign: 'left', padding: '12px', borderBottom: '2px solid #ddd', position: 'sticky', top: 0, zIndex: 1 },
    productRow: { backgroundColor: '#f9fafb' },
    productCell: { padding: '12px', fontWeight: 'bold', borderBottom: '1px solid #ddd', borderTop: '2px solid #34495e' },
    variationRow: { borderBottom: '1px solid #eee' },
    variationCell: { padding: '8px 12px', verticalAlign: 'middle' },
    quantityInput: { width: '80px', padding: '8px', border: '1px solid #ccc', borderRadius: '4px', textAlign: 'center' },
    quantityInputChanged: { backgroundColor: '#fff3cd', borderColor: '#ffeeba' },
    actionsContainer: { display: 'flex', justifyContent: 'flex-end', marginTop: '20px' },
    saveButton: { padding: '12px 25px', borderRadius: '8px', border: 'none', color: 'white', fontSize: '1.1em', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '600', backgroundColor: '#28a745' },
    messageError: { backgroundColor: '#f8d7da', color: '#721c24', padding: '12px', borderRadius: '8px', marginBottom: '20px', textAlign: 'center' },
    messageSuccess: { backgroundColor: '#d4edda', color: '#155724', padding: '12px', borderRadius: '8px', marginBottom: '20px', textAlign: 'center' },
    loadingContainer: { textAlign: 'center', padding: '50px' },
};

function InventoryPage() {
    const { userRole, userStoreId } = useAuth();
    const { db } = useFirebase();

    const [stores, setStores] = useState([]);
    const [selectedStoreId, setSelectedStoreId] = useState(userStoreId || '');
    const [catalog, setCatalog] = useState([]);
    const [inventoryMap, setInventoryMap] = useState(new Map());
    const [editedQuantities, setEditedQuantities] = useState({});
    const [searchTerm, setSearchTerm] = useState('');
    
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const productsCollectionRef = useMemo(() => db ? collection(db, 'products') : null, [db]);
    const inventoryCollectionRef = useMemo(() => db ? collection(db, 'inventory') : null, [db]);
    const storesCollectionRef = useMemo(() => db ? collection(db, 'stores') : null, [db]);
    
    // Fetch stores (for admin selector)
    useEffect(() => {
        if (userRole === 'admin' && storesCollectionRef) {
            getDocs(storesCollectionRef).then(snapshot => {
                const storesList = snapshot.docs.map(doc => ({ id: doc.id, name: doc.data().name }));
                setStores(storesList);
                if (!userStoreId && storesList.length > 0) {
                    setSelectedStoreId(storesList[0].id);
                }
            });
        }
    }, [db, userRole, userStoreId, storesCollectionRef]);

    // Fetch product catalog
    useEffect(() => {
        if (!productsCollectionRef) return;
        const q = query(productsCollectionRef, orderBy('name'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const productList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setCatalog(productList);
        }, (err) => {
            setError("Falha ao carregar o catálogo de produtos.");
            console.error(err);
        });
        return unsubscribe;
    }, [productsCollectionRef]);

    // Fetch inventory for the selected store
    useEffect(() => {
        if (!selectedStoreId || !inventoryCollectionRef) {
            setInventoryMap(new Map());
            setIsLoading(false);
            return;
        }
        setIsLoading(true);
        const q = query(inventoryCollectionRef, where("storeId", "==", selectedStoreId));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const newInventoryMap = new Map();
            snapshot.forEach(doc => {
                const item = doc.data();
                const key = `${item.productId}-${item.color}-${item.size}`;
                newInventoryMap.set(key, item.quantity);
            });
            setInventoryMap(newInventoryMap);
            setIsLoading(false);
        }, (err) => {
            setError("Falha ao carregar o inventário da loja.");
            console.error(err);
            setIsLoading(false);
        });
        return unsubscribe;
    }, [selectedStoreId, inventoryCollectionRef]);

    const filteredCatalog = useMemo(() => {
        if (!searchTerm) return catalog;
        const lowerCaseSearch = searchTerm.toLowerCase();
        return catalog.filter(p => 
            p.name.toLowerCase().includes(lowerCaseSearch) || 
            p.code.toLowerCase().includes(lowerCaseSearch)
        );
    }, [catalog, searchTerm]);

    const handleQuantityChange = (productId, color, size, value) => {
        const key = `${productId}-${color}-${size}`;
        const newValue = value === '' ? '' : parseInt(value, 10);
        
        if (isNaN(newValue) && value !== '') return; // Impede entrada não numérica

        setEditedQuantities(prev => ({
            ...prev,
            [key]: newValue,
        }));
    };

    const handleSaveChanges = async () => {
        if (Object.keys(editedQuantities).length === 0) {
            setSuccess("Nenhuma alteração para salvar.");
            return;
        }
        setIsSaving(true);
        setError('');
        setSuccess('');

        try {
            const batch = writeBatch(db);
            const inventoryQuery = query(inventoryCollectionRef, where("storeId", "==", selectedStoreId));
            const inventorySnapshot = await getDocs(inventoryQuery);
            const existingInventoryDocs = new Map();
            inventorySnapshot.forEach(doc => {
                const data = doc.data();
                const key = `${data.productId}-${data.color}-${data.size}`;
                existingInventoryDocs.set(key, { id: doc.id, ...data });
            });

            for (const key in editedQuantities) {
                const [productId, color, size] = key.split('-');
                const newQuantity = editedQuantities[key] === '' ? 0 : editedQuantities[key];

                const existingDoc = existingInventoryDocs.get(key);

                if (existingDoc) {
                    // Update existing document
                    const docRef = doc(db, 'inventory', existingDoc.id);
                    batch.update(docRef, { 
                        quantity: newQuantity,
                        updatedAt: serverTimestamp()
                    });
                } else if (newQuantity > 0) {
                    // Create new document
                    const productDetails = catalog.find(p => p.id === productId);
                    const newDocRef = doc(collection(db, 'inventory'));
                    batch.set(newDocRef, {
                        productId,
                        productName: productDetails?.name || 'N/A',
                        productCode: productDetails?.code || 'N/A',
                        productPrice: productDetails?.price || 0,
                        storeId: selectedStoreId,
                        color,
                        size,
                        quantity: newQuantity,
                        createdAt: serverTimestamp(),
                        updatedAt: serverTimestamp(),
                    });
                }
            }
            await batch.commit();
            setSuccess("Estoque atualizado com sucesso!");
            setEditedQuantities({});
        } catch (err) {
            setError(`Falha ao salvar alterações: ${err.message}`);
            console.error(err);
        } finally {
            setIsSaving(false);
        }
    };
    
    if (userRole !== 'admin' && userRole !== 'manager') {
        return <div style={styles.container}><h1 style={styles.header}>Acesso Negado</h1></div>;
    }

    return (
        <div style={styles.container}>
            <h1 style={styles.header}>Gestão de Inventário</h1>
            {error && <p style={styles.messageError}>{error}</p>}
            {success && <p style={styles.messageSuccess}>{success}</p>}

            <div style={styles.section}>
                <h2 style={styles.sectionTitle}>Filtros</h2>
                <div style={styles.filtersContainer}>
                    {userRole === 'admin' && (
                        <div style={styles.inputGroup}>
                            <Store />
                            <select 
                                value={selectedStoreId} 
                                onChange={e => setSelectedStoreId(e.target.value)} 
                                style={styles.select}
                                disabled={Object.keys(editedQuantities).length > 0}
                            >
                                <option value="">Selecione uma Loja</option>
                                {stores.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                            </select>
                        </div>
                    )}
                     <div style={styles.inputGroup}>
                        <Search />
                        <input 
                            type="text"
                            placeholder="Buscar por nome ou código do produto..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            style={styles.input}
                        />
                    </div>
                </div>
                 {Object.keys(editedQuantities).length > 0 && (
                    <p style={{color: '#f97316', display: 'flex', alignItems: 'center', gap: '8px'}}><AlertTriangle size={18}/> Salve as alterações pendentes antes de mudar de loja.</p>
                )}
            </div>

            <div style={styles.section}>
                <div style={styles.tableContainer}>
                    <table style={styles.table}>
                        <thead>
                            <tr>
                                <th style={styles.tableHeader}>Produto</th>
                                <th style={styles.tableHeader}>Cor</th>
                                <th style={styles.tableHeader}>Tamanho</th>
                                <th style={styles.tableHeader}>Quantidade em Estoque</th>
                            </tr>
                        </thead>
                        <tbody>
                            {isLoading ? (
                                <tr><td colSpan="4" style={{textAlign: 'center', padding: '20px'}}>A carregar inventário...</td></tr>
                            ) : filteredCatalog.map((product, pIndex) => (
                                <React.Fragment key={product.id}>
                                    <tr style={styles.productRow}>
                                        <td style={styles.productCell} colSpan="4">{product.name} ({product.code})</td>
                                    </tr>
                                    {(product.variations || []).map((variation, vIndex) => {
                                        const key = `${product.id}-${variation.color}-${variation.size}`;
                                        const currentQty = inventoryMap.get(key) || 0;
                                        const displayQty = editedQuantities.hasOwnProperty(key) ? editedQuantities[key] : currentQty;
                                        const hasChanged = editedQuantities.hasOwnProperty(key);

                                        return (
                                            <tr key={key} style={styles.variationRow}>
                                                <td style={styles.variationCell}></td>
                                                <td style={styles.variationCell}>{variation.color}</td>
                                                <td style={styles.variationCell}>{variation.size}</td>
                                                <td style={styles.variationCell}>
                                                    <input
                                                        type="number"
                                                        min="0"
                                                        value={displayQty}
                                                        onChange={e => handleQuantityChange(product.id, variation.color, variation.size, e.target.value)}
                                                        style={{...styles.quantityInput, ...(hasChanged && styles.quantityInputChanged)}}
                                                    />
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </React.Fragment>
                            ))}
                        </tbody>
                    </table>
                </div>
                <div style={styles.actionsContainer}>
                    <button 
                        onClick={handleSaveChanges} 
                        style={styles.saveButton} 
                        disabled={isSaving || Object.keys(editedQuantities).length === 0}
                    >
                        <Save /> {isSaving ? 'A salvar...' : 'Salvar Alterações'}
                    </button>
                </div>
            </div>
        </div>
    );
}

export default InventoryPage;

