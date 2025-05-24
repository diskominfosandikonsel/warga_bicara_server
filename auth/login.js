const express = require('express');
const Joi = require('joi');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const uniqid = require('uniqid'); 
const {connectMongo} = require('../db/mongodb/connection')
const {getCollection} = require('../db/mongodb/controller')

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
    // const test = getUsers()

    // const users = await getCollection('users')
    // const hasil = await users.find({"username":req.body.username}).toArray()
    // // console.log(await getUsers().find().toArray());
    // // console.log(await users.find({"username":req.body.username}).toArray());
    // console.log(hasil[0]);
    // console.log("await getUsers()");
    
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
    console.log(req.body);

        const request = {
        username: req.body.username,
        password: req.body.password,
    }  
    const { error, value } = schema.validate(request);

    if (error) { 
        // Jika skemanya salah
        res.status(409).json({message: error.details[0].message})
    } else { 

        const users = await getCollection('users')
        const result = await users.find({"username":req.body.username}).toArray(); //query cari data 
        // console.log(result);
        

        if (result.length <= 0 ) {
            console.log("ayo Login"); 
            respondError422(res, next, "Username Salah");
        }else{
            // res.send('ditemukan')
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

                // console.log(payload);
                console.log("Token_secret : ", process.env.TOKEN_SECRET);

                bcrypt.compare(req.body.password, user.password).then((result) => {
                    console.log(result);
                    console.log("bcrypt");

                    if (result) {
                                    jwt.sign(payload, process.env.TOKEN_SECRET, {
                                        expiresIn: '24h'
                                    }, (err, token) => {
                                        if (err) {
                                            respondError422(res, next, "Kesalahan dlm pembuatan token");
                                        } else {
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
});



module.exports = router;