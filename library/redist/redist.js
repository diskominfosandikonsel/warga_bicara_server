const { createClient } = require('redis');

const redisClient =  () => {
    return new Promise((resolve, reject) => {
    const client =  createClient({url: "redis://diskominfosandi:kominfo2018@awesome.redis.server:6380"})
      .on("error", (err) => console.log("Redis Client Error", err))
      .connect();

      resolve(client)
    
    //  client.set("key", "value");
    // const value =  client.get("key");
    // client.destroy();
        
    })

}

module.exports = {redisClient:redisClient};
