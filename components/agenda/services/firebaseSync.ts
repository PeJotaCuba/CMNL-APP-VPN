import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  query, 
  where, 
  onSnapshot, 
  serverTimestamp,
  deleteDoc,
  orderBy,
  limit,
  Bytes
} from 'firebase/firestore';
import { db, auth } from '../../../src/lib/firebase';
import { GeneratedAgenda } from './db';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: any;
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
    },
    operationType,
    path
  };
  
  // Log but don't throw if it's a list/get to prevent app crash
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  if (operationType !== OperationType.LIST && operationType !== OperationType.GET) {
    throw new Error(JSON.stringify(errInfo));
  }
}

export interface EditorialSyncData {
  id: string;
  programId: string;
  weekId: string;
  dayName: string;
  month: string;
  theme: string;
  ideas: string;
  updatedAt: any;
  updatedBy: string;
}

// 1. Agenda Sharing
export const deleteSharedAgenda = async (id: string) => {
  const path = `generated_agendas/${id}`;
  try {
    await deleteDoc(doc(db, 'generated_agendas', id));
    return true;
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
    return false;
  }
};

export const deleteAllSharedAgendas = async () => {
  const path = 'generated_agendas';
  try {
    const q = query(collection(db, path));
    const snapshot = await getDocs(q);
    const deletePromises = snapshot.docs.map(d => deleteDoc(doc(db, path, d.id)));
    await Promise.all(deletePromises);
    return true;
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
    return false;
  }
};

export const shareAgendaFirebase = async (agenda: GeneratedAgenda) => {
  const path = `generated_agendas/${agenda.id}`;
  try {
    console.log("Iniciando subida a Firebase:", path);
    // Firestore cannot store Blob directly. Convert to Uint8Array.
    const arrayBuffer = await agenda.blob.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);
    
    // Firestore limit is 1MB.
    const isSmallEnough = uint8Array.length <= 1000000;
    
    // Destructure to remove the Blob object
    const { blob, ...metadata } = agenda;

    const agendaRef = doc(db, 'generated_agendas', agenda.id);
    await setDoc(agendaRef, {
      ...metadata,
      authorId: auth.currentUser?.uid || 'anonymous_user',
      createdAt: serverTimestamp(),
      fileData: isSmallEnough ? Bytes.fromUint8Array(uint8Array) : null,
      hasBinary: isSmallEnough,
      sharedBy: 'Equipo RCM'
    });
    console.log("Subida completada con éxito");
    return true;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
    return false;
  }
};

export const getSharedAgendas = (callback: (agendas: any[]) => void) => {
  const path = 'generated_agendas';
  const q = query(collection(db, path), orderBy('createdAt', 'desc'), limit(50));
  return onSnapshot(q, (snapshot) => {
    const agendas = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    callback(agendas);
  }, (error) => {
    handleFirestoreError(error, OperationType.GET, path);
  });
};

// 2. Editorial Real-time Sync
export const syncEditorialContent = (
  month: string, 
  weekId: string, 
  callback: (contents: Record<string, EditorialSyncData>) => void
) => {
  const path = 'editorial_contents';
  const q = query(collection(db, path), where('month', '==', month), where('weekId', '==', weekId));
  
  return onSnapshot(q, (snapshot) => {
    const contents: Record<string, EditorialSyncData> = {};
    snapshot.docs.forEach(doc => {
      const data = doc.data() as EditorialSyncData;
      const key = `${data.programId}-${data.dayName}`;
      contents[key] = data;
    });
    callback(contents);
  }, (error) => {
    handleFirestoreError(error, OperationType.GET, path);
  });
};

export const updateEditorialFirebase = async (data: Partial<EditorialSyncData>) => {
  if (!data.programId || !data.weekId || !data.dayName || !data.month) return;
  
  const contentId = `${data.month}-${data.weekId}-${data.programId}-${data.dayName}`;
  const path = `editorial_contents/${contentId}`;
  
  try {
    const docRef = doc(db, 'editorial_contents', contentId);
    // Ensure no undefined values are passed to Firestore
    const cleanData = {
        programId: data.programId,
        weekId: data.weekId,
        dayName: data.dayName,
        month: data.month,
        theme: data.theme || '',
        ideas: data.ideas || '',
        updatedAt: serverTimestamp(),
        updatedBy: auth.currentUser?.uid || 'anonymous_user'
    };
    
    await setDoc(docRef, cleanData, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
};
