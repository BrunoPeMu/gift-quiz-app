import React, { createContext, useContext, useState, useEffect } from 'react';
import {
    signInWithPopup,
    signInWithRedirect,
    getRedirectResult,
    signOut,
    onAuthStateChanged,
    type User,
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    updateProfile as updateAuthProfile
} from 'firebase/auth';
import { auth, googleProvider, /* appleProvider, */ db } from '../services/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import type { UserProfile } from '../types';
import CookieConsentModal from '../components/CookieConsentModal';
import { shouldReaccept } from '../config/legal';

interface AuthContextType {
    currentUser: User | null;
    userProfile: UserProfile | null;
    loading: boolean;
    loginWithGoogle: () => Promise<void>;
    loginWithGoogleRedirect: () => Promise<void>;
    // loginWithApple: () => Promise<void>;
    loginWithEmail: (email: string, password: string) => Promise<void>;
    registerWithEmail: (email: string, password: string, name: string) => Promise<void>;
    logout: () => Promise<void>;
    updateUserProfile: (data: Partial<UserProfile>) => Promise<void>;
    refreshProfile: () => Promise<void>;
    checkUsernameAvailability: (username: string) => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            setCurrentUser(user);

            if (user) {
                // Fetch user profile from Firestore
                try {
                    const userDocRef = doc(db, 'users', user.uid);
                    const userDocSnap = await getDoc(userDocRef);

                    if (userDocSnap.exists()) {
                        const data = userDocSnap.data();

                        // Check for monthly credit refill
                        let credits = data.credits ?? 3;
                        let lastCreditReset = data.lastCreditReset;

                        try {
                            const { checkMonthlyCreditRefill } = await import('../services/userService');
                            const refillResult = await checkMonthlyCreditRefill(user.uid, { credits, lastCreditReset, tier: data.tier || 'free' });
                            if (refillResult) {
                                credits = refillResult.credits;
                                lastCreditReset = refillResult.lastCreditReset;
                            }
                        } catch (err) {
                            console.error("Error checking credit refill:", err);
                        }

                        setUserProfile({
                            uid: user.uid,
                            email: user.email || '',
                            displayName: data.displayName || user.displayName || 'User',
                            photoURL: data.photoURL || user.photoURL || undefined,
                            isPremium: data.isPremium || false,
                            isAdmin: data.isAdmin || false,
                            role: data.role || (data.isAdmin ? 'admin' : 'user'),
                            username: data.username,
                            bio: data.bio,
                            createdAt: data.createdAt || Date.now(),
                            preferences: data.preferences || { theme: 'system' },
                            tier: data.tier || 'free',
                            credits: credits,
                            lastCreditReset: lastCreditReset,
                            termsAccepted: data.termsAccepted || false,
                            termsAcceptedAt: data.termsAcceptedAt,
                            termsAcceptedVersion: data.termsAcceptedVersion,
                            cookiesAccepted: data.cookiesAccepted || false,
                            cookiesAcceptedAt: data.cookiesAcceptedAt,
                            cookiesAcceptedVersion: data.cookiesAcceptedVersion,
                        });
                    } else {
                        // Create new user profile if it doesn't exist
                        const newlyCreatedTime = Date.now();
                        const newProfile: UserProfile = {
                            uid: user.uid,
                            email: user.email || '',
                            displayName: user.displayName || 'User',
                            photoURL: user.photoURL || undefined,
                            isPremium: false,
                            isAdmin: false,
                            role: 'user',
                            createdAt: Date.now(),
                            preferences: { theme: 'system' },
                            tier: 'free',
                            credits: 3,
                            lastCreditReset: newlyCreatedTime,
                            termsAccepted: true,
                            termsAcceptedAt: Date.now(),
                            cookiesAccepted: true,
                            cookiesAcceptedAt: Date.now(),
                        };
                        await setDoc(userDocRef, newProfile);
                        setUserProfile(newProfile);
                    }
                } catch (error) {
                    console.error("Error fetching user profile:", error);
                    // Fallback to basic auth info
                    setUserProfile({
                        uid: user.uid,
                        email: user.email || '',
                        displayName: user.displayName || 'User',
                        photoURL: user.photoURL || undefined,
                        isPremium: false,
                        isAdmin: false,
                        role: 'user',
                        createdAt: Date.now(),
                        preferences: { theme: 'system' },
                        tier: 'free',
                        credits: 3,
                        termsAccepted: true,
                        termsAcceptedAt: Date.now(),
                        cookiesAccepted: true,
                        cookiesAcceptedAt: Date.now(),
                    });
                }
            } else {
                // Guest User - Load from Local Storage
                const guestProfile = JSON.parse(localStorage.getItem('guest_profile') || '{}');
                setUserProfile({
                    uid: 'guest',
                    email: '',
                    displayName: 'Invitado',
                    photoURL: guestProfile.photoURL || undefined,
                    isPremium: false,
                    isAdmin: false,
                    role: 'user',
                    tier: 'guest',
                    username: undefined,
                    bio: undefined,
                    createdAt: Date.now(),
                    preferences: guestProfile.preferences || { theme: 'system' },
                    cookiesAccepted: guestProfile.cookiesAccepted ?? false,
                    cookiesAcceptedAt: guestProfile.cookiesAcceptedAt,
                    cookiesAcceptedVersion: guestProfile.cookiesAcceptedVersion,
                });
            }

