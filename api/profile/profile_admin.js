const express = require('express');
const router = express.Router();
const {connectMongo} = require('../../db/mongodb/connection')
const uniqid =  require('uniqid');
const Joi = require('joi');
const bcrypt = require('bcryptjs'); 
const jwt = require('jsonwebtoken'); 

 

const {decrypt, encrypt} = require('../../library/encrypt/enkripsi') 
const { connectRedis, redisClient } = require('../../library/redist/redist');

const { kirimEmail } = require('../../library/nodemailer/sendResetpass');
const { xrespondError422 } = require('../../library/utilitas/errorHandler');

const Cryptr = require('cryptr');
const cryptr = new Cryptr(process.env.KEYRESETPASS);

const {getCollection} = require('../../db/mongodb/controller')
 

router.post('/getView', async (req, res, next) => {
    console.log('getView'); 
    
    const profile = await getCollection('users'); //memilih collection yang mau di query
    const result = await profile.find({
        $or:    [
                    
                ]
        }).toArray(); //query cari data
    if (result.length <= 0 ) {
        res.status(404).json({message: "Data tidak ditemukan"})
    } else {
        res.status(200).json({
            result:result,
            data:req.user._id

        });
    }
})

router.post('/addData', async (req, res, next) => {
    res.send(JSON.stringify(req.body));
})

router.post('/editData', async (req, res, next) => {
    res.send(JSON.stringify(req.body));
})

router.post('/removeData', async (req, res, next) => {
    res.send(JSON.stringify(req.body));
})

router.post('/editPass', async (req, res, next) => {
    res.send(JSON.stringify(req.body));
})

router.post('/editPhoto', async (req, res, next) => {
    res.send(JSON.stringify(req.body));
})

router.post('/statusUser', async (req, res, next) => {
    res.send(JSON.stringify(req.body));
})

module.exports = router;