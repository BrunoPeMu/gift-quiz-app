import { initializeApp } from 'firebase/app';
import { getFirestore, collection, query, getDocs } from 'firebase/firestore';

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

async function check() {
  console.log('Checking topics and questions...');
  
  const qSnap = await getDocs(collection(db, 'questions'));
  const questions = qSnap.docs.map(d => ({ id: d.id, ...d.data() }));
  
  const tSnap = await getDocs(collection(db, 'topics'));
  const topics = tSnap.docs.map(d => ({ id: d.id, ...d.data() }));
  
  console.log(`Total questions: ${questions.length}`);
  console.log(`Total topics: ${topics.length}`);
  
  const targetTopics = ['tema 4', 'tema 5', 'Tema 4', 'Tema 5', '04', '05'];
  
  const matchingQ = questions.filter(q => {
      const topic = (q.topic || '').toLowerCase();
      const subject = (q.subject || '').toLowerCase();
      return topic.includes('tema 4') || topic.includes('tema 5') || topic === '04' || topic === '05' || subject.includes('patronato');
  });
  
  console.log('Matching questions:');
  matchingQ.forEach(q => console.log(`- ID: ${q.id}, userId: ${q.userId}, topic: ${q.topic}, subject: ${q.subject}`));
  
  const matchingT = topics.filter(t => {
      const name = (t.name || '').toLowerCase();
      const subject = (t.subject || '').toLowerCase();
      return name.includes('tema 4') || name.includes('tema 5') || name === '04' || name === '05' || subject.includes('patronato');
  });
  
  console.log('\nMatching topics:');
  matchingT.forEach(t => console.log(`- ID: ${t.id}, userId: ${t.userId}, name: ${t.name}, subject: ${t.subject}`));
}

check().catch(console.error);
