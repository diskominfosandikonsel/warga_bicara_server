const redis = require('redis');
const { MongoClient, ObjectId } = require('mongodb');
const {getCollection} = require('../../db/mongodb/controller')
const { connectRedis, redisClient } = require('./redist');

// Buat client subscriber Redis
// const subscriber = redis.createClient();
// const mongoClient = new MongoClient('mongodb://localhost:27017');
// const dbName = 'namadb'; // Ganti sesuai nama database kamu

async function startRedisListener() {

const subscriber = redisClient.duplicate(); // penting: gunakan duplicate()

  await subscriber.connect();
//   await mongoClient.connect();

//   const db = mongoClient.db(dbName);
    const users = await getCollection('users')
//   const users = db.collection('users');

  await subscriber.configSet('notify-keyspace-events', 'Ex');

  await subscriber.pSubscribe('__keyevent@0__:expired', async (message) => {
    console.log(`🔔 Key expired: ${message}`);

    if (message.startsWith('blacklist-user:')) {
      const userId = message.split(':')[1];
    //   console.log(userId);
      
      await users.updateOne(
        { id: userId },
        { $set: { is_active: true, waktuBlacklist: '' } }
      );

      console.log(`✅ User ${userId} diaktifkan kembali`);
    }
  });

  console.log('👂 Redis listener aktif');

}

// startRedisListener().catch(console.error);


module.exports = startRedisListener;
