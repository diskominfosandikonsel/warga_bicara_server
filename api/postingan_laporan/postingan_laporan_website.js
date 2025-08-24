const express = require('express')
const router = express.Router()
const {getCollection} = require('../../db/mongodb/controller') 
const uniqid = require('uniqid')

var upload = require('../../library/multer/fileMulter');
const IMAGE = require('../../library/multer/image');
const { ObjectId } = require('mongodb');






router.post('/viewData', async (req, res, next) => { 
  try {
    const post = await getCollection('post');
    const page = parseInt(req.body.page) || 1;
    const limit = 10;
    const cari = req.body.cari || '';

    const pipeline = [
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

    const results = await post.aggregate(pipeline).toArray();

    // Hitung total data (tanpa $skip dan $limit)
    const totalData = await post.countDocuments({
      title: { $regex: cari, $options: 'i' }
    });

    res.status(200).json({
      currentPage: page,
      totalPage: Math.ceil(totalData / limit),
      totalData,
      data: results
    });
  } catch (error) {
    console.error('Gagal mengambil data post:', error);
    res.status(500).json({ message: 'Gagal mengambil data' });
  }
})


async function simpanupdateKeterangan(data, idnya, req) {
  try { 
    const post = await getCollection('post_keterangan');
    await post.updateOne({ post_id :idnya }, 
        { $set: { 
                    status         : data.status, // Status 3 = Ditolak              
                    keterangan     : data.keterangan,
                    user_id        : req.user.id
                }
        })
    return true;
  } catch (error) {
    console.error("Gagal menyimpan simpanLokasi:", error);
    throw error;
  }
}

async function delegasikeopd(data, idnya) {
  try {

    console.log("delegasikeopd");
    console.log(data);
    

    var payload = {
      _id: new ObjectId(), // MongoDB ObjectId
      id: uniqid(), // Custom ID
      post_id: idnya,           // ID dari laporan
      master_unit_kerja_id: data.unit_kerja_id,   // Latitude
      status: data.status  // Longitude
    }


    const post_handle = await getCollection('post_handle');
    await post_handle.updateOne({ post_id: idnya }, payload, { upsert: true });

    // await post_handle.insertOne(payload);
    // responQuery(post_handle, req, res, next, "Data berhasil ditambahkan", "Data gagal ditambahkan");

    return true;
  } catch (error) {
    console.error("Gagal menyimpan simpanLokasi:", error);
    throw error;
  }
}



router.post('/tolakAduanDaerah', upload.fields([{ name: 'file', maxCount: 5 }]), async (req, res, next) => {
    const data = req.body; 
          data.status = 3; // Status 3 = Ditolak
    const post = await getCollection('post');
    const result = await post.updateOne({ id :data.id }, 
        { $set: { 
                    status         : data.status, // Status 3 = Ditolak              
                }
        }) 

    var simpanKeterangan = await simpanupdateKeterangan(data, data.id, req)
    if(simpanKeterangan===false){
      console.log('Gagal menyimpan keterangan');
    }
    responQuery(result, req, res, next, "Data berhasil Dikembalikan", "Data gagal Dikembalikan"); 
 
});

router.post('/terimaAduanDaerah', upload.fields([{ name: 'file', maxCount: 5 }]), async (req, res, next) => {
  // Tambah data opd penerima
  // Delegasi Aduan = 2
    console.log(req.body);

    const data = req.body; 
          data.status = 2; // Status 2 = Diterima
          data.keterangan = "";
    const post = await getCollection('post');
    const result = await post.updateOne({ id :data.id }, 
        { $set: { 
                    status         : data.status, // Status 2 = Delegasi              
                }
        }) 

    var simpanKeterangan = await simpanupdateKeterangan(data, data.id, req)
    if(simpanKeterangan===false){
      console.log('Gagal menyimpan keterangan');
    }

    var delegasikeopdx = await delegasikeopd(data, data.id, req)
    if(delegasikeopdx===false){
      console.log('Gagal delegasikeopd');
    }
    responQuery(result, req, res, next, "Data berhasil Di Delegasikan", "Data gagal Di Delegasikan");   
  
})

router.post('/viewDataOPD', async (req, res, next) => { 
  try {
    const post = await getCollection('post');
    const page = parseInt(req.body.page) || 1;
    const limit = 10;
    const cari = req.body.cari || '';

    const pipeline = [
      {
        $match: {
          user_id: req.user.id,
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

    const results = await post.aggregate(pipeline).toArray();

    // Hitung total data (tanpa $skip dan $limit)
    const totalData = await post.countDocuments({
      title: { $regex: cari, $options: 'i' }
    });

    res.status(200).json({
      currentPage: page,
      totalPage: Math.ceil(totalData / limit),
      totalData,
      data: results
    });
  } catch (error) {
    console.error('Gagal mengambil data post:', error);
    res.status(500).json({ message: 'Gagal mengambil data' });
  }
})


router.post('/tolakAduanOpd', upload.fields([{ name: 'file', maxCount: 5 }]), async (req, res, next) => {
    const data = req.body; 
          data.status = 3; // Status 3 = Ditolak
    const post = await getCollection('post');
    const result = await post.updateOne({ id :data.id }, 
        { $set: { 
                  status : data.status, // Status 3 = Ditolak              
                }
        }) 
    var simpanKeterangan = await simpanupdateKeterangan(data, data.id, req)
    if(simpanKeterangan===false){
      console.log('Gagal menyimpan keterangan');
    }
    responQuery(result, req, res, next, "Data berhasil Dikembalikan", "Data gagal Dikembalikan");  
});

router.post('/terimaAduanOpd', upload.fields([{ name: 'file', maxCount: 5 }]), async (req, res, next) => {
  // Tambah data opd penerima
  // Delegasi Aduan = 2
})

router.post('/chatBox', upload.fields([{ name: 'file', maxCount: 5 }]), async (req, res, next) => {
  // Tambah data opd penerima
  // Delegasi Aduan = 2
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