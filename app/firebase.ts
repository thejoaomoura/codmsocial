// src/app/firebase.ts
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyB3LeSAftV91bja13PSOQkTTsIrg4faMBk",
  authDomain: "codmsocial-f8015.firebaseapp.com",
  projectId: "codmsocial-f8015",
  storageBucket: "codmsocial-f8015.firebasestorage.app",
  messagingSenderId: "391686792657",
  appId: "1:391686792657:web:a5809f64ef1c9a61ecacf0"
};

const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);
export const auth = getAuth(app);
export const provider = new GoogleAuthProvider();