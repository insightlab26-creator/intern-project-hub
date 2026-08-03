import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBvc5xmNLNaPkxIotdwjOmQnqyilhQVV5o",
  authDomain: "intern-project-hub.firebaseapp.com",
  projectId: "intern-project-hub",
  storageBucket: "intern-project-hub.firebasestorage.app",
  messagingSenderId: "553204932488",
  appId: "1:553204932488:web:e27115adde163f4916243d"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);