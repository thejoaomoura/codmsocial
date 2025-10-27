// src/app/firebase.ts
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyB3LeSAftV91bja13PSOQkTTsIrg4faMBk",
  authDomain: "codmsocial-f8015.firebaseapp.com",
  databaseURL: "https://codmsocial-f8015-default-rtdb.firebaseio.com",
  projectId: "codmsocial-f8015",
  storageBucket: "codmsocial-f8015.firebasestorage.app",
  messagingSenderId: "391686792657",
  appId: "1:391686792657:web:a5809f64ef1c9a61ecacf0",
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
