// Membuat verifikasi token yang dikirimkan melalui headers client

const jwt = require('jsonwebtoken');
const { connectRedis, redisClient } = require('../library/redist/redist');
const {getCollection} = require('../db/mongodb/controller')


// function checkTokenSeetUser(req, res, next){
//      const authHeader = req.get('authorization');
//      // console.log("authHeader");
//      // console.log(authHeader);
     
//      if (authHeader) {
//           // jika ada authorization yang dikirim client melalui headers
//           // dan karena token yang dikirim dipisahkan spasi maka kita pisahkan bagiannya
//           const token = authHeader.split(' ')[1];
//           // console.log("token");
//           // console.log(token);
          
//           if (token) {
//                // jika tokennya ada
//                // maka lakukan verifikasi terhadap token tersebut
//                jwt.verify(token, process.env.TOKEN_SECRET, async function(error, user) {
//                     if (error) {
//                          console.log(error);
//                     }
                    
//                     console.log(token); 
//                     // cek apakah token ini di blacklist atau tidak
//                     const isBlacklisted = await redisClient.exists(`blacklist:${token}`);

//                     if (isBlacklisted){
//                          // console.log("isBlacklisted" );
//                          // console.log(isBlacklisted );
//                          next()
//                          // return res.status(403).json({ message: 'Token telah diblacklist' });
//                     }else{
//                          console.log("tidak di blacklist ABC" );

//                          // Cek whitelist
//                          const isWhitelisted = await redisClient.exists(`whitelist:${token}`);
//                          if (!isWhitelisted){
//                               // Jika tidak ada di whitelist
//                               next()
                              
//                          }else{

//                               if (isBlacklisted === 1) {
//                                    console.log("token anda di diblacklist");
//                                    return res.status(403).json({ message: 'token anda di diblacklist' });
//                               }  

//                               // console.log('berhasil');
//                               // console.log("isWhitelisted" );
//                               // console.log(isWhitelisted );
//                               req.user = user;
//                               next()
     
//                          }
 
//                     }
                    
         


//                     // if (hasilredisJson.token === token) {
//                     //      console.log('sama');
//                     //      console.log("hasilredis");
//                     //      console.log("Lanjutkan proses midleware");
//                     //      console.log(hasilredisJson.token);
                         
//                     // }else{
//                     //      console.log('Tidak sama');
//                     //      console.log('Cek di blaklist');
//                     //      console.log(hasilredisJson.token);
                         
//                     // }


                    
//                     // Jika tidak ada error selanjutnya token di dapatkan
//                     // akan di terjemakan ke identitas user clien

//                });
//           }else{
//                next();
//           }

//      }else{

//           next();
//      }
// } 

async function checkTokenSeetUser(req, res, next) {
  const authHeader = req.get('authorization');

  if (!authHeader) {
    return next(); // Tidak ada header → lewati
  }

  const token = authHeader.split(' ')[1];
  if (!token) {
    return next(); // Tidak ada token → lewati
  }

  try {
    const user = jwt.verify(token, process.env.TOKEN_SECRET);

    // Cek apakah token diblacklist
    const isBlacklisted = await redisClient.exists(`blacklist:${token}`);
    if (isBlacklisted === 1) {
      return res.status(403).json({ message: 'Token Anda diblacklist' });
    }

    // (Opsional) Cek whitelist
    // const isWhitelisted = await redisClient.exists(`whitelist:${token}`);
    // if (isWhitelisted !== 1) {
    //   return res.status(401).json({ message: 'Token tidak terdaftar di whitelist' });
    // }

    req.user = user;
    return next();
  } catch (err) {
    console.log('JWT error:', err.message);
    return res.status(401).json({ message: 'Token tidak valid atau expired' });
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

async function sideMenuMidleware(req, res, next){
  const klpId = req.user?.auth?.authorization;
  const klpIdStr = String(klpId ?? '');
  if (!klpIdStr) {
    return res.status(401).json({ message: 'Authorization kelompok tidak ditemukan' });
  }

  const menu_klp_list = await getCollection('menu_klp_list');
  const results = await menu_klp_list.aggregate([
    
    {
      $match: {
        $expr: {
          $eq: [{ $toString: '$menu_klp_id' }, klpIdStr]
        }
      }
    },
    {
      $lookup: {
        from: 'menu',               // nama koleksi yang di-join
        localField: 'menu_id',      // field di menu_klp_list
        foreignField: 'id',         // field di menu
        as: 'menu_info'
      }
    },
    {
      $unwind: '$menu_info' // Karena hasil $lookup berupa array
    },
    {
    $sort: {
        'menu_info.urutan': 1
      }
    },
    {
      $project: {
        menu_id: 1,
        menu_klp_id: 1,
        readx: 1,
        updatex: 1,
        deletex: 1,
        addx: 1,
        // ... field lain dari menu_klp_list
        route: '$menu_info.route'  // ambil hanya field 'route' dari join
      }
    }
  ]).toArray();

  if (results.length === 0) {
    return res.status(404).json({ message: 'Menu tidak ditemukan untuk kelompok ini' });
  }else{
    req.menu_akses = results
    next();
  }

}

module.exports = {
     checkTokenSeetUser,
     isLoggedIn, 
     sideMenuMidleware,
}