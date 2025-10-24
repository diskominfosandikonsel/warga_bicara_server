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
    const post = await getCollection('post');
    const page = parseInt(req.body.page) || 1;
    const limit = 10;
    const cari = req.body.cari || '';

    const { master_kategori_laporan_id, master_kategori_laporan_sub_id, status } = req.body;

    const filter = {};
    if (cari) {
      filter.title = { $regex: cari, $options: 'i' };
    }
    if (master_kategori_laporan_id) {
      filter.master_kategori_id = master_kategori_laporan_id;
    }
    if (master_kategori_laporan_sub_id) {
      filter.master_sub_kategori_id = master_kategori_laporan_sub_id;
    }
    if (status) {
      filter.status = parseInt(status);
    }

    const pipelinex1 = [
      {
        $match: {
          title: { $regex: cari, $options: 'i' } // LIKE '%search%' (case-insensitive)
        }
      },

      {
        $lookup: {
          from: 'lampiran',
          let: { postId: '$id' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ['$tabel_id', '$$postId'] },
                    { $eq: ['$tabel', 'post'] }
                  ]
                }
              }
            }
          ],
          as: 'lampiran'
        }
      },

      {
        $lookup: {
          from: 'post_lokasi',
          localField: 'id',      // field di koleksi post
          foreignField: 'post_id', // field di koleksi post_lokasi
          as: 'lokasi'
        }
      },

      {
        $lookup: {
          from: 'post_keterangan',
          localField: 'id',         // field di koleksi post
          foreignField: 'post_id',  // field di koleksi post_keterangan
          as: 'post_keterangan'
        }
      },
      {
        $lookup: {
          from: 'post_handle',
          localField: 'id',         // field di koleksi post
          foreignField: 'post_id',  // field di koleksi post_handle
          as: 'post_handle'
        }
      },
      {
        $lookup: {
          from: 'unit_kerja',
          localField: 'post_handle.master_unit_kerja_id',         // field di koleksi post
          foreignField: 'id',                       // field di koleksi unit_kerja
          as: 'unit_kerja'
        }
      },

      {
        $lookup: {
          from: 'master_kategori_laporan',
          localField: 'master_kategori_id',         // field di koleksi post
          foreignField: 'id',  // field di koleksi post_keterangan
          as: 'master_kategori_uraian'
        }
      },
      {
        $unwind: {
          path: '$master_kategori_uraian',
          preserveNullAndEmptyArrays: true // kalau master_kategori_laporan_uraian tidak ditemukan, tetap lanjut
        }
      },

      {
        $addFields: {
          master_kategori_uraian: '$master_kategori_uraian.uraian' // ganti array user jadi nama string saja
        }
      },


      {
        $lookup: {
          from: 'master_kategori_laporan_sub',
          localField: 'master_sub_kategori_id',         // field di koleksi post
          foreignField: 'id',  // field di koleksi post_keterangan
          as: 'master_sub_kategori_uraian'
        }
      },
      {
        $unwind: {
          path: '$master_sub_kategori_uraian',
          preserveNullAndEmptyArrays: true // kalau master_kategori_laporan_uraian tidak ditemukan, tetap lanjut
        }
      },

      {
        $addFields: {
          master_sub_kategori_uraian: '$master_sub_kategori_uraian.uraian' // ganti array user jadi nama string saja
        }
      },



      {
        $lookup: {
          from: 'users',
          localField: 'user_id',
          foreignField: 'id',
          as: 'createdBy'
        }
      },

      {
        $unwind: {
          path: '$createdBy',
          preserveNullAndEmptyArrays: true // kalau user tidak ditemukan, tetap lanjut
        }
      },

      {
        $addFields: {
          createdBy: '$createdBy.nama' // ganti array user jadi nama string saja
        }
      },

      {
        $sort: { createdAt: -1 }
      },
      {
        $skip: (page - 1) * limit
      },
      {
        $limit: limit
      }
    ];

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
          from: 'master_kategori_laporan',
          localField: 'master_kategori_id',
          foreignField: 'id',
          as: 'kategorix'
        }
      },
      {
        $lookup: {
          from: 'master_kategori_laporan_sub',
          localField: 'master_sub_kategori_id',
          foreignField: 'id',
          as: 'sub_kategorix'
        }
      },

      // Join master_kategori_laporan → langsung ambil uraian
      {
        $lookup: {
          from: "master_kategori_laporan",
          let: { mkid: "$master_kategori_id" },
          pipeline: [
            { $match: { $expr: { $eq: ["$id", "$$mkid"] } } },
            { $project: { _id: 0, uraian: 1 } }
          ],
          as: "master_kategori_uraian"
        }
      },
      {
        $set: {
          master_kategori_uraian: { $arrayElemAt: ["$master_kategori_uraian.uraian", 0] }
        }
      },

      // Join master_kategori_laporan_sub → langsung ambil uraian
      {
        $lookup: {
          from: "master_kategori_laporan_sub",
          let: { skid: "$master_sub_kategori_id" },
          pipeline: [
            { $match: { $expr: { $eq: ["$id", "$$skid"] } } },
            { $project: { _id: 0, uraian: 1 } }
          ],
          as: "master_sub_kategori_uraian"
        }
      },
      {
        $set: {
          master_sub_kategori_uraian: { $arrayElemAt: ["$master_sub_kategori_uraian.uraian", 0] }
        }
      },

      // Join users → ambil nama
      {
        $lookup: {
          from: "users",
          localField: "user_id",
          foreignField: "id",
          as: "createdBy"
        }
      },
      {
        $set: {
          createdBy: { $arrayElemAt: ["$createdBy.nama", 0] }
        }
      },

      // Join lampiran (langsung filter di pipeline)
      {
        $lookup: {
          from: "lampiran",
          let: { postId: "$id" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$tabel_id", "$$postId"] },
                    { $eq: ["$tabel", "post"] }
                  ]
                }
              }
            },
            { $project: { _id: 0, file: 1, filetype: 1, filethumbnail: 1 } }
          ],
          as: "lampiran"
        }
      },

      // Join lokasi
      {
        $lookup: {
          from: "post_lokasi",
          localField: "id",
          foreignField: "post_id",
          as: "lokasi"
        }
      },

      // Join post_keterangan
      {
        $lookup: {
          from: "post_keterangan",
          localField: "id",
          foreignField: "post_id",
          as: "post_keterangan"
        }
      },

      // Join post_handle + unit_kerja langsung
      {
        $lookup: {
          from: "post_handle",
          let: { pid: "$id" },
          pipeline: [
            { $match: { $expr: { $eq: ["$post_id", "$$pid"] } } },
            {
              $lookup: {
                from: "unit_kerja",
                localField: "master_unit_kerja_id",
                foreignField: "id",
                as: "unit_kerja"
              }
            },
            { $unwind: { path: "$unit_kerja", preserveNullAndEmptyArrays: true } },
            {
              $project: {
                _id: 0,
                id: 1,
                master_unit_kerja_id: 1,
                status: 1,
                "unit_kerja.id": 1,
                "unit_kerja.unit_kerja": 1
              }
            }
          ],
          as: "post_handle"
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