            setLoading(false);
        });

        return unsubscribe;
    }, []);

    // Apply theme effect
    useEffect(() => {
        const theme = userProfile?.preferences?.theme || 'system';
        const root = window.document.documentElement;

        const applyTheme = () => {
            root.classList.remove('light', 'dark');

            if (theme === 'system') {
                const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
                root.classList.add(systemTheme);
            } else {
                root.classList.add(theme);
            }
        };

        applyTheme();

        if (theme === 'system') {
            const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

            // Listen for changes
            const handleChange = () => applyTheme();
            mediaQuery.addEventListener('change', handleChange);

            return () => mediaQuery.removeEventListener('change', handleChange);
        }
    }, [userProfile?.preferences?.theme]);

    // Check for redirect result on mount
    useEffect(() => {
        getRedirectResult(auth).then(async (result) => {
            if (result) {
                // User signed in via redirect
                // The onAuthStateChanged listener will handle the state update
                console.log("Redirect login success");
            }
        }).catch((error) => {
            console.error("Redirect login failed", error);
        });
    }, []);

    const loginWithGoogle = async () => {
        try {
            await signInWithPopup(auth, googleProvider);
        } catch (error) {
            console.error("Google Login failed", error);
            throw error;
        }
    };

    const loginWithGoogleRedirect = async () => {
        try {
            await signInWithRedirect(auth, googleProvider);
        } catch (error) {
            console.error("Google Redirect Login failed", error);
            throw error;
        }
    };

    /*
    const loginWithApple = async () => {
        try {
            await signInWithPopup(auth, appleProvider);
        } catch (error) {
            console.error("Apple Login failed", error);
            throw error;
        }
    };
    */

    const loginWithEmail = async (email: string, password: string) => {
        try {
            await signInWithEmailAndPassword(auth, email, password);
        } catch (error) {
            console.error("Email Login failed", error);
            throw error;
        }
    };

    const registerWithEmail = async (email: string, password: string, name: string) => {
        try {
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            // Update display name immediately
            await updateAuthProfile(userCredential.user, { displayName: name });

            // Explicitly create user profile in Firestore to ensure it exists immediately
                        const newProfile: UserProfile = {
                            uid: userCredential.user.uid,
                            email: email,
                            displayName: name,
                            photoURL: undefined,
                            isPremium: false,
                            isAdmin: false,
                            role: 'user',
                            createdAt: Date.now(),
                            preferences: { theme: 'system' },
                            tier: 'free',
                            credits: 3,
                            termsAccepted: true,
                            termsAcceptedAt: Date.now(),
                            cookiesAccepted: true,
                            cookiesAcceptedAt: Date.now(),
                        };
            const userDocRef = doc(db, 'users', userCredential.user.uid);
            await setDoc(userDocRef, newProfile);

            // Update local state immediately so we don't depend solely on the listener delay
            setUserProfile(newProfile);
        } catch (error) {
            console.error("Registration failed", error);
            throw error;
        }
    };

    const logout = async () => {
        try {
            await signOut(auth);
            // Clear any lingering user profile state immediately
            setUserProfile(null);
            setCurrentUser(null);
            // Optionally clear guest profile if we want a fresh start
            // localStorage.removeItem('guest_profile'); 
        } catch (error) {
            console.error("Logout failed", error);
            throw error;
        }
    };

    const checkUsernameAvailability = async (username: string): Promise<boolean> => {
        // Enforce basic constraints
        if (username.length < 3) return false;
        if (!/^[a-zA-Z0-9_]+$/.test(username)) return false;

        // In a real app with strict security, this should be a cloud function.
        // For this client-side implementation, we'll query Firestore.
        try {
            const { collection, query, where, getDocs } = await import('firebase/firestore');
            const usersRef = collection(db, 'users');
            const q = query(usersRef, where('username', '==', username));
            const querySnapshot = await getDocs(q);

            // If any doc exists with this username AND it's not the current user
            if (!querySnapshot.empty) {
                const doc = querySnapshot.docs[0];
                if (doc.id !== auth.currentUser?.uid) {
                    return false; // Taken by someone else
                }
            }
            return true;
        } catch (error) {
            console.error("Error checking username:", error);
            return false; // Fail safe
        }
    };

    const refreshProfile = async () => {
        if (!auth.currentUser) return;
        try {
            const userDocRef = doc(db, 'users', auth.currentUser.uid);
            const userDocSnap = await getDoc(userDocRef);
            if (userDocSnap.exists()) {
                const data = userDocSnap.data();
                setUserProfile(prev => prev ? ({ ...prev, ...data }) : null);
            }
        } catch (error) {
            console.error("Error refreshing profile", error);
        }
    };

    const updateUserProfile = async (data: Partial<UserProfile>) => {
        if (auth.currentUser) {
            try {
                // Only update Firebase Auth profile if displayName or photoURL are present
                if (data.displayName || data.photoURL) {
                    await import('firebase/auth').then(module => module.updateProfile(auth.currentUser!, {
                        displayName: data.displayName,
                        photoURL: data.photoURL
                    }));
                }

                // Persist to Firestore
                const userDocRef = doc(db, 'users', auth.currentUser.uid);
                await setDoc(userDocRef, data, { merge: true });

                // Update local state
                setCurrentUser(prev => prev ? ({ ...prev, ...data } as any) : null);
                setUserProfile(prev => prev ? ({ ...prev, ...data }) : null);
            } catch (error) {
                console.error("Failed to update profile", error);
                throw error;
            }
        } else {
            // Guest User - Update Local Storage
            const currentGuest = JSON.parse(localStorage.getItem('guest_profile') || '{}');
            const newGuestProfile = { ...currentGuest, ...data };
            localStorage.setItem('guest_profile', JSON.stringify(newGuestProfile));

            // Update local state
            setUserProfile(prev => prev ? ({ ...prev, ...data }) : null);
        }
    };

    const value = {
        currentUser,
        userProfile,
        loading,
        login: loginWithGoogle, // Deprecated alias, keep for backward compat for now
        loginWithGoogle,
        loginWithGoogleRedirect,
        // loginWithApple,
        loginWithEmail,
        registerWithEmail,
        logout,
        updateUserProfile,
        refreshProfile,
        checkUsernameAvailability
    };

    return (
        <AuthContext.Provider value={value}>
            {!loading && children}
            {!loading && shouldReaccept(!!userProfile?.cookiesAccepted, userProfile?.cookiesAcceptedVersion) && !(userProfile?.subscription?.status === 'active' || userProfile?.isPremium || userProfile?.tier === 'pro') && <CookieConsentModal />}
        </AuthContext.Provider>
    );
}
