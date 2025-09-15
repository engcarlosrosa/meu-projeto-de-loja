// src/pages/LoginPage.js
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../components/AuthProvider'; // ATUALIZADO: Importa o useAuth

const styles = {
    container: {
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        backgroundColor: '#f0f2f5',
        fontFamily: "'Inter', sans-serif",
    },
    loginBox: {
        padding: '40px',
        backgroundColor: 'white',
        borderRadius: '10px',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)',
        width: '100%',
        maxWidth: '400px',
        textAlign: 'center',
    },
    title: {
        marginBottom: '30px',
        color: '#34495e',
        fontSize: '2em',
    },
    inputGroup: {
        marginBottom: '20px',
        textAlign: 'left',
    },
    label: {
        display: 'block',
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
    button: {
        width: '100%',
        padding: '12px',
        border: 'none',
        borderRadius: '6px',
        backgroundColor: '#3498db',
        color: 'white',
        fontSize: '1.1em',
        fontWeight: 'bold',
        cursor: 'pointer',
        transition: 'background-color 0.3s ease',
    },
    buttonDisabled: {
        backgroundColor: '#a9cce3',
        cursor: 'not-allowed',
    },
    errorMessage: {
        color: '#e74c3c',
        backgroundColor: '#fdd',
        padding: '10px',
        borderRadius: '6px',
        marginTop: '20px',
        border: '1px solid #e74c3c',
    },
    footerText: {
        marginTop: '20px',
        fontSize: '0.9em',
        color: '#777',
    }
};

const LoginPage = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    
    const navigate = useNavigate();
    // ATUALIZADO: Usa a função de login do nosso AuthProvider
    const { login } = useAuth(); 

    const handleLogin = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        if (!email || !password) {
            setError("Por favor, preencha o email e a senha.");
            setLoading(false);
            return;
        }

        try {
            // ATUALIZADO: Chama a função de login centralizada do AuthProvider
            await login(email, password);
            navigate('/'); // Redireciona para o dashboard após o login
        } catch (err) {
            console.error("Erro ao fazer login:", err);
            if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
                setError('Email ou senha incorretos.');
            } else {
                setError('Falha ao fazer login. Por favor, tente novamente.');
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={styles.container}>
            <div style={styles.loginBox}>
                <h1 style={styles.title}>Login</h1>
                <form onSubmit={handleLogin}>
                    <div style={styles.inputGroup}>
                        <label htmlFor="email" style={styles.label}>Email</label>
                        <input
                            type="email"
                            id="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            style={styles.input}
                            placeholder="seuemail@exemplo.com"
                            required
                        />
                    </div>
                    <div style={styles.inputGroup}>
                        <label htmlFor="password" style={styles.label}>Senha</label>
                        <input
                            type="password"
                            id="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            style={styles.input}
                            placeholder="********"
                            required
                        />
                    </div>
                    <button 
                        type="submit" 
                        style={{...styles.button, ...(loading ? styles.buttonDisabled : {})}}
                        disabled={loading}
                    >
                        {loading ? 'Entrando...' : 'Entrar'}
                    </button>
                </form>
                {error && <p style={styles.errorMessage}>{error}</p>}
                <p style={styles.footerText}>
                    Não tem uma conta? Peça ao administrador para criar uma.
                </p>
            </div>
        </div>
    );
};

export default LoginPage;
