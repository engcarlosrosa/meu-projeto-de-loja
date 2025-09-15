// src/services/authService.js
import {
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut,
    sendPasswordResetEmail
} from 'firebase/auth'; // Importa apenas as funções do auth

import { doc, setDoc } from 'firebase/firestore'; // Importa doc e setDoc para manipulação do Firestore

// Função de Login
export const loginUser = async (auth, email, password) => { // Recebe 'auth' como argumento
    try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        return userCredential.user;
    } catch (error) {
        console.error("Erro ao fazer login:", error);
        throw error;
    }
};

// Função de Registro (com role e storeId)
export const registerUser = async (auth, db, appId, email, password, role, storeId, username) => { // Recebe 'auth', 'db' e 'appId' como argumentos
    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        // Cria um documento de perfil para o novo usuário no Firestore
        // Caminho: artifacts/{appId}/users/{userId}/profile/data
        const userProfileRef = doc(db, `artifacts/${appId}/users/${user.uid}/profile`, 'data');
        await setDoc(userProfileRef, {
            email: user.email,
            role: role,
            storeId: storeId || null, // storeId é opcional, caso o usuário não seja associado a uma loja inicialmente
            username: username || email, // Usa o username fornecido ou o email
            createdAt: new Date(),
        });
        return user;
    } catch (error) {
        console.error("Erro ao registrar usuário:", error);
        throw error;
    }
};

// Função de Logout
export const logoutUser = async (auth) => { // Recebe 'auth' como argumento
    try {
        await signOut(auth);
    } catch (error) {
        console.error("Erro ao fazer logout:", error);
        throw error;
    }
};

// Função de Recuperação de Senha
export const resetPassword = async (auth, email) => { // Recebe 'auth' como argumento
    try {
        await sendPasswordResetEmail(auth, email);
    } catch (error) {
        console.error("Erro ao redefinir senha:", error);
        throw error;
    }
};
