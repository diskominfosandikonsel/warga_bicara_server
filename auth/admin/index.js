const express = require('express');
const router = express.Router();
const Joi = require('joi');

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const uniqid = require('uniqid'); 
const {connectMongo} = require('../../db/mongodb/connection') 

const {decrypt, encrypt} = require('../../library/encrypt/enkripsi')
const { connectRedis, redisClient } = require('../../library/redist/redist');

const {getCollection} = require('../../db/mongodb/controller')

const { kirimEmail } = require('../../library/nodemailer/sendResetpass');

const Cryptr = require('cryptr');
const cryptr = new Cryptr(process.env.KEYRESETPASS);

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


// router.post('/signup', async (req, res, next) => {

 


//     const request = {
//         username: req.body.username,
//         password: req.body.password,
//     }  
//     const { error, value } = schema.validate(request);
//     if (error) { 
//         res.status(409).json({message: error.details[0].message})

//     } else {
        

 
//         const users = await getCollection('users'); //memilih collection yang mau di query
//         // const result = users.find({"username":req.body.username}).toArray(); //query cari data
//         // if (result.length <= 0 ) {
//             const existingUser = await users.findOne({
//                 $or: [
//                     { email     : req.body.email },
//                     { username  : req.body.username },
//                     { nik       : req.body.nik }
//                 ]
//             });
//             if (!existingUser) {
//             console.log("ayo Insert");

//             bcrypt.hash(req.body.password.trim(), 12).then(async hashedPassword =>  {

//                 var form = {
//                     id                          : uniqid(),
//                     username                    : req.body.username,
//                     password                    : hashedPassword,
//                     nama                        : req.body.nama,
//                     alamat                      : req.body.alamat,
//                     master_jk_id                : req.body.master_jk_id,
//                     tgl_lahir                   : req.body.tgl_lahir,
//                     master_prov_id              : req.body.master_prov_id,
//                     master_kab_id               : req.body.master_kab_id,
//                     master_kec_id               : req.body.master_kec_id,
//                     master_deskel_id            : req.body.master_deskel_id,
//                     master_agama_id             : req.body.master_agama_id,
//                     master_pekerjaan_id         : req.body.master_pekerjaan_id,
//                     master_pendidikan_id        : req.body.master_pendidikan_id,
//                     hp                          : req.body.hp,
//                     nik                         : req.body.nik,
//                     nip                         : req.body.nip,
//                     email                       : req.body.email,
//                     authorization               : req.body.authorization,
//                     kategori_user               : req.body.kategori_user,
//                     master_unit_kerja_id        : req.body.master_unit_kerja_id
//                 }
        
//                 try {
//                     const results = await users.insertOne(form)
//                     if (results.acknowledged) {  // results.acknowledged Hasilnya true / false
//                         console.log("Berhasil Menambahkan User " + req.body.username);
//                         res.status(201).json({success: true, message: "Berhasil Menambahkan User " + req.body.username})
//                     } else {
//                         console.log('Insert gagal '+err); 
//                         res.status(500).json({message: "Insert Gagal "+err})
//                     }
//                 } catch (err) { 
//                     console.error('Terjadi error saat insert:', err);
//                     res.status(500).json({message: "Terjadi error saat insert "+err})
//                 }

//             })

            

//         } 
//         // else {
//         //     console.log("Jangan Insert");
//         //     res.status(409).json({message:"Gagal melakukan insert data. Data user sudah pernah ada."}) 
//         // }
//         if (existingUser) {
//             let message = "Gagal insert data. ";
//             if (existingUser.username === req.body.username) message += "Username sudah digunakan. ";
//             if (existingUser.nik === req.body.nik) message += "NIK sudah terdaftar.";
//             return res.status(409).json({message});
//         }
    
//     }     
// })

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




// ===================================== Reset passwd =====================================

router.post('/passwordC', async (req, res, next) => { 
    await cekEmailuser(req, res, next)  
})


