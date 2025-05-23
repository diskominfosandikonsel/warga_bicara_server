require('dotenv').config();
const express = require('express')
const volleyball = require('volleyball');
const cors = require('cors');
var path = require("path");


const app = express()
const port = 3000
app.use(express.json()); // ⬅️ Ini wajib

app.use(volleyball);

// app.use(cors({ origin : '*' })); 

const allowedOrigins = [
//   'https://domain1.com',
//   'https://domain2.com',
//   'http://localhost:3000',
//   '*',
  'http://localhost:3000',
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




app.get('/', async (req, res) => { 
    const db = await connectMongo() //konek ke database
    const users = db.collection('users'); //memilih collection yang mau di query
    const data = await users.find().toArray(); //query data
    console.log('📦 Data pengguna:', data);
    res.send(data)  
})

const reg_masyarakat = require('./api/auth/registration_masyarakat');
app.use('/api/v1/reg_masyarakat', reg_masyarakat);





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


app.listen(port, () => { console.log(`Example app listening on port ${port}`) })
