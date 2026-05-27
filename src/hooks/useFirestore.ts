import { useState, useEffect } from 'react';
import { 
  collection, 
  query, 
  getDocs, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  onSnapshot 
} from 'firebase/firestore';
import { db } from '../lib/firebase';

export function useFirestore<T>(collectionName: string) {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const q = query(collection(db, collectionName));
    
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const documents: any[] = [];
      querySnapshot.forEach((doc) => {
        documents.push({ id: doc.id, ...doc.data() });
      });
      setData(documents as T[]);
      setLoading(false);
    }, (err) => {
      console.error("Error fetching collection:", err);
      setError(err);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [collectionName]);

  const addDocument = async (document: Omit<T, 'id'>) => {
    try {
      const docRef = await addDoc(collection(db, collectionName), document);
      return docRef.id;
    } catch (err) {
      console.error("Error adding document:", err);
      throw err;
    }
  };

  const updateDocument = async (id: string, updates: Partial<T>) => {
    try {
      const docRef = doc(db, collectionName, id);
      await updateDoc(docRef, updates);
    } catch (err) {
      console.error("Error updating document:", err);
      throw err;
    }
  };

  const deleteDocument = async (id: string) => {
    try {
      await deleteDoc(doc(db, collectionName, id));
    } catch (err) {
      console.error("Error deleting document:", err);
      throw err;
    }
  };

  return { data, loading, error, addDocument, updateDocument, deleteDocument };
}
