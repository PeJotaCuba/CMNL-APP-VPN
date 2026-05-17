import React, { createContext, useContext, useEffect, useState } from 'react';
import { User as FirebaseUser, onAuthStateChanged, signInAnonymously } from 'firebase/auth';
import { auth } from '../lib/firebase';

interface FirebaseContextType {
  user: FirebaseUser | null;
  loading: boolean;
}

const FirebaseContext = createContext<FirebaseContextType>({ user: null, loading: true });

export const useFirebase = () => useContext(FirebaseContext);

export const FirebaseProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
      
      if (!u) {
        signInAnonymously(auth).catch(err => {
          if (err.code === 'auth/admin-restricted-operation') {
            console.warn("Firebase: Anonymous Auth is disabled in the Firebase Console. Basic sync may require public permissions or enabling this provider.");
          } else {
            console.error("Firebase Anonymous Login Error:", err);
          }
        });
      }
    });
    return () => unsubscribe();
  }, []);

  return (
    <FirebaseContext.Provider value={{ user, loading }}>
      {children}
    </FirebaseContext.Provider>
  );
};
