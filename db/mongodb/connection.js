// require('dotenv').config();
// const { MongoClient } = require('mongodb');


// const dbUsername = process.env.USERNAME_DB_MONGO
// const dbPassword = process.env.PASSWORD_DB_MONGO
// const dbHost = process.env.HOST_DB_MONGO

// // const uri = `mongodb://`+dbUsername+`:`+dbPassword+`@localhost:27017/?authMechanism=SCRAM-SHA-1`;
// // const uri = `mongodb+srv://diskominfosandi:Kominfo2018@cluster0.9zdgtpl.mongodb.net/`; 
// // const uri = `mongodb+srv://`+dbUsername+`:`+dbPassword+`@`+dbHost+``; // untuk atlas
// const uri = `mongodb://`+dbUsername+`:`+dbPassword+`@`+dbHost+``; // untuk local
 
// const dbName = process.env.NAMA_DB_MONGO;

// // const client = new MongoClient(uri, {
// //   useNewUrlParser: true,
// //   useUnifiedTopology: true,
// // });

// // const client = new MongoClient(uri);

// // let db;

// // async function connectMongo() {
// //   try {
// //     if (!db) {
// //       await client.connect();
// //       db = client.db(dbName);
// //       console.log(`✅ MongoDB connected: ${dbName}`);
// //     }
// //     return db;
// //   } catch (err) {
// //     console.error('❌ MongoDB connection error:', err);
// //     throw err;
// //   }
// // }

// // console.log("panggil " +db);


// // ===============================

// let client;
// let db;

// async function connectDB() {
//   if (db) return db; // jika sudah connect, pakai yang ada

//   client = new MongoClient(uri, {
//     useNewUrlParser: true,
//     useUnifiedTopology: true
//   });

//   await client.connect();
//   db = client.db(dbName);
//   console.log('🟢 MongoDB connected');
//   return db;
// }

// module.exports = { connectDB };



// // module.exports = {
// //   connectMongo,
// //   client,
// // };
// // ===============================>


// // require('dotenv').config();
// // const { MongoClient } = require('mongodb');

// // const dbUsername = encodeURIComponent(process.env.USERNAME_DB_MONGO);
// // const dbPassword = encodeURIComponent(process.env.PASSWORD_DB_MONGO);
// // const dbHost = process.env.HOST_DB_MONGO;
// // const dbName = process.env.NAMA_DB_MONGO;

// // // ====== AUTO DETECT URI FORMAT ======
// // let uri;

// // if (dbHost.includes('mongodb.net') || dbHost.includes('atlas')) {
// //   // ====== ATLAS FORMAT ======
// //   uri = `mongodb+srv://${dbUsername}:${dbPassword}@${dbHost}`;
// //   console.log('🌐 Using MongoDB Atlas URI format');
// // } else {
// //   // ====== LOCAL FORMAT ======
// //   uri = `mongodb://${dbUsername}:${dbPassword}@${dbHost}`;
// //   console.log('🏠 Using MongoDB Local URI format');
// // }

// // // ====== DEBUG INFO ======
// // console.log('🔍 MongoDB Config:');
// // console.log('  Host:', dbHost);
// // console.log('  Database:', dbName);
// // // console.log('  Username:', process.env.USERNAME_DB_MONGO);
// // // console.log('  Password:', '***' + process.env.PASSWORD_DB_MONGO.slice(-3));
// // console.log('  URI Type:', dbHost.includes('mongodb.net') ? 'Atlas' : 'Local');

// // let client;
// // let db;

// // async function connectDB() {
// //   if (db) return db;

// //   try {
// //     client = new MongoClient(uri);
// //     await client.connect();
// //     db = client.db(dbName);
// //     console.log('✅ MongoDB connected successfully');
// //     console.log('   Database:', dbName);
// //     return db;
// //   } catch (err) {
// //     console.error('❌ MongoDB connection error:', err.message);
// //     console.error('   Code:', err.code);
// //     console.error('   URI:', uri.replace(dbPassword, '***'));
// //     throw err;
// //   }
// // }

// // async function closeDB() {
// //   if (client) {
// //     await client.close();
// //     db = null;
// //     console.log('🔌 MongoDB connection closed');
// //   }
// // }

