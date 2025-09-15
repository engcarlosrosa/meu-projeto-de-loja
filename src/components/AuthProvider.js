// src/components/AuthProvider.js
import React, { createContext, useContext, useState, useEffect } from 'react';
import { onAuthStateChanged, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, sendPasswordResetEmail } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { useFirebase } from '../contexts/FirebaseContext';

export const AuthContext = createContext(null);

export const useAuth = () => useContext(AuthContext);

const AuthProvider = ({ children }) => {
    const { auth, db, firebaseLoading } = useFirebase();
    const [currentUser, setCurrentUser] = useState(null);
    const [userRole, setUserRole] = useState(null);
    const [userStoreId, setUserStoreId] = useState(null);
    const [userStoreName, setUserStoreName] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!auth || !db) {
            setLoading(true);
            return;
        }

        const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
            if (user) {
                setCurrentUser(user);
                try {
                    const userProfileRef = doc(db, `users/${user.uid}`);
                    const userProfileSnap = await getDoc(userProfileRef);
                    if (userProfileSnap.exists()) {
                        const profileData = userProfileSnap.data();
                        setUserRole(profileData.role || null);
                        setUserStoreId(profileData.storeId || null);
                        
                        if (profileData.storeId && profileData.storeId !== 'ALL_STORES') {
                            const storeRef = doc(db, `stores/${profileData.storeId}`);
                            const storeSnap = await getDoc(storeRef);
                            if (storeSnap.exists()) {
                                setUserStoreName(storeSnap.data().name || null);
                            }
                        } else {
                            setUserStoreName(profileData.role === 'admin' ? 'Acesso Global' : null);
                        }
                    } else {
                        setUserRole(null);
                        setUserStoreId(null);
                        setUserStoreName(null);
                    }
                } catch (profileError) {
                    console.error("AuthProvider: Erro ao buscar perfil do usuário:", profileError);
                    setUserRole(null);
                    setUserStoreId(null);
                    setUserStoreName(null);
                }
            } else {
                setCurrentUser(null);
                setUserRole(null);
                setUserStoreId(null);
                setUserStoreName(null);
            }
            setLoading(false);
        });

        return () => unsubscribeAuth();
    }, [auth, db, firebaseLoading]);

    // Lógica de registro agora está dentro do AuthProvider
    const register = async (email, password, role, storeId, username) => {
        if (!auth || !db) throw new Error("Firebase não inicializado.");
        
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        const userProfile = {
            uid: user.uid,
            email: user.email,
            username: username,
            role: role,
            storeId: storeId, // Salva o ID da loja ou 'ALL_STORES'
            createdAt: new Date(),
        };

        await setDoc(doc(db, 'users', user.uid), userProfile);
        
        // ATUALIZADO: Faz o logout da sessão do novo usuário imediatamente.
        // Isso fará com que o admin seja redirecionado para a tela de login
        // para poder entrar novamente com suas credenciais.
        await signOut(auth);

        return userCredential;
    };

    const login = (email, password) => {
        return signInWithEmailAndPassword(auth, email, password);
    };

    const logout = () => {
        return signOut(auth);
    };

    const resetPassword = (email) => {
        return sendPasswordResetEmail(auth, email);
    };

    const authContextValue = {
        currentUser,
        userRole,
        userStoreId,
        userStoreName,
        loading,
        login,
        logout,
        register,
        resetPassword,
    };

    return (
        <AuthContext.Provider value={authContextValue}>
            {children}
        </AuthContext.Provider>
    );
};

export default AuthProvider;
