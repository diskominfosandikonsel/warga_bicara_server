const express = require('express')
const router = express.Router()
const {getCollection} = require('../../db/mongodb/controller') 
const uniqid = require('uniqid')


const dbegov = require('../../db/mysql/simpeg')

// biodata.unit_kerja
// unit_kerja.id

router.post('/list', async(req, res, next) =>{ 

    let data            = req.body;
    let whereClauses    = [];
    let params          = [];

    // Filter berdasarkan unit_kerja_id
    if (data.unit_kerja_id) {
        whereClauses.push(` unit_kerja.id = '`+data.unit_kerja_id+`' `);
        params.push(data.unit_kerja_id);
    }

    // Filter berdasarkan pencarian
    if (data.cari) {
        whereClauses.push(`LOWER(unit_kerja.unit_kerja) LIKE LOWER('%`+data.cari+`%')`);
        params.push(data.cari);
    }    

    // Gabungkan klausa WHERE jika ada
    let whereClause = '';
    if (whereClauses.length > 0) {
        whereClause = 'WHERE ' + whereClauses.join(' AND ');
    }
    

    var query = `   
                    SELECT * 
                    FROM unit_kerja  
                    `+whereClause+` 
                    ORDER BY unit_kerja.unit_kerja ASC 
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


router.post('/nip_unitkerja', async(req, res, next) =>{ 
    let data            = req.body;
    let whereClauses    = [];
    let params          = [];

    // Filter berdasarkan unit_kerja_id
    if (data.nip) {
        whereClauses.push(` biodata.nip = '`+data.nip+`' `);
        params.push(data.nip);
    }

    // Gabungkan klausa WHERE jika ada
    let whereClause = '';
    if (whereClauses.length > 0) {
        whereClause = 'WHERE ' + whereClauses.join(' AND ');
    }
    

    var query = `   

                    SELECT biodata.*,
                    unit_kerja.id AS unit_kerja_id,
                    unit_kerja.unit_kerja AS nama_unit_kerja
                    FROM biodata biodata
                    LEFT JOIN unit_kerja
                    ON biodata.unit_kerja = unit_kerja.id
                    `+whereClause+` 
                    ORDER BY biodata.nama ASC 
                `

    dbegov.query(query, (err, row)=>{
        if(err) {
            console.log(err);
            res.send(err);
        }else{
            if (row.length>0) {
                res.send(row);
            }else{
                res.status(404).send(JSON.stringify({
                    messages:"Nip Tidak Terdaftar"
                }))
            }
        }
    })

})

  


module.exports = router