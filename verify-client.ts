import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, limit, query } from 'firebase/firestore';
import fs from "fs";

const config = JSON.parse(fs.readFileSync("./firebase-applet-config.json", "utf-8"));

async function verifyClient() {
  console.log("--- Firebase Client SDK Verification ---");
  const infraProjectId = "ais-asia-east1-805a85cda175494";
  console.log("Project ID:", infraProjectId);
  console.log("Database ID:", config.firestoreDatabaseId);

  try {
    const app = initializeApp({ ...config, projectId: infraProjectId });
    const db = getFirestore(app, config.firestoreDatabaseId);
    
    console.log("Attempting to list rooms (Client SDK)...");
    const q = query(collection(db, 'rooms'), limit(1));
    const snap = await getDocs(q);
    console.log("Client Success! Count:", snap.size);
  } catch (err: any) {
    console.error("Client Failed:", err.message);
  }
}

verifyClient();
