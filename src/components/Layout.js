// src/Layout.js
import React from 'react';
import Sidebar from './Sidebar';

const Layout = ({ children }) => {
  return (
    <div style={styles.layoutContainer}>
      <Sidebar />
      <main style={styles.mainContent}>
        {children}
      </main>
    </div>
  );
};

const styles = {
  layoutContainer: {
    display: 'flex', // Usa flexbox para a barra lateral e o conteúdo
    minHeight: '100vh',
  },
  mainContent: {
    marginLeft: '250px', // Margem esquerda igual à largura da sidebar
    flexGrow: 1, // Ocupa o restante do espaço horizontal
    padding: '20px', // Espaçamento interno do conteúdo
    backgroundColor: '#f5f7fa', // Uma cor de fundo mais clara para o conteúdo
  },
};

export default Layout;