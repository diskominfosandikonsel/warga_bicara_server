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
const { respondError422 } = require('../../library/utilitas/errorHandler');
const crypto = require('crypto');

const {getCollection} = require('../../db/mongodb/controller');
 
const Cryptr = require('cryptr');
const cryptr = new Cryptr(process.env.KEYRESETPASS);


 

 
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



router.post('/passwordM', async (req, res, next) => { 
    await cekEmailuser(req, res, next)  
})


router.get('/confirm', async (req, res, next) => { 
    const idx = req.query.token  
    const dekripsiID = await dekripsi(idx) 

    // cari database token reset password di redis
    const result_redis =  await redisClient.get(`reset_account:${dekripsiID}`);
    const hasilRedis = JSON.parse(result_redis);

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
        console.log(result); 
        if (result == null) {
            respondError422(res, next, 'Email anda tidak terdaftar pada aplikasi')
        } else {
            // console.log(result);
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