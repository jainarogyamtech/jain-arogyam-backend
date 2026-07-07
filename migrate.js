// migrate.js to migrate data from appwrite to mongo.
import 'dotenv/config';
import { Client, Databases, Query } from "node-appwrite";
import { MongoClient } from "mongodb";

const appwrite = new Client()
  .setEndpoint(process.env.APPWRITE_ENDPOINT)
  .setProject(process.env.APPWRITE_PROJECT_ID)
  .setKey(process.env.APPWRITE_API_KEY); // server key, not client

const DB_NAME = process.env.MONGODB_DB_NAME;

const databases = new Databases(appwrite);

const mongo = new MongoClient(process.env.MONGODB_URI);

// --- CONFIG ---
const APPWRITE_DB_ID = "67496ef6002bb2655def";
const COLLECTIONS = [
  { appwriteId: "67531a440000a7821a1b",    mongoCollection: "users" },
  // { appwriteId: "67667e7a0011d9d73859", mongoCollection: "finalizeddatas" },
  // { appwriteId: "67496f260013217dd22b", mongoCollection: "appointments" },
  // add all your collections
];

// Paginate through ALL docs (Appwrite limit is 25 by default, max 100)
async function fetchAll(dbId, colId) {
  const all = [];
  let cursor = null;

  while (true) {
    const queries = [Query.limit(100)];
    if (cursor) queries.push(Query.cursorAfter(cursor));

    const res = await databases.listDocuments(dbId, colId, queries);
    all.push(...res.documents);

    if (res.documents.length < 100) break; // last page
    cursor = res.documents.at(-1).$id;
  }

  return all;
}

// Transform: strip Appwrite system fields, remap $id → _id
function transform(doc) {
  const { $id, $collectionId, $databaseId, $createdAt, $updatedAt, $permissions, ...rest } = doc;
  return {
    _id: $id,           // preserve original ID for reference integrity
    createdAt: new Date($createdAt),
    updatedAt: new Date($updatedAt),
    ...rest,
  };
}

async function migrate() {
  await mongo.connect();
  const db = mongo.db(DB_NAME);

  for (const { appwriteId, mongoCollection } of COLLECTIONS) {
    console.log(`\n→ Migrating: ${mongoCollection}`);

    const docs = await fetchAll(APPWRITE_DB_ID, appwriteId);
    console.log(`  Fetched: ${docs.length} documents`);

    if (docs.length === 0) continue;

    const transformed = docs.map(transform);

    // ordered: false → don't stop on duplicate key, useful for reruns
    try {
      await db.collection(mongoCollection).insertMany(transformed, { ordered: false });
      console.log(`  ✓ Inserted into MongoDB`);
    } catch (err) {
      if (err.code === 11000 || err.writeErrors) {
    console.log(`  ✓ Inserted new docs, skipped ${err.writeErrors?.length ?? 0} duplicates`);
  } else throw err;
    }
  }

  await mongo.client?.close?.();
  console.log("\n✅ Migration complete");
}

migrate().catch(console.error);