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
  // console.log("req.user.id");
  // console.log(req.user.id);
  
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

      {
        $lookup: {
          from: 'tindak_lanjut_laporan',
          localField: 'id',
          foreignField: 'post_id',
          as: 'tindak_lanjut_laporan'
        }
      },

      {
        $lookup: {
          from: 'rating',
          localField: 'id',
          foreignField: 'post_id',
          as: 'rating'
        }
      },


      // === TAMBAHAN: JOIN KE COLLECTION LIKES ===
      {
        $lookup: {
          from: 'likes',
          localField: 'id',
          foreignField: 'post_id',
          as: 'likes_data'
        }
      },

      // === TAMBAHAN: JOIN KE COLLECTION COMMENTS ===
      {
        $lookup: {
          from: 'comments',
          localField: 'id',
          foreignField: 'post_id',
          as: 'comments_data'
        }
      },      

      // === JOIN post_handle + unit_kerja langsung ===
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
          createdBy: '$createdBy.nama',
          // === TAMBAHAN: HITUNG JUMLAH LIKES ===
          total_likes: { $size: '$likes_data' },
          // === TAMBAHAN: HITUNG JUMLAH COMMENTS (HANYA KOMENTAR UTAMA) ===
          total_comments: {
            $size: {
              $filter: {
                input: '$comments_data',
                as: 'comment',
                cond: { $eq: ['$$comment.parent_id', null] }
              }
            }
          }          
        }
      },

      {
        $project: {
          likes_data: 0,
          comments_data: 0
        }
      },

      {
        $sort: { createdAt: -1 }
      },
      // {
      //   $skip: (page - 1) * limit
      // },
      // {
      //   $limit: limit
      // }
    ];

    const results = await post.aggregate(pipeline).toArray();

    // console.log(results);
    
    // Hitung total data (tanpa $skip dan $limit)
    const totalData = await post.countDocuments({
      user_id: req.user.id,
      title: { $regex: cari, $options: 'i' }
    });

    res.status(200).json({
      // currentPage: page,
      // totalPage: Math.ceil(totalData / limit),
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
    console.log("====== addData =======");
    console.log(req.body);
    
    var data = JSON.parse(req.body.data); 

    data.id           = uniqid()
    data.status       = 1
    data.publish      = false
    data.finalisasi   = false
    data.created_at   = new Date()
    data.user_id      = req.user.id
    data.anonymous    = data.anonymous

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
        data.status = 1

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

    const notificationData = await sendNotification(data.post_id, 1, 'Anda memiliki pesan baru ', 'Anda memiliki pesan baru', 'Periksa Chat Anda', data, false)
    // sendNotification = async (post_id, type, type_notif, title, message, data, read)
    if (notificationData===false) {
        console.log('gagal mengirim notificationData');
    }      

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

  // const notificationData = await sendNotification(data.id, 1, 'Laporan Diterima ', 'Dokumen sudah di disposisi di opd terkait', 'Dokumen sudah di disposisi ke opd Terkait. Silahkan komunikasi langsung ke opd terkait melalui chat', data, false)
  // if (notificationData===false) {
  //   console.log('gagal mengirim notificationData');
  // }  

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

// router.post('/tindak_lanjut_laporan_viewx', async (req, res) => {
//   try {

//     const data = req.body;
//     const post_id = req.body.post_id; // ID laporan induk
//     const filter = {};
//     // if (data.post_id) {
//     //   filter.post_id = data.post_id;
//     // }
//     console.log(data);
    

//     const post = await getCollection('tindak_lanjut_laporan');

//     const pipeline = [
//       {
//         $match: {
//           post_id: post_id
//         }
//       },

//       // === JOIN KE COLLECTION LAMPIRAN ===
//       {
//         $lookup: {
//           from: "lampiran",
//           let: { postId: "$id" }, 
//           pipeline: [
//             {
//               $match: {
//                 $expr: {
//                   $and: [
//                     { $eq: ["$tabel", "tindak_lanjut_laporan"] },
//                     { $eq: ["$tabel_id", "$$postId"] }
//                   ]
//                 }
//               }
//             },
//             {
//               $project: {
//                 _id: 0,
//                 file: 1,
//                 filetype: 1,
//                 filethumbnail: 1
//               }
//             }
//           ],
//           as: "lampiran_tindak_lanjut"
//         }
//       },

//       { $sort: { created_at: -1 } }
//     ];

//     const results = await post.aggregate(pipeline).toArray();

//     res.status(200).json({
//       // tabel_id: post_id,
//       total: results.length,
//       data: results
//     });

//   } catch (error) {
//     console.error('Error:', error);
//     res.status(500).json({ message: 'Gagal mengambil data tindak lanjut + lampiran' });
//   }
// });
 
router.post('/tindak_lanjut_laporan_view', async (req, res) => {
  try {

    const data = req.body;
    const post_id = req.body.post_id; // ID laporan induk
    const filter = {};
    
    console.log(data);
    

    const post = await getCollection('tindak_lanjut_laporan');
    const post_handle = await getCollection('post_handle');

    // ====== AMBIL DATA OPD YANG MENANGANI LAPORAN ======
    const opdHandler = await post_handle.aggregate([
      {
        $match: {
          post_id: post_id
        }
      },
      {
        $lookup: {
          from: 'unit_kerja',
          localField: 'master_unit_kerja_id',
          foreignField: 'id',
          as: 'opd_info'
        }
      },
      {
        $unwind: {
          path: '$opd_info',
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $project: {
          _id: 0,
          master_unit_kerja_id: 1,
          unit_kerja_name: '$opd_info.unit_kerja',
          post_id: 1,
          created_at: 1
        }
      }
    ]).toArray();

    // ====== AMBIL DATA TINDAK LANJUT DENGAN LAMPIRAN ======
    const pipeline = [
      {
        $match: {
          post_id: post_id
        }
      },

      // === JOIN KE COLLECTION LAMPIRAN ===
      {
        $lookup: {
          from: "lampiran",
          let: { postId: "$id" }, 
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$tabel", "tindak_lanjut_laporan"] },
                    { $eq: ["$tabel_id", "$$postId"] }
                  ]
                }
              }
            },
            {
              $project: {
                _id: 0,
                file: 1,
                filetype: 1,
                filethumbnail: 1
              }
            }
          ],
          as: "lampiran_tindak_lanjut"
        }
      },

      { $sort: { created_at: -1 } }
    ];

    const results = await post.aggregate(pipeline).toArray();

    // ====== TAMBAHKAN OPD_HANDLER KE DALAM DATA ======
    const resultsWithOpdHandler = results.map(item => ({
      ...item,
      opd_handler: opdHandler
    }));

    res.status(200).json({
      total: resultsWithOpdHandler.length,
      data: resultsWithOpdHandler
    });

  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ message: 'Gagal mengambil data tindak lanjut + lampiran' });
  }
});

