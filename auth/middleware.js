// Membuat verifikasi token yang dikirimkan melalui headers client

const jwt = require('jsonwebtoken');

function checkTokenSeetUser(req, res, next){
     const authHeader = req.get('authorization');
     if (authHeader) {
          // jika ada authorization yang dikirim client melalui headers
          // dan karena token yang dikirim dipisahkan spasi maka kita pisahkan bagiannya
          const token = authHeader.split(' ')[1];
          if (token) {
               // jika tokennya ada
               // maka lakukan verifikasi terhadap token tersebut
               jwt.verify(token, process.env.TOKEN_SECRET, function(error, user) {
                    if (error) {
                         console.log(error);
                    }

                    // Jika tidak ada error selanjutnya token di dapatkan
                    // akan di terjemakan ke identitas user clien
                    req.user = user;
                    next()
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