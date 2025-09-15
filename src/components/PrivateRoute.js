// src/components/PrivateRoute.js
import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from './AuthProvider'; // Importa o hook useAuth
import Sidebar from './Sidebar'; // Importar a Sidebar

// Definindo os estilos fora do componente para evitar recriação desnecessária
const styles = {
  layoutContainer: {
    display: 'flex',
    minHeight: '100vh', // Garante que o layout ocupe toda a altura da viewport
  },
  contentContainer: {
    // Ajusta a margem para a largura da sidebar padrão
    marginLeft: '250px', 
    flexGrow: 1, // Permite que o conteúdo ocupe o espaço restante
    padding: '20px', // Adiciona padding geral ao conteúdo
    backgroundColor: '#f8f9fa', // Cor de fundo suave para o conteúdo
    transition: 'margin-left 0.3s ease-in-out', // Adiciona transição para ajustar a margem
  },
  loadingContainer: {
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '100vh',
    backgroundColor: '#f8f9fa',
    color: '#34495e',
    fontSize: '1.2em',
  },
  spinner: {
    border: '4px solid rgba(0, 0, 0, 0.1)',
    borderLeftColor: '#3498db',
    borderRadius: '50%',
    width: '40px',
    height: '40px',
    animation: 'spin 1s linear infinite',
    marginBottom: '15px',
  },
  loadingText: {
    fontWeight: 'bold',
  },
  '@keyframes spin': {
    '0%': { transform: 'rotate(0deg)' },
    '100%': { transform: 'rotate(360deg)' },
  },
};

const PrivateRoute = () => {
  // Obtém o contexto de autenticação de forma defensiva
  const authContext = useAuth(); 

  // Se o contexto ainda for nulo (muito cedo na renderização ou AuthProvider não está a funcionar),
  // podemos renderizar um estado de carregamento genérico ou retornar null/um erro.
  if (!authContext) {
    console.warn("AuthContext is null in PrivateRoute. This might indicate an issue with AuthProvider mounting.");
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.spinner}></div>
        <p style={styles.loadingText}>Aguardando serviços de autenticação...</p>
      </div>
    );
  }

  // Agora que authContext é garantidamente não-nulo, podemos desestruturar
  const { currentUser, loading } = authContext;

  // Se ainda estiver a carregar a autenticação, mostra uma mensagem de carregamento
  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.spinner}></div>
        <p style={styles.loadingText}>Carregando...</p>
      </div>
    );
  }

  // Se o utilizador não estiver autenticado após o carregamento, redireciona para a página de login
  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  // Se o utilizador estiver autenticado (e a lógica de role for necessária, pode ser adicionada aqui via props nas rotas do App.js)
  return (
    <div style={styles.layoutContainer}>
      <Sidebar />
      <div style={styles.contentContainer}>
        <Outlet /> {/* Renderiza o componente da rota aninhada aqui */}
      </div>
    </div>
  );
};

export default PrivateRoute;