// // module.exports = { connectDB, closeDB };


// ======================================================== DISINI BARU

require('dotenv').config();
const { MongoClient } = require('mongodb');
const EventEmitter = require('events');

const dbUsername = process.env.USERNAME_DB_MONGO;
const dbPassword = process.env.PASSWORD_DB_MONGO;
const dbHost = process.env.HOST_DB_MONGO || 'localhost:27017';
const dbName = process.env.NAMA_DB_MONGO || 'warga_bicara';

// ====== AUTO DETECT URI FORMAT ======
let uri;

if (dbHost.includes('mongodb.net') || dbHost.includes('atlas')) {
  uri = `mongodb+srv://${dbUsername}:${dbPassword}@${dbHost}`;
  console.log('🌐 Using MongoDB Atlas URI format');
} else if (dbUsername && dbPassword) {
  uri = `mongodb://${dbUsername}:${dbPassword}@${dbHost}`;
  console.log('🏠 Using MongoDB Local Authenticated URI format');
} else {
  uri = `mongodb://${dbHost}`;
  console.log('🏠 Using MongoDB Local Direct URI format');
}

let client;
let db;
let isConnecting = false;
let connectionRetries = 0;
let lastHealthCheckTime = null;
let isHealthy = false;

const MAX_RETRIES = 5;
const RETRY_DELAY = 2000;
const HEALTH_CHECK_INTERVAL = 30000; // 30 detik
const HEALTH_CHECK_TIMEOUT = 5000; // 5 detik

// ====== EVENT EMITTER UNTUK MONITORING ======
class ConnectionManager extends EventEmitter {}
const connManager = new ConnectionManager();

// ====== HEALTH CHECK FUNCTION ======
async function checkHealth() {
  if (!db) {
    isHealthy = false;
    return false;
  }

  try {
    // ====== PING DATABASE ======
    await Promise.race([
      db.admin().ping(),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Health check timeout')), HEALTH_CHECK_TIMEOUT)
      )
    ]);
    
    lastHealthCheckTime = new Date();
    isHealthy = true;
    connManager.emit('healthy');
    return true;
  } catch (err) {
    console.warn('⚠️ Health check failed:', err.message);
    isHealthy = false;
    connManager.emit('unhealthy', err);
    return false;
  }
}

// ====== MAIN CONNECTION FUNCTION ======
async function connectDB() {
  // ====== JIK A SUDAH CONNECT, COBA HEALTH CHECK DULU ======
  if (db && isHealthy) {
    return db;
  }

  if (db && !isHealthy) {
    console.warn('⚠️ Connection health degraded, running health check...');
    const isOk = await checkHealth();
    if (isOk) return db;
    
    // ====== JIKA HEALTH CHECK GAGAL, DISCONNECT ======
    console.warn('⚠️ Health check failed, attempting reconnection...');
    db = null;
    client = null;
  }

  // ====== PREVENT MULTIPLE CONCURRENT CONNECTIONS ======
  if (isConnecting) {
    console.log('⏳ Connection in progress, waiting...');
    let waitRetries = 0;
    while (isConnecting && waitRetries < 50) {
      await new Promise(resolve => setTimeout(resolve, 100));
      waitRetries++;
    }
    if (db && isHealthy) return db;
  }

  isConnecting = true;

  try {
    console.log(`📡 Connecting to MongoDB... (Attempt: ${connectionRetries + 1}/${MAX_RETRIES})`);
    console.log(`   Host: ${dbHost}`);
    console.log(`   Database: ${dbName}`);

    // ====== CLEANUP OLD CONNECTION ======
    if (client) {
      try {
        await client.close();
      } catch (e) {
        // ignore
      }
    }

    // ====== CREATE NEW CONNECTION ======
    client = new MongoClient(uri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      // ====== CONNECTION POOL SETTINGS - OPTIMIZED UNTUK 24/7 ======
      maxPoolSize: 50,                   // ✅ Max 50 concurrent connections
      minPoolSize: 5,                    // ✅ Keep 5 connections alive
      maxIdleTimeMS: 45000,              // ✅ Close idle after 45s
      socketTimeoutMS: 30000,            // ✅ Socket timeout 30s
      serverSelectionTimeoutMS: 5000,    // ✅ Server selection 5s
      connectTimeoutMS: 10000,           // ✅ Connection timeout 10s
      retryWrites: true,                 // ✅ Retry writes
      retryReads: true,                  // ✅ Retry reads
      waitQueueTimeoutMS: 10000,         // ✅ Wait queue 10s
      heartbeatFrequencyMS: 10000,       // ✅ Heartbeat every 10s
      monitorCommands: false,            // ✅ Reduce logging
    });

    // ====== SETUP LISTENERS ======
    client.on('error', (err) => {
      console.error('❌ Client error:', err.message);
      isHealthy = false;
      connManager.emit('client_error', err);
    });

    client.on('close', () => {
      console.warn('⚠️ Client connection closed');
      db = null;
      isHealthy = false;
      connManager.emit('client_closed');
    });

    // ====== CONNECT ======
    await client.connect();
    db = client.db(dbName);

    // ====== VERIFY CONNECTION ======
    await checkHealth();

    connectionRetries = 0;
    isConnecting = false;
    
    console.log('✅ MongoDB connected successfully');
    console.log('   Database:', dbName);
    console.log('   Host:', dbHost);
    console.log('   Pool Size: Min=5, Max=50');
    console.log('   Health Check Interval: 30s');
    
    connManager.emit('connected');
    return db;

  } catch (err) {
    isConnecting = false;
    isHealthy = false;
    db = null;
    
    console.error('❌ MongoDB connection error:', err.message);
    console.error('   Code:', err.code);
    console.error('   Attempt:', connectionRetries + 1);

    connManager.emit('connection_error', err);

    // ====== AUTO RECONNECT WITH EXPONENTIAL BACKOFF ======
    if (connectionRetries < MAX_RETRIES) {
      connectionRetries++;
      const delayMs = RETRY_DELAY * Math.pow(2, connectionRetries - 1); // exponential backoff
      console.log(`⏰ Retrying in ${delayMs / 1000}s...`);
      
      await new Promise(resolve => setTimeout(resolve, delayMs));
      return connectDB(); // ✅ Recursive reconnect
    } else {
      console.error('❌ Max retries reached. Connection failed.');
      connectionRetries = 0;
      connManager.emit('max_retries_reached');
      throw new Error('Failed to connect to MongoDB after multiple retries');
    }
  }
}

// ====== CLOSE CONNECTION GRACEFULLY ======
async function closeDB() {
  if (client) {
    try {
      await client.close();
      db = null;
      isHealthy = false;
      console.log('🔌 MongoDB connection closed gracefully');
      connManager.emit('closed');
    } catch (err) {
      console.error('❌ Error closing connection:', err.message);
    }
  }
}

// ====== GET CONNECTION STATUS ======
function getConnectionStatus() {
  return {
    isConnected: db !== null,
    isHealthy: isHealthy,
    isConnecting: isConnecting,
    retryCount: connectionRetries,
    lastHealthCheck: lastHealthCheckTime,
    poolSize: {
      min: 5,
      max: 50
    }
  };
}

// ====== MONITOR CONNECTION HEALTH EVERY 30 SECONDS ======
const healthCheckInterval = setInterval(async () => {
  if (db) {
    const isOk = await checkHealth();
    if (!isOk && !isConnecting) {
      console.warn('⚠️ Health check failed, reconnecting...');
      db = null;
      client = null;
      await connectDB();
    }
  }
}, HEALTH_CHECK_INTERVAL);

// ====== GRACEFUL SHUTDOWN ======
process.on('SIGINT', async () => {
  console.log('\n🛑 Shutting down gracefully (SIGINT)...');
  clearInterval(healthCheckInterval);
  await closeDB();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n🛑 Shutting down gracefully (SIGTERM)...');
  clearInterval(healthCheckInterval);
  await closeDB();
  process.exit(0);
});

// ====== HANDLE UNCAUGHT ERRORS ======
process.on('uncaughtException', async (err) => {
  console.error('❌ Uncaught Exception:', err);
  await closeDB();
  process.exit(1);
});

module.exports = { 
  connectDB, 
  closeDB, 
  getConnectionStatus,
  connManager // ✅ Export event emitter untuk monitoring
};
