const express = require('express')
const router = express.Router()
const {getCollection} = require('../../db/mongodb/controller') 
const uniqid = require('uniqid')

var upload = require('../../library/multer/fileMulter');
const IMAGE = require('../../library/multer/image');

const { ObjectId } = require('mongodb');
const id = require('volleyball/lib/id');






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

    console.log(results);
    

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


router.post('/addData', upload.fields([{ name: 'file', maxCount: 5 }]), async (req, res, next) => {
  

    var data = JSON.parse(req.body.data); 

    data.id = uniqid()
    data.status = 1
    data.publish = false
    data.finalisasi = false
    data.created_at = new Date()
    // console.log(typeof data);
    // console.log(data);

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