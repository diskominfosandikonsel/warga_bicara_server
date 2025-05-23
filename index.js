require('dotenv').config();
const express = require('express')
const volleyball = require('volleyball');
const cors = require('cors');

const app = express()
const port = 3000

app.use(volleyball);
app.use(cors({ origin : '*' }));

const {connectMongo} = require('./db/mongodb/connection')


app.get('/', async (req, res) => { 
    const db = await connectMongo() //konek ke database
    const users = db.collection('users'); //memilih collection yang mau di query
    const data = await users.find().toArray(); //query data
    console.log('📦 Data pengguna:', data);
    res.send(data) 

})





app.listen(port, () => { console.log(`Example app listening on port ${port}`) })
