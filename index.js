require('dotenv').config();
const express = require('express')
const volleyball = require('volleyball');
const cors = require('cors');
var path = require("path");
const middleware = require('./auth/middleware');
const crypto = require('crypto')
const { connectRedis } = require('./library/redist/redist');

const app = express()
const port = 5016
app.use(express.json()); // ⬅️ Ini wajib 
app.use(volleyball);
// Connect Redis once on app start
connectRedis().catch(console.error);

const {connectMongo} = require('./db/mongodb/connection')
const {getCollection} = require('./db/mongodb/controller')

const startRedisListener = require('./library/redist/redisListener'); // import listener kamu



// app.use(cors({ origin : '*' })); 


const allowedOrigins = [
//   'https://domain1.com',
  'https://server-warga-bicara.konaweselatankab.go.id',
//   'http://localhost:3000',
'http://localhost:3000',
'http://10.0.2.2:3000', // untuk android emu
'http://localhost:5173', // untuk client
'http://10.91.178.2', // untuk client
'https://warga-bicara.konaweselatankab.go.id', // untuk client
'*',
];

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    } else {
      return callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true // Jika kamu pakai cookie/token
}));




app.use(middleware.checkTokenSeetUser);

app.use('/uploads', express.static(path.join(__dirname, './uploads')))


app.get('/', async (req, res) => { 
    res.send(JSON.stringify({
      message:"👌"
    }))  
})

// GLOBAL VARIABEL
global.SecretKey = 'ini sekret key';
global.secretDuration = 0;

// Function to generate a random 8-character string
function buatSecretKey() {
    const characters = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ!@#$%^&*()';
    let result = '';
    for (let i = 0; i < 8; i++) { // 8 character
        const randomIndex = crypto.randomInt(0, characters.length);
        result += characters[randomIndex];
    }
    global.SecretKey = result
    console.log("buat secret key"); 
    console.log(global.SecretKey); 
    return result
}

// Fungsi Simpan Durasi ke Database
async function saveSecretDuration(duration) { 
  const db = await getCollection('durationSecretKey'); 
  await db.deleteMany({})
  await db.insertOne({"duration":duration}) 
}

async function startSecretLoop() { 
  const db = await getCollection('durationSecretKey');
  const row = await db.findOne({}) 

  if (row) {
    // console.log(row);
    global.secretDuration = row.duration;
    global.SecretKey = buatSecretKey();
    setInterval(buatSecretKey, global.secretDuration * 60000);
  }else{
    console.log("Tidak ada duration secret key");
    console.log("Silahkan set durasi secret key");
  } 

}



 




