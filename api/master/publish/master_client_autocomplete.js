const express = require('express')
const router = express.Router()
const {getCollection} = require('../../../db/mongodb/controller') 
const uniqid = require('uniqid')


const simpeg = require('../../../db/mysql/simpeg')
const dbegov = require('../../../db/mysql/egov')


// ========== AGAMA ==========
router.post('/autocomplete_agama', async (req, res, next) => {
  try {
    const master_agama = await getCollection('master_agama');

    // Ambil keyword dari body, dan pastikan berbentuk string
    const { cari} = req.body;

    // Bangun filter pencarian (case-insensitive regex)
    const filter = cari
      ? { uraian: { $regex: cari, $options: 'i' } }
      : {};

    // Ambil data maksimal 10 untuk keperluan autocomplete
    const result = await master_agama
      .find(filter)
      .sort({ urutan: 1 })
      .toArray();

    if (result.length <= 0) {
      res.status(404).json({ message: "Data tidak ditemukan" });
    } else {
      res.json(result);
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Terjadi kesalahan pada server" });
  }
});
// ========== AGAMA ==========


// ========== UNIT KERJA ==========
router.post('/list unitKerja', async(req, res, next) =>{ 

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

    simpeg.query(query, (err, row)=>{
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

    simpeg.query(query, (err, row)=>{
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
// ========== UNIT KERJA ==========

// ========== WILAYAH ==========
router.post('/list_provinsi', async(req, res, next) =>{

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

router.post('/list_kabupaten', async(req, res, next) =>{

    var data = req.body

    var filter = ''

    if (data.cari == '' || data.cari == undefined || data.cari == null) {
        filter= ''
    } else {
        filter = `WHERE LOWER(master_kabupaten.nama_kabupaten) LIKE LOWER('%`+data.cari+`%') OR master_kabupaten.provinsi_id = '`+data.cari+`' `
    }

    var query = `   
                    SELECT master_kabupaten.*,
                    master_provinsi.nama_provinsi AS nama_provinsi 
                    FROM master_kabupaten 
                    LEFT JOIN master_provinsi 
                    ON master_kabupaten.provinsi_id = master_provinsi.provinsi_id
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

router.post('/list_kecamatan', async(req, res, next) =>{

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

router.post('/list_desa_kelurahan', async(req, res, next) =>{

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
// ========== WILAYAH ==========

// ========== JENIS KELAMIN ==========
router.post('/autocomplete_jenis_kelamin', async (req, res, next) => {
  try {
    const master_jeniskelamin = await getCollection('master_jeniskelamin');

    // Ambil keyword dari body, dan pastikan berbentuk string
    const { cari} = req.body;

    // Bangun filter pencarian (case-insensitive regex)
    const filter = cari
      ? { uraian: { $regex: cari, $options: 'i' } }
      : {};

    // Ambil data maksimal 10 untuk keperluan autocomplete
    const result = await master_jeniskelamin
      .find(filter)
      .sort({ urutan: 1 })
      .limit(10)
      .toArray();

    if (result.length <= 0) {
      res.status(404).json({ message: "Data tidak ditemukan" });
    } else {
      res.json(result);
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Terjadi kesalahan pada server" });
  }
});
// ========== JENIS KELAMIN ==========

// ========== JENIS PEKERJAAN ==========
router.post('/autocomplete_jenis_pekerjaan', async (req, res, next) => {
  try {
    const master_pekerjaan = await getCollection('master_pekerjaan');

    // Ambil keyword dari body, dan pastikan berbentuk string
    const { cari} = req.body;

    // Bangun filter pencarian (case-insensitive regex)
    const filter = cari
      ? { uraian: { $regex: cari, $options: 'i' } }
      : {};

    // Ambil data maksimal 10 untuk keperluan autocomplete
    const result = await master_pekerjaan
      .find(filter)
      .sort({ urutan: 1 })
      .limit(10)
      .toArray();

    if (result.length <= 0) {
      res.status(404).json({ message: "Data tidak ditemukan" });
    } else {
      res.json(result);
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Terjadi kesalahan pada server" });
  }
});
// ========== JENIS PEKERJAAN ==========

// ========== JENIS PENDIDIKAN ==========
router.post('/autocomplete_jenis_pendidikan', async (req, res, next) => {
  try {
    const master_pendidikan = await getCollection('master_pendidikan');

    // Ambil keyword dari body, dan pastikan berbentuk string
    const { cari} = req.body;

    // Bangun filter pencarian (case-insensitive regex)
    const filter = cari
      ? { uraian: { $regex: cari, $options: 'i' } }
      : {};

    // Ambil data maksimal 10 untuk keperluan autocomplete
    const result = await master_pendidikan
      .find(filter)
      .sort({ urutan: 1 })
      .limit(10)
      .toArray();

    if (result.length <= 0) {
      res.status(404).json({ message: "Data tidak ditemukan" });
    } else {
      res.json(result);
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Terjadi kesalahan pada server" });
  }
});
// ========== JENIS PENDIDIKAN ==========

module.exports = router