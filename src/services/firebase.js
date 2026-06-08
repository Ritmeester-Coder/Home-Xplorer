import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyCEprR52Xwlz3oBGpe7mWZTMskibvxjsQw",
  authDomain: "home-xplorer.firebaseapp.com",
  projectId: "home-xplorer",
  storageBucket: "home-xplorer.firebasestorage.app",
  messagingSenderId: "166798602789",
  appId: "1:166798602789:web:bb8199f0362046cfe045cc",
  measurementId: "G-K40R4PJEJ2",
};

export const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);
export const auth = getAuth(app);
export const storage = getStorage(app);