const express = require('express')
const router = express.Router()
const {getCollection} = require('../../db/mongodb/controller') 
const uniqid = require('uniqid')

router.post('/autocomplete', async (req, res, next) => {
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

router.post('/viewData', async (req, res, next) => {
  try {
    const master_agama = await getCollection('master_agama');

    // Ambil query dari body request
    const { cari, page, limit } = req.body;

    // Buat filter pencarian berdasarkan `uraian` jika ada keyword
    const filter = cari
      ? { uraian: { $regex: cari, $options: 'i' } } // case-insensitive
      : {};

    // Hitung total data untuk keperluan pagination
    const totalItems = await master_agama.countDocuments(filter);

    // Hitung skip berdasarkan page & limit
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Query dengan filter, sort ascending by `uraian`, paginasi
    const result = await master_agama
      .find(filter)
      .sort({ uraian: 1 })
      .skip(skip)
      .limit(parseInt(limit))
      .toArray();

    if (result.length <= 0) {
      res.status(404).json({ message: "Data tidak ditemukan" });
    } else {
      res.json({
        data: result,
        totalItems,
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalItems / parseInt(limit)),
      });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Terjadi kesalahan pada server" });
  }
});

router.post('/addData', async (req, res, next) => {
    const data = req.body; 
          data.id = uniqid(); //generate id unik
    const master_agama = await getCollection('master_agama');
    const result = await master_agama.insertOne(data);
    responQuery(result, req, res, next, "Data berhasil ditambahkan", "Data gagal ditambahkan");
})

router.post('/editData', async (req, res, next) => {
    const data = req.body; 
    const master_agama = await getCollection('master_agama');
    const result = await master_agama.updateOne({ id :data.id }, 
        { $set: { 
                    uraian         : data.uraian              
                }
        }) 
    responQuery(result, req, res, next, "Data berhasil diupdate", "Data gagal diupdate");
})

router.post('/removeData', async (req, res, next) => {
    const data = req.body;
    const master_agama = await getCollection('master_agama');
    const result = await master_agama.deleteOne({ id: data.id });
    responQuery(result, req, res, next, "Data berhasil dihapus", "Data gagal dihapus");
})

const responQuery = async (result, req, res, next, successMessage, errorMessage) => {
    try {
        let action = '';

        // INSERT
        if (result.insertedId || (result.acknowledged && result.upsertedCount === 1)) {
            action = 'add';
        }

        // UPDATE
        else if (typeof result.matchedCount !== 'undefined') {
            if (result.matchedCount === 0) {
                // Tidak ada data dengan id yang dimaksud
                return res.status(404).json({
                    action: 'edit',
                    message: 'Data dengan ID tersebut tidak ditemukan'
                });
            } else if (result.modifiedCount === 0) {
                // Data ditemukan tapi tidak berubah
                return res.status(200).json({
                    action: 'edit',
                    message: 'Tidak ada perubahan data yang dilakukan'
                });
            } else {
                action = 'edit';
            }
        }

        // DELETE
        else if (typeof result.deletedCount !== 'undefined') {
            if (result.deletedCount === 0) {
                return res.status(404).json({
                    action: 'remove',
                    message: 'Data yang ingin dihapus tidak ditemukan'
                });
            } else {
                action = 'remove';
            }
        }

        // Jika berhasil dan ada aksi yang dikenali
        if (action) {
            console.log(`[${action.toUpperCase()}]`, result);
            return res.status(200).json({
                action,
                message: successMessage || `${action} success`
            });
        }

        // Fallback error
        return res.status(500).json({
            message: errorMessage || 'Operasi tidak dikenali atau gagal'
        });

    } catch (err) {
        console.error('responQuery error:', err);
        return res.status(500).json({
            message: 'Internal server error'
        });
    }

};

module.exports = router