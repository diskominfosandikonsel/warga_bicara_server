const express = require('express');
const router = express.Router();
const {connectMongo} = require('../../db/mongodb/connection')
const uniqid =  require('uniqid');
const Joi = require('joi');
const bcrypt = require('bcryptjs'); 
const jwt = require('jsonwebtoken'); 
const {decrypt, encrypt} = require('../../library/encrypt/enkripsi') 
const { connectRedis, redisClient } = require('../../library/redist/redist');


const {getCollection} = require('../../db/mongodb/controller')


// SKEMA JOI ===========================
const schema = Joi.object().keys({
    username: Joi.string()
                .alphanum() // hanya huruf dan angka 
                .min(6)
                .max(13)
                .required()
                .messages({
                    'string.alphanum': 'Username hanya boleh berisi huruf dan angka (tanpa simbol).',
                    'string.min': 'Username minimal 6 karakter.',
                    'string.max': 'Username maksimal 13 karakter.',
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
// SKEMA JOI ===========================

function respondError422(res, next, text) {
    res.status(422);
    const error = new Error(text);
    next(error);
}





router.post('/login', async (req, res, next) => { 

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
        //   console.log("User ditemukan");
        //   console.log(result);
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

                bcrypt.compare(request.password, user.password).then((result) => {
                    console.log(result);
                    console.log("bcrypt");

                    if (result) {
                                    jwt.sign(payload, process.env.TOKEN_SECRET, {
                                        expiresIn: '24h'
                                    }, async (err, token) => {
                                        if (err) {
                                            respondError422(res, next, "Kesalahan dlm pembuatan token");
                                        } else {

const device = "Andorororo"
                                          // const redisKey = `whitelist:${user.username}`;
                                          // await redisClient.set(redisKey, token, {
                                          //   EX: global.secretDuration, // 1 hour in seconds
                                          // });

                                        //   await connectRedis().set('whitelist', user.username, JSON.stringify({ token }));
// await connectRedis.ft.create('whitelist', user.username, JSON.stringify({ token }));
await connectRedis();
await redisClient.set('whitelist', JSON.stringify({ username: user.username, token:token }));

// await redisClient.quit();



                                          console.log("sudah berhasil kirim");
                                          
                                            res.json({
                                                token,
                                                profile: payload
                                            });
                                        }
                                    })                        
                    } else {
                        respondError422(res, next, "Password salah");
                    }

                })
                
        }
        
    }
  
  
  
})

router.post('/encrypt', async (req, res)=>{ // Ini nanti di hapus yaaaa 🔖🔖
  // var enkrip = 'OGvz3dY/96Ca8IpfznCecg==' 
    const username = await encrypt(req.body.username, global.SecretKey)
    const password = await encrypt(req.body.password, global.SecretKey) 

    const request = {
      username: username,
      password: password,
      key:global.SecretKey
    }

    console.log(request);
    res.send(request) 

})

module.exports = router;