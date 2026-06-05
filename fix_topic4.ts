import { initializeApp } from 'firebase/app';
import { getFirestore, collection, query, where, getDocs, writeBatch, doc } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyDOONcS64CEcx8siV9MVl-WEkoxl46l6Vg",
  authDomain: "generador-de-test-c0035.firebaseapp.com",
  projectId: "generador-de-test-c0035",
  storageBucket: "generador-de-test-c0035.firebasestorage.app",
  messagingSenderId: "951304261354",
  appId: "1:951304261354:web:8e1f85fa8ed4913f949193",
  measurementId: "G-FKP52FS071"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function renameTopic4() {
  console.log('Renaming "Tema 4" → "04" in questions...');
  
  // Update questions
  const q = query(collection(db, 'questions'), where('topic', '==', 'Tema 4'));
  const qSnap = await getDocs(q);
  console.log(`Found ${qSnap.size} questions with topic "Tema 4"`);
  
  const batch = writeBatch(db);
  qSnap.docs.forEach(d => {
    batch.update(d.ref, { topic: '04' });
  });
  
  // Update topics collection
  const t = query(collection(db, 'topics'), where('name', '==', 'Tema 4'));
  const tSnap = await getDocs(t);
  console.log(`Found ${tSnap.size} topics named "Tema 4"`);
  
  tSnap.docs.forEach(d => {
    batch.update(d.ref, { name: '04' });
  });
  
  await batch.commit();
  console.log('Done! Renamed "Tema 4" → "04"');
}

renameTopic4().catch(console.error);
