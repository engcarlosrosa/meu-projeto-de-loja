import React, { useState, useEffect, useCallback } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { useAuth } from '../components/AuthProvider';
import { useFirebase } from '../contexts/FirebaseContext';

const COLORS_DOC_ID = 'colors';

function ColorManagementPage() {
  const { currentUser, userRole, loading: authLoading } = useAuth();
  const { db, firebaseLoading } = useFirebase(); // Removido 'appId' pois não é mais necessário para o caminho da coleção raiz

  const [colors, setColors] = useState([]);
  const [newColor, setNewColor] = useState('');
  const [editingColor, setEditingColor] = useState(null);
  const [editColorName, setEditColorName] = useState('');
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  const canManageAttributes = currentUser && userRole === 'admin';

  const fetchColors = useCallback(async () => {
    if (authLoading || firebaseLoading || !db || !currentUser) {
        console.log("ColorManagementPage: Carregamento de cores adiado - Firebase/Auth não pronto.");
        return;
    }
    setError(null);
    try {
      // Caminho CORRIGIDO: Agora 'product_attributes' é uma coleção de nível raiz
      const docRef = doc(db, 'product_attributes', COLORS_DOC_ID);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        setColors(docSnap.data().items || []);
        console.log("ColorManagementPage: Cores carregadas com sucesso:", docSnap.data().items);
      } else {
        setColors([]);
        // Cria o documento com um array vazio se ele não existir
        await setDoc(docRef, { items: [] });
        console.log("ColorManagementPage: Documento de cores não encontrado. Inicializando com array vazio.");
      }
    } catch (err) {
      console.error("Erro ao buscar cores:", err);
      setError("Erro ao carregar cores. Por favor, tente novamente.");
    }
  }, [authLoading, firebaseLoading, db, currentUser]); // Removido 'appId' das dependências

  useEffect(() => {
    if (!authLoading && !firebaseLoading && db && currentUser) { // Removido 'appId' da condição
      fetchColors();
    }
  }, [authLoading, firebaseLoading, db, currentUser, fetchColors]); // Removido 'appId' das dependências

  const handleAddColor = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    if (!canManageAttributes) {
      setError("Você não tem permissão para adicionar cores.");
      return;
    }
    if (!newColor.trim()) {
      setError("O nome da cor não pode estar vazio.");
      return;
    }
    if (colors.includes(newColor.trim())) {
      setError("Esta cor já existe.");
      return;
    }
    if (!db || !currentUser) { // Removido 'appId' da condição
        setError("Firebase não inicializado. Por favor, tente recarregar a página.");
        return;
    }

    try {
      // Caminho CORRIGIDO: Agora 'product_attributes' é uma coleção de nível raiz
      const docRef = doc(db, 'product_attributes', COLORS_DOC_ID);
      const newColors = [...colors, newColor.trim()];
      await setDoc(docRef, { items: newColors });
      setColors(newColors);
      setNewColor('');
      setSuccessMessage("Cor adicionada com sucesso!");
    } catch (err) {
      console.error("Erro ao adicionar cor:", err);
      setError("Erro ao adicionar cor. Por favor, tente novamente.");
    }
  };

  const handleEditClick = (color) => {
    setEditingColor(color);
    setEditColorName(color);
  };

  const handleUpdateColor = async (originalColor) => {
    setError(null);
    setSuccessMessage(null);

    if (!canManageAttributes) {
      setError("Você não tem permissão para editar cores.");
      return;
    }
    if (!editColorName.trim()) {
      setError("O nome da cor não pode estar vazio.");
      return;
    }
    if (originalColor !== editColorName.trim() && colors.includes(editColorName.trim())) {
      setError("Esta cor já existe.");
      return;
    }
    if (!db || !currentUser) { // Removido 'appId' da condição
        setError("Firebase não inicializado. Por favor, tente recarregar a página.");
        return;
    }

    try {
      // Caminho CORRIGIDO: Agora 'product_attributes' é uma coleção de nível raiz
      const docRef = doc(db, 'product_attributes', COLORS_DOC_ID);
      const updatedColors = colors.map(color =>
        color === originalColor ? editColorName.trim() : color
      );
      await setDoc(docRef, { items: updatedColors });
      setColors(updatedColors);
      setEditingColor(null);
      setEditColorName('');
      setSuccessMessage("Cor atualizada com sucesso!");
    } catch (err) {
      console.error("Erro ao atualizar cor:", err);
      setError("Erro ao atualizar cor. Por favor, tente novamente.");
    }
  };

  const handleDeleteColor = async (colorToDelete) => {
    setError(null);
    setSuccessMessage(null);

    console.log(`Confirmação: Tem certeza que deseja excluir a cor "${colorToDelete}"?`);

    if (!canManageAttributes) {
      setError("Você não tem permissão para excluir cores.");
      return;
    }
    if (!db || !currentUser) { // Removido 'appId' da condição
        setError("Firebase não inicializado. Por favor, tente recarregar a página.");
        return;
    }

    try {
      // Caminho CORRIGIDO: Agora 'product_attributes' é uma coleção de nível raiz
      const docRef = doc(db, 'product_attributes', COLORS_DOC_ID);
      const updatedColors = colors.filter(color => color !== colorToDelete);
      await setDoc(docRef, { items: updatedColors });
      setColors(updatedColors);
      setSuccessMessage("Cor excluída com sucesso!");
    } catch (err) {
      console.error("Erro ao excluir cor:", err);
      setError("Erro ao excluir cor. Por favor, tente novamente.");
    }
  };

  if (authLoading || firebaseLoading) {
    return <div style={styles.container}>Carregando informações do usuário e Firebase...</div>;
  }

  if (!canManageAttributes) {
    return <div style={styles.container}><h2 style={styles.accessDenied}>Acesso negado. Você precisa ser um administrador para gerenciar cores.</h2></div>;
  }

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>Gerenciar Cores</h1>

      {error && <p style={styles.messageError}>{error}</p>}
      {successMessage && <p style={styles.messageSuccess}>{successMessage}</p>}

      <form onSubmit={handleAddColor} style={styles.form}>
        <h2 style={styles.formTitle}>Adicionar Nova Cor</h2>
        <input
          type="text"
          placeholder="Nome da Cor"
          value={newColor}
          onChange={(e) => setNewColor(e.target.value)}
          required
          style={styles.input}
        />
        <button type="submit" style={styles.button}>Adicionar Cor</button>
      </form>

      <h2 style={styles.listTitle}>Cores Cadastradas</h2>
      {colors.length === 0 ? (
        <p style={{ textAlign: 'center', color: '#666' }}>Nenhuma cor cadastrada ainda.</p>
      ) : (
        <ul style={styles.list}>
          {colors.map((color, index) => (
            <li key={index} style={styles.listItem}>
              {editingColor === color ? (
                <div style={styles.editContainer}>
                  <input
                    type="text"
                    value={editColorName}
                    onChange={(e) => setEditColorName(e.target.value)}
                    style={styles.editInput}
                  />
                  <div style={styles.buttonGroup}>
                    <button onClick={() => handleUpdateColor(color)} style={styles.saveButton}>Salvar</button>
                    <button onClick={() => setEditingColor(null)} style={styles.cancelButton}>Cancelar</button>
                  </div>
                </div>
              ) : (
                <div style={styles.itemContent}>
                  <span style={styles.itemName}>{color}</span>
                  <div style={styles.buttonGroup}>
                    <button onClick={() => handleEditClick(color)} style={styles.editButton}>Editar</button>
                    <button onClick={() => handleDeleteColor(color)} style={styles.deleteButton}>Excluir</button>
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

export default ColorManagementPage;
