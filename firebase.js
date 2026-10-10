// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBhr0dzess4x8D512tfRicvd7nqjYMbaK4",
  authDomain: "camera-note-app.firebaseapp.com",
  projectId: "camera-note-app",
  storageBucket: "camera-note-app.firebasestorage.app",
  messagingSenderId: "401694937474",
  appId: "1:401694937474:web:32b1cf7d23b39350e5bf9b"
};

// Initialize Firebase
export const app = initializeApp(firebaseConfig);