router.post('/addComment', async (req, res) => {
  const { post_id, parent_id = null, user_id, comment, anonymous } = req.body;
  const data = req.body;

  if (!post_id || !user_id || !comment) {
    return res.status(400).json({ message: "post_id, user_id, dan comment wajib dikirim" });
  }

  try {
    const comments = await getCollection('comments');

    const newComment = {
      id: uniqid(),
      post_id,
      parent_id: parent_id || null,
      user_id,
      comment,
      anonymous,
      created_at: new Date()
    };

    const result = await comments.insertOne(newComment);



    return res.status(200).json({
      message: parent_id ? "Reply berhasil ditambahkan" : "Comment berhasil ditambahkan",
      data: { id: result.insertedId, ...newComment }
    });

  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Terjadi kesalahan server" });
  }
});

router.post('/viewComment', async (req, res, next) => {
  try {
    const { post_id } = req.body;
    
    if (!post_id) {
      return res.status(400).json({ 
        message: 'post_id wajib dikirim' 
      });
    }

    const comments = await getCollection('comments');
    
    const pipeline = [
      {
        $match: {
          post_id: post_id,
          parent_id: null  // Ambil hanya komentar utama (bukan reply)
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: 'user_id',
          foreignField: 'id',
          as: 'user_info'
        }
      },
      {
        $unwind: {
          path: '$user_info',
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $addFields: {
          user_name: {
            $cond: [
              '$anonymous',
              'Anonim',
              '$user_info.nama'
            ]
          }
        }
      },
      {
        $lookup: {
          from: 'comments',
          let: { commentId: '$_id' },
          pipeline: [
            {
              $match: {
                $expr: { $eq: ['$parent_id', '$$commentId'] }
              }
            },
            {
              $lookup: {
                from: 'users',
                localField: 'user_id',
                foreignField: 'id',
                as: 'reply_user'
              }
            },
            {
              $unwind: {
                path: '$reply_user',
                preserveNullAndEmptyArrays: true
              }
            },
            {
              $addFields: {
                user_name: {
                  $cond: [
                    '$anonymous',
                    'Anonim',
                    '$reply_user.nama'
                  ]
                }
              }
            },
            {
              $sort: { created_at: 1 }
            }
          ],
          as: 'replies'
        }
      },
      {
        $sort: { created_at: -1 }
      }
    ];

    const results = await comments.aggregate(pipeline).toArray();
    
    res.status(200).json({
      success: true,
      data: results,
      total: results.length
    });

  } catch (error) {
    console.error('Gagal mengambil comments:', error);
    res.status(500).json({ 
      success: false,
      message: 'Gagal mengambil comments' 
    });
  }
});

router.post('/editComment', async (req, res) => {
  const { comment_id, comment } = req.body;
  const user_id = req.user.id;

  if (!comment_id || !comment) {
    return res.status(400).json({ 
      message: "comment_id dan comment wajib dikirim" 
    });
  }

  try {
    const comments = await getCollection('comments');

    // ====== CEK APAKAH COMMENT DIMILIKI USER ======
    const existingComment = await comments.findOne({ 
      id: comment_id
    });

    if (!existingComment) {
      return res.status(404).json({
        success: false,
        message: "Komentar tidak ditemukan"
      });
    }

    // ====== VALIDASI KEPEMILIKAN ======
    if (existingComment.user_id !== user_id) {
      return res.status(403).json({
        success: false,
        message: "Anda tidak memiliki izin mengubah komentar ini"
      });
    }

    // ====== UPDATE KOMENTAR ======
    const result = await comments.updateOne(
      { id: comment_id },
      {
        $set: {
          comment: comment,
          updated_at: new Date()
        }
      }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({
        success: false,
        message: "Komentar tidak ditemukan"
      });
    }

    if (result.modifiedCount === 0) {
      return res.status(200).json({
        success: true,
        message: "Tidak ada perubahan yang dilakukan"
      });
    }

    // ====== AMBIL DATA KOMENTAR YANG SUDAH DIUPDATE ======
    const updatedComment = await comments.findOne({ 
      id: comment_id
    });

    return res.status(200).json({
      success: true,
      message: "Komentar berhasil diperbarui",
      data: updatedComment
    });

  } catch (error) {
    console.error('Error saat mengubah komentar:', error);
    return res.status(500).json({ 
      success: false,
      message: "Terjadi kesalahan server" 
    });
  }
});

router.post('/deleteComment', async (req, res) => {
  const { comment_id } = req.body;
  const user_id = req.user.id;

  if (!comment_id) {
    return res.status(400).json({ 
      message: "comment_id wajib dikirim" 
    });
  }

  try {
    const comments = await getCollection('comments');

    // ====== CEK APAKAH COMMENT DIMILIKI USER ======
    const comment = await comments.findOne({ id: comment_id });

    if (!comment) {
      return res.status(404).json({
        success: false,
        message: "Komentar tidak ditemukan"
      });
    }

    // ====== VALIDASI KEPEMILIKAN ======
    if (comment.user_id !== user_id) {
      return res.status(403).json({
        success: false,
        message: "Anda tidak memiliki izin menghapus komentar ini"
      });
    }

    // ====== JIKA KOMENTAR UTAMA, HAPUS SEMUA REPLY-NYA ======
    if (!comment.parent_id) {
      // Hapus semua reply dari komentar utama ini
      await comments.deleteMany({ parent_id: comment_id });
    }

    // ====== HAPUS KOMENTAR ITU SENDIRI ======
    const result = await comments.deleteOne({ id: comment_id });

    if (result.deletedCount === 0) {
      return res.status(500).json({
        success: false,
        message: "Gagal menghapus komentar"
      });
    }

    return res.status(200).json({
      success: true,
      message: !comment.parent_id ? 
        "Komentar dan semua balasan berhasil dihapus" : 
        "Balasan berhasil dihapus",
      data: {
        comment_id: comment_id,
        deleted_at: new Date()
      }
    });

  } catch (error) {
    console.error('Error saat menghapus komentar:', error);
    return res.status(500).json({ 
      success: false,
      message: "Terjadi kesalahan server" 
    });
  }
});

router.post('/likePost', async (req, res) => {
  const { post_id } = req.body;
  const user_id = req.user.id;

  if (!post_id) {
    return res.status(400).json({ 
      message: "post_id wajib dikirim" 
    });
  }

  try {
    const likes = await getCollection('likes');

    // Cek apakah user sudah like post ini sebelumnya
    const existingLike = await likes.findOne({
      post_id: post_id,
      user_id: user_id
    });

    if (existingLike) {
      // Jika sudah like, hapus like (unlike)
      const result = await likes.deleteOne({
        post_id: post_id,
        user_id: user_id
      });

      return res.status(200).json({
        success: true,
        action: 'unlike',
        message: "Like berhasil dihapus"
      });
    } else {
      // Jika belum like, tambahkan like baru
      const newLike = {
        _id: new ObjectId(),
        id: uniqid(),
        post_id: post_id,
        user_id: user_id,
        created_at: new Date()
      };

      const result = await likes.insertOne(newLike);

      return res.status(200).json({
        success: true,
        action: 'like',
        message: "Like berhasil ditambahkan",
        data: newLike
      });
    }

  } catch (error) {
    console.error('Error saat melakukan like:', error);
    return res.status(500).json({ 
      success: false,
      message: "Terjadi kesalahan server" 
    });
  }
});


sendNotification = async (post_id, type, type_notif, title, message, data, read) => {
  
    console.log('sendNotification called with parameters:');
    console.log(post_id, type, type_notif, title, message, data, read);
    
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
      // console.log(datax);
                  
      const notifikasi  = await getCollection('notifikasi');
      const result      = await notifikasi.insertOne(datax);                  
      console.log('sendNotification data ==> 🚀');
      console.log(data);

      if(result.acknowledged===true)
        console.log('sendNotification berhasil'); 
        return true
    } catch (error) {
        console.log('sendNotification error:', error);
        return false; 
    } 
}





module.exports = router