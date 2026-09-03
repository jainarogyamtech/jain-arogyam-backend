// verify-counts.js — compare document counts between Appwrite and MongoDB
import 'dotenv/config';
import { Client, Databases } from "node-appwrite";
import { MongoClient } from "mongodb";

const appwrite = new Client()
  .setEndpoint(process.env.APPWRITE_ENDPOINT)
  .setProject(process.env.APPWRITE_PROJECT_ID)
  .setKey(process.env.APPWRITE_API_KEY);

const DB_NAME = process.env.MONGODB_DB_NAME;

const databases = new Databases(appwrite);
const mongo = new MongoClient(process.env.MONGODB_URI);

// --- CONFIG --- (same list as migrate.js — keep these in sync)
const APPWRITE_DB_ID = "67496ef6002bb2655def";
const COLLECTIONS = [
  { appwriteId: "67531a440000a7821a1b", mongoCollection: "users" },
  { appwriteId: "67667e7a0011d9d73859", mongoCollection: "finalizeddatas" },
  { appwriteId: "67496f260013217dd22b", mongoCollection: "appointments" }, // update name if different
];

async function getAppwriteCount(colId) {
  // total is returned regardless of pagination — no need to fetch all docs
  const res = await databases.listDocuments(APPWRITE_DB_ID, colId, []);
  return res.total;
}

async function main() {
  await mongo.connect();
  const db = mongo.db(DB_NAME);

  console.log(`\nComparing counts — Appwrite DB: ${APPWRITE_DB_ID} | Mongo DB: ${DB_NAME}\n`);
  console.log("Collection".padEnd(20), "Appwrite".padStart(10), "MongoDB".padStart(10), "  Status");
  console.log("-".repeat(60));

  let allMatch = true;

  for (const { appwriteId, mongoCollection } of COLLECTIONS) {
    let appwriteCount = "ERR";
    let mongoCount = "ERR";
    let ok = false;

    try {
      appwriteCount = await getAppwriteCount(appwriteId);
    } catch (err) {
      console.error(`  ⚠️  Failed to get Appwrite count for ${mongoCollection}: ${err.message}`);
    }

    try {
      mongoCount = await db.collection(mongoCollection).countDocuments();
    } catch (err) {
      console.error(`  ⚠️  Failed to get Mongo count for ${mongoCollection}: ${err.message}`);
    }

    ok = appwriteCount === mongoCount;
    if (!ok) allMatch = false;

    console.log(
      mongoCollection.padEnd(20),
      String(appwriteCount).padStart(10),
      String(mongoCount).padStart(10),
      "  " + (ok ? "✅ match" : "❌ MISMATCH")
    );
  }

  console.log("-".repeat(60));
  console.log(allMatch ? "\n✅ All collections match.\n" : "\n❌ Some collections do NOT match — see above.\n");

  await mongo.close();
  process.exit(allMatch ? 0 : 1);
}

main().catch((err) => {
  console.error("\n💥 Verification script failed:", err);
  process.exit(1);
});