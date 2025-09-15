/* global __app_id, __firebase_config, __initial_auth_token */
// src/contexts/FirebaseContext.js
import React, { createContext, useContext, useState, useEffect } from 'react';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, signInWithCustomToken, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { firebaseConfig as importedFirebaseConfig } from '../firebase'; // Importa a configuração do firebase.js

// Cria o contexto
export const FirebaseContext = createContext(null);

// Hook personalizado para usar o FirebaseContext
export const useFirebase = () => {
    const context = useContext(FirebaseContext);
    // Lança um erro se o hook não for usado dentro de um FirebaseProvider
    if (context === null) { // Verifica se o contexto é null (valor padrão)
        throw new Error('useFirebase deve ser usado dentro de um FirebaseProvider');
    }
    return context;
};

// Provedor do FirebaseContext
const FirebaseProvider = ({ children }) => {
    const [db, setDb] = useState(null);
    const [auth, setAuth] = useState(null);
    const [userId, setUserId] = useState(null);
    const [appId, setAppId] = useState(null);
    const [firebaseLoading, setFirebaseLoading] = useState(true);

    useEffect(() => {
        const initFirebase = async () => {
            try {
                const currentAppId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
                const envFirebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : {};

                const configToUse = Object.keys(envFirebaseConfig).length > 0 ? envFirebaseConfig : (importedFirebaseConfig || {});

                const initialAuthToken = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;

                setAppId(currentAppId);

                let firebaseApp;
                if (!getApps().length) {
                    firebaseApp = initializeApp(configToUse);
                } else {
                    firebaseApp = getApp();
                }
                
                const firestoreDb = getFirestore(firebaseApp);
                const firebaseAuth = getAuth(firebaseApp);

                setDb(firestoreDb);
                setAuth(firebaseAuth);

                const unsubscribe = onAuthStateChanged(firebaseAuth, async (user) => {
                    if (user) {
                        setUserId(user.uid);
                        console.log("FirebaseContext: Usuário autenticado:", user.uid);
                    } else {
                        if (initialAuthToken) {
                            try {
                                await signInWithCustomToken(firebaseAuth, initialAuthToken);
                            } catch (tokenError) {
                                console.error("FirebaseContext: Erro ao autenticar com token personalizado:", tokenError);
                                await signInAnonymously(firebaseAuth);
                            }
                        } else {
                            await signInAnonymously(firebaseAuth);
                        }
                        setUserId(firebaseAuth.currentUser?.uid || crypto.randomUUID());
                        console.log("FirebaseContext: Usuário atual (após tentativa de login):", firebaseAuth.currentUser?.uid || 'Anônimo');
                    }
                    console.log("FirebaseContext: App ID carregado:", currentAppId);
                    setFirebaseLoading(false);
                });

                return () => unsubscribe();
            } catch (err) {
                console.error("FirebaseContext: Erro ao inicializar Firebase:", err);
                setFirebaseLoading(false);
            }
        };

        initFirebase();
    }, []);

    const contextValue = {
        db,
        auth,
        userId,
        appId,
        firebaseLoading
    };

    return (
        <FirebaseContext.Provider value={contextValue}>
            {children}
        </FirebaseContext.Provider>
    );
};

export { FirebaseProvider };
