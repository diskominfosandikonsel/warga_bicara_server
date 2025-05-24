const { connectDB } = require('./connection');

async function getCollection(name) {
  const db = await connectDB();
  const namaCollection = await db.collection(name);
  console.log("connect ke Collection => " +name);
  
  return namaCollection;
}

module.exports = { getCollection };
