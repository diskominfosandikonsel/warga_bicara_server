const express = require('express')
const router = express.Router()
const {getCollection} = require('../../db/mongodb/controller') 
const uniqid = require('uniqid')

var upload = require('../../library/multer/fileMulter');
const IMAGE = require('../../library/multer/image');

const { ObjectId } = require('mongodb');
const id = require('volleyball/lib/id');






// router.post('/viewData', async (req, res, next) => { 

//   console.log("req.user.id");
//   console.log(req.user.id);
  
//   try {
//     const post = await getCollection('post');
//     const page = parseInt(req.body.page) || 1;
//     const limit = 10;
//     const cari = req.body.cari || '';
    

//     const pipeline = [
//       {
//         $match: {
//           user_id: req.user.id,
//           title: { $regex: cari, $options: 'i' } // LIKE '%search%' (case-insensitive)
//         }
//       },

//       {
//         $lookup: {
//           from: 'lampiran',
//           let: { postId: '$id' },
//           pipeline: [
//             {
//               $match: {
//                 $expr: {
//                   $and: [
//                     { $eq: ['$tabel_id', '$$postId'] },
//                     { $eq: ['$tabel', 'post'] }
//                   ]
//                 }
//               }
//             }
//           ],
//           as: 'lampiran'
//         }
//       }, 

//       {
//         $lookup: {
//           from: 'post_lokasi',
//           localField: 'id',      // field di koleksi post
//           foreignField: 'post_id', // field di koleksi post_lokasi
//           as: 'lokasi'
//         }
//       },

//       {
//         $lookup: {
//           from: 'post_keterangan',
//           localField: 'id',         // field di koleksi post
//           foreignField: 'post_id',  // field di koleksi post_keterangan
//           as: 'post_keterangan'
//         }
//       },        

//         {
//     $lookup: {
//       from: 'users',
//       localField: 'user_id',
//       foreignField: 'id',
//       as: 'createdBy'
//     }
//   },

//   {
//     $unwind: {
//       path: '$createdBy',
//       preserveNullAndEmptyArrays: true // kalau user tidak ditemukan, tetap lanjut
//     }
//   },

//   {
//     $addFields: {
//       createdBy: '$createdBy.nama' // ganti array user jadi nama string saja
//     }
//   },

//       {
//         $sort: { createdAt: -1 }
//       },
//       {
//         $skip: (page - 1) * limit
//       },
//       {
//         $limit: limit
//       }
//     ];

//     const results = await post.aggregate(pipeline).toArray();

//     console.log(results);
    

//     // Hitung total data (tanpa $skip dan $limit)
//     const totalData = await post.countDocuments({
//       title: { $regex: cari, $options: 'i' }
//     });

//     res.status(200).json({
//       currentPage: page,
//       totalPage: Math.ceil(totalData / limit),
//       totalData,
//       data: results
//     });
//   } catch (error) {
//     console.error('Gagal mengambil data post:', error);
//     res.status(500).json({ message: 'Gagal mengambil data' });
//   }
// })

