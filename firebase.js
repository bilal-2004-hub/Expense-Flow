const admin = require('firebase-admin');
const dotenv = require('dotenv');

dotenv.config();

// Ensure private key handles literal '\n' characters if stored as env string
const privateKey = process.env.FIREBASE_PRIVATE_KEY
  ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
  : undefined;

if (!admin.apps.length) {
  if (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_CLIENT_EMAIL && privateKey) {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: privateKey,
      }),
    });
    console.log('Firebase Admin initialized with Environment Credentials');
  } else {
    // Fallback for default GCP / ADC environment or mock/emulator setup
    admin.initializeApp({
      projectId: process.env.FIREBASE_PROJECT_ID || 'expenseflow-app',
    });
    console.log('Firebase Admin initialized with Default Credentials');
  }
}

const db = admin.firestore();
const auth = admin.auth();

module.exports = {
  admin,
  db,
  auth
};
