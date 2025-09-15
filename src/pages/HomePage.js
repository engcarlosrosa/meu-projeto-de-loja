// src/pages/HomePage.js
import React from 'react';
import { useAuth } from '../components/AuthProvider';
import { logoutUser } from '../services/authService'; // Importa a função de logout
import { useNavigate } from 'react-router-dom'; // Para redirecionar

function HomePage() {
  const { currentUser, loading, userRole } = useAuth(); // Pega também a role
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await logoutUser();
      navigate('/login'); // Redireciona para a página de login após o logout
    } catch (error) {
      console.error("Erro ao fazer logout:", error);
      alert("Erro ao fazer logout: " + error.message);
    }
  };

  if (loading) {
    return <div>Carregando autenticação...</div>;
  }

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>Bem-vindo à Página Inicial!</h1>
      {currentUser ? (
        <>
          <p style={styles.loggedInText}>Você está logado como: <strong style={styles.emailText}>{currentUser.email}</strong></p>
          {userRole && <p style={styles.loggedInText}>Sua função é: <strong style={styles.roleText}>{userRole}</strong></p>}
          <button onClick={handleLogout} style={styles.logoutButton}>
            Sair
          </button>
          {/* Aqui você pode adicionar links para outras funcionalidades do app */}
          <div style={styles.linksContainer}>
            <button style={styles.appButton} onClick={() => navigate('/stores')}>Gerenciar Lojas</button>
            <button style={styles.appButton} onClick={() => navigate('/products')}>Gerenciar Produtos</button>
            <button style={styles.appButton} onClick={() => navigate('/sales')}>Registrar Vendas</button>
            {/* Exemplo de botão visível apenas para admin */}
            {userRole === 'admin' && (
              <button style={styles.appButton} onClick={() => navigate('/admin-dashboard')}>Painel Admin</button>
            )}
          </div>
        </>
      ) : (
        <>
          <p style={styles.notLoggedInText}>Você não está logado. Por favor, faça login.</p>
          <button onClick={() => navigate('/login')} style={styles.loginButton}>
            Ir para Login
          </button>
        </>
      )}
    </div>
  );
}

// Estilos básicos para HomePage (ajuste conforme seu gosto)
const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    backgroundColor: '#e0f7fa',
    fontFamily: 'Arial, sans-serif',
    padding: '20px',
    textAlign: 'center',
  },
  title: {
    fontSize: '2.8em',
    marginBottom: '30px',
    color: '#00796b',
  },
  loggedInText: {
    fontSize: '1.2em',
    marginBottom: '10px',
    color: '#333',
  },
  emailText: {
    color: '#004d40',
  },
  roleText: {
    color: '#d84315',
  },
  notLoggedInText: {
    fontSize: '1.2em',
    marginBottom: '20px',
    color: '#555',
  },
  logoutButton: {
    padding: '10px 20px',
    backgroundColor: '#dc3545',
    color: 'white',
    border: 'none',
    borderRadius: '5px',
    fontSize: '1em',
    cursor: 'pointer',
    transition: 'background-color 0.3s ease',
    marginBottom: '20px',
  },
  logoutButtonHover: {
    backgroundColor: '#c82333',
  },
  loginButton: {
    padding: '12px 25px',
    backgroundColor: '#28a745',
    color: 'white',
    border: 'none',
    borderRadius: '5px',
    fontSize: '1.1em',
    cursor: 'pointer',
    transition: 'background-color 0.3s ease',
  },
  loginButtonHover: {
    backgroundColor: '#218838',
  },
  linksContainer: {
    marginTop: '30px',
    display: 'flex',
    flexWrap: 'wrap',
    gap: '15px',
    justifyContent: 'center',
  },
  appButton: {
    padding: '10px 20px',
    backgroundColor: '#17a2b8',
    color: 'white',
    border: 'none',
    borderRadius: '5px',
    fontSize: '1em',
    cursor: 'pointer',
    transition: 'background-color 0.3s ease',
  },
  appButtonHover: {
    backgroundColor: '#138496',
  }
};

export default HomePage;