// src/app/firebase.ts
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);
export const auth = getAuth(app);
export const provider = new GoogleAuthProvider();

// Configurações para email link authentication
export const actionCodeSettings = {
  // URL para redirecionamento após autenticação - deve estar na lista de domínios autorizados do Firebase
  url:
    typeof window !== "undefined"
      ? window.location.origin + "/login"
      : "http://localhost:3000/login",
  // Deve ser sempre true para concluir o processo de login no app
  handleCodeInApp: true,
  iOS: {
    bundleId: "com.codmsocial.app",
  },
  // Configurações para Android
  android: {
    packageName: "com.codmsocial.app",
    installApp: true,
    minimumVersion: "12",
  },
  // Domínio personalizado (se configurado no Firebase Hosting)
  // linkDomain: 'codmsocial.com' // Descomentar quanto tiver domínio próprio
};
