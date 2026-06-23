import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { initializeAuth, getReactNativePersistence } from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';

const firebaseConfig = {
  apiKey: "AIzaSyBn3Lep3C3lIOJDGSCX_vE4Bl5Uf9onIT8",
  authDomain: "o-go-app-5e21d.firebaseapp.com",
  projectId: "o-go-app-5e21d",
  storageBucket: "o-go-app-5e21d.appspot.com",
  messagingSenderId: "439190538802",
  appId: "1:439190538802:web:9e58c1836be8ef30804a2b"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage)
});
