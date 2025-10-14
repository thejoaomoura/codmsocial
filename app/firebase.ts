import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

// Chave Principal do Firebase do Projeto
const firebaseConfig = {
  apiKey: "AIzaSyC9b62CSL3fEwR2Z0s5757B3aXvrkhfvK4",
  authDomain: "codmsocial-e2649.firebaseapp.com",
  projectId: "codmsocial-e2649",
  storageBucket: "codmsocial-e2649.firebasestorage.app",
  messagingSenderId: "753477650265",
  appId: "1:753477650265:web:2209a48126e572c824ae48"
};

// Inicializa o Firebase apenas se não existir uma instância
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
const db = getFirestore(app);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();

export { db, auth, provider };