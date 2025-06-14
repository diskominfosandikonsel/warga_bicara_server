const express = require('express');
const router = express.Router();
const Joi = require('joi');
var db = require('../../db/mongodb/connection')
const {getCollection} = require('../../db/mongodb/controller')
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const uniqid = require('uniqid'); 

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


router.post('/signup', async (req, res, next) => {

 


    const request = {
        username: req.body.username,
        password: req.body.password,
    }  
    const { error, value } = schema.validate(request);
    if (error) { 
        res.status(409).json({message: error.details[0].message})

    } else {
        

 
        const users = await getCollection('users'); //memilih collection yang mau di query
        // const result = users.find({"username":req.body.username}).toArray(); //query cari data
        // if (result.length <= 0 ) {
            const existingUser = await users.findOne({
                $or: [
                    { email     : req.body.email },
                    { username  : req.body.username },
                    { nik       : req.body.nik }
                ]
            });
            if (!existingUser) {
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
                        res.status(201).json({success: true, message: "Berhasil Menambahkan User " + req.body.username})
                    } else {
                        console.log('Insert gagal '+err); 
                        res.status(500).json({message: "Insert Gagal "+err})
                    }
                } catch (err) { 
                    console.error('Terjadi error saat insert:', err);
                    res.status(500).json({message: "Terjadi error saat insert "+err})
                }

            })

            

        } 
        // else {
        //     console.log("Jangan Insert");
        //     res.status(409).json({message:"Gagal melakukan insert data. Data user sudah pernah ada."}) 
        // }
        if (existingUser) {
            let message = "Gagal insert data. ";
            if (existingUser.username === req.body.username) message += "Username sudah digunakan. ";
            if (existingUser.nik === req.body.nik) message += "NIK sudah terdaftar.";
            return res.status(409).json({message});
        }
    
    }     
})