router.get('/confirm', async (req, res, next) => { 
    const idx = req.query.token  
    const dekripsiID = await dekripsi(idx) 

    // cari database token reset password di redis
    const result_redis =  await redisClient.get(`reset_account:${dekripsiID}`); 
    const hasilRedis = JSON.parse(result_redis)

    if (hasilRedis===null) {
        res.send(`
                    <!DOCTYPE html>
                    <html lang="id">
                    <head>
                    <meta charset="UTF-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <title>Request Data Expire</title>
                    <script>
                    setTimeout(function() {
                        window.location.href = '`+process.env.HOSTADMIN+`';
                    }, 5000); // 5 detik
                    </script>
                    <style>
                        body {
                        font-family: Arial, sans-serif;
                        background-color: #f4f4f7;
                        margin: 0;
                        padding: 0;
                        }
                        .container {
                        max-width: 600px;
                        margin: 80px auto;
                        background-color: #ffffff;
                        padding: 40px;
                        border-radius: 10px;
                        text-align: center;
                        box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
                        }
                        h1 {
                        color: #28a745;
                        }
                        p {
                        color: #333333;
                        font-size: 16px;
                        }
                        a.button {
                        display: inline-block;
                        margin-top: 20px;
                        padding: 12px 24px;
                        background-color: #007bff;
                        color: #ffffff;
                        text-decoration: none;
                        border-radius: 6px;
                        }
                    </style>
                    </head>
                    <body>
                    <div class="container">
                        <h1>Request Data Expire</h1>
                        <p>Token request data anda berakhir.</p>
                        <p>Silahkan lakukan reset password kembali.</p>
                        <p>Halaman ini akan redirect otomatis.... </p> 
                    </div>
                    </body>
                    </html>            
            `)
    }

    // Update data collection user berdasarkan id  
    
    bcrypt.hash(hasilRedis.newpassword.trim(), 12).then(async hashedPassword =>  {
        
        const users = await getCollection('users')
        const result_update = await users.updateOne(
            { id: hasilRedis.id },
            { $set: { password: hashedPassword } }
        );
        if (result_update.modifiedCount === 1) {
            console.log("Berhasil merubah data");
            await redisClient.del(`reset_account:${dekripsiID}`);
            // <a href="myapp://open" class="button">Buka Aplikasi</a>
            // <a href="intent://open#Intent;scheme=myapp;package=id.periksa.pasien.rsudkonaweselatan;end" class="button">Buka Aplikasi</a>
            res.send(
                `
                    <!DOCTYPE html>
                    <html lang="id">
                    <head>
                    <meta charset="UTF-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <title>Reset Password Berhasil</title>
                    <script>
                    setTimeout(function() {
                        window.location.href = '`+process.env.HOSTADMIN+`';
                    }, 5000); // 5 detik
                    </script>
                    <style>
                        body {
                        font-family: Arial, sans-serif;
                        background-color: #f4f4f7;
                        margin: 0;
                        padding: 0;
                        }
                        .container {
                        max-width: 600px;
                        margin: 80px auto;
                        background-color: #ffffff;
                        padding: 40px;
                        border-radius: 10px;
                        text-align: center;
                        box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
                        }
                        h1 {
                        color: #28a745;
                        }
                        p {
                        color: #333333;
                        font-size: 16px;
                        }
                        a.button {
                        display: inline-block;
                        margin-top: 20px;
                        padding: 12px 24px;
                        background-color: #007bff;
                        color: #ffffff;
                        text-decoration: none;
                        border-radius: 6px;
                        }
                    </style>
                    </head>
                    <body>
                    <div class="container">
                        <h1>Reset Password Berhasil</h1>
                        <p>Password Anda telah berhasil direset.</p>
                        <p>Anda dapat kembali ke aplikasi Anda dan login dengan password baru.</p>
                        <p>Halaman ini akan redirect otomatis.... </p>

                    </div>
                    </body>
                    </html>
                `
            )
    
        } else {
            console.log("Gagal Merubah Data");
            res.send(
                `
                <!DOCTYPE html>
                <html lang="id">
                <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Reset Password Berhasil</title>
                <script>
                setTimeout(function() {
                    window.location.href = '`+process.env.HOSTADMIN+`';
                }, 5000); // 5 detik
                </script>
                <style>
                    body {
                    font-family: Arial, sans-serif;
                    background-color: #f4f4f7;
                    margin: 0;
                    padding: 0;
                    }
                    .container {
                    max-width: 600px;
                    margin: 80px auto;
                    background-color: #ffffff;
                    padding: 40px;
                    border-radius: 10px;
                    text-align: center;
                    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
                    }
                    h1 {
                    color: #28a745;
                    }
                    p {
                    color: #333333;
                    font-size: 16px;
                    }
                    a.button {
                    display: inline-block;
                    margin-top: 20px;
                    padding: 12px 24px;
                    background-color: #007bff;
                    color: #ffffff;
                    text-decoration: none;
                    border-radius: 6px;
                    }
                </style>
                </head>
                <body>
                <div class="container">
                    <h1>Gagal merubah password</h1>
                    <p>Password yang anda masukan sama dengan password sebelumnya.</p>
                    <p>Anda dapat login kembali di aplikasi anda dengan password sebelumnya.</p>
                </div>
                </body>
                </html>            
                `            
            )
            
        }
    })
    
    

})

const cekEmailuser = async (req, res, next) => {  
        const users = await getCollection('users')
        const result = await users.findOne({"email":req.body.email}) //query cari data   
        console.log('cekEmailuser'); 
        if (result == null) {
            respondError422(res, next, 'Email anda tidak terdaftar pada aplikasi')
        } else {
            console.log(result);
            await insertDataSementara(req, res, next, result)
        }
}

const insertDataSementara = async (req, res, next, result) => {
        const idx = uniqid()
        console.log('insertData sementara'); 
        const result2 =  await redisClient.set(
            `reset_account:${idx}`, 
            JSON.stringify({
                email           :req.body.email, 
                newpassword     :req.body.newpassword, 
                confirmPassword :req.body.confirmPassword, 
                _id             :result._id, 
                id              :result.id
                }), 
            { EX: 15 * 60 }
        );
        const enkripID = await enkripsi(idx)
        kirimEmail(req, res, next, enkripID, result) 
}

const enkripsi = (id) => {
    return new Promise(async (resolve, reject) => {
        const encryptedString = cryptr.encrypt(id); 
        resolve(encryptedString) 
    })

}
const dekripsi = (id) => {
    return new Promise( (resolve, reject) => { 
        const decryptedString = cryptr.decrypt(id);        
        resolve(decryptedString)  
    })
} 

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

// ===================================== Reset passwd =====================================


module.exports = router;