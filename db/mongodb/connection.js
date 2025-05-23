require('dotenv').config();
const { MongoClient } = require('mongodb');

const dbUsername = process.env.USERNAME_DB_MONGO
const dbPassword = process.env.PASSWORD_DB_MONGO
const dbHost = process.env.HOST_DB_MONGO

// const uri = `mongodb://`+dbUsername+`:`+dbPassword+`@localhost:27017/?authMechanism=SCRAM-SHA-1`;
// const uri = `mongodb+srv://diskominfosandi:Kominfo2018@cluster0.9zdgtpl.mongodb.net/`; 
const uri = `mongodb+srv://`+dbUsername+`:`+dbPassword+`@`+dbHost+``;
// const uri = `mongodb://`+dbUsername+`:`+dbPassword+`@`+dbHost+``; 
 
const dbName = process.env.NAMA_DB_MONGO;

// const client = new MongoClient(uri, {
//   useNewUrlParser: true,
//   useUnifiedTopology: true,
// });

const client = new MongoClient(uri);

let db;

async function connectMongo() {
  try {
    if (!db) {
      await client.connect();
      db = client.db(dbName);
      console.log(`✅ MongoDB connected: ${dbName}`);
    }
    return db;
  } catch (err) {
    console.error('❌ MongoDB connection error:', err);
    throw err;
  }
}

module.exports = {
  connectMongo,
  client,
};
