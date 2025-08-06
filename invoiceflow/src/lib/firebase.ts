import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { Quotation } from '../types';
import { collection, getDocs, getDoc, doc, addDoc, updateDoc, deleteDoc } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyCq2EkMJw9p5Gsd4zL9VLA8TI8cfEdf7IM",
  authDomain: "invoiceapplication-c87ef.firebaseapp.com",
  projectId: "invoiceapplication-c87ef",
  storageBucket: "invoiceapplication-c87ef.firebasestorage.app",
  messagingSenderId: "775249568703",
  appId: "1:775249568703:web:61936c0d4d82eedeed370a",
  measurementId: "G-JGJ2FYBLSK"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

export const getQuotations = async () => {
  const snapshot = await getDocs(collection(db, 'quotations'));
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Quotation[];
};

export const getQuotationById = async (id: string) => {
  const docRef = doc(db, 'quotations', id);
  const docSnap = await getDoc(docRef);
  if (docSnap.exists()) {
    return { id: docSnap.id, ...docSnap.data() } as Quotation;
  }
  return null;
};

export const addQuotation = async (quotation: Omit<Quotation, 'id'>) => {
  const docRef = await addDoc(collection(db, 'quotations'), quotation);
  return docRef.id;
};

export const updateQuotation = async (id: string, quotation: Partial<Quotation>) => {
  const docRef = doc(db, 'quotations', id);
  await updateDoc(docRef, quotation);
};

export const deleteQuotation = async (id: string) => {
  const docRef = doc(db, 'quotations', id);
  await deleteDoc(docRef);
};