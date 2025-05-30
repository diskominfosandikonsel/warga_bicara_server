// Membuat verifikasi token yang dikirimkan melalui headers client

const jwt = require('jsonwebtoken');
const { connectRedis, redisClient } = require('../library/redist/redist');

function checkTokenSeetUser(req, res, next){
     const authHeader = req.get('authorization');
     // console.log("authHeader");
     // console.log(authHeader);
     
     if (authHeader) {
          // jika ada authorization yang dikirim client melalui headers
          // dan karena token yang dikirim dipisahkan spasi maka kita pisahkan bagiannya
          const token = authHeader.split(' ')[1];
          // console.log("token");
          // console.log(token);
          
          if (token) {
               // jika tokennya ada
               // maka lakukan verifikasi terhadap token tersebut
               jwt.verify(token, process.env.TOKEN_SECRET, async function(error, user) {
                    if (error) {
                         console.log(error);
                    }
                    
                    console.log(token); 
                    // cek apakah token ini di blacklist atau tidak
                    const isBlacklisted = await redisClient.exists(`blacklist:${token}`);

                    if (isBlacklisted){
                         // console.log("isBlacklisted" );
                         // console.log(isBlacklisted );
                         next()
                         // return res.status(403).json({ message: 'Token telah diblacklist' });
                    }else{
                         console.log("tidak di blacklist" );

                         // Cek whitelist
                         const isWhitelisted = await redisClient.exists(`whitelist:${token}`);
                         if (!isWhitelisted){
                              // Jika tidak ada di whitelist
                              next()
                              
                         }else{

                              if (isBlacklisted === 1) {
                                   console.log("token anda di diblacklist");
                                   return res.status(403).json({ message: 'token anda di diblacklist' });
                              }  

                              // console.log('berhasil');
                              // console.log("isWhitelisted" );
                              // console.log(isWhitelisted );
                              req.user = user;
                              next()
     
                         }
                    }
                    
         


                    // if (hasilredisJson.token === token) {
                    //      console.log('sama');
                    //      console.log("hasilredis");
                    //      console.log("Lanjutkan proses midleware");
                    //      console.log(hasilredisJson.token);
                         
                    // }else{
                    //      console.log('Tidak sama');
                    //      console.log('Cek di blaklist');
                    //      console.log(hasilredisJson.token);
                         
                    // }


                    
                    // Jika tidak ada error selanjutnya token di dapatkan
                    // akan di terjemakan ke identitas user clien

               });
          }else{
               next();
          }

     }else{

          next();
     }
} 

function isLoggedIn(req, res, next){
     if (req.user) {
          // jika login maka lanjutkan ke tahap berikutnya
          next();
     }else {
          // kalau tidak login berikan respon error
          const error = new Error('Tidak ter-Authorisasi');
          res.status(401);
          next(error);
     }
}

module.exports = {
     checkTokenSeetUser,
     isLoggedIn, 
}