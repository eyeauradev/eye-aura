import admin from "firebase-admin";

let firebaseAdmin: admin.app.App | null = null;

export function initializeFirebaseAdmin() {
  if (!firebaseAdmin) {
    if (admin.apps.length > 0) {
      firebaseAdmin = admin.apps[0];
      return firebaseAdmin;
    }

    const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");
    
    if (!privateKey) {
      throw new Error("FIREBASE_PRIVATE_KEY not set in environment variables");
    }

    firebaseAdmin = admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
        privateKey,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      }),
    });
  }
  
  return firebaseAdmin;
}

export function getFirebaseAdmin() {
  if (!firebaseAdmin) {
    return initializeFirebaseAdmin();
  }
  return firebaseAdmin;
}
