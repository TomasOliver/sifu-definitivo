import { initializeApp } from 'firebase/app';
import { initializeFirestore } from 'firebase/firestore';

export const firebaseConfig = {
  apiKey: 'AIzaSyDiG8v7jkjoSW_UzLiI0CmgWsYduBzcx9I',
  authDomain: 'sifu-db-61d90.firebaseapp.com',
  projectId: 'sifu-db-61d90',
  storageBucket: 'sifu-db-61d90.firebasestorage.app',
  messagingSenderId: '1052899000524',
  appId: '1:1052899000524:web:c43be3626edf228555c269',
  measurementId: 'G-PDKRFL2N9N'
};

export const firebaseApp = initializeApp(firebaseConfig);
export const firestoreDb = initializeFirestore(firebaseApp, {
  ignoreUndefinedProperties: true
});
