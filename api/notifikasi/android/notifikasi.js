const express = require('express')
const router = express.Router()
const { getCollection } = require('../../../db/mongodb/controller')
const uniqid = require('uniqid')

var upload = require('../../../library/multer/fileMulter');
const IMAGE = require('../../../library/multer/image');
const { ObjectId } = require('mongodb');
const dbegov = require('../../../db/mysql/simpeg')





router.post('/viewData', async (req, res, next) => {

  try {
    const post = await getCollection('notifikasi');
    const page = parseInt(req.body.page) || 1;
    const limit = 10;
    const cari = req.body.cari || '';

    // const { master_kategori_laporan_id, master_kategori_laporan_sub_id, status } = req.body;

    const filter = {};

    filter.user_id = req.user.id;

    // if (cari) {
    //   filter.title = { $regex: cari, $options: 'i' };
    // }
    // if (master_kategori_laporan_id) {
    //   filter.master_kategori_id = master_kategori_laporan_id;
    // }
    // if (master_kategori_laporan_sub_id) {
    //   filter.master_sub_kategori_id = master_kategori_laporan_sub_id;
    // }
    // if (status) {
    //   filter.status = parseInt(status);
    // }

    // console.log('Filter yang digunakan:', filter);
     

    const pipeline = [
      // Filter judul
      {
        // $match: {
        //   title: { $regex: cari, $options: "i" }
        // }
        $match: filter
      },
      

      {
        $lookup: {
          from: 'post',
          localField: 'post_id',
          foreignField: 'id',
          as: 'post'
        }
      },      
      

      // Sort + paging
      { $sort: { created_at: -1 } },
      { $skip: (page - 1) * limit },
      { $limit: limit }
    ];

    const results = await post.aggregate(pipeline).toArray();

    // Hitung total data (tanpa $skip dan $limit)
    const totalData = await post.countDocuments({
      title: { $regex: cari, $options: 'i' }
    });

    res.status(200).json({
      currentPage: page,
      totalPage: Math.ceil(totalData / limit),
      totalData,
      data: results,

    });
  } catch (error) {
    console.error('Gagal mengambil data post:', error);
    res.status(500).json({ message: 'Gagal mengambil data' });
  }

})


router.post('/readNotif', async (req, res, next) => {
    const data = req.body; 
    const notifikasi = await getCollection('notifikasi');
    const result = await notifikasi.updateOne({ id :data.id }, 
        { $set: { 
                    read         : true
                }
        }) 
    responQuery(result, req, res, next, "notifikasi berhasil diupdate", "notifikasi gagal diupdate");
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