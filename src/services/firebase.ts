import { initializeApp } from "firebase/app";
// import { getAnalytics } from "firebase/analytics";
import { getFirestore } from 'firebase/firestore';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
// import { getAuth, GoogleAuthProvider, OAuthProvider } from 'firebase/auth';

const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
    measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
};

// Initialize Firebase
export const app = initializeApp(firebaseConfig);
// const analytics = getAnalytics(app);
export const db = getFirestore(app);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
// export const appleProvider = new OAuthProvider('apple.com');

import { getFunctions } from 'firebase/functions';
// import { initializeAppCheck, ReCaptchaV3Provider } from 'firebase/app-check';

export const functions = getFunctions(app);

// Initialize App Check
// Use semantic version to avoid type errors if window.FIREBASE_APPCHECK_DEBUG_TOKEN is not defined
// eslint-disable-next-line @typescript-eslint/no-explicit-any
/*
if (typeof window !== 'undefined') {
    // Localhost debug logic can be added here if needed
    // (window as any).FIREBASE_APPCHECK_DEBUG_TOKEN = true; 

    initializeAppCheck(app, {
        provider: new ReCaptchaV3Provider('6Lfd2VUsAAAAAPF_J05qphhKOSoMJoPFUpdxufeg'),
        isTokenAutoRefreshEnabled: true
    });
}
*/
