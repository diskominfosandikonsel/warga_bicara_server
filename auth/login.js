const express = require('express');
const Joi = require('joi');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const uniqid = require('uniqid'); 
const {connectMongo} = require('../db/mongodb/connection')
const {getCollection} = require('../db/mongodb/controller')

const {decrypt, encrypt} = require('../library/encrypt/enkripsi')
const { connectRedis, redisClient } = require('../library/redist/redist');
const router = express.Router();

const schema = Joi.object().keys({
    username: Joi.string()
                .alphanum() // hanya huruf dan angka 
                .min(5)
                .max(20)
                .required()
                .messages({
                    'string.alphanum': 'Username hanya boleh berisi huruf dan angka (tanpa simbol).',
                    'string.min': 'Username minimal 5 karakter.',
                    'string.max': 'Username maksimal 20 karakter.',
                    'any.required': 'Username wajib diisi.',
                }),
    password: Joi.string()
                .min(6)
                .pattern(/.*[A-Z].*/, 'huruf kapital') // minimal 1 huruf kapital
                .pattern(/.*\d.*/, 'angka')            // minimal 1 angka
                .pattern(/.*[!@#$%^&*(),.?":{}|<>].*/, 'simbol') // minimal 1 simbol
                .required()
                .messages({
                    'string.min': 'Password minimal 6 karakter.',
                    'string.pattern.name': 'Password harus mengandung minimal 1 {#name}.',
                    'string.base': 'Password harus berupa teks.',
                    'any.required': 'Password wajib diisi.',
                }),
}); 



router.get('/', async(req, res) => { 
    
    res.json({
        message: 'Router Login Check'
    });
});


function respondError422(res, next, text) {
    res.status(422);
    const error = new Error(text);
    next(error);
}



router.post('/login', async (req, res, next) => {
    const db = await getCollection('durationSecretKey');
    const row = await db.findOne({})
    global.secretDuration = row.duration

    console.log(req.body);

      const request = {
            username: await decrypt(req.body.username, global.SecretKey),
            password: await decrypt(req.body.password, global.SecretKey),
      }
    
      const { error, value } = schema.validate(request);
        if (error) { 
            res.status(409).json({message: error.details[0].message})
    
        } else {
    
            const users = await getCollection('users')
            const result = await users.find({"username":request.username}).toArray(); //query cari data  
    
            if (result.length <= 0 ) {
                console.log("Username Salah"); 
                respondError422(res, next, "Username Salah");
            } else {
              console.log("User ditemukan");
              console.log(result);
              // res.send(result)
              
                          var user = {}
                    for (var i in result) { user = result[i] }
                    
                    const payload = {
                        _id                               : user._id,  
                        id                                : user.id, 
                        profile: {
                            username                          : user.username, 
                            password                          : user.password, 
                            nama                              : user.nama,  
                            alamat                            : user.alamat,  
                            master_jk_id                      : user.master_jk_id, 
                            tgl_lahir                         : user.tgl_lahir,  
                            hp                                : user.hp, 
                            nik                               : user.nik, 
                            nip                               : user.nip,  
                            email                             : user.email, 
                            master_prov_id                    : user.master_prov_id, 
                            master_kab_id                     : user.master_kab_id, 
                            master_kec_id                     : user.master_kec_id, 
                            master_deskel_id                  : user.master_deskel_id, 
                            master_agama_id                   : user.master_agama_id, 
                            master_pekerjaan_id               : user.master_pekerjaan_id, 
                            master_pendidikan_id              : user.master_pendidikan_id, 
                        },
                        auth:{
                            authorization                     : user.authorization, 
                            kategori_user                     : user.kategori_user, 
                            master_unit_kerja_id              : user.master_unit_kerja_id, 
                        }
                    };
    
                    console.log("Token_secret : ", process.env.TOKEN_SECRET);
    
                    bcrypt.compare(request.password, user.password).then(async (result) => {
                        console.log(result);
                        console.log("bcrypt");
    
                        if (result) {
                                        jwt.sign(payload, process.env.TOKEN_SECRET, {
                                            expiresIn: global.secretDuration * 60
                                        }, async (err, token) => {
                                            if (err) {
                                                respondError422(res, next, "Kesalahan dlm pembuatan token");
                                            } else {
                                              console.log("sudah berhasil kirim");
                                              
                                            await connectRedis();
                                            await redisClient.set(`whitelist:${token}`, JSON.stringify({username: user.username, device:req.body.devices}), { EX: global.secretDuration * 60 });

                                                res.json({
                                                    token,
                                                    profile: payload
                                                });
                                            }
                                        })                        
                        } else {
                            // const users = await getCollection('users')
                            // const result = await users.find({"username":request.username}).toArray(); //query cari data  

                            respondError422(res, next, "Password salah");
                        }
    
                    })
                    
            }
            
        }
      
      


});


router.post('/logout', async (req, res) => {
    const db = await getCollection('durationSecretKey');
    const row = await db.findOne({})
    global.secretDuration = row.duration

    const authHeader = req.get('authorization');
     // console.log("authHeader");
     // console.log(authHeader);
     
    if (authHeader) {
        // jika ada authorization yang dikirim client melalui headers
        // dan karena token yang dikirim dipisahkan spasi maka kita pisahkan bagiannya
        const token = authHeader.split(' ')[1];
        // console.log("token");
        // console.log(token);
        
 
        if (!token) return res.status(400).json({ message: 'Token tidak ditemukan' });
      
        await redisClient.del(`whitelist:${token}`);
        await redisClient.set(`blacklist:${token}`, '1', { EX: 5 * 60 });
      
        res.json({ message: 'Logout berhasil' });
    }

});

router.post('/blacklist', async (req, res) => {

    const db = await getCollection('durationSecretKey');
    const row = await db.findOne({})
    global.secretDuration = row.duration

    var waktuBlaklist = 1 

    const authHeader = req.get('authorization'); 
     
    if (authHeader) { 
        const token = authHeader.split(' ')[1]; 
 
        if (!token) return res.status(400).json({ message: 'Token tidak ditemukan' });
      
        await redisClient.set(`blacklist:${token}`, '1', { EX: waktuBlaklist * 60 });
        // await redisClient.del(`whitelist:${token}`);
      
        res.json({ message: 'Blaklist berhasil dan akan di hapus' });
    }

});

module.exports = router;