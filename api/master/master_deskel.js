const express = require('express')
const router = express.Router()
const {getCollection} = require('../../db/mongodb/controller') 
const uniqid = require('uniqid')


const dbegov = require('../../db/mysql/egov')


router.post('/list', async(req, res, next) =>{

    var data = req.body

    var filter_nama = ''

    if (data.cari == '' || data.cari == undefined || data.cari == null) {
        filter_nama= ''
    } else {
        filter_nama = `AND LOWER(master_des_kel.nama_des_kel) LIKE LOWER('%`+data.cari+`%') `
    }

    var query = `   
                    SELECT * 
                    FROM master_des_kel 
                    WHERE master_des_kel.kecamatan_id = `+data.kecamatan_id+`
                    `+filter_nama+`
                    ORDER BY master_des_kel.nama_des_kel ASC 
                `

    dbegov.query(query, (err, row)=>{
        if(err) {
            console.log(err);
            res.send(err);
        }else{
            res.send(row);
        }
    })

})

  


module.exports = router