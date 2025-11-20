// // src/firebase.js
// import { initializeApp } from "firebase/app";
// import { getFirestore } from "firebase/firestore";
// import { getAuth, GoogleAuthProvider, signInWithPopup } from "firebase/auth";

// const firebaseConfig = {
//   apiKey: "AIzaSyBNQvKzBatbf3RiiZZGZ5PP1RHyTY3-Ut0",
//   authDomain: "oop-project-6e62a.firebaseapp.com",
//   projectId: "oop-project-6e62a",
//   storageBucket: "oop-project-6e62a.appspot.com",
//   messagingSenderId: "130989756801",
//   appId: "1:130989756801:web:a5633c446771ccdd0f5880",
//   measurementId: "G-ZZCXNCQPW8",
// };

// const app = initializeApp(firebaseConfig);

// export const db = getFirestore(app);
// export const auth = getAuth(app);
// export const provider = new GoogleAuthProvider();

// export const signInWithGoogle = async () => {
//   try {
//     const result = await signInWithPopup(auth, provider);
//     return result.user;
//   } catch (err) {
//     console.error("Google sign-in error:", err);
//   }
// };

import { initializeApp } from "firebase/app";
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  onAuthStateChanged,
} from "firebase/auth";
import { getFirestore, setLogLevel } from "firebase/firestore";

// IMPORTANT: Replace this with your actual Firebase config object
const firebaseConfig = {
  apiKey: "AIzaSyBNQvKzBatbf3RiiZZGZ5PP1RHyTY3-Ut0",
  authDomain: "oop-project-6e62a.firebaseapp.com",
  projectId: "oop-project-6e62a",
  storageBucket: "oop-project-6e62a.appspot.com",
  messagingSenderId: "130989756801",
  appId: "1:130989756801:web:a5633c446771ccdd0f5880",
  measurementId: "G-ZZCXNCQPW8",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const provider = new GoogleAuthProvider();

// Enable Firestore logging for debugging
setLogLevel('debug');

const signInWithGoogle = () => {
  return new Promise((resolve, reject) => {
    signInWithPopup(auth, provider)
      .then((result) => {
        resolve(result.user);
      })
      .catch((error) => {
        console.error("Google Sign-In Error:", error);
        reject(error);
      });
  });
};

const handleSignOut = () => {
  return signOut(auth);
};

export { app, db, auth, onAuthStateChanged, signInWithGoogle, handleSignOut };