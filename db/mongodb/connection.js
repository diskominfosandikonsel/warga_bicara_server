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

