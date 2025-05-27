const express = require('express');
const router = express.Router();
const Joi = require('joi');
var db = require('../db/mongodb/connection')
const {getCollection} = require('../db/mongodb/controller')

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


router.post('/cekSKey', async (req, res, next) => {
 
})

router.post('/getSKey', async (req, res, next) => {
 
})


module.exports = router;