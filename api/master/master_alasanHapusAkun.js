const express = require('express');
const router = express.Router();
const {connectMongo} = require('../../db/mongodb/connection')
const uniqid =  require('uniqid');
const Joi = require('joi');
const bcrypt = require('bcryptjs'); 
const jwt = require('jsonwebtoken'); 

const multer = require("multer");
const upload = require('../../library/multer/fileMulter');
const fs = require('fs');

const {decrypt, encrypt} = require('../../library/encrypt/enkripsi') 
const { connectRedis, redisClient } = require('../../library/redist/redist');

const { kirimEmail } = require('../../library/nodemailer/sendResetpass');
const { xrespondError422 } = require('../../library/utilitas/errorHandler');

const Cryptr = require('cryptr');
const cryptr = new Cryptr(process.env.KEYRESETPASS);

const {getCollection} = require('../../db/mongodb/controller')
const IMAGE = require('../../library/multer/image');


router.get('/getView', async (req, res, next) => { 
    console.log('getView');
    
    
    const master_alasanHa = await getCollection('master_alasanHapusAkun'); //memilih collection yang mau di query
    const result = await master_alasanHa.find().toArray(); //query cari data
    if (result.length <= 0 ) {
        res.status(404).json({message: "Data tidak ditemukan"})
    } else {
        const master_alasanHa = await getCollection('master_alasanHapusAkun'); //memilih collection yang mau di query
        const results = await users.insertOne(form)

        res.status(200).json({
            result:result

        });
    }
})

router.get('/getData', async (req, res, next) => {  
    const master_alasanHa = await getCollection('hapus_akun'); //memilih collection yang mau di query
    const result = await master_alasanHa.aggregate([
        {
            $lookup: {
            from: "master_alasanHapusAkun",           // koleksi yang ingin dijoin
            localField: "hapus_akun_id", // field referensi di collection1
            foreignField: "id", // field yang dicocokkan di collection2
            as: "uraian_alasan"    // nama field hasil join (berisi array)
            }
        } 
    ]).toArray()

    if (result.length <= 0 ) {
        res.status(404).json({message: "Data tidak ditemukan"})     
    } else {
        res.status(200).json({
            result:result
        });
    } 
})


module.exports = router;