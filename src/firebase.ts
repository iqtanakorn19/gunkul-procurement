import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCLcKumFHPB9k3qnlQE5yE0-fFBBTFoyMI",
  authDomain: "gunkul-internship.firebaseapp.com",
  projectId: "gunkul-internship",
  storageBucket: "gunkul-internship.firebasestorage.app",
  messagingSenderId: "380788772670",
  appId: "1:380788772670:web:bece97fb479875a2e8e66f",
  measurementId: "G-2RMRM2W29D"
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);
export const db = getFirestore(app);