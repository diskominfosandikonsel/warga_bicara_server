require('dotenv').config();
const express = require('express')
const volleyball = require('volleyball');
const cors = require('cors');
var path = require("path");
const middleware = require('./auth/middleware');
const crypto = require('crypto')
const { connectRedis } = require('./library/redist/redist');

const app = express()
const port = 3000
app.use(express.json()); // ⬅️ Ini wajib 
app.use(volleyball);
// Connect Redis once on app start
connectRedis().catch(console.error);

// app.use(cors({ origin : '*' })); 

const allowedOrigins = [
//   'https://domain1.com',
//   'https://domain2.com',
//   'http://localhost:3000',
//   '*',
  'http://localhost:3000',
  'http://10.0.2.2:3000', // untuk android emu
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


const {connectMongo} = require('./db/mongodb/connection')


const {getCollection} = require('./db/mongodb/controller')

app.use(middleware.checkTokenSeetUser);

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


  const regMsyarakat = require('./api/auth/registration_masyarakat');
  app.use('/api/v1/reg_masyarakat', regMsyarakat);                        //REGIS MASYARAKAT

  const routeAuth = require('./auth/login');
  app.use('/api/v1/auth', routeAuth);

  const routeAuthMasyarakat = require('./api/auth/login_masyarakat');
  app.use('/api/v1/authMasyarakat', routeAuthMasyarakat);


  const checkAuth = require('./auth/cekMidleware');
  app.use('/checkAuth', middleware.isLoggedIn, checkAuth);

  const registration = require('./auth/registration');
  app.use('/registration', middleware.isLoggedIn, registration);          //REGIS ADMIN
// API START HERE ==========================







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


app.listen(port, () => { 
  console.log(`Example app listening on port ${port}`);
  startSecretLoop();
})
// app.listen(port, '0.0.0.0', () => {
//   console.log(`Server running at http://0.0.0.0:${port}`);
// });
