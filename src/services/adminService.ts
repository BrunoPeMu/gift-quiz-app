import { db } from './firebase';
import { collection, getDocs, doc, updateDoc } from 'firebase/firestore';
import type { UserProfile } from '../types';

export const getAllUsers = async (): Promise<UserProfile[]> => {
    try {
        const usersCol = collection(db, 'users');
        const userSnapshot = await getDocs(usersCol);
        const userList = userSnapshot.docs.map(doc => ({
            uid: doc.id,
            ...doc.data()
        } as UserProfile));
        return userList;
    } catch (error) {
        console.error("Error fetching users:", error);
        throw error;
    }
};

export const updateUserStatus = async (uid: string, status: { isPremium?: boolean, isAdmin?: boolean }) => {
    try {
        const userRef = doc(db, 'users', uid);
        await updateDoc(userRef, status);
    } catch (error) {
        console.error("Error updating user status:", error);
        throw error;
    }
};

export const updateUserData = async (uid: string, data: Partial<UserProfile>) => {
    try {
        const userRef = doc(db, 'users', uid);
        await updateDoc(userRef, data);
    } catch (error) {
        console.error("Error updating user data:", error);
        throw error;
    }
};
