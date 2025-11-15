const express = require('express')
const router = express.Router()
const {getCollection} = require('../../../db/mongodb/controller') 
const uniqid = require('uniqid')


const dbegov = require('../../../db/mysql/egov')


router.post('/list', async(req, res, next) =>{

    var data = req.body

    var filter_nama = ''

    if (data.cari == '' || data.cari == undefined || data.cari == null) {
        filter_nama= ''
    } else {
        filter_nama = `AND LOWER(master_des_kel.nama_des_kel) LIKE LOWER('%`+data.cari+`%') `
    }
    

    var query = `   
                    SELECT master_des_kel.*,
                    master_kecamatan.nama_kecamatan AS nama_kecamatan,
                    master_kabupaten.nama_kabupaten AS nama_kabupaten,
                    master_provinsi.nama_provinsi AS nama_provinsi
                    FROM master_des_kel
                    LEFT JOIN master_kecamatan
                    ON master_des_kel.kecamatan_id = master_kecamatan.kecamatan_id
                    LEFT JOIN master_kabupaten 
                    ON master_kecamatan.kabupaten_id = master_kabupaten.kabupaten_id
                    LEFT JOIN master_provinsi 
                    ON master_kabupaten.provinsi_id = master_provinsi.provinsi_id
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