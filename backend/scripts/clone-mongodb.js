/**
 * Universal MongoDB Collection Cloner / Sync Tool
 * Clones all collections, documents, and indexes between any two MongoDB databases
 * (Remote Atlas -> Local, Local -> Remote Atlas, or arbitrary URIs).
 *
 * Usage:
 *   node scripts/clone-mongodb.js [--from <uri>] [--to <uri>] [--direction <atlas-to-local|local-to-atlas>]
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const dns = require('dns');
try {
  dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch {}

const { MongoClient } = require('mongodb');

const LOCAL_URI = process.env.LOCAL_MONGODB_URI || 'mongodb://127.0.0.1:27017/ayatrio_crm';
const ATLAS_URI = process.env.ATLAS_MONGODB_URI || (process.env.MONGODB_URI?.startsWith('mongodb+srv://') ? process.env.MONGODB_URI : null);

// Parse CLI args
const args = process.argv.slice(2);
let fromUri = null;
let toUri = null;
let direction = 'atlas-to-local'; // default if both available

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--from' && args[i + 1]) fromUri = args[++i];
  if (args[i] === '--to' && args[i + 1]) toUri = args[++i];
  if (args[i] === '--direction' && args[i + 1]) direction = args[++i];
}

if (!fromUri || !toUri) {
  if (direction === 'local-to-atlas') {
    fromUri = LOCAL_URI;
    toUri = ATLAS_URI;
  } else {
    fromUri = ATLAS_URI || LOCAL_URI;
    toUri = LOCAL_URI;
  }
}

if (!fromUri || !toUri) {
  console.error('❌ Missing MongoDB connection URIs.');
  console.error('Specify --from <uri> and --to <uri>, or set MONGODB_URI and LOCAL_MONGODB_URI in backend/.env.');
  process.exit(1);
}

if (fromUri === toUri) {
  console.log('ℹ️ Source and Target URIs are the same. Nothing to clone.');
  process.exit(0);
}

async function cloneCollections() {
  console.log('================================================================');
  console.log('🚀 Ayatrio CRM Universal MongoDB Cloner');
  console.log('================================================================');
  console.log(`📍 Source: ${fromUri.replace(/:([^@]+)@/, ':****@')}`);
  console.log(`🎯 Target: ${toUri.replace(/:([^@]+)@/, ':****@')}`);
  console.log('================================================================\n');

  const sourceClient = new MongoClient(fromUri, { serverSelectionTimeoutMS: 15000 });
  const targetClient = new MongoClient(toUri, { serverSelectionTimeoutMS: 15000 });

  try {
    console.log('Connecting to Source MongoDB...');
    await sourceClient.connect();
    console.log('✅ Source MongoDB connected.');

    console.log('Connecting to Target MongoDB...');
    await targetClient.connect();
    console.log('✅ Target MongoDB connected.\n');

    const sourceDb = sourceClient.db();
    const targetDb = targetClient.db();

    const collections = await sourceDb.listCollections().toArray();
    console.log(`Found ${collections.length} collections in source database.\n`);

    const summary = [];

    for (const colInfo of collections) {
      const colName = colInfo.name;
      if (colName.startsWith('system.')) continue;

      const sourceCol = sourceDb.collection(colName);
      const targetCol = targetDb.collection(colName);

      const sourceDocs = await sourceCol.find({}).toArray();
      const sourceCount = sourceDocs.length;

      if (sourceCount === 0) {
        summary.push({
          collection: colName,
          sourceCount: 0,
          targetCount: await targetCol.countDocuments(),
          status: 'Empty (Skipped)',
        });
        continue;
      }

      // Upsert in batches of 500
      const operations = sourceDocs.map((doc) => ({
        replaceOne: {
          filter: { _id: doc._id },
          replacement: doc,
          upsert: true,
        },
      }));

      const batchSize = 500;
      let upsertedCount = 0;
      for (let i = 0; i < operations.length; i += batchSize) {
        const batch = operations.slice(i, i + batchSize);
        const result = await targetCol.bulkWrite(batch, { ordered: false });
        upsertedCount += (result.upsertedCount || 0) + (result.modifiedCount || 0) + (result.matchedCount || 0);
      }

      // Copy indexes
      try {
        const sourceIndexes = await sourceCol.indexes();
        for (const idx of sourceIndexes) {
          if (idx.name === '_id_') continue;
          const { key, name, unique, sparse, expireAfterSeconds } = idx;
          const opts = { name };
          if (unique) opts.unique = true;
          if (sparse) opts.sparse = true;
          if (expireAfterSeconds !== undefined) opts.expireAfterSeconds = expireAfterSeconds;
          try {
            await targetCol.createIndex(key, opts);
          } catch {}
        }
      } catch (idxErr) {
        console.warn(`Could not sync indexes for ${colName}:`, idxErr.message);
      }

      const targetCount = await targetCol.countDocuments();
      summary.push({
        collection: colName,
        sourceCount,
        targetCount,
        status: sourceCount === targetCount ? 'Synced ✅' : 'Count Mismatch ⚠️',
      });
      console.log(`✓ [${colName}] Synced ${sourceCount} documents.`);
    }

    console.log('\n=================== CLONE SUMMARY ===================');
    console.table(summary);
    console.log('=====================================================\n');
    console.log('🎉 MongoDB cloning completed successfully!');
  } catch (err) {
    console.error('❌ Cloning failed:', err);
    process.exitCode = 1;
  } finally {
    await sourceClient.close();
    await targetClient.close();
  }
}

cloneCollections();
