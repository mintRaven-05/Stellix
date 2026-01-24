
const { Client, Databases, Permission, Role } = require('node-appwrite');
require('dotenv').config();

const client = new Client()
  .setEndpoint(process.env.APPWRITE_ENDPOINT || 'https://cloud.appwrite.io/v1')
  .setProject(process.env.APPWRITE_PROJECT_ID)
  .setKey(process.env.APPWRITE_API_KEY);

const databases = new Databases(client);

const DATABASE_ID = '696fcc4f0028e9c4a222';
const COLLECTION_ID = 'escrow_metadata';

async function createEscrowCollection() {
  try {
    console.log('Creating Escrow Metadata collection...');
    
    // Step 1: Create collection
    const collection = await databases.createCollection(
      DATABASE_ID,
      COLLECTION_ID,
      'Escrow Metadata',
      [
        Permission.read(Role.any()),
        Permission.create(Role.any()),
        Permission.update(Role.any()),
        Permission.delete(Role.any())
      ]
    );

    console.log('✅ Collection created:', collection.$id);
    console.log('Waiting 2 seconds before creating attributes...');
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Step 2: Create attributes
    console.log('Creating attributes...');

    await databases.createStringAttribute(
      DATABASE_ID,
      COLLECTION_ID,
      'payment_id',
      255,
      true
    );
    console.log('✅ Created: payment_id');
    await new Promise(resolve => setTimeout(resolve, 1000));

    await databases.createStringAttribute(
      DATABASE_ID,
      COLLECTION_ID,
      'sender',
      255,
      true
    );
    console.log('✅ Created: sender');
    await new Promise(resolve => setTimeout(resolve, 1000));

    await databases.createStringAttribute(
      DATABASE_ID,
      COLLECTION_ID,
      'receiver',
      255,
      true
    );
    console.log('✅ Created: receiver');
    await new Promise(resolve => setTimeout(resolve, 1000));

    await databases.createStringAttribute(
      DATABASE_ID,
      COLLECTION_ID,
      'asset_code',
      12,
      true
    );
    console.log('✅ Created: asset_code');
    await new Promise(resolve => setTimeout(resolve, 1000));

    await databases.createStringAttribute(
      DATABASE_ID,
      COLLECTION_ID,
      'asset_issuer',
      255,
      false
    );
    console.log('✅ Created: asset_issuer');
    await new Promise(resolve => setTimeout(resolve, 1000));

    await databases.createStringAttribute(
      DATABASE_ID,
      COLLECTION_ID,
      'amount',
      50,
      true
    );
    console.log('✅ Created: amount');
    await new Promise(resolve => setTimeout(resolve, 1000));

    await databases.createStringAttribute(
      DATABASE_ID,
      COLLECTION_ID,
      'token_contract',
      255,
      true
    );
    console.log('✅ Created: token_contract');
    await new Promise(resolve => setTimeout(resolve, 1000));

    await databases.createStringAttribute(
      DATABASE_ID,
      COLLECTION_ID,
      'transaction_hash',
      255,
      true
    );
    console.log('✅ Created: transaction_hash');
    await new Promise(resolve => setTimeout(resolve, 1000));

    await databases.createDatetimeAttribute(
      DATABASE_ID,
      COLLECTION_ID,
      'created_at',
      true
    );
    console.log('✅ Created: created_at');
    await new Promise(resolve => setTimeout(resolve, 1000));

    await databases.createStringAttribute(
      DATABASE_ID,
      COLLECTION_ID,
      'status',
      50,
      true
    );
    console.log('✅ Created: status');
    
    console.log('\n✅ All attributes created successfully!');
    console.log('Waiting 3 seconds before creating indexes...');
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Step 3: Create indexes
    console.log('\nCreating indexes...');

    await databases.createIndex(
      DATABASE_ID,
      COLLECTION_ID,
      'payment_id_idx',
      'key',
      ['payment_id'],
      ['ASC']
    );
    console.log('✅ Created index: payment_id_idx');
    await new Promise(resolve => setTimeout(resolve, 1000));

    await databases.createIndex(
      DATABASE_ID,
      COLLECTION_ID,
      'receiver_idx',
      'key',
      ['receiver'],
      ['ASC']
    );
    console.log('✅ Created index: receiver_idx');
    await new Promise(resolve => setTimeout(resolve, 1000));

    await databases.createIndex(
      DATABASE_ID,
      COLLECTION_ID,
      'status_idx',
      'key',
      ['status'],
      ['ASC']
    );
    console.log('✅ Created index: status_idx');

    console.log('\n========================================');
    console.log('✅ SUCCESS! Escrow Metadata collection is ready!');
    console.log('========================================');
    console.log('Collection ID:', COLLECTION_ID);
    console.log('Database ID:', DATABASE_ID);
    console.log('\nYou can now use Protected Pay with auto-swap!');

  } catch (error) {
    console.error('\n❌ Error creating collection:', error.message);
    
    if (error.code === 409) {
      console.log('\n⚠️  Collection already exists!');
      console.log('If you want to recreate it, delete it first from Appwrite console.');
    } else if (error.code === 401) {
      console.log('\n⚠️  Authentication failed!');
      console.log('Check your APPWRITE_API_KEY in .env file');
    } else {
      console.log('\nFull error:', error);
    }
  }
}

// Run the script
console.log('========================================');
console.log('Appwrite Escrow Collection Setup');
console.log('========================================');
console.log('Database ID:', DATABASE_ID);
console.log('Collection ID:', COLLECTION_ID);
console.log('========================================\n');

createEscrowCollection();
