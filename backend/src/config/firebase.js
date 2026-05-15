const admin = require('firebase-admin');

function normalizePrivateKey(privateKey) {
  return privateKey ? privateKey.replace(/\\n/g, '\n') : undefined;
}

function buildServiceAccountFromEnv() {
  if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
    const parsed = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
    if (parsed.private_key) {
      parsed.private_key = normalizePrivateKey(parsed.private_key);
    }
    return parsed;
  }

  if (
    process.env.FIREBASE_PROJECT_ID &&
    process.env.FIREBASE_CLIENT_EMAIL &&
    process.env.FIREBASE_PRIVATE_KEY
  ) {
    return {
      project_id: process.env.FIREBASE_PROJECT_ID,
      client_email: process.env.FIREBASE_CLIENT_EMAIL,
      private_key: normalizePrivateKey(process.env.FIREBASE_PRIVATE_KEY),
    };
  }

  return null;
}

let firebaseReady = false;

function initializeFirebase() {
  if (admin.apps.length > 0) {
    firebaseReady = true;
    return admin;
  }

  const serviceAccount = buildServiceAccountFromEnv();
  const storageBucket = process.env.FIREBASE_STORAGE_BUCKET;

  if (!serviceAccount || !storageBucket) {
    firebaseReady = false;
    return null;
  }

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    storageBucket,
  });

  firebaseReady = true;
  return admin;
}

function getStorageBucket() {
  const firebase = initializeFirebase();
  if (!firebaseReady || !firebase) {
    return null;
  }
  return firebase.storage().bucket();
}

module.exports = {
  admin,
  initializeFirebase,
  getStorageBucket,
};
