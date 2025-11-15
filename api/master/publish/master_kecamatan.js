const express = require('express')
const router = express.Router()
const {getCollection} = require('../../../db/mongodb/controller') 
const uniqid = require('uniqid')


const dbegov = require('../../../db/mysql/egov')


router.post('/list', async(req, res, next) =>{

    var data = req.body

    var filter = ''

    if (data.cari == '' || data.cari == undefined || data.cari == null) {
        filter= ''
    } else {
        filter = `AND LOWER(master_kecamatan.nama_kecamatan) LIKE LOWER('%`+data.cari+`%') `
    }

    var query = `   
                    SELECT master_kecamatan.*,
                    master_kabupaten.nama_kabupaten AS nama_kabupaten,
                    master_provinsi.nama_provinsi AS nama_provinsi
                    FROM master_kecamatan 
                    LEFT JOIN master_kabupaten 
                    ON master_kecamatan.kabupaten_id = master_kabupaten.kabupaten_id
                    LEFT JOIN master_provinsi 
                    ON master_kabupaten.provinsi_id = master_provinsi.provinsi_id
                    WHERE master_kecamatan.kabupaten_id = `+data.kabupaten_id+`
                    `+filter+`
                    ORDER BY master_kecamatan.nama_kecamatan ASC 
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