import { initializeApp as initializeClientApp, getApps as getClientApps } from "firebase/app";
import { getFirestore as getClientFirestore } from "firebase/firestore";
import { initializeApp as initializeAdminApp, getApps as getAdminApps } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import fs from "fs";
import path from "path";

// Load config manually to avoid potential issues with JSON imports in TS/ESM
const configPath = path.join(process.cwd(), "firebase-applet-config.json");
const config = JSON.parse(fs.readFileSync(configPath, "utf-8"));

// Initialize Firebase Admin for Auth (if needed)
const adminApp = getAdminApps().length > 0 ? getAdminApps()[0]! : initializeAdminApp({
  projectId: config.projectId
});
export const auth = getAuth(adminApp);

// Initialize Firebase Client for Firestore (as a workaround for permission issues)
const clientApp = getClientApps().length > 0 ? getClientApps()[0]! : initializeClientApp(config);
export const db = getClientFirestore(clientApp, config.firestoreDatabaseId);

console.log(`[firebaseAdmin] Setup complete for Project: ${config.projectId}`);
