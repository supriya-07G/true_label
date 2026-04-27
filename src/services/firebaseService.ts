import { 
  doc, 
  setDoc, 
  getDoc, 
  collection, 
  addDoc, 
  getDocs, 
  query, 
  orderBy, 
  deleteDoc, 
  serverTimestamp,
  updateDoc
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { UserProfile, CabinetItem, ScanResult, ChatMessage } from '../types';

export const saveUserProfile = async (userId: string, profile: UserProfile) => {
  const path = `users/${userId}`;
  try {
    await setDoc(doc(db, path), {
      ...profile,
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
};

export const getUserProfile = async (userId: string): Promise<UserProfile | null> => {
  const path = `users/${userId}`;
  try {
    const snap = await getDoc(doc(db, path));
    if (snap.exists()) {
      return snap.data() as UserProfile;
    }
    return null;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
    return null;
  }
};

export const saveCabinetItem = async (userId: string, item: CabinetItem) => {
  const path = `users/${userId}/cabinet/${item.id}`;
  try {
    // Convert addedAt to Date if it's a string for Firestore timestamp compatibility if needed, 
    // but here we'll just use serverTimestamp for new items if not provided.
    await setDoc(doc(db, path), {
      ...item,
      addedAt: item.addedAt ? new Date(item.addedAt) : serverTimestamp()
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
};

export const getCabinetItems = async (userId: string): Promise<CabinetItem[]> => {
  const path = `users/${userId}/cabinet`;
  try {
    const q = query(collection(db, path), orderBy('addedAt', 'desc'));
    const snap = await getDocs(q);
    return snap.docs.map(doc => {
      const data = doc.data();
      return {
        ...data,
        id: doc.id,
        addedAt: data.addedAt?.toDate().toISOString() || new Date().toISOString()
      } as CabinetItem;
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
    return [];
  }
};

export const deleteCabinetItem = async (userId: string, itemId: string) => {
  const path = `users/${userId}/cabinet/${itemId}`;
  try {
    await deleteDoc(doc(db, path));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
};

export const saveScanResult = async (userId: string, result: ScanResult) => {
  const path = `users/${userId}/scanHistory`;
  try {
    const scanId = `scan_${Date.now()}`;
    await setDoc(doc(db, path, scanId), {
      ...result,
      scanDate: serverTimestamp()
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
};

export const getScanHistory = async (userId: string): Promise<ScanResult[]> => {
  const path = `users/${userId}/scanHistory`;
  try {
    const q = query(collection(db, path), orderBy('scanDate', 'desc'));
    const snap = await getDocs(q);
    return snap.docs.map(doc => {
      const data = doc.data();
      return {
        ...data,
        scanDate: data.scanDate?.toDate().toISOString() || new Date().toISOString()
      } as ScanResult;
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
    return [];
  }
};

export const saveChatMessage = async (userId: string, message: ChatMessage) => {
  const path = `users/${userId}/chatMessages`;
  try {
    await addDoc(collection(db, path), {
      ...message,
      timestamp: serverTimestamp()
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
};

export const getChatMessages = async (userId: string): Promise<ChatMessage[]> => {
  const path = `users/${userId}/chatMessages`;
  try {
    const q = query(collection(db, path), orderBy('timestamp', 'asc'));
    const snap = await getDocs(q);
    return snap.docs.map(doc => {
      const data = doc.data();
      return {
        ...data,
        id: doc.id,
        timestamp: data.timestamp?.toDate().toISOString() || new Date().toISOString()
      } as ChatMessage;
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
    return [];
  }
};
