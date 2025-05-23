// const { MongoClient, name } = require('mongodb'); 

// // Ambil URI dari .env
// const uri = process.env.URI_DB_MONGO;
// const dbName = process.env.NAMA_DB_MONGO;

// // const uri = 'mongodb://diskominfosandi:Kominfo2018@localhost:27017';
// // const dbName = "warga_bicara"
 

// if (!uri) {
//   console.error("❌ URI MongoDB tidak ditemukan di .env (MONGO_URI)");
//   process.exit(1);
// }

// const client = new MongoClient(uri);

// // const database = client.db("warga_bicara");
// const db = client.db(dbName);
// console.log(db); 
// const a = database.getCollectionNames("users");

// buatCollections("users");

//  function buatCollections(namaCollections) {
//     // var collection = db.collection(namaCollections);
//     // collection.create().then(
//     //     () => console.log('Collections "'+namaCollections+'" berhasil dibuat'),
//     //     err => console.error('Collections "'+namaCollections+'" gagal dibuat atau sdh dibuat sebelumnya')
//     // );

//     var collection =  database.getCollectionNames(namaCollections);
//     if (collection===true) {
//         console.log("Sudah ada");
//     }else{
//         console.log("Belum ada buat baru");
//     }


// //     db.createCollection(
// //   "<viewName>",
// //   {
// //     "viewOn" : "<source>",
// //     "pipeline" : [<pipeline>],
// //     "collation" : { <collation> }
// //   }
// // )
// }


// module.exports = db;



// ===================================================================

// const { MongoClient } = require("mongodb");
// // Replace the uri string with your connection string
// // const uri = "<connection string uri>";
// // // Ambil URI dari .env
// const uri = "mongodb://diskominfosandi:Kominfo2018@localhost:27017/?authMechanism=SCRAM-SHA-1";
// // const uri = process.env.URI_DB_MONGO;
// const dbName = process.env.NAMA_DB_MONGO;
// const client = new MongoClient(uri);
// const db = client.connect(dbName)

// const db = dba.then((result) => 
//     console.log("db connect"))
// .catch((err)=> console.log(err))

// async function run() {
//   try {
//     const database = client.db(dbName);
//     const movies = database.collection('users');
//     // Queries for a movie that has a title value of 'Back to the Future'
//     const query = { nama: 'Riswan' };
//     const movie = await movies.find(query);
//     console.log(movie);
//     console.log("queryqueryqueryquery");
//   } finally {
//     await client.close();
//   }
// }
// run().catch(console.dir);

// module.exports = db;



// ===================================

require('dotenv').config();
const { MongoClient } = require('mongodb');

// const uri = process.env.URI_DB_MONGO;
// const dbName = process.env.NAMA_DB_MONGO;

const uri = "mongodb://diskominfosandi:Kominfo2018@localhost:27017/?authMechanism=SCRAM-SHA-1";
// const uri = process.env.URI_DB_MONGO;
const dbName = process.env.NAMA_DB_MONGO;

const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

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
