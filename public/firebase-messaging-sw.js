
importScripts(
  "https://www.gstatic.com/firebasejs/12.4.0/firebase-app-compat.js"
);

importScripts(
  "https://www.gstatic.com/firebasejs/12.4.0/firebase-messaging-compat.js"
);

firebase.initializeApp({
 apiKey: "AIzaSyBhr0dzess4x8D512tfRicvd7nqjYMbaK4",
  authDomain: "camera-note-app.firebaseapp.com",
  projectId: "camera-note-app",
  storageBucket: "camera-note-app.firebasestorage.app",
  messagingSenderId: "401694937474",
  appId: "1:401694937474:web:32b1cf7d23b39350e5bf9b"
});

firebase.messaging();
