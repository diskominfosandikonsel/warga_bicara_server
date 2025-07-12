const express = require('express')
const router = express.Router()
const {getCollection} = require('../../db/mongodb/controller') 
const uniqid = require('uniqid')

router.post('/autocomplete', async (req, res, next) => {
  // try {
  //   const master_kategori_laporan_sub = await getCollection('master_kategori_laporan_sub');

  //   const { cari, master_kategori_laporan_id } = req.body;

  //   const filter = {
  //     ...(cari && { uraian: { $regex: cari, $options: 'i' } }),
  //     ...(master_kategori_laporan_id && { master_kategori_laporan_id })
  //   };

  //   const result = await master_kategori_laporan_sub
  //     .find(filter)
  //     .sort({ urutan: 1 }) 
  //     .toArray();

  //   if (result.length <= 0) {
  //     res.status(404).json({ message: "Data tidak ditemukan" });
  //   } else {
  //     res.json(result);
  //   }
  // } catch (err) {
  //   console.error(err);
  //   res.status(500).json({ message: "Terjadi kesalahan pada server" });
  // }

  try {
    const master_kategori_laporan_sub = await getCollection('master_kategori_laporan_sub');

    const { cari, master_kategori_laporan_id } = req.body;

    // Cek kalau master_kategori_laporan_id tidak dikirim
    if (!master_kategori_laporan_id) {
      return res.status(400).json({ message: "master_kategori_laporan_id wajib diisi" });
    }

    // Bangun filter: master_kategori_laporan_id wajib, cari opsional
    const filter = {
      master_kategori_laporan_id,
      ...(cari && { uraian: { $regex: cari, $options: 'i' } })
    };

    const result = await master_kategori_laporan_sub
      .find(filter)
      .sort({ urutan: 1 })
      .limit(10)
      .toArray();

    if (result.length === 0) {
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
    const master_kategori_laporan_sub = await getCollection('master_kategori_laporan_sub');

    // Ambil query dari body request
    const { cari, page, limit } = req.body;

    // Buat filter pencarian berdasarkan `uraian` jika ada keyword
    const filter = cari
      ? { uraian: { $regex: cari, $options: 'i' } } // case-insensitive
      : {};

    // Hitung total data untuk keperluan pagination
    const totalItems = await master_kategori_laporan_sub.countDocuments(filter);

    // Hitung skip berdasarkan page & limit
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Query dengan filter, sort ascending by `uraian`, paginasi
    const result = await master_kategori_laporan_sub
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
    const master_kategori_laporan_sub = await getCollection('master_kategori_laporan_sub');
    const result = await master_kategori_laporan_sub.insertOne(data);
    responQuery(result, req, res, next, "Data berhasil ditambahkan", "Data gagal ditambahkan");
})

router.post('/editData', async (req, res, next) => {
    const data = req.body; 
    const master_kategori_laporan_sub = await getCollection('master_kategori_laporan_sub');
    const result = await master_kategori_laporan_sub.updateOne({ id :data.id }, 
        { $set: { 
                    uraian         : data.uraian              
                }
        }) 
    responQuery(result, req, res, next, "Data berhasil diupdate", "Data gagal diupdate");
})

router.post('/removeData', async (req, res, next) => {
    const data = req.body;
    const master_kategori_laporan_sub = await getCollection('master_kategori_laporan_sub');
    const result = await master_kategori_laporan_sub.deleteOne({ id: data.id });
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