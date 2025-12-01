const express = require('express')
const router = express.Router()
const { getCollection } = require('../../db/mongodb/controller')
const uniqid = require('uniqid')

var upload = require('../../library/multer/fileMulter');
const IMAGE = require('../../library/multer/image');
const { ObjectId } = require('mongodb');
const dbegov = require('../../db/mysql/simpeg');
const id = require('volleyball/lib/id');





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

router.post('/tolakAduanDaerah', upload.fields([{ name: 'file', maxCount: 5 }]), async (req, res, next) => {
  const data = req.body;
  data.status = 3; // Status 3 = Ditolak
  const post = await getCollection('post');
  const result = await post.updateOne({ id: data.id },
    {
      $set: {
        status: data.status, // Status 3 = Ditolak              
      }
    })

  var simpanKeterangan = await simpanupdateKeterangan(data, data.id, req)
  if (simpanKeterangan === false) {
    console.log('Gagal menyimpan keterangan');
  }

  const notificationData = await sendNotification(data.id, 1, 'Laporan Dikembalikan ', 'Laporan anda dikembalikan', data.keterangan, data, false)
  if (notificationData===false) {
      console.log('gagal mengirim notificationData');
  }  

  responQuery(result, req, res, next, "Data berhasil Dikembalikan", "Data gagal Dikembalikan");

});

router.post('/terimaAduanDaerah', upload.fields([{ name: 'file', maxCount: 5 }]), async (req, res, next) => {
  // Tambah data opd penerima
  // Delegasi Aduan = 2
  console.log(req.body);

  const data = req.body;
  data.status = 2; // Status 2 = Diterima
  data.created_at = new Date()
  // data.keterangan = "";
  const post = await getCollection('post');
  const result = await post.updateOne({ id: data.id },
    {
      $set: {
        status: data.status, // Status 2 = Delegasi              
        master_kategori_id: data.master_kategori_laporan_id,
        master_sub_kategori_id: data.master_kategori_laporan_sub_id,
        master_kec_id: data.master_kec_id,
        master_deskel_id: data.master_deskel_id
      }
    })

  var simpanKeterangan = await simpanupdateKeterangan(data, data.id, req)
  if (simpanKeterangan === false) {
    console.log('Gagal menyimpan keterangan');
  }

  var delegasikeopdx = await delegasikeopd(data, data.id, req)
  if (delegasikeopdx === false) {
    console.log('Gagal delegasikeopd');
  }

  const notificationData = await sendNotification(data.id, 1, 'Laporan Diterima ', 'Dokumen sudah di disposisi di opd terkait', 'Dokumen sudah di disposisi ke opd Terkait. Silahkan komunikasi langsung ke opd terkait melalui chat', data, false)
  if (notificationData===false) {
    console.log('gagal mengirim notificationData');
  }  

  responQuery(result, req, res, next, "Data berhasil Di Delegasikan", "Data gagal Di Delegasikan");

})



