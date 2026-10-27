require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });

const dns = require('dns');
dns.setServers(['8.8.8.8', '1.1.1.1']);

const { MongoClient } = require('mongodb');

const ATLAS_URI = process.env.ATLAS_MONGODB_URI || (process.env.MONGODB_URI?.startsWith('mongodb+srv://') ? process.env.MONGODB_URI : null);

if (!ATLAS_URI) {
  console.error('❌ Missing Atlas URI in backend/.env');
  process.exit(1);
}

// Map of collection -> array of index names to drop
const INDEXES_TO_DROP = {
  portalsyncstates: ['clientId_1'],
  agentcenteragents: ['module_1', 'orgId_1'],
  leads: ['mobile_1', 'email_1', 'pan_1', 'status_1'],
  trusteddevices: ['email_1'],
  financialinvoices: ['orgId_1'],
  financialtimeentries: ['orgId_1'],
  officenotices: ['firmId_1'],
  tasks: [
    'assigneeName_1',
    'status_1',
    'subTasks.taskId_1',
    'subTasks.serviceId_1',
    'checklist.taskId_1',
    'checklist.serviceId_1',
    'documentRequests.taskId_1',
    'documentRequests.serviceId_1',
  ],
  leaves: ['firmId_1'],
  notices: ['clientId_1', 'portal_1'],
  complianceentries: ['itemId_1'],
  quotations: ['status_1', 'leadId_1'],
  attendance: ['firmId_1', 'userId_1'],
  complianceitems: ['clientId_1'],
  taskexpenses: ['orgId_1'],
  users: ['orgId_1'],
  employmentrequests: ['status_1'],
  services: [
    'category_1',
    'isRecurring_1',
    'subTasks.taskId_1',
    'subTasks.serviceId_1',
    'checklist.taskId_1',
    'checklist.serviceId_1',
    'documentRequests.taskId_1',
    'documentRequests.serviceId_1',
    'status_1',
  ],
  holidays: ['firmId_1'],
  agentcenterruns: ['agentId_1', 'orgId_1'],
  documents: ['category_1', 'clientId_1'],
};

async function dropUnnecessaryIndexes() {
  const client = new MongoClient(ATLAS_URI, { serverSelectionTimeoutMS: 20000 });
  try {
    console.log('Connecting to MongoDB Atlas...');
    await client.connect();
    console.log('✅ Connected to MongoDB Atlas\n');

    const db = client.db('ayatrio_crm');
    let totalDropped = 0;
    let totalSkipped = 0;

    for (const [colName, indexNames] of Object.entries(INDEXES_TO_DROP)) {
      const collection = db.collection(colName);
      let existingIndexes = [];
      try {
        existingIndexes = await collection.indexes();
      } catch (err) {
        console.warn(`⚠️ Collection "${colName}" not found or error reading indexes:`, err.message);
        continue;
      }

      const existingNames = new Set(existingIndexes.map((i) => i.name));

      for (const idxName of indexNames) {
        if (!existingNames.has(idxName)) {
          console.log(`⏩ [${colName}] Index "${idxName}" does not exist (already dropped).`);
          totalSkipped++;
          continue;
        }

        try {
          await collection.dropIndex(idxName);
          console.log(`🗑️  [${colName}] Successfully dropped index "${idxName}".`);
          totalDropped++;
        } catch (err) {
          console.error(`❌ [${colName}] Failed to drop index "${idxName}":`, err.message);
        }
      }
    }

    console.log(`\n========================================`);
    console.log(`🎉 Cleanup Complete!`);
    console.log(`Dropped: ${totalDropped} indexes`);
    console.log(`Skipped / Not present: ${totalSkipped} indexes`);
    console.log(`========================================\n`);
  } catch (err) {
    console.error('Fatal error during index cleanup:', err);
  } finally {
    await client.close();
  }
}

dropUnnecessaryIndexes();
