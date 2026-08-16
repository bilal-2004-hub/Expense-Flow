const { db } = require('./config/firebase');

async function check() {
  try {
    const snap = await db.collection('transactions').get();
    console.log(`Total transactions in DB: ${snap.size}`);
    snap.forEach(doc => {
      console.log(`ID: ${doc.id}`, doc.data());
    });

    const usersSnap = await db.collection('users').get();
    console.log(`Total users in DB: ${usersSnap.size}`);
    usersSnap.forEach(doc => {
      console.log(`ID: ${doc.id}`, doc.data());
    });
  } catch (err) {
    console.error('Error checking DB:', err);
  }
}

check();
