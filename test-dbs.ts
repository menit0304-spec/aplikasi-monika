
import { initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import fs from "fs";

const config = JSON.parse(fs.readFileSync("./firebase-applet-config.json", "utf-8"));

async function test(dbId: string | undefined) {
  console.log(`Testing DB ID: ${dbId === undefined ? "undefined (default)" : dbId}`);
  const app = initializeApp({ projectId: config.projectId }, `app-${dbId || 'default'}`);
  const db = getFirestore(app, dbId);
  try {
    const snap = await db.collection("test").limit(1).get();
    console.log(`  RESULT: Success (size ${snap.size})`);
  } catch (err: any) {
    console.log(`  RESULT: Failed - ${err.message}`);
  }
}

async function run() {
  await test(undefined);
  await test("(default)");
  await test(config.firestoreDatabaseId);
}

run();
