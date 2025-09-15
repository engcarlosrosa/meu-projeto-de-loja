import React, { useState, useEffect, useCallback } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { useFirebase } from '../contexts/FirebaseContext';
import { useAuth } from '../components/AuthProvider';
import { Edit, Trash2 } from 'lucide-react';

const SUPPLIERS_DOC_ID = 'suppliers';

function SupplierManagementPage() {
  const { db, firebaseLoading } = useFirebase(); // Removido 'appId' e 'userId'
  const { currentUser, userRole, loading: authLoading } = useAuth();
  const [suppliers, setSuppliers] = useState([]);
  const [newSupplier, setNewSupplier] = useState('');
  const [editingSupplier, setEditingSupplier] = useState(null);
  const [editSupplierName, setEditSupplierName] = useState('');
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmModalMessage, setConfirmModalMessage] = useState('');
  const [confirmAction, setConfirmAction] = useState(null);

  const canManageAttributes = currentUser && userRole === 'admin';

  const fetchSuppliers = useCallback(async () => {
    setError(null);
    if (authLoading || firebaseLoading || !db || !currentUser) { // Removido 'appId' e 'userId' da condição
        console.log("SupplierManagementPage: Carregamento de fornecedores adiado - Firebase/Auth não pronto.");
        return;
    }
    try {
      // Caminho CORRIGIDO: Agora 'product_attributes' é uma coleção de nível raiz
      const docRef = doc(db, 'product_attributes', SUPPLIERS_DOC_ID);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        setSuppliers(docSnap.data().items || []);
        console.log("SupplierManagementPage: Fornecedores carregados com sucesso:", docSnap.data().items);
      } else {
        setSuppliers([]);
        await setDoc(docRef, { items: [] }); // Cria o documento se não existir
        console.log("SupplierManagementPage: Documento de fornecedores não encontrado. Inicializando com array vazio.");
      }
    } catch (err) {
      console.error("Erro ao buscar fornecedores:", err);
      setError("Erro ao carregar fornecedores. Por favor, tente novamente.");
    }
  }, [authLoading, firebaseLoading, db, currentUser]); // Removido 'appId' e 'userId' das dependências

  useEffect(() => {
    if (canManageAttributes && !authLoading && !firebaseLoading && db && currentUser) { // Removido 'appId' e 'userId' da condição
      fetchSuppliers();
    }
  }, [canManageAttributes, authLoading, firebaseLoading, db, currentUser, fetchSuppliers]); // Removido 'appId' e 'userId' das dependências

  const handleAddSupplier = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    if (!canManageAttributes) {
      setError("Você não tem permissão para adicionar fornecedores.");
      return;
    }
    if (!newSupplier.trim()) {
      setError("O nome do fornecedor não pode estar vazio.");
      return;
    }
    if (suppliers.includes(newSupplier.trim())) {
      setError("Este fornecedor já existe.");
      return;
    }
    if (authLoading || firebaseLoading || !db || !currentUser) { // Removido 'appId' e 'userId'
        setError("Firebase não inicializado ou informações do usuário ausentes. Por favor, tente recarregar a página.");
        return;
    }

    try {
      // Caminho CORRIGIDO: Agora 'product_attributes' é uma coleção de nível raiz
      const docRef = doc(db, 'product_attributes', SUPPLIERS_DOC_ID);
      const newSuppliers = [...suppliers, newSupplier.trim()];
      await setDoc(docRef, { items: newSuppliers });
      setSuppliers(newSuppliers);
      setNewSupplier('');
      setSuccessMessage("Fornecedor adicionado com sucesso!");
    } catch (err) {
      console.error("Erro ao adicionar fornecedor:", err);
      setError("Erro ao adicionar fornecedor. Por favor, tente novamente.");
    }
  };

  const handleEditClick = (supplier) => {
    setEditingSupplier(supplier);
    setEditSupplierName(supplier);
  };

  const handleUpdateSupplier = async (originalSupplier) => {
    setError(null);
    setSuccessMessage(null);

    if (!canManageAttributes) {
      setError("Você não tem permissão para editar fornecedores.");
      return;
    }
    if (!editSupplierName.trim()) {
      setError("O nome do fornecedor não pode estar vazio.");
      return;
    }
    if (originalSupplier !== editSupplierName.trim() && suppliers.includes(editSupplierName.trim())) {
      setError("Este fornecedor já existe.");
      return;
    }
    if (authLoading || firebaseLoading || !db || !currentUser) { // Removido 'appId' e 'userId'
        setError("Firebase não inicializado ou informações do usuário ausentes. Por favor, tente recarregar a página.");
        return;
    }

    try {
      // Caminho CORRIGIDO: Agora 'product_attributes' é uma coleção de nível raiz
      const docRef = doc(db, 'product_attributes', SUPPLIERS_DOC_ID);
      const updatedSuppliers = suppliers.map(supplier =>
        supplier === originalSupplier ? editSupplierName.trim() : supplier
      );
      await setDoc(docRef, { items: updatedSuppliers });
      setSuppliers(updatedSuppliers);
      setEditingSupplier(null);
      setEditSupplierName('');
      setSuccessMessage("Fornecedor atualizado com sucesso!");
    } catch (err) {
      console.error("Erro ao atualizar fornecedor:", err);
      setError("Erro ao atualizar fornecedor. Por favor, tente novamente.");
    }
  };

  const handleDeleteSupplier = async (supplierToDelete) => {
    setError(null);
    setSuccessMessage(null);

    setConfirmModalMessage(`Tem certeza que deseja excluir o fornecedor "${supplierToDelete}"?`);
    setConfirmAction(() => async () => {
      try {
        if (!canManageAttributes) {
          setError("Você não tem permissão para excluir fornecedores.");
          return;
        }
        if (authLoading || firebaseLoading || !db || !currentUser) { // Removido 'appId' e 'userId'
            setError("Firebase não inicializado ou informações do usuário ausentes. Por favor, tente recarregar a página.");
            return;
        }

        // Caminho CORRIGIDO: Agora 'product_attributes' é uma coleção de nível raiz
        const docRef = doc(db, 'product_attributes', SUPPLIERS_DOC_ID);
        const updatedSuppliers = suppliers.filter(supplier => supplier !== supplierToDelete);
        await setDoc(docRef, { items: updatedSuppliers });
        setSuppliers(updatedSuppliers); // Atualiza o estado após a exclusão
        setSuccessMessage("Fornecedor excluído com sucesso!");
      } catch (err) {
        console.error("Erro ao excluir fornecedor:", err);
        setError("Erro ao excluir fornecedor. Por favor, tente novamente.");
      } finally {
        setShowConfirmModal(false);
      }
    });
    setShowConfirmModal(true);
  };

  if (authLoading || firebaseLoading) {
    return <div style={styles.container}>Carregando informações do usuário e Firebase...</div>;
  }

  if (!canManageAttributes) {
    return <div style={styles.container}><h2 style={styles.accessDenied}>Acesso negado. Você precisa ser um administrador para gerenciar fornecedores.</h2></div>;
  }

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>Gerenciar Fornecedores</h1>

      {error && <p style={styles.messageError}>{error}</p>}
      {successMessage && <p style={styles.messageSuccess}>{successMessage}</p>}

      <form onSubmit={handleAddSupplier} style={styles.form}>
        <h2 style={styles.formTitle}>Adicionar Novo Fornecedor</h2>
        <input
          type="text"
          placeholder="Nome do Fornecedor"
          value={newSupplier}
          onChange={(e) => setNewSupplier(e.target.value)}
          required
          style={styles.input}
        />
        <button type="submit" style={styles.button}>Adicionar Fornecedor</button>
      </form>

      <h2 style={styles.listTitle}>Fornecedores Cadastrados</h2>
      {suppliers.length === 0 ? (
        <p style={{ textAlign: 'center', color: '#666' }}>Nenhum fornecedor cadastrado ainda.</p>
      ) : (
        <ul style={styles.list}>
          {suppliers.map((supplier, index) => (
            <li key={index} style={styles.listItem}>
              {editingSupplier === supplier ? (
                <div style={styles.editContainer}>
                  <input
                    type="text"
                    value={editSupplierName}
                    onChange={(e) => setEditSupplierName(e.target.value)}
                    style={styles.editInput}
                  />
                  <div style={styles.buttonGroup}>
                    <button onClick={() => handleUpdateSupplier(supplier)} style={styles.saveButton}>Salvar</button>
                    <button onClick={() => setEditingSupplier(null)} style={styles.cancelButton}>Cancelar</button>
                  </div>
                </div>
              ) : (
                <div style={styles.itemContent}>
                  <span style={styles.itemName}>{supplier}</span>
                  <div style={styles.buttonGroup}>
                    <button onClick={() => handleEditClick(supplier)} style={styles.editButton}><Edit className="w-5 h-5" /></button>
                    <button onClick={() => handleDeleteSupplier(supplier)} style={styles.deleteButton}><Trash2 className="w-5 h-5" /></button>
                  </div>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      {showConfirmModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-xl text-center">
            <h3 className="text-xl font-semibold mb-4">Confirmação</h3>
            <p className="mb-6">{confirmModalMessage}</p>
            <div className="flex justify-center space-x-4">
              <button
                onClick={() => { confirmAction(); }}
                className="px-6 py-2 bg-green-500 text-white rounded-md hover:bg-green-600"
              >
                Confirmar
              </button>
              <button
                onClick={() => setShowConfirmModal(false)}
                className="px-6 py-2 bg-gray-300 text-gray-800 rounded-md hover:bg-gray-400"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  container: {
    fontFamily: 'Arial, sans-serif',
    padding: '20px',
    maxWidth: '800px',
    margin: '0 auto',
    backgroundColor: '#f9f9f9',
    borderRadius: '8px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
  },
  title: {
    textAlign: 'center',
    color: '#333',
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
    display: 'flex',
    flexDirection: 'column',
    gap: '15px',
  },
  formTitle: {
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
  button: {
    backgroundColor: '#4CAF50',
    color: 'white',
    padding: '12px 20px',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '1em',
    fontWeight: 'bold',
    transition: 'background-color 0.3s ease',
  },
  listTitle: {
    textAlign: 'center',
    color: '#333',
    marginBottom: '20px',
    fontSize: '2em',
  },
  list: {
    listStyle: 'none',
    padding: '0',
  },
  listItem: {
    backgroundColor: '#ffffff',
    padding: '15px 20px',
    marginBottom: '10px',
    borderRadius: '8px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '10px',
  },
  itemContent: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    flexWrap: 'wrap',
    gap: '10px',
  },
  itemName: {
    fontSize: '1.1em',
    color: '#333',
    fontWeight: 'bold',
    flexGrow: 1,
  },
  buttonGroup: {
    display: 'flex',
    gap: '10px',
  },
  editButton: {
    backgroundColor: '#007bff',
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
  accessDenied: {
    textAlign: 'center',
    color: '#dc3545',
    fontSize: '1.5em',
    marginTop: '50px',
  },
};

export default SupplierManagementPage;
