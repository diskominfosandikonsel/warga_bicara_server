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

router.post('/getView', async (req, res, next) => {
    console.log('getView');
    // console.log(req.user);
    // res.send(JSON.stringify({
    //     message: "getView 👌",
    //     data: req.user
    // }));
    
    const profile = await getCollection('users'); //memilih collection yang mau di query
    const result = await profile.find({
        $or:    [
                    {id : req.user.id}
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

// router.post('/addData', async (req, res, next) => {
//     res.send(JSON.stringify(req.body));
// })

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

router.post('/editData', async (req, res, next) => {
    // res.send(JSON.stringify(req.body));
    var data = req.body;
    const emails = await cekDataemail(data.id, data.email);
    if (emails.success === true) {

        try {
    const users     = await getCollection('users')
    const result    = await users.updateOne(
                        {id: data.id},
                        {$set: { 
                            username                    :data.username,                                
                                           
                            nama                        :data.nama,
                            alamat                      :data.alamat,
                            master_jk_id                :data.master_jk_id,
                            tgl_lahir                   :data.tgl_lahir,
                            master_prov_id              :data.master_prov_id,
                            master_kab_id               :data.master_kab_id,
                            master_kec_id               :data.master_kec_id,
                            master_deskel_id            :data.master_deskel_id,
                            master_agama_id             :data.master_agama_id,
                            master_pekerjaan_id         :data.master_pekerjaan_id,
                            master_pendidikan_id        :data.master_pendidikan_id,
                            hp                          :data.hp,
                            nik                         :data.nik,
                            nip                         :null,
                            // email                       :data.email, // di matikan karena perlu di dilakukan pengecekan sendiri
                            authorization               :null,
                            kategori_user               :data.kategori_user,
                            master_unit_kerja_id        :null,
                        }}
                        ) 

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
            
        }



    }else{
        // console.log("emails");
        // console.log(emails);
        res.status(500).json(emails);
    }

    // console.log(emails);
    

})

router.post('/removeData', async (req, res, next) => {
 
    try {
        const users = await getCollection('users');  
        const result = await users.deleteOne({ id: req.body.id });
        if (result.deletedCount > 0) {
            res.status(200).json({ message: "Data berhasil dihapus" });
        } else {
            res.status(404).json({ message: "Data tidak ditemukan" });
        }
    } catch (error) {
        res.status(500).json({ message: 'Terjadi kesalahan server' });
    }


})

router.post('/editPass', async (req, res, next) => {
    // res.send(JSON.stringify(req.body));
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
            } else if (result_update.matchedCount > 0 && result_update.modifiedCount === 0) {
                res.status(200).json({
                    message: "Password tidak berubah",
                });
            } else {
                res.status(500).json({message: "Terjadi kesalahan saat mengupdate password"});
            }

        })
            

})

router.post('/getPhotoUser', async (req, res, next) => {
    const data = req.body;
    const ceklampiran = await getCollection('lampiran');  
    const result_ceklampiranr = await ceklampiran.findOne({
        $and: [
            { tabel: 'users' },
            { tabel_id: data.id }
        ]
    })

    
    if (result_ceklampiranr=== null) {
        res.send(JSON.stringify({
            data:null
        }))
    }else{
        res.send(JSON.stringify({
            data:result_ceklampiranr
        }))
    }    
 
})

router.post('/editPhoto', upload.fields([{name:'file', maxCount:1}]), async (req, res, next) => {
    // console.log(req.files['file']);    
    var data = req.body;
    if (req.files['file'] == undefined || req.files['file'] == null || req.files['file'] == '') {
        // console.log("tidak ada isinya"); 
        res.status(400).json({
            message: "Silahkan tentukan file yang akan di upload",
        })
    }else{ 
            const ceklampiran = await getCollection('lampiran');  
            const result_ceklampiranr = await ceklampiran.findOne({
                $and: [
                    { tabel: 'users' },
                    { tabel_id: data.id }
                ]
            })
            
            // console.log(result_ceklampiranr);
       
            if (result_ceklampiranr=== null) {
                // console.log("ayo Insert");
                    try {
                        const lampiran = await getCollection('lampiran')
                        await lampiran.insertOne({
                            id              :uniqid(),
                            tabel           :'users',
                            tabel_id        :data.id,
                            file            :req.files['file'][0].filename,
                            filetype        :req.files['file'][0].mimetype,
                            filethumbnail   :'thumbnail' + req.files['file'][0].filename,
                        })

                        IMAGE.resizeImg(req.files['file'][0].filename)
                        .then(() => {
                            console.log("resize image berhasil");
                        })

                        res.status(200).json({
                            message: "Photo berhasil di masukan",
                        })

                    } catch (error) {
                        console.error("Error saat Insert photo: ", error);
                        return res.status(500).json({message: "Gagal Insert photo"});
                    }                
            }else{
                // console.log("ayo Update");

            
                    if (data.fileOld== undefined || data.fileOld == null || data.fileOld == '') {
                    }else{
                        IMAGE.hapus_file(data.fileOld)
                        IMAGE.hapus_file('thumbnail'+data.fileOld)
                    }

                    try{
                    const lampiran = await getCollection('lampiran')
                    const result = await lampiran.updateOne(
                        {tabel:'users' , tabel_id: data.id},
                        {$set: { 
                            file            :req.files['file'][0].filename,
                            filetype        :req.files['file'][0].mimetype,
                            filethumbnail   :'thumbnail' + req.files['file'][0].filename,
                        }}
                    );
                    // console.log(result.modifiedCount); 
                    if (result.modifiedCount > 0) {
                        IMAGE.resizeImg(req.files['file'][0].filename)
                        .then(() => {
                            console.log("resize image berhasil");
                        })
                        
                        res.status(200).json({
                            message: "Photo berhasil di update",
                        })
                    } else {
                        res.status(500).json({message: "Gagal update photo"});
                    }                    
                }
                catch (error) {
                    console.error("Error saat mengupdate photo: ", error);
                    return res.status(500).json({message: "Gagal update photo"});
                }

            }
            
    } 
})

module.exports = router;