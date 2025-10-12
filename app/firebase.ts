// src/app/firebase.ts
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyBZl9_FYc-wndFiFSrzN8RNJHrlR6VV5MY",
  authDomain: "coach-bc3b3.firebaseapp.com",
  projectId: "coach-bc3b3",
  storageBucket: "coach-bc3b3.appspot.com",
  messagingSenderId: "672742580848",
  appId: "1:672742580848:web:34dfa4f35be4a470950ab5",
};

const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);
export const auth = getAuth(app);
export const provider = new GoogleAuthProvider();