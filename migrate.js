// diagnose-finalizeddatas.js — find why Mongo has more docs than Appwrite
import 'dotenv/config';
import { Client, Databases, Query } from "node-appwrite";
import { MongoClient } from "mongodb";

const appwrite = new Client()
  .setEndpoint(process.env.APPWRITE_ENDPOINT)
  .setProject(process.env.APPWRITE_PROJECT_ID)
  .setKey(process.env.APPWRITE_API_KEY);

const DB_NAME = process.env.MONGODB_DB_NAME;
const databases = new Databases(appwrite);
const mongo = new MongoClient(process.env.MONGODB_URI);

const APPWRITE_DB_ID = "67496ef6002bb2655def";
const APPWRITE_COL_ID = "67667e7a0011d9d73859";
const MONGO_COLLECTION = "finalizeddatas";

async function fetchAllIds() {
  const ids = new Set();
  let cursor = null;
  while (true) {
    const queries = [Query.limit(100)];
    if (cursor) queries.push(Query.cursorAfter(cursor));
    const res = await databases.listDocuments(APPWRITE_DB_ID, APPWRITE_COL_ID, queries);
    res.documents.forEach((d) => ids.add(d.$id));
    if (res.documents.length < 100) break;
    cursor = res.documents.at(-1).$id;
  }
  return ids;
}

async function main() {
  await mongo.connect();
  const db = mongo.db(DB_NAME);
  const collection = db.collection(MONGO_COLLECTION);

  console.log("Fetching all current Appwrite IDs...");
  const appwriteIds = await fetchAllIds();
  console.log(`  Appwrite has ${appwriteIds.size} unique documents\n`);

  console.log("Checking MongoDB...");
  const mongoTotal = await collection.countDocuments();
  console.log(`  Mongo has ${mongoTotal} documents total`);

  // Check for duplicate _id values (shouldn't be possible since _id is the primary key,
  // but worth ruling out if a different field was meant to be unique)
  const dupCheck = await collection
    .aggregate([{ $group: { _id: "$_id", count: { $sum: 1 } } }, { $match: { count: { $gt: 1 } } }, { $limit: 5 }])
    .toArray();
  console.log(`  Duplicate _id groups found: ${dupCheck.length} (should always be 0 — _id is unique in Mongo)`);

  // Count Mongo docs whose _id does NOT exist in the current Appwrite set —
  // these are "orphaned" / stale docs from old runs or deleted Appwrite records
  const allMongoIds = await collection.find({}, { projection: { _id: 1 } }).toArray();
  const orphaned = allMongoIds.filter((d) => !appwriteIds.has(String(d._id)));
  console.log(`  Mongo docs with no matching Appwrite $id: ${orphaned.length}`);

  if (orphaned.length > 0) {
    console.log("\n  Sample of orphaned _id values (first 10):");
    orphaned.slice(0, 10).forEach((d) => console.log(`    ${d._id}`));

    // Pull a couple full sample docs to inspect their shape/timestamps
    const samples = await collection
      .find({ _id: { $in: orphaned.slice(0, 3).map((d) => d._id) } })
      .toArray();
    console.log("\n  Sample orphaned documents (check createdAt/updatedAt for clues on when they were inserted):");
    samples.forEach((d) => console.log("   ", JSON.stringify(d, null, 2)));
  }

  console.log(
    `\nSummary: Appwrite=${appwriteIds.size}, Mongo=${mongoTotal}, Orphaned-in-Mongo=${orphaned.length}, ` +
      `Expected-if-clean=${appwriteIds.size}`
  );

  await mongo.close();
}

main().catch((err) => {
  console.error("💥 Diagnostic failed:", err);
  process.exit(1);
});