router.post('/getView', async (req, res, next) => {
    console.log('getView');  
    const { nama, username, kategori_user, page, limit = 10 } = req.body; 
    console.log(nama, username, kategori_user, page, limit);
    
    // Konversi page dan limit ke integer
    const pageNumber = parseInt(page);
    const limitNumber = parseInt(limit);
    const skip = (pageNumber - 1) * limitNumber;

    // Buat filter dinamis
    const filter = {};
    if (nama) {
        filter.nama = { $regex: nama, $options: 'i' }; // pencarian case-insensitive
    }
    if (username) {
        filter.username = { $regex: username, $options: 'i' };
    }
    if (kategori_user) {
        filter.kategori_user = kategori_user; // jika string eksak
    }
    console.log(filter);
    

    try {
        const colUsers = await getCollection('users'); //memilih collection yang mau di query
        // const result = await profile.find({

        const total = await colUsers.countDocuments(filter); // total data
        const users = await colUsers
            .find(filter)
            .skip(skip)
            .limit(limitNumber)
            .toArray();

        res.json({
            currentPage: pageNumber,
            totalPages: Math.ceil(total / limitNumber),
            totalData: total,
            data: users,
        });
    } catch (error) {
        console.error('Error saat mengambil data users:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
})

router.post('/addData', async (req, res, next) => {

})

router.post('/editData', async (req, res, next) => {
    // const { id, nama, username, kategori_user } = req.body;
        const emails = await cekDataemail(req.body.id, req.body.email);
    if (emails.success === true) {
        try {
            const colUsers = await getCollection('users');
            const result = await colUsers.updateOne({ id: req.body.id }, { $set: {

                        username                    : req.body.username, 
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
                        authorization               : req.body.authorization,
                        kategori_user               : req.body.kategori_user,
                        master_unit_kerja_id        : req.body.master_unit_kerja_id
                
                } });
                console.log(result);
                
                    if (result.modifiedCount > 0) {
                        res.status(200).json({
                            message: "Data berhasil di update",
                            email: emails.message
                        })
                    }else if (result.matchedCount > 0 && result.modifiedCount === 0) {
                        res.status(200).json({
                            message: "Data diri tidak berubah",
                            email: emails.message
                        });     
                    } 
                    else {
                        res.status(500).json({message: "Terjadi kesalahan saat mengupdate data"});
                    }   
        } catch (error) {
            console.error('Error saat mengupdate data user:', error);
            res.status(500).json({ error: 'Internal Server Error' });
        }


    }else{
        res.status(500).json(emails);
    }


})

router.post('/removeData', async (req, res, next) => {

    try {
        const users = await getCollection('users');  
        const result = await users.deleteOne({ id: req.body.id });
        if (result.deletedCount > 0) {
            const hapus_akun = await getCollection('hapus_akun'); //memilih collection yang mau di query
            const hapus_akun_results = await hapus_akun.insertOne({
                id: uniqid(),
                hapus_akun_id: req.body.alasan_hapus_akun_id
            })
            if (hapus_akun_results.insertedCount > 0) {
                console.log("Data hapus_akun berhasil di insert");
            }  
            res.status(200).json({ message: "Data berhasil dihapus" });

        } else {
            res.status(404).json({ message: "Data tidak ditemukan" });
        }
    } catch (error) {
        res.status(500).json({ message: 'Terjadi kesalahan server' });
    }
})

router.post('/editPass', async (req, res, next) => {
        const data = req.body;
            bcrypt.hash(data.newpassword.trim(), 12).then(async hashedPassword =>  {
    
                const users = await getCollection('users')
                const result_update = await users.updateOne(
                    { id: data.id },
                    { $set: { password: hashedPassword } }
                )
                if (result_update.modifiedCount > 0) {
                    res.status(200).json({
                        message: "Password berhasil di update",
                    })
                } else {
                    res.status(500).json({message: "Terjadi kesalahan saat mengupdate password"});
                }
    
            })
})

router.post('/statusUser', async (req, res, next) => {
})

router.post('/blacklist', async (req, res) => {

    const db = await getCollection('durationSecretKey');
    const row = await db.findOne({})
    global.secretDuration = row.duration

    var waktuBlaklist = req.body.waktuBlaklist // default waktu blacklist 1 menit

    const authHeader = req.get('authorization'); 
     
    if (authHeader) { 
        const token = authHeader.split(' ')[1]; 
 
        if (!token) return res.status(400).json({ message: 'Token tidak ditemukan' });
      
        await redisClient.set(`blacklist:${token}`, '1', { EX: waktuBlaklist * 60 });
        // await redisClient.del(`whitelist:${token}`);
      
        res.json({ message: 'Blaklist berhasil dan akan di hapus' });
    }

});


cekDataemail = async (userId, newEmail) => {
    console.log(userId, newEmail);
    
    const users = await getCollection('users'); //memilih collection yang mau di query
    // const result = await users.findOne({
    //     $or: [
    //         { email: newEmail }
    //     ]
    // }); //query cari 

// Fungsi untuk cek dan update email

  try {
    // Ambil user berdasarkan ID
    const currentUser = await users.findOne({id:userId});
    console.log(currentUser);
    
    if (!currentUser) {
      return { success: false, message: 'User tidak ditemukan' };
    }

    // Jika email tidak berubah, langsung update data lain
    if (currentUser.email === newEmail) {
 
      return { success: true, message: 'Email tetap sama, tidak perlu diupdate' };
    }

    // Cek apakah email baru sudah digunakan oleh user lain
    const emailUsed = await users.findOne({
      email: newEmail,
      id: { $ne: userId } // pengecualian untuk user itu sendiri
    });

    if (emailUsed) {
      return { success: false, message: 'Email sudah digunakan oleh user lain' };
    }

    // Update email jika belum digunakan    
    await users.updateOne(
        { id: userId },
        { $set: { email: newEmail } }
    );


    return { success: true, message: 'Email berhasil diperbarui' };
 

  } catch (err) {
    console.error('Error:', err);
    return { success: false, message: 'Terjadi kesalahan saat mengupdate email' };
  }



}

module.exports = router;