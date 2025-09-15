import React, { useState, useEffect, useCallback } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { useAuth } from '../components/AuthProvider';
import { useFirebase } from '../contexts/FirebaseContext';

const SIZE_GRADES_DOC_ID = 'sizeGrades';

function SizeGradeManagementPage() {
  const { currentUser, userRole, loading: authLoading } = useAuth();
  const { db, firebaseLoading } = useFirebase(); // Removido 'appId'

  const [sizeGrades, setSizeGrades] = useState({});
  const [newGradeName, setNewGradeName] = useState('');
  const [newGradeSizes, setNewGradeSizes] = useState('');
  const [editingGrade, setEditingGrade] = useState(null);
  const [editGradeName, setEditGradeName] = useState('');
  const [editGradeSizes, setEditGradeSizes] = useState('');
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  const canManageAttributes = currentUser && userRole === 'admin';

  const fetchSizeGrades = useCallback(async () => {
    if (authLoading || firebaseLoading || !db || !currentUser) { // Removido 'appId'
        console.log("SizeGradeManagementPage: Carregamento de grades de tamanho adiado - Firebase/Auth não pronto.");
        return;
    }
    setError(null);
    try {
      // Caminho CORRIGIDO: Agora 'product_attributes' é uma coleção de nível raiz
      const docRef = doc(db, 'product_attributes', SIZE_GRADES_DOC_ID);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        setSizeGrades(docSnap.data() || {});
        console.log("SizeGradeManagementPage: Grades de tamanho carregadas com sucesso:", docSnap.data());
      } else {
        setSizeGrades({});
        await setDoc(docRef, {}); // Cria o documento se não existir
        console.log("SizeGradeManagementPage: Documento de grades de tamanho não encontrado. Inicializando com objeto vazio.");
      }
    } catch (err) {
      console.error("Erro ao buscar grades de tamanho:", err);
      setError("Erro ao carregar grades de tamanho. Por favor, tente novamente.");
    }
  }, [authLoading, firebaseLoading, db, currentUser]); // Removido 'appId'

  useEffect(() => {
    if (!authLoading && !firebaseLoading && db && currentUser) { // Removido 'appId'
      fetchSizeGrades();
    }
  }, [authLoading, firebaseLoading, db, currentUser, fetchSizeGrades]); // Removido 'appId'

  const handleAddGrade = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    if (!canManageAttributes) {
      setError("Você não tem permissão para adicionar grades de tamanho.");
      return;
    }
    if (!newGradeName.trim() || !newGradeSizes.trim()) {
      setError("Nome e tamanhos da grade são obrigatórios.");
      return;
    }
    if (sizeGrades[newGradeName.trim()]) {
      setError("Já existe uma grade com este nome.");
      return;
    }
    if (!db || !currentUser) { // Removido 'appId'
        setError("Firebase não inicializado. Por favor, tente recarregar a página.");
        return;
    }

    try {
      // Caminho CORRIGIDO: Agora 'product_attributes' é uma coleção de nível raiz
      const docRef = doc(db, 'product_attributes', SIZE_GRADES_DOC_ID);
      const sizesArray = newGradeSizes.split(',').map(s => s.trim()).filter(s => s !== '');
      if (sizesArray.length === 0) {
        setError("Por favor, insira tamanhos válidos separados por vírgulas.");
        return;
      }

      const updatedGrades = { ...sizeGrades, [newGradeName.trim()]: sizesArray };
      await setDoc(docRef, updatedGrades);
      setSizeGrades(updatedGrades);
      setNewGradeName('');
      setNewGradeSizes('');
      setSuccessMessage("Grade de tamanho adicionada com sucesso!");
    } catch (err) {
      console.error("Erro ao adicionar grade de tamanho:", err);
      setError("Erro ao adicionar grade de tamanho. Por favor, tente novamente.");
    }
  };

  const handleEditClick = (gradeName) => {
    setEditingGrade(gradeName);
    setEditGradeName(gradeName);
    setEditGradeSizes(sizeGrades[gradeName].join(', '));
  };

  const handleUpdateGrade = async (originalGradeName) => {
    setError(null);
    setSuccessMessage(null);

    if (!canManageAttributes) {
      setError("Você não tem permissão para editar grades de tamanho.");
      return;
    }
    if (!editGradeName.trim() || !editGradeSizes.trim()) {
      setError("Nome e tamanhos da grade são obrigatórios.");
      return;
    }
    if (originalGradeName !== editGradeName.trim() && sizeGrades[editGradeName.trim()]) {
      setError("Já existe uma grade com o novo nome.");
      return;
    }
    if (!db || !currentUser) { // Removido 'appId'
        setError("Firebase não inicializado. Por favor, tente recarregar a página.");
        return;
    }

    try {
      // Caminho CORRIGIDO: Agora 'product_attributes' é uma coleção de nível raiz
      const docRef = doc(db, 'product_attributes', SIZE_GRADES_DOC_ID);
      const sizesArray = editGradeSizes.split(',').map(s => s.trim()).filter(s => s !== '');
      if (sizesArray.length === 0) {
        setError("Por favor, insira tamanhos válidos separados por vírgulas.");
        return;
      }

      const updatedGrades = { ...sizeGrades };
      if (originalGradeName !== editGradeName.trim()) {
        delete updatedGrades[originalGradeName];
      }
      updatedGrades[editGradeName.trim()] = sizesArray;

      await setDoc(docRef, updatedGrades);
      setSizeGrades(updatedGrades);
      setEditingGrade(null);
      setEditGradeName('');
      setEditGradeSizes('');
      setSuccessMessage("Grade de tamanho atualizada com sucesso!");
    } catch (err) {
      console.error("Erro ao atualizar grade de tamanho:", err);
      setError("Erro ao atualizar grade de tamanho. Por favor, tente novamente.");
    }
  };

  const handleDeleteGrade = async (gradeNameToDelete) => {
    setError(null);
    setSuccessMessage(null);

    console.log(`Confirmação: Tem certeza que deseja excluir a grade "${gradeNameToDelete}"?`);

    if (!canManageAttributes) {
      setError("Você não tem permissão para excluir grades de tamanho.");
      return;
    }
    if (!db || !currentUser) { // Removido 'appId'
        setError("Firebase não inicializado. Por favor, tente recarregar a página.");
        return;
    }

    try {
      // Caminho CORRIGIDO: Agora 'product_attributes' é uma coleção de nível raiz
      const docRef = doc(db, 'product_attributes', SIZE_GRADES_DOC_ID);
      const updatedGrades = { ...sizeGrades };
      delete updatedGrades[gradeNameToDelete];
      await setDoc(docRef, updatedGrades);
      setSizeGrades(updatedGrades);
      setSuccessMessage("Grade de tamanho excluída com sucesso!");
    } catch (err) {
      console.error("Erro ao excluir grade de tamanho:", err);
      setError("Erro ao excluir grade de tamanho. Por favor, tente novamente.");
    }
  };

  if (authLoading || firebaseLoading) {
    return <div style={styles.container}>Carregando informações do usuário e Firebase...</div>;
  }

  if (!canManageAttributes) {
    return <div style={styles.container}><h2 style={styles.accessDenied}>Acesso negado. Você precisa ser um administrador para gerenciar grades de tamanho.</h2></div>;
  }

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>Gerenciar Grades de Tamanho</h1>

      {error && <p style={styles.messageError}>{error}</p>}
      {successMessage && <p style={styles.messageSuccess}>{successMessage}</p>}

      <form onSubmit={handleAddGrade} style={styles.form}>
        <h2 style={styles.formTitle}>Adicionar Nova Grade de Tamanho</h2>
        <input
          type="text"
          placeholder="Nome da Grade (ex: Padrão, Numérico)"
          value={newGradeName}
          onChange={(e) => setNewGradeName(e.target.value)}
          required
          style={styles.input}
        />
        <textarea
          placeholder="Tamanhos (separados por vírgula, ex: PP, P, M, G, GG ou 36, 38, 40)"
          value={newGradeSizes}
          onChange={(e) => setNewGradeSizes(e.target.value)}
          required
          rows="3"
          style={styles.input}
        ></textarea>
        <button type="submit" style={styles.button}>Adicionar Grade</button>
      </form>

      <h2 style={styles.listTitle}>Grades de Tamanho Cadastradas</h2>
      {Object.keys(sizeGrades).length === 0 ? (
        <p style={{ textAlign: 'center', color: '#666' }}>Nenhuma grade de tamanho cadastrada ainda.</p>
      ) : (
        <ul style={styles.list}>
          {Object.keys(sizeGrades).map((gradeName) => (
            <li key={gradeName} style={styles.listItem}>
              {editingGrade === gradeName ? (
                <div style={styles.editContainer}>
                  <input
                    type="text"
                    value={editGradeName}
                    onChange={(e) => setEditGradeName(e.target.value)}
                    style={styles.editInput}
                  />
                  <textarea
                    value={editGradeSizes}
                    onChange={(e) => setEditGradeSizes(e.target.value)}
                    rows="3"
                    style={styles.editInput}
                  ></textarea>
                  <div style={styles.buttonGroup}>
                    <button onClick={() => handleUpdateGrade(gradeName)} style={styles.saveButton}>Salvar</button>
                    <button onClick={() => setEditingGrade(null)} style={styles.cancelButton}>Cancelar</button>
                  </div>
                </div>
              ) : (
                <div style={styles.itemContent}>
                  <span style={styles.itemName}><strong>{gradeName}:</strong> {sizeGrades[gradeName].join(', ')}</span>
                  <div style={styles.buttonGroup}>
                    <button onClick={() => handleEditClick(gradeName)} style={styles.editButton}>Editar</button>
                    <button onClick={() => handleDeleteGrade(gradeName)} style={styles.deleteButton}>Excluir</button>
                  </div>
                </div>
              )}
            </li>
          ))}
        </ul>
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

export default SizeGradeManagementPage;
