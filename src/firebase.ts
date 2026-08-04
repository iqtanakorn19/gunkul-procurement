import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import {
  getFirestore,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
} from "firebase/firestore";
import type { Firestore } from "firebase/firestore";

// No firebase/storage import: Cloud Storage for Firebase requires the paid
// Blaze plan on new projects even within the free quota. Document/file
// uploads across the app link out to Google Drive instead (see FileVault.tsx,
// KnowledgePage.tsx), so this project can run entirely on the free Spark plan.
const firebaseConfig = {
  apiKey: "AIzaSyCLcKumFHPB9k3qnlQE5yE0-fFBBTFoyMI",
  authDomain: "gunkul-internship.firebaseapp.com",
  projectId: "gunkul-internship",
  messagingSenderId: "380788772670",
  appId: "1:380788772670:web:bece97fb479875a2e8e66f",
  measurementId: "G-2RMRM2W29D"
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);

// Firestore with PERSISTENT local cache (IndexedDB). Repeat visits and page
// refreshes are served from the on-device cache and cost ZERO server reads —
// only changed documents are re-fetched. This is the main lever for keeping
// total reads under the Spark (free) plan's 50k/day quota. The multi-tab
// manager keeps the cache consistent when the app is open in several tabs.
// initializeFirestore must run before any getFirestore(app); if the app was
// already initialized (e.g. Vite HMR re-import), fall back to the existing one.
let firestore: Firestore;
try {
  firestore = initializeFirestore(app, {
    localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
  });
} catch {
  firestore = getFirestore(app);
}
export const db = firestore;