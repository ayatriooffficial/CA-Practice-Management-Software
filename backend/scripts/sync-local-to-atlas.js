require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });

const dns = require('dns');
// Use reliable public DNS resolvers to handle SRV records on Windows without ECONNREFUSED
dns.setServers(['8.8.8.8', '1.1.1.1']);

const { MongoClient } = require('mongodb');

const LOCAL_URI = process.env.LOCAL_MONGODB_URI || 'mongodb://127.0.0.1:27017/ayatrio_crm';
const ATLAS_URI = process.env.ATLAS_MONGODB_URI || (process.env.MONGODB_URI?.startsWith('mongodb+srv://') ? process.env.MONGODB_URI : null);

if (!ATLAS_URI) {
  console.error('❌ Error: Missing Atlas connection URI. Please define ATLAS_MONGODB_URI or MONGODB_URI in your backend/.env file.');
  process.exit(1);
}

async function syncDatabases() {
  console.log('🔄 Starting Local to Atlas MongoDB Sync...\n');
  console.log(`📍 Local Source: ${LOCAL_URI}`);
  console.log(`☁️  Atlas Target: ${ATLAS_URI.replace(/:([^@]+)@/, ':****@')}\n`);

  const localClient = new MongoClient(LOCAL_URI);
  const atlasClient = new MongoClient(ATLAS_URI, { serverSelectionTimeoutMS: 15000 });

  try {
    console.log('Connecting to Local MongoDB...');
    await localClient.connect();
    console.log('✅ Local MongoDB connected.');

    console.log('Connecting to MongoDB Atlas...');
    await atlasClient.connect();
    console.log('✅ MongoDB Atlas connected.\n');

    const localDb = localClient.db();
    const atlasDb = atlasClient.db();

    const localCollections = await localDb.listCollections().toArray();
    console.log(`Found ${localCollections.length} collections in local database.\n`);

    const summary = [];

    for (const colInfo of localCollections) {
      const colName = colInfo.name;
      // Skip system collections
      if (colName.startsWith('system.')) continue;

      const localCol = localDb.collection(colName);
      const atlasCol = atlasDb.collection(colName);

      const localDocs = await localCol.find({}).toArray();
      const localCount = localDocs.length;

      if (localCount === 0) {
        // Ensure collection exists on Atlas
        const atlasCount = await atlasCol.countDocuments();
        summary.push({
          collection: colName,
          localCount: 0,
          atlasCount,
          status: 'Empty (Skipped)',
        });
        continue;
      }

      // Prepare bulk upsert operations
      const operations = localDocs.map((doc) => ({
        replaceOne: {
          filter: { _id: doc._id },
          replacement: doc,
          upsert: true,
        },
      }));

      // Execute bulkWrite in batches of 500
      const batchSize = 500;
      let upsertedOrModified = 0;

      for (let i = 0; i < operations.length; i += batchSize) {
        const batch = operations.slice(i, i + batchSize);
        const result = await atlasCol.bulkWrite(batch, { ordered: false });
        upsertedOrModified += (result.upsertedCount || 0) + (result.modifiedCount || 0) + (result.matchedCount || 0);
      }

      // Sync custom indexes
      try {
        const localIndexes = await localCol.indexes();
        for (const idx of localIndexes) {
          if (idx.name === '_id_') continue;
          const { key, name, unique, sparse, expireAfterSeconds } = idx;
          const options = { name };
          if (unique) options.unique = true;
          if (sparse) options.sparse = true;
          if (expireAfterSeconds !== undefined) options.expireAfterSeconds = expireAfterSeconds;

          try {
            await atlasCol.createIndex(key, options);
          } catch {
            // Ignore if index already exists with slightly different options
          }
        }
      } catch (err) {
        console.warn(`Could not sync indexes for ${colName}:`, err.message);
      }

      const atlasCount = await atlasCol.countDocuments();
      summary.push({
        collection: colName,
        localCount,
        atlasCount,
        status: localCount === atlasCount ? 'Synced ✅' : 'Count Mismatch ⚠️',
      });

      console.log(`✓ [${colName}] Synced ${localCount} documents.`);
    }

    console.log('\n=================== SYNC SUMMARY ===================');
    console.table(summary);
    console.log('====================================================\n');
    console.log('🎉 MongoDB sync from local to Atlas completed successfully!');

  } catch (err) {
    console.error('❌ Sync failed with error:', err);
    process.exitCode = 1;
  } finally {
    await localClient.close();
    await atlasClient.close();
  }
}

syncDatabases();
