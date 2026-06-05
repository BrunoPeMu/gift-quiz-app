import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, query, where, writeBatch, doc } from 'firebase/firestore';

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

async function diagnoseSubjects() {
  // Get all subjects
  const subjectsSnap = await getDocs(collection(db, 'subjects'));
  console.log('=== SUBJECTS COLLECTION ===');
  subjectsSnap.docs.forEach(d => {
    const data = d.data();
    console.log(`  ${data.name} (userId: ${data.userId?.substring(0,8)}..., order: ${data.order})`);
  });

  // Get all topics
  const topicsSnap = await getDocs(collection(db, 'topics'));
  console.log('\n=== TOPICS COLLECTION ===');
  topicsSnap.docs.forEach(d => {
    const data = d.data();
    console.log(`  ${data.name} - subject: ${data.subject || '(none)'} (userId: ${data.userId?.substring(0,8)}...)`);
  });

  // Get all questions - unique subjects
  const questionsSnap = await getDocs(collection(db, 'questions'));
  const questionSubjects = new Set<string>();
  questionsSnap.docs.forEach(d => {
    const data = d.data();
    if (data.subject && data.subject !== 'Uncategorized') {
      questionSubjects.add(data.subject);
    }
  });
  console.log('\n=== UNIQUE SUBJECTS FROM QUESTIONS ===');
  questionSubjects.forEach(s => console.log(`  ${s}`));

  console.log('\n=== ANALYSIS ===');
  const subjectNames = subjectsSnap.docs.map(d => d.data().name);
  const topicNames = topicsSnap.docs.map(d => d.data().name);
  
  // Subjects that are also topic names (likely incorrect)
  const overlaps = subjectNames.filter(s => topicNames.includes(s));
  console.log(`Subjects that are also topic names (likely wrong): ${overlaps.length}`);
  overlaps.forEach(s => console.log(`  ❌ ${s}`));
  
  // Real subjects (from questions)
  const realSubjects = [...questionSubjects].filter(s => !topicNames.includes(s));
  console.log(`\nReal subjects (from questions, not topics): ${realSubjects.length}`);
  realSubjects.forEach(s => console.log(`  ✅ ${s}`));
}

diagnoseSubjects().catch(console.error);