router.post('/viewDataOPD', async (req, res, next) => {

  // var opds = getOPD({unit_kerja_id:"EtTbFb6EzYZt9mMJL"});
  try {
    const post = await getCollection('post');
    const page = parseInt(req.body.page) || 1;
    const limit = 10;
    const cari = req.body.cari || '';
    const unit_kerja_id = req.user.auth.master_unit_kerja_id; //Get ID Master Unit Kerja
    const userId = req.user.id;
    const laporanId = req.body.tabel_id;


    const pipeline = [
      {
        $match: {
          tabel_id: laporanId
        }
      },
      // Filter judul
      {
        $match: {
          title: { $regex: cari, $options: "i" }
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
      {
        $match: {
          "post_handle.master_unit_kerja_id": unit_kerja_id
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
      currentUserId: userId // Tambahkan baris ini
    });
  } catch (error) {
    console.error('Gagal mengambil data post:', error);
    res.status(500).json({ message: 'Gagal mengambil data' });
  }
})

router.post('/tolakAduanOpd', upload.fields([{ name: 'file', maxCount: 5 }]), async (req, res, next) => {
  const data = req.body;
  data.status = 7; // Status 3 = Ditolak
  const post = await getCollection('post');
  const result = await post.updateOne({ id: data.id },
    {
      $set: {
        status: data.status, // Status 3 = Ditolak              
      }
    })

  var simpanKeterangan = await simpanupdateKeterangan(data, data.id, req)
  if (simpanKeterangan === false) {
    console.log('Gagal menyimpan keterangan');
  }
  responQuery(result, req, res, next, "Data berhasil Dikembalikan", "Data gagal Dikembalikan");
});

router.post('/terimaAduanOpd', upload.fields([{ name: 'file', maxCount: 5 }]), async (req, res, next) => {

  console.log(req.body);

  const data = req.body;
  data.status = 4; // tindak lanjut dengan opd yang bersangkutan
  const post = await getCollection('post');
  const result = await post.updateOne({ id: data.id },
    {
      $set: {
        status: data.status,
      }
    })

    const notificationData = await sendNotification(data.id, 2, 'Laporan Diterima ', 'Laporan anda sudah di terima oleh opd', 'Laporan sudah di disposisi ke opd Terkait. Silahkan komunikasi langsung ke opd terkait melalui chat', data, false)
    if (notificationData===false) {
      console.log('gagal mengirim notificationData');
    }    

  responQuery(result, req, res, next, "Data berhasil diterima", "Data gagal diterima");
})

router.post('/chat_view', upload.fields([{ name: 'file', maxCount: 5 }]), async (req, res, next) => {

  try {
    const post = await getCollection('chat');
    const page = parseInt(req.body.page) || 1;
    const limit = 10;
    const cari = req.body.cari || '';
    const laporanId = req.body.post_id;

    console.log("======================");
    console.log(laporanId);
    console.log("======================");

    const pipeline = [
      {
        $match: {
          post_id: laporanId
        }
      },
      // Filter judul
      {
        $match: {
          pesan: { $regex: cari, $options: "i" }
        }
      },
      {
        $lookup: {
          from: "users",
          localField: "created_by",
          foreignField: "id",
          as: "createdBy"
        }
      },
      {
        $set: {
          createdBy: { $arrayElemAt: ["$createdBy.nama", 0] }
        }
      },

      // Sort + paging
      { $sort: { created_at: -1 } }
    ];

    const results = await post.aggregate(pipeline).toArray();

    res.status(200).json({
      data: results,
    });
  } catch (error) {
    console.error('Gagal mengambil data post:', error);
    res.status(500).json({ message: 'Gagal mengambil data' });
  }
})

router.post('/chat_send', upload.fields([{ name: 'file', maxCount: 5 }]), async (req, res, next) => {
  var data = JSON.parse(req.body.data);
  // console.log(data);
  
  data.id = uniqid()
  data.created_by = req.user.id
  data.created_at = new Date()
  const chat = await getCollection('chat');
  const result = await chat.insertOne(data);
  responQuery(result, req, res, next, "Data berhasil ditambahkan", "Data gagal ditambahkan");
})

router.post('/chat_delete', async (req, res, next) => {
  const data = req.body;
  const idx = data.id;
  console.log("==================");
  console.log(idx);
  console.log("==================");

  if (!idx) {
    return res.status(400).json({ message: "ID data tidak ditemukan" });
  }

  try {
    const chat = await getCollection('chat'); 

    // dilakukan pencarian data
    const findChat = await chat.findOne({ id: idx }); 

    console.log("Data 'chat' yang akan dihapus:", findChat); 
    console.log(`--------------------------------------------\n`);

    const [
      resultChat
    ] = await Promise.all([
      chat.deleteOne({ id: idx })
    ]);
    
    if (resultChat.deletedCount === 0) {
      // Jika post utama tidak ditemukan, kembalikan pesan error
      return res.status(404).json({
        action: 'remove',
        message: 'Data post yang ingin dihapus tidak ditemukan'
      });
    }

    // Buat objek hasil gabungan untuk dikirim ke `responQuery`
    const finalResult = {
      deletedCount: resultChat.deletedCount
    };

    responQuery(finalResult, req, res, next, "Data berhasil dihapus", "Data gagal dihapus");

  } catch (err) {
    console.error('Error saat menghapus data:', err);
    return res.status(500).json({
      message: 'Terjadi kesalahan saat menghapus data.'
    });
  }
});


router.post('/removeData', async (req, res, next) => {
  const data = req.body;
  const idx = data.id;
  console.log("==================");
  console.log(idx);
  console.log("==================");

  if (!idx) {
    return res.status(400).json({ message: "ID data tidak ditemukan" });
  }

  try {
    const post = await getCollection('post');
    const post_lokasi = await getCollection('post_lokasi');
    const post_handle = await getCollection('post_handle');
    const post_keterangan = await getCollection('post_keterangan');
    const lampiran = await getCollection('lampiran');

    // dilakukan pencarian data
    const findPost = await post.findOne({ id: idx });
    const findLokasi = await post_lokasi.find({ post_id: idx }).toArray();
    const findHandle = await post_handle.find({ post_id: idx }).toArray();
    const findKeterangan = await post_keterangan.find({ post_id: idx }).toArray();
    const findLampiran = await lampiran.find({ tabel_id: idx, tabel: 'post' }).toArray();

    console.log("Data 'post' yang akan dihapus:", findPost);
    console.log("Data 'post_lokasi' yang akan dihapus:", findLokasi);
    console.log("Data 'post_handle' yang akan dihapus:", findHandle);
    console.log("Data 'post_keterangan' yang akan dihapus:", findKeterangan);
    console.log("Data 'lampiran' yang akan dihapus:", findLampiran);
    console.log(`--------------------------------------------\n`);

    const [
      resultPost,
      resultPostLokasi,
      resultPostHandle,
      resultPostKeterangan,
      resultLampiran
    ] = await Promise.all([
      post.deleteOne({ id: idx }),

      // menghapus isi tabel yang id nya sama dengan id post
      post_lokasi.deleteMany({ post_id: idx }),
      post_handle.deleteMany({ post_id: idx }),
      post_keterangan.deleteMany({ post_id: idx }),

      // Menghapus lampiran, dengan kondisi tabel_id dan tabel
      lampiran.deleteMany({ tabel_id: idx, tabel: 'post' })
    ]);

    // Periksa apakah data 'post' utama berhasil dihapus
    if (resultPost.deletedCount === 0) {
      // Jika post utama tidak ditemukan, kembalikan pesan error
      return res.status(404).json({
        action: 'remove',
        message: 'Data post yang ingin dihapus tidak ditemukan'
      });
    }

    // Buat objek hasil gabungan untuk dikirim ke `responQuery`
    const finalResult = {
      deletedCount: resultPost.deletedCount,
      post_lokasi_count: resultPostLokasi.deletedCount,
      post_handle_count: resultPostHandle.deletedCount,
      post_keterangan_count: resultPostKeterangan.deletedCount,
      lampiran_count: resultLampiran.deletedCount
    };

    responQuery(finalResult, req, res, next, "Data berhasil dihapus", "Data gagal dihapus");

  } catch (err) {
    console.error('Error saat menghapus data:', err);
    return res.status(500).json({
      message: 'Terjadi kesalahan saat menghapus data.'
    });
  }
});


async function simpanupdateKeterangan(data, idnya, req) {
  try {
    const post = await getCollection('post_keterangan');
    await post.updateOne({ post_id: idnya },
      {
        $set: {
          status: data.status, // Status 3 = Ditolak / 6 = kembalikan ke admin daerah
          keterangan: data.keterangan,
          created_at: new Date(),
          user_id: req.user.id
        },
      },
      { upsert: true } // Untuk memasukkan data ke dalam tabel post_keterangan
    )
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
      // _id: new ObjectId(), // MongoDB ObjectId
      id: uniqid(), // Custom ID
      post_id: idnya,           // ID dari laporan
      master_unit_kerja_id: data.unit_kerja_id,   // Latitude
      status: data.status,  // Longitude
      created_at: new Date()
    }


    const post_handle = await getCollection('post_handle');
    await post_handle.updateOne({ post_id: idnya }, { $set: payload, $setOnInsert: { _id: new ObjectId() } }, { upsert: true });

    // await post_handle.insertOne(payload);
    // responQuery(post_handle, req, res, next, "Data berhasil ditambahkan", "Data gagal ditambahkan");

    return true;
  } catch (error) {
    console.error("Gagal menyimpan simpanLokasi:", error);
    throw error;
  }
}

async function simpanfile(datafile, idLaporan) {
  try {
    const lampiran = await getCollection('lampiran');

    // Batasi maksimal 5 file saja
    const files = datafile.slice(0, 5);

    for (const element of files) {
      // Resize gambar (jika fungsi async)
      await IMAGE.resizeImg(element.filename);

      const payload = {
        _id: new ObjectId(),       // MongoDB ObjectId
        id: uniqid(),             // Custom ID
        tabel: "post",
        tabel_id: idLaporan,
        file: element.filename,
        filetype: element.mimetype,
        filethumbnail: "thumbnail" + element.filename
      };

      const result = await lampiran.insertOne(payload);
      console.log("Inserted:", result.insertedId);
    }

    return true;
  } catch (error) {
    console.error("Gagal menyimpan file:", error);
    throw error;
  }
}

function getOPD(paramsx) {
  // Implementasi fungsi untuk mendapatkan data OPD
  let data = paramsx;
  let whereClauses = [];
  let params = [];

  console.log("getOPD");
  console.log(data);


  // Filter berdasarkan unit_kerja_id
  if (data.unit_kerja_id) {
    whereClauses.push(` unit_kerja.id = '` + data.unit_kerja_id + `' `);
    params.push(data.unit_kerja_id);
  }

  // Filter berdasarkan pencarian
  if (data.cari) {
    whereClauses.push(`LOWER(unit_kerja.unit_kerja) LIKE LOWER('%` + data.cari + `%')`);
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
                    `+ whereClause + ` 
                    ORDER BY unit_kerja.unit_kerja ASC 
                `

  dbegov.query(query, (err, row) => {
    if (err) {
      console.log(err);
      res.send(err);
    } else {
      // res.send(row);
      console.log(row[0]);
      return row[0];
    }
  })
}

router.post('/startChat', async (req, res, next) => {

  try { 
    const notificationData = await sendNotification('post_id', 'type', 'type_notif', 'title', 'message', 'data', false)
    if (notificationData===false) {
      console.log('gagal mengirim notificationData');
    }
    console.log('sukses mengirim notificationData');
    
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Server error' });
  }

  console.log('Do next process here...');
  res.send({ success: true, message: 'Process completed' });
  
  
});


sendNotification = async (post_id, type, type_notif, title, message, data, read) => {
  
    const post = await getCollection('post');
    const findPost = await post.findOne({ id: post_id }) 
    const hasilcari= findPost 
    

    try {
    const datax = {
                    id          : uniqid(),
                    post_id     : post_id,
                    user_id     : hasilcari.user_id,
                    type        : type,
                    type_notif  : type_notif,
                    title       : title,
                    message     : message,
                    read        : read,
                    data        : data,
                    created_at  : new Date()
                  } 
      const notifikasi  = await getCollection('notifikasi');
      const result      = await notifikasi.insertOne(datax);                  
      console.log('sendNotification data ==> ');
      console.log(data);

      if(result.acknowledged===true)
        console.log('sendNotification berhasil'); 
        return true
    } catch (error) {
        console.log('sendNotification error:', error);
        return false; 
    } 
}



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