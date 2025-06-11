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

router.post('/editData', async (req, res, next) => {
    res.send(JSON.stringify(req.body));
})

router.post('/removeData', async (req, res, next) => {
    res.send(JSON.stringify(req.body));
})

router.post('/editPass', async (req, res, next) => {
    res.send(JSON.stringify(req.body));
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

                IMAGE.hapus_file(data.fileOld)
                    if (data.fileOld== undefined || data.fileOld == null || data.fileOld == '') {
                    }else{
                        IMAGE.hapus_file(data.fileOld)
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