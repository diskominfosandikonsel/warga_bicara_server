require('dotenv').config();
const { MongoClient } = require('mongodb');


const dbUsername = process.env.USERNAME_DB_MONGO
const dbPassword = process.env.PASSWORD_DB_MONGO
const dbHost = process.env.HOST_DB_MONGO

// const uri = `mongodb://`+dbUsername+`:`+dbPassword+`@localhost:27017/?authMechanism=SCRAM-SHA-1`;
// const uri = `mongodb+srv://diskominfosandi:Kominfo2018@cluster0.9zdgtpl.mongodb.net/`; 
const uri = `mongodb+srv://`+dbUsername+`:`+dbPassword+`@`+dbHost+``; // untuk atlas
// const uri = `mongodb://`+dbUsername+`:`+dbPassword+`@`+dbHost+``; // untuk local
 
const dbName = process.env.NAMA_DB_MONGO;

// const client = new MongoClient(uri, {
//   useNewUrlParser: true,
//   useUnifiedTopology: true,
// });

// const client = new MongoClient(uri);

// let db;

// async function connectMongo() {
//   try {
//     if (!db) {
//       await client.connect();
//       db = client.db(dbName);
//       console.log(`✅ MongoDB connected: ${dbName}`);
//     }
//     return db;
//   } catch (err) {
//     console.error('❌ MongoDB connection error:', err);
//     throw err;
//   }
// }

// console.log("panggil " +db);


// ===============================

let client;
let db;

async function connectDB() {
  if (db) return db; // jika sudah connect, pakai yang ada

  client = new MongoClient(uri, {
    useNewUrlParser: true,
    useUnifiedTopology: true
  });

  await client.connect();
  db = client.db(dbName);
  console.log('🟢 MongoDB connected');
  return db;
}

module.exports = { connectDB };



// module.exports = {
//   connectMongo,
//   client,
// };
// ===============================>


// require('dotenv').config();
// const { MongoClient } = require('mongodb');

// const dbUsername = encodeURIComponent(process.env.USERNAME_DB_MONGO);
// const dbPassword = encodeURIComponent(process.env.PASSWORD_DB_MONGO);
// const dbHost = process.env.HOST_DB_MONGO;
// const dbName = process.env.NAMA_DB_MONGO;

// // ====== AUTO DETECT URI FORMAT ======
// let uri;

// if (dbHost.includes('mongodb.net') || dbHost.includes('atlas')) {
//   // ====== ATLAS FORMAT ======
//   uri = `mongodb+srv://${dbUsername}:${dbPassword}@${dbHost}`;
//   console.log('🌐 Using MongoDB Atlas URI format');
// } else {
//   // ====== LOCAL FORMAT ======
//   uri = `mongodb://${dbUsername}:${dbPassword}@${dbHost}`;
//   console.log('🏠 Using MongoDB Local URI format');
// }

// // ====== DEBUG INFO ======
// console.log('🔍 MongoDB Config:');
// console.log('  Host:', dbHost);
// console.log('  Database:', dbName);
// // console.log('  Username:', process.env.USERNAME_DB_MONGO);
// // console.log('  Password:', '***' + process.env.PASSWORD_DB_MONGO.slice(-3));
// console.log('  URI Type:', dbHost.includes('mongodb.net') ? 'Atlas' : 'Local');

// let client;
// let db;

// async function connectDB() {
//   if (db) return db;

//   try {
//     client = new MongoClient(uri);
//     await client.connect();
//     db = client.db(dbName);
//     console.log('✅ MongoDB connected successfully');
//     console.log('   Database:', dbName);
//     return db;
//   } catch (err) {
//     console.error('❌ MongoDB connection error:', err.message);
//     console.error('   Code:', err.code);
//     console.error('   URI:', uri.replace(dbPassword, '***'));
//     throw err;
//   }
// }

// async function closeDB() {
//   if (client) {
//     await client.close();
//     db = null;
//     console.log('🔌 MongoDB connection closed');
//   }
// }

// module.exports = { connectDB, closeDB };