router.post('/viewData', async (req, res, next) => { 
  console.log("req.user.id");
  console.log(req.user.id);
  
  try {
    const post = await getCollection('post');
    const page = parseInt(req.body.page) || 1;
    const limit = 10;
    const cari = req.body.cari || '';
    
    const pipeline = [
      {
        $match: {
          user_id: req.user.id,
          title: { $regex: cari, $options: 'i' }
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
          localField: 'id',
          foreignField: 'post_id',
          as: 'lokasi'
        }
      },

      // Update lookup post_keterangan dengan join ke users untuk info admin
      {
        $lookup: {
          from: 'post_keterangan',
          let: { postId: '$id' },
          pipeline: [
            {
              $match: {
                $expr: { $eq: ['$post_id', '$$postId'] }
              }
            },
            {
              $lookup: {
                from: 'users',
                localField: 'user_id',
                foreignField: 'id',
                as: 'admin_info'
              }
            },
            {
              $unwind: {
                path: '$admin_info',
                preserveNullAndEmptyArrays: true
              }
            },
            {
              $addFields: {
                admin_name: '$admin_info.nama'
              }
            },
            {
              $sort: { created_at: -1 }
            }
          ],
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
          preserveNullAndEmptyArrays: true
        }
      },

      {
        $addFields: {
          createdBy: '$createdBy.nama'
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

    console.log(results);
    
    // Hitung total data (tanpa $skip dan $limit)
    const totalData = await post.countDocuments({
      user_id: req.user.id,
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


async function simpanfile(datafile, idLaporan) {
  try {
    const lampiran = await getCollection('lampiran');

    // Batasi maksimal 5 file saja
    const files = datafile.slice(0, 5);

    for (const element of files) {
      // Resize gambar (jika fungsi async)
      await IMAGE.resizeImg(element.filename);

      const payload = {
        _id           : new ObjectId(),       // MongoDB ObjectId
        id            : uniqid(),             // Custom ID
        tabel         : "post",
        tabel_id      : idLaporan,
        file          : element.filename,
        filetype      : element.mimetype,
        filethumbnail : "thumbnail" + element.filename
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
async function simpanLokasi(data, idnya) {
  try {

    console.log("simpanLokasi");
    console.log(data);
    

    var payload = {
      _id: new ObjectId(), // MongoDB ObjectId
      id: uniqid(), // Custom ID
      post_id: idnya,           // ID dari laporan
      lat: data.lat,   // Latitude
      lng: data.lng  // Longitude
    }


            const post_lokasi = await getCollection('post_lokasi');
            await post_lokasi.insertOne(payload);
            // responQuery(result, req, res, next, "Data berhasil ditambahkan", "Data gagal ditambahkan");

    return true;
  } catch (error) {
    console.error("Gagal menyimpan simpanLokasi:", error);
    throw error;
  }
}
async function simpanupdateKeterangan(data, idnya, req) {
  try {

    console.log("simpanLokasi");
    console.log(data);
  
    var payload = {
      _id         : new ObjectId(), // MongoDB ObjectId
      id          : uniqid(),  
      post_id     : idnya,            
      keterangan  : data.keterangan,    
      status      : data.status,
      created_at  : new Date(),
      user_id     : req.user.id
    }

    const post_keterangan = await getCollection('post_keterangan');
    await post_keterangan.insertOne(payload);
    // responQuery(result, req, res, next, "Data berhasil ditambahkan", "Data gagal ditambahkan");

    return true;
  } catch (error) {
    console.error("Gagal menyimpan simpanLokasi:", error);
    throw error;
  }
}


router.post('/addData', upload.fields([{ name: 'file', maxCount: 5 }]), async (req, res, next) => {
  

    var data = JSON.parse(req.body.data); 

    data.id = uniqid()
    data.status       = 1
    data.publish      = false
    data.finalisasi   = false
    data.created_at   = new Date()
    data.user_id      = req.user.id 

    try {
        const uploadedFiles = req.files['file']; 

        if (uploadedFiles && uploadedFiles.length > 0) {
            // Jika ada file yang diupload, lakukan sesuatu dengan file tersebut
            // console.log('File yang diterima:', uploadedFiles.length); 
            var uploadfile =  await simpanfile(uploadedFiles, data.id);
            if(uploadfile===false){
              console.log('Gagal menyimpan file');
            }

            var simpanLokasix = await simpanLokasi(data, data.id);
            if(simpanLokasix===false){
              console.log('Gagal menyimpan lokasi');
            }
            var simpanKeterangan = await simpanupdateKeterangan(data, data.id, req);
            if(simpanKeterangan===false){
              console.log('Gagal menyimpan keterangan');
            }

            const listMenu = await getCollection('post');
            const result = await listMenu.insertOne(data);
            responQuery(result, req, res, next, "Data berhasil ditambahkan", "Data gagal ditambahkan");
            

        } else {
            console.log('Tidak ada file yang diupload');
            return res.status(400).json({ message: 'Tidak ada file yang diupload' });
        }
    } catch (err) {
        next(err);
    } 
})

router.post('/editData', upload.fields([{ name: 'file', maxCount: 5 }]), async (req, res, next) => {
  const data = JSON.parse(req.body.data); // body: { id: "...", nama: "...", dst }
  const idLaporan = data.id;

  try {
    const post = await getCollection('post');
    const lampiran = await getCollection('lampiran');

    // Update data utama
    const resultUpdate = await post.updateOne(
      { id: idLaporan },
      { $set: data }
    );

    // Kalau ada file baru
    const uploadedFiles = req.files['file'];
    if (uploadedFiles && uploadedFiles.length > 0) {

      // Ambil file lama dari database
      const fileLama = await lampiran.find({ tabel: 'post', tabel_id: idLaporan }).toArray();

      // Hapus file lama dari folder
      fileLama.forEach(item => {
        IMAGE.hapus_file(item.file);                     // file asli
        IMAGE.hapus_file(item.filethumbnail);            // thumbnail-nya
      });

      // Hapus record file lama dari DB
      await lampiran.deleteMany({ tabel: 'post', tabel_id: idLaporan });

      // Simpan file baru
      await simpanfile(uploadedFiles, idLaporan);
    }

    responQuery(resultUpdate, req, res, next, "Data berhasil diubah", "Data gagal diubah");

  } catch (err) {
    next(err);
  }
});

 

router.post('/removeData', async (req, res, next) => {

//   const { idLaporan } = req.body;

    const data = req.body;
    var idLaporan = data.id; 

  if (!idLaporan) {
    return res.status(400).json({ message: 'idLaporan wajib dikirim' });
  }
  
  try {
    const lampiran = await getCollection('lampiran');

    // Ambil semua file yang terkait
    const fileList = await lampiran.find({ tabel: 'post', tabel_id: idLaporan }).toArray();

    // Hapus file fisik
    fileList.forEach(file => {
      IMAGE.hapus_file(file.file);
      IMAGE.hapus_file(file.filethumbnail);
    });

    // Hapus data dari database
    const hapusfile = await lampiran.deleteMany({ tabel: 'post', tabel_id: idLaporan });

    const post = await getCollection('post');
    const result = await post.deleteOne({ id: idLaporan });    

    responQuery(result, req, res, next, "Data berhasil dihapus", "Data gagal dihapus");

  } catch (err) {
    console.error('Gagal menghapus lampiran:', err);
    res.status(500).json({ message: 'Gagal menghapus lampiran' });
  }
  
})


router.post('/chat_view', upload.fields([{ name: 'file', maxCount: 5 }]), async (req, res, next) => {

    try {
    const post = await getCollection('chat');
    const page = parseInt(req.body.page) || 1;
    const limit = 10;
    const cari = req.body.cari || '';
    
    const pipeline = [
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

router.post('/chat_send', async (req, res, next) => {
    var data = JSON.parse(req.body.data); 
    data.id = uniqid()
    data.created_by   = req.user.id
    data.created_at   = new Date() 
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


router.post('/get_rejection_reason', async (req, res, next) => {
  try {
    const { post_id } = req.body;
    
    if (!post_id) {
      return res.status(400).json({ 
        message: 'post_id wajib dikirim' 
      });
    }

    const post_keterangan = await getCollection('post_keterangan');
    
    // Cari keterangan dengan status 3 (ditolak) untuk post_id tertentu
    // Urutkan berdasarkan created_at terbaru
    const pipeline = [
      {
        $match: {
          post_id: post_id,
          status: 3
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: 'user_id',
          foreignField: 'id',
          as: 'admin_info'
        }
      },
      {
        $unwind: {
          path: '$admin_info',
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $addFields: {
          admin_name: '$admin_info.nama'
        }
      },
      {
        $sort: { created_at: -1 }
      },
      {
        $limit: 1  // Ambil yang terbaru saja
      }
    ];

    const result = await post_keterangan.aggregate(pipeline).toArray();
    
    if (result.length > 0) {
      res.status(200).json({
        success: true,
        data: result[0],
        keterangan: result[0].keterangan,
        admin_name: result[0].admin_name || 'Admin',
        created_at: result[0].created_at
      });
    } else {
      res.status(404).json({
        success: false,
        message: 'Keterangan penolakan tidak ditemukan'
      });
    }

  } catch (error) {
    console.error('Gagal mengambil keterangan penolakan:', error);
    res.status(500).json({ 
      success: false,
      message: 'Gagal mengambil keterangan penolakan' 
    });
  }
});

// Verifikasi laporan untuk tindak lanjut status = 5 
router.post('/verifikasi_laporan', upload.fields([{ name: 'file', maxCount: 5 }]), async (req, res, next) => {
 
  console.log('verifikasi_laporan');
  console.log(req.body);

  const data = req.body;
  data.status = 5; // Status 5 = Verifikasi
  data.created_at = new Date()
  // data.keterangan = "";
  const post = await getCollection('post');
  const result = await post.updateOne({ id: data.id },
    {
      $set: {
        status: data.status, // Status 5 = Verifikasi
      }
    })

  var simpanKeterangan = await simpanupdateKeterangan(data, data.id, req)
  if (simpanKeterangan === false) {
    console.log('Gagal menyimpan keterangan');
  }

  const notificationData = await sendNotification(data.id, 1, 'Laporan Diterima ', 'Dokumen sudah di disposisi di opd terkait', 'Dokumen sudah di disposisi ke opd Terkait. Silahkan komunikasi langsung ke opd terkait melalui chat', data, false)
  if (notificationData===false) {
    console.log('gagal mengirim notificationData');
  }  

  responQuery(result, req, res, next, "Data berhasil Di Delegasikan", "Data gagal Di Delegasikan");

})


router.post('/rating_laporan', async (req, res, next) => {
 
  console.log('verifikasi_laporan');
  console.log(req.body);

  const data = req.body;
  data.status = 6; // Status 6 = Rating
  data.created_by = req.user.id
  data.created_at = new Date()
  // data.keterangan = "";
  const post = await getCollection('post');
  const result = await post.updateOne({ id: data.post_id },
    {
      $set: {
        status: data.status, // Status 6 = Rating
      }
    })

  var simpanKeterangan = await simpanupdateKeterangan(data, data.post_id, req)
  if (simpanKeterangan === false) {
    console.log('Gagal menyimpan keterangan');
  }

  const rating = await getCollection('rating');
  const result_rating = await rating.insertOne(data);  

  // const notificationData = await sendNotification(data.id, 1, 'Laporan Diterima ', 'Dokumen sudah di disposisi di opd terkait', 'Dokumen sudah di disposisi ke opd Terkait. Silahkan komunikasi langsung ke opd terkait melalui chat', data, false)
  // if (notificationData===false) {
  //   console.log('gagal mengirim notificationData');
  // }  

  responQuery(result_rating, req, res, next, "Berhasil Melakukan Rating", "Gagal Melakukan Rating");

})




// Alternatif: Endpoint untuk mendapatkan semua keterangan suatu post
router.post('/get_post_keterangan_history', async (req, res, next) => {
  try {
    const { post_id } = req.body;
    
    if (!post_id) {
      return res.status(400).json({ 
        message: 'post_id wajib dikirim' 
      });
    }

    const post_keterangan = await getCollection('post_keterangan');
    
    const pipeline = [
      {
        $match: {
          post_id: post_id
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: 'user_id',
          foreignField: 'id',
          as: 'admin_info'
        }
      },
      {
        $unwind: {
          path: '$admin_info',
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $addFields: {
          admin_name: '$admin_info.nama'
        }
      },
      {
        $sort: { created_at: -1 }
      }
    ];

    const results = await post_keterangan.aggregate(pipeline).toArray();
    
    res.status(200).json({
      success: true,
      data: results,
      total: results.length
    });

  } catch (error) {
    console.error('Gagal mengambil history keterangan:', error);
    res.status(500).json({ 
      success: false,
      message: 'Gagal mengambil history keterangan' 
    });
  }
});


module.exports = router