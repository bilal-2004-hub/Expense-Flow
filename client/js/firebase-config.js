/* =========================================================
   EXPENSEFLOW — firebase-config.js
   Client-side Firebase Web SDK Configuration & Initialization.
   Replace placeholder values below with your Firebase Project credentials
   from the Firebase Console (Project Settings -> General -> Web Apps).
   ========================================================= */

const firebaseConfig = {
  apiKey: "AIzaSyA-Pvos_9jBzsQ2jcda0depdnEyHkvfjYQ",
  authDomain: "expense-flow-d5278.firebaseapp.com",
  projectId: "expense-flow-d5278",
  storageBucket: "expense-flow-d5278.firebasestorage.app",
  messagingSenderId: "83669762731",
  appId: "1:83669762731:web:1b9b9600abdbf21f74edee",
  measurementId: "G-2M4L8VSC3B"
};

function isFirebaseConfigured() {
  return (
    firebaseConfig.apiKey &&
    !firebaseConfig.apiKey.includes('YOUR_FIREBASE_API_KEY') &&
    firebaseConfig.apiKey.trim() !== ''
  );
}

// Initialize Firebase App if SDK script is present and valid
if (typeof firebase !== 'undefined' && !firebase.apps.length) {
  if (isFirebaseConfigured()) {
    firebase.initializeApp(firebaseConfig);
  } else {
    console.warn(
      '⚠️ Firebase credentials not configured in client/js/firebase-config.js.\n' +
      'Please replace placeholder values with your Firebase Web App credentials from the Firebase Console.'
    );
  }
}
