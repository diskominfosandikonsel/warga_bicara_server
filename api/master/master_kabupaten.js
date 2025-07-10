const express = require('express')
const router = express.Router()
const {getCollection} = require('../../db/mongodb/controller') 
const uniqid = require('uniqid')


const dbegov = require('../../db/mysql/egov')


router.post('/list', async(req, res, next) =>{

    var data = req.body

    var filter = ''

    if (data.cari == '' || data.cari == undefined || data.cari == null) {
        filter= ''
    } else {
        filter = `WHERE LOWER(master_kabupaten.nama_kabupaten) LIKE LOWER('%`+data.cari+`%') OR master_kabupaten.provinsi_id = '`+data.cari+`' `
    }

    var query = `   
                    SELECT * 
                    FROM master_kabupaten 
                    `+filter+`
                    ORDER BY master_kabupaten.nama_kabupaten ASC 
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