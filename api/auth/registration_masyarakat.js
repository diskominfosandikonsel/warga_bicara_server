const express = require('express');
const router = express.Router();
const {connectMongo} = require('../../db/mongodb/connection')
const uniqid =  require('uniqid');
const Joi = require('joi');
const bcrypt = require('bcryptjs');

const {getCollection} = require('../../db/mongodb/controller')

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
 


  router.post('/signup', async (req, res) => { 

    console.log('data dari frontend:', { 
        ...req.body, 
        password: '*****', 
        confirmPassword: '*****' 
      });

    const request = {
        username: req.body.username,
        password: req.body.password,
    }  
    const { error, value } = schema.validate(request);
    if (error) { 
        res.status(409).json({message: error.details[0].message})

    } else {
        

 
        const users = await getCollection('users'); //memilih collection yang mau di query
        const result = await users.find({
            "username"  :req.body.username,
            "nik"       :req.body.nik
        }).toArray(); //query cari data
        

        if (result.length <= 0 ) {
            console.log("ayo Insert");

            bcrypt.hash(req.body.password.trim(), 12).then(async hashedPassword =>  {

                var form = {
                    id                          : uniqid(),
                    username                    : req.body.username,
                    password                    : hashedPassword,
                    nama                        : req.body.nama,
                    alamat                      : req.body.alamat,
                    master_jk_id                : req.body.master_jk_id,
                    tgl_lahir                   : req.body.tgl_lahir,
                    master_prov_id              : req.body.master_prov_id,
                    master_kab_id               : req.body.master_kab_id,
                    master_kec_id               : req.body.master_kec_id,
                    master_deskel_id            : req.body.master_deskel_id,
                    master_agama_id             : req.body.master_agama_id,
                    master_pekerjaan_id         : req.body.master_pekerjaan_id,
                    master_pendidikan_id        : req.body.master_pendidikan_id,
                    hp                          : req.body.hp,
                    nik                         : req.body.nik,
                    nip                         : req.body.nip,
                    email                       : req.body.email,
                    authorization               : req.body.authorization,
                    kategori_user               : req.body.kategori_user,
                    master_unit_kerja_id        : req.body.master_unit_kerja_id
                }
        
                try {
                    const results = await users.insertOne(form)
                    if (results.acknowledged) {  // results.acknowledged Hasilnya true / false
                        console.log("Berhasil Menambahkan User " + req.body.username);
                        res.status(201).json({
                            success: true,
                            message: "Berhasil Menambahkan User " + req.body.username})
                    } else {
                        console.log('Insert gagal '+err); 
                        res.status(500).json({message: "Insert Gagal "+err})
                    }
                } catch (err) { 
                    console.error('Terjadi error saat insert:', err);
                    res.status(500).json({message: "Terjadi error saat insert "+err})
                }

            })

            

        } else {
            console.log("Jangan Insert");
            res.status(409).json({message:"Gagal melakukan insert data. Data user sudah pernah ada."}) 
        }
    
    } 


})

router.get('/get_test', (req, res) =>{
    res.send("asdasd")
})

module.exports = router;