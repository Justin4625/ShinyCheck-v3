// Firebase web config. These values are public by design (they identify the project);
// access is protected by Firestore security rules (see firestore.rules).
// Firebase console → Project settings → Your apps → Web app → SDK setup and configuration.
// Set to null to run ShinyCheck in local-only mode.
export const firebaseConfig = {
  apiKey: "AIzaSyDa1RjpvEKqCA5g3FhkZKdtO0ZuvDUL5IY",
  authDomain: "shinycheck-5189f.firebaseapp.com",
  projectId: "shinycheck-5189f",
  storageBucket: "shinycheck-5189f.firebasestorage.app",
  messagingSenderId: "723087237579",
  appId: "1:723087237579:web:caa93a12ff6e1da0ccd64e",
};

// OAuth "Web client ID" for Google sign-in (Firebase → Authentication → Sign-in method →
// Google → Web SDK configuration). Makes Google sign-in work on mobile. null = popup only.
export const googleClientId = "723087237579-gk9gi4c1dhtgkhmfvoiudhjb0ktrnp3i.apps.googleusercontent.com";

// reCAPTCHA v3 site key for Firebase App Check (public). null = App Check off.
export const appCheckSiteKey = null;
