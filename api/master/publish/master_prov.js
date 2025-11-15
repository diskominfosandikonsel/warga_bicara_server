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
        filter = `WHERE LOWER(master_provinsi.nama_provinsi) LIKE LOWER('%`+data.cari+`%') `
    }

    var query = `   SELECT * 
                    FROM master_provinsi 
                    `+filter+`
                    ORDER BY master_provinsi.nama_provinsi ASC 
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