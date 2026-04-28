import fs from "fs";
import { initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

const config = JSON.parse(fs.readFileSync("./firebase-applet-config.json", "utf-8"));

async function verify() {
  console.log("--- Firebase Admin Verification (Final Try) ---");
  console.log("Project ID:", config.projectId);
  console.log("Database ID:", config.firestoreDatabaseId);

  const app = initializeApp({ projectId: config.projectId });

  try {
    const db = getFirestore(app, config.firestoreDatabaseId);
    console.log("Testing 'rooms'...");
    const snap = await db.collection("rooms").limit(1).get();
    console.log("Success! Count:", snap.size);
  } catch (err: any) {
    console.error("Failed:", err.message);
  }
}

verify();
