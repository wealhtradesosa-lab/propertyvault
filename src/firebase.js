import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyBVH1KybbkL01qiGu_60fwXP_dYsY9YsuQ",
  authDomain: "district-42394.firebaseapp.com",
  projectId: "district-42394",
  storageBucket: "district-42394.firebasestorage.app",
  messagingSenderId: "579263399308",
  appId: "1:579263399308:web:72c152a5c4779c936042a9",
  measurementId: "G-9JT1SDFXWP"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
