import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBNQvKzBatbf3RiiZZGZ5PP1RHyTY3-Ut0",
  authDomain: "oop-project-6e62a.firebaseapp.com",
  projectId: "oop-project-6e62a",
  storageBucket: "oop-project-6e62a.firebasestorage.app",
  messagingSenderId: "130989756801",
  appId: "1:130989756801:web:a5633c446771ccdd0f5880",
  measurementId: "G-ZZCXNCQPW8"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export const auth = getAuth(app);
export const provider = new GoogleAuthProvider();

export {db}; 

export const signInWithGoogle = async () => {
  try {
    const result = await signInWithPopup(auth, provider);
    return result.user;
  } catch (err) {
    console.error(err);
  }
};
