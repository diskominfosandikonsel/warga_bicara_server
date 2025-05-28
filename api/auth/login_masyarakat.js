const express = require('express');
const router = express.Router();
const {connectMongo} = require('../../db/mongodb/connection')
const uniqid =  require('uniqid');
const Joi = require('joi');
const bcrypt = require('bcryptjs');
const CryptoJS = require('crypto-js');

const {getCollection} = require('../../db/mongodb/controller')


router.post('/login', async (req, res) => {
    // Ganti ini dengan kunci rahasia Anda

    const CryptoJS = require('crypto-js');
const secretKey = global.SecretKey;

// Fungsi untuk mengenkripsi
function encryptAES(plainText, key) {
  return CryptoJS.AES.encrypt(plainText, key).toString();
}

// Fungsi untuk mendekripsi
function decryptAES(cipherText, key) {
  const bytes = CryptoJS.AES.decrypt(cipherText, key);
  return bytes.toString(CryptoJS.enc.Utf8);
}

// Contoh penggunaan
const pesanAsli = req.body.username;
const terenkripsi = encryptAES(pesanAsli, secretKey);
const terdekripsi = decryptAES(terenkripsi, secretKey);

console.log('Teks Asli     :', pesanAsli);
console.log('Terenkripsi   :', terenkripsi);
console.log('Terdekripsi   :', terdekripsi);

})

module.exports = router;