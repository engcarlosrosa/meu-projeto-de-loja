// src/pages/RevenueCategoryManagementPage.js
import React, { useState, useEffect, useCallback } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { useAuth } from '../components/AuthProvider';
import { useFirebase } from '../contexts/FirebaseContext';

const REVENUE_CATEGORIES_DOC_ID = 'revenue_categories';

function RevenueCategoryManagementPage() {
  const { currentUser, userRole, loading: authLoading } = useAuth();
  const { db, firebaseLoading } = useFirebase();

  const [categories, setCategories] = useState([]);
  const [newCategory, setNewCategory] = useState('');
  const [editingCategory, setEditingCategory] = useState(null);
  const [editCategoryName, setEditCategoryName] = useState('');
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  const canManage = currentUser && (userRole === 'admin' || userRole === 'finance');

  const fetchCategories = useCallback(async () => {
    if (authLoading || firebaseLoading || !db || !currentUser) return;
    setError(null);
    try {
      const docRef = doc(db, 'product_attributes', REVENUE_CATEGORIES_DOC_ID);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        setCategories(docSnap.data().items || []);
      } else {
        setCategories([]);
        await setDoc(docRef, { items: [] });
      }
    } catch (err) {
      console.error("Erro ao buscar categorias de receita:", err);
      setError("Erro ao carregar categorias de receita.");
    }
  }, [authLoading, firebaseLoading, db, currentUser]);

  useEffect(() => {
    if (canManage) {
      fetchCategories();
    }
  }, [canManage, fetchCategories]);

  const handleAddCategory = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);
    if (!canManage) {
      setError("Você não tem permissão para adicionar categorias.");
      return;
    }
    if (!newCategory.trim() || categories.includes(newCategory.trim())) {
      setError("O nome da categoria não pode estar vazio ou já existir.");
      return;
    }
    try {
      const docRef = doc(db, 'product_attributes', REVENUE_CATEGORIES_DOC_ID);
      const newCategories = [...categories, newCategory.trim()];
      await setDoc(docRef, { items: newCategories });
      setCategories(newCategories);
      setNewCategory('');
      setSuccessMessage("Categoria adicionada com sucesso!");
    } catch (err) {
      setError("Erro ao adicionar categoria.");
    }
  };

  const handleUpdateCategory = async (originalCategory) => {
    setError(null);
    setSuccessMessage(null);
    if (!canManage || !editCategoryName.trim() || (originalCategory !== editCategoryName.trim() && categories.includes(editCategoryName.trim()))) {
      setError("Permissão negada, nome inválido ou categoria já existente.");
      return;
    }
    try {
      const docRef = doc(db, 'product_attributes', REVENUE_CATEGORIES_DOC_ID);
      const updatedCategories = categories.map(cat => cat === originalCategory ? editCategoryName.trim() : cat);
      await setDoc(docRef, { items: updatedCategories });
      setCategories(updatedCategories);
      setEditingCategory(null);
      setEditCategoryName('');
      setSuccessMessage("Categoria atualizada com sucesso!");
    } catch (err) {
      setError("Erro ao atualizar categoria.");
    }
  };

  const handleDeleteCategory = async (categoryToDelete) => {
    setError(null);
    setSuccessMessage(null);
    if (!canManage) {
      setError("Você não tem permissão para excluir categorias.");
      return;
    }
    try {
      const docRef = doc(db, 'product_attributes', REVENUE_CATEGORIES_DOC_ID);
      const updatedCategories = categories.filter(cat => cat !== categoryToDelete);
      await setDoc(docRef, { items: updatedCategories });
      setCategories(updatedCategories);
      setSuccessMessage("Categoria excluída com sucesso!");
    } catch (err) {
      setError("Erro ao excluir categoria.");
    }
  };

  if (authLoading || firebaseLoading) return <div style={styles.container}>Carregando...</div>;
  if (!canManage) return <div style={styles.container}><h2 style={styles.accessDenied}>Acesso negado.</h2></div>;

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>Gerenciar Categorias de Receita</h1>
      {error && <p style={styles.messageError}>{error}</p>}
      {successMessage && <p style={styles.messageSuccess}>{successMessage}</p>}
      <form onSubmit={handleAddCategory} style={styles.form}>
        <h2 style={styles.formTitle}>Adicionar Nova Categoria</h2>
        <input type="text" placeholder="Ex: Aluguel Recebido, Rendimentos" value={newCategory} onChange={(e) => setNewCategory(e.target.value)} required style={styles.input}/>
        <button type="submit" style={styles.button}>Adicionar Categoria</button>
      </form>
      <h2 style={styles.listTitle}>Categorias Cadastradas</h2>
      <ul style={styles.list}>
        {categories.map((category, index) => (
          <li key={index} style={styles.listItem}>
            {editingCategory === category ? (
              <div style={styles.editContainer}>
                <input type="text" value={editCategoryName} onChange={(e) => setEditCategoryName(e.target.value)} style={styles.editInput}/>
                <div style={styles.buttonGroup}>
                  <button onClick={() => handleUpdateCategory(category)} style={styles.saveButton}>Salvar</button>
                  <button onClick={() => setEditingCategory(null)} style={styles.cancelButton}>Cancelar</button>
                </div>
              </div>
            ) : (
              <div style={styles.itemContent}>
                <span style={styles.itemName}>{category}</span>
                <div style={styles.buttonGroup}>
                  <button onClick={() => { setEditingCategory(category); setEditCategoryName(category); }} style={styles.editButton}>Editar</button>
                  <button onClick={() => handleDeleteCategory(category)} style={styles.deleteButton}>Excluir</button>
                </div>
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

const styles = {
    container: { fontFamily: 'Arial, sans-serif', padding: '20px', maxWidth: '800px', margin: '0 auto', backgroundColor: '#f9f9f9', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' },
    title: { textAlign: 'center', color: '#333', marginBottom: '30px', fontSize: '2.5em', fontWeight: 'bold' },
    form: { backgroundColor: '#ffffff', padding: '25px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', marginBottom: '30px', display: 'flex', flexDirection: 'column', gap: '15px' },
    formTitle: { textAlign: 'center', color: '#555', marginBottom: '20px', fontSize: '1.8em' },
    input: { width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '4px', boxSizing: 'border-box' },
    button: { backgroundColor: '#4CAF50', color: 'white', padding: '12px 20px', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '1em', fontWeight: 'bold', transition: 'background-color 0.3s ease' },
    listTitle: { textAlign: 'center', color: '#333', marginBottom: '20px', fontSize: '2em' },
    list: { listStyle: 'none', padding: '0' },
    listItem: { backgroundColor: '#ffffff', padding: '15px 20px', marginBottom: '10px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' },
    itemContent: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', flexWrap: 'wrap', gap: '10px' },
    itemName: { fontSize: '1.1em', color: '#333', fontWeight: 'bold', flexGrow: 1 },
    buttonGroup: { display: 'flex', gap: '10px' },
    editButton: { backgroundColor: '#007bff', color: 'white', padding: '8px 15px', border: 'none', borderRadius: '4px', cursor: 'pointer', transition: 'background-color 0.3s ease' },
    deleteButton: { backgroundColor: '#dc3545', color: 'white', padding: '8px 15px', border: 'none', borderRadius: '4px', cursor: 'pointer', transition: 'background-color 0.3s ease' },
    editContainer: { display: 'flex', flexGrow: 1, gap: '10px', flexWrap: 'wrap' },
    editInput: { flexGrow: 1, padding: '8px', border: '1px solid #ddd', borderRadius: '4px' },
    saveButton: { backgroundColor: '#28a745', color: 'white', padding: '8px 15px', border: 'none', borderRadius: '4px', cursor: 'pointer', transition: 'background-color 0.3s ease' },
    cancelButton: { backgroundColor: '#6c757d', color: 'white', padding: '8px 15px', border: 'none', borderRadius: '4px', cursor: 'pointer', transition: 'background-color 0.3s ease' },
    messageError: { backgroundColor: '#f8d7da', color: '#721c24', padding: '10px', borderRadius: '4px', marginBottom: '20px', textAlign: 'center', border: '1px solid #f5c6cb' },
    messageSuccess: { backgroundColor: '#d4edda', color: '#155724', padding: '10px', borderRadius: '4px', marginBottom: '20px', textAlign: 'center', border: '1px solid #c3e6cb' },
    accessDenied: { textAlign: 'center', color: '#dc3545', fontSize: '1.5em', marginTop: '50px' },
};

export default RevenueCategoryManagementPage;