// API START HERE ==========================

  app.get('/getSecretKey', async (req, res) => {

      const db = await getCollection('durationSecretKey');
      const row = await db.findOne({}) 

      if (row) { 
        console.log('getSecretKey ====> 🚀');
        console.log(global.SecretKey);
        res.send(global.SecretKey)
      }else{
        console.log("tidak ada isinya");
        console.error("tidak ada isinya");
        res.status(500).json("Silahkan tentukan waktu expire secretKey nya")
      } 
  })

  app.post('/admin/set-duration', async (req, res) => {
    const duration = req.body.duration;
    console.log(duration);
    if (!duration) return res.status(400).json({ message: 'Duration required' });
    await saveSecretDuration(duration);
    await startSecretLoop();
    res.json({ message: 'Duration Di Buat successfully' });
    process.exit(0); // aplikasi di stopkan lalu akan di restart secara otomatis oleh pm2
    
  });


  
  const checkAuth = require('./auth/cekMidleware')
  app.use('/checkAuth', middleware.isLoggedIn, checkAuth)
  // =========================== CLIENT ===========================
  const authClient = require('./auth/client')
  app.use('/api/v1/authClient', authClient)                        //AUTH MASYARAKAT

  const profileMasyarakat = require('./api/profile/profile_client')
  app.use('/api/v1/client_profile', middleware.isLoggedIn, profileMasyarakat)

  // =========================== CLIENT ===========================

  // =========================== ADMIN ===========================

  const authAdmin = require('./auth/admin')
  app.use('/api/v1/authAdmin', authAdmin)                                                  //AUTH ADMIN 

  const registration = require('./auth/admin/registration')
  app.use('/api/v1/authAdmin/registration', middleware.isLoggedIn, registration)           //REGIS ADMIN

  const profile_admin = require('./api/profile/profile_admin')
  app.use('/api/v1/admin_profile', middleware.isLoggedIn, profile_admin)                   //REGIS ADMIN
  
  // =========================== MASTER ===========================
 

  const listMenu = require('./api/listMenu/listMenu')
  app.use('/api/v1/listMenu', middleware.isLoggedIn, middleware.sideMenuMidleware, listMenu);

  const klp_users = require('./api/kelompok_user/klp_users')
  app.use('/api/v1/klp_users', middleware.isLoggedIn, middleware.sideMenuMidleware, klp_users);

  const master_prov = require('./api/master/master_prov')
  app.use('/api/v1/master_prov', middleware.isLoggedIn, master_prov)

  const master_kabupaten = require('./api/master/master_kabupaten')
  app.use('/api/v1/master_kabupaten', middleware.isLoggedIn, master_kabupaten)
  const master_kecamatan = require('./api/master/master_kecamatan')
  app.use('/api/v1/master_kecamatan', middleware.isLoggedIn, master_kecamatan)
  const master_deskel = require('./api/master/master_deskel')
  app.use('/api/v1/master_deskel', middleware.isLoggedIn, master_deskel)

  const master_pendidikan = require('./api/master/master_pendidikan')
  app.use('/api/v1/master_pendidikan', middleware.isLoggedIn, master_pendidikan)
  const master_pekerjaan = require('./api/master/master_pekerjaan')
  app.use('/api/v1/master_pekerjaan', middleware.isLoggedIn, master_pekerjaan)
  const master_jeniskelamin = require('./api/master/master_jeniskelamin')
  app.use('/api/v1/master_jeniskelamin', middleware.isLoggedIn, master_jeniskelamin)
  const master_alasanHapusAkun = require('./api/master/master_alasanHapusAkun')
  app.use('/api/v1/master_alasanHapusAkun', middleware.isLoggedIn, master_alasanHapusAkun) //MASTER ALASAN HAPUS AKUN
  const master_agama = require('./api/master/master_agama')
  app.use('/api/v1/master_agama', middleware.isLoggedIn, master_agama)
  const master_kategori_laporan = require('./api/master/master_kategori_laporan')
  app.use('/api/v1/master_kategori_laporan', middleware.isLoggedIn, master_kategori_laporan)
  const master_kategori_laporan_sub = require('./api/master/master_kategori_laporan_sub')
  app.use('/api/v1/master_kategori_laporan_sub', middleware.isLoggedIn, master_kategori_laporan_sub)

  const master_unit_kerja = require('./api/master/master_unit_kerja')
  app.use('/api/v1/master_unit_kerja', middleware.isLoggedIn, master_unit_kerja)
  
  // =========================== MASTER ===========================
  
  
  
  // =========================== ADMIN ===========================
  
  const postingan_laporan_android = require('./api/postingan_laporan/postingan_laporan_android')
  app.use('/postingan_laporan_android', middleware.isLoggedIn, postingan_laporan_android)

  const notifikasi_client = require('./api/notifikasi/android/notifikasi')
  app.use('/notifikasi_android', middleware.isLoggedIn, notifikasi_client)

  const rating_client = require('./api/rating/rating_android')
  app.use('/rating_android', middleware.isLoggedIn, rating_client)

  const dashboard_android_client = require('./api/dashboard/dashboard_android')
  app.use('/dashboard_android', middleware.isLoggedIn, dashboard_android_client)
 

  const postingan_laporan_website = require('./api/postingan_laporan/postingan_laporan_website')
  app.use('/api/v1/postingan_laporan_website', middleware.isLoggedIn, postingan_laporan_website)

  const dashboard_web = require('./api/dashboard/dashboard_web')
  app.use('/api/v1/dashboard_web', middleware.isLoggedIn, dashboard_web)
  
  // =========================== PUBLISH ===========================
  
  const publish_master_agama = require('./api/master/publish/master_agama')
  app.use('/publish_master_agama', publish_master_agama)

  const publish_master_deskel = require('./api/master/publish/master_deskel')
  app.use('/publish_master_deskel', publish_master_deskel)

  const publish_master_jeniskelamin = require('./api/master/publish/master_jeniskelamin')
  app.use('/publish_master_jeniskelamin', publish_master_jeniskelamin)

  const publish_master_kabupaten = require('./api/master/publish/master_kabupaten')
  app.use('/publish_master_kabupaten', publish_master_kabupaten)

  const publish_master_kecamatan = require('./api/master/publish/master_kecamatan')
  app.use('/publish_master_kecamatan', publish_master_kecamatan)

  const publish_master_prov = require('./api/master/publish/master_prov')
  app.use('/publish_master_prov', publish_master_prov)

  const publish_master_pekerjaan = require('./api/master/publish/master_pekerjaan')
  app.use('/publish_master_pekerjaan', publish_master_pekerjaan)

  const publish_master_pendidikan = require('./api/master/publish/master_pendidikan')
  app.use('/publish_master_pendidikan', publish_master_pendidikan)

  const publish_master_client_autocomplete = require('./api/master/publish/master_client_autocomplete')
  app.use('/api/v1/master_client_autocomplete', publish_master_client_autocomplete)

  // =========================== PUBLISH ===========================

function notFound(req, res, next) {
  res.status(404);
  const error = new Error('Not Found data - ' + req.originalUrl);
  next(error);
}

function errorHandler(err, req, res, next) {
  res.status(res.statusCode || 500);
  res.json({
    message: err.message,
    stack: err.stack
  });
}

app.use(notFound);
app.use(errorHandler);


app.listen(port, async () => { 
  console.log(`Example app listening on port ${port}`);
  startSecretLoop();
  await startRedisListener()
})
// app.listen(port, '0.0.0.0', () => {
//   console.log(`Server running at http://0.0.0.0:${port}`);
// });
