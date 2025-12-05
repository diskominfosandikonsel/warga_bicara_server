const express = require('express')
const router = express.Router()
const {getCollection} = require('../../db/mongodb/controller') 
const uniqid = require('uniqid')

var upload = require('../../library/multer/fileMulter');
const IMAGE = require('../../library/multer/image');

const { ObjectId } = require('mongodb');
const id = require('volleyball/lib/id');



router.post('/viewData', async (req, res, next) => { 
  console.log("req.user.id");
  console.log(req.user.id);
  
  try {
    const post = await getCollection('post');
    const page = parseInt(req.body.page) || 1;
    const limit = 10;
    const cari = req.body.cari || '';
    const kategori = req.body.kategori || '';

    const pipeline = [
      {
        $match: {
            status: 6,
            master_kategori_id: {$regex: kategori, $options: 'i'},
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
          from: 'rating',
          localField: 'id',
          foreignField: 'post_id',
          as: 'rating'
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
                $project: {
                    'admin_info.nama': 1,
                    'admin_info.username': 1,
                    // field lain yang ingin kamu pertahankan di post_keterangan
                    keterangan: 1,
                    status: 1,
                    created_at: 1,
                    user_id: 1,
                    post_id: 1,
                    id: 1
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


router.post('/jmlAduan', async (req, res, next) => { 
  console.log("jmlAduan"); 
  res.status(200).json({ message: 'Gagal mengambil data jmlAduan' });
})
// ✅
router.post('/popularIssue', async (req, res, next) => { 

    function getRandomColor() {
    const letters = '0123456789ABCDEF'
    let color = '#'
    for (let i = 0; i < 6; i++) {
        color += letters[Math.floor(Math.random() * 16)]
    }
    return color
    }


//   console.log("popularIssue"); 
//   const post = await getCollection('post');  
//   res.status(200).json({ message: 'Gagal mengambil data popularIssue' });

  try {
    const post = await getCollection('post')

    const result = await post.aggregate([
      {
        $match: {
        //   publish: true,
        //   finalisasi: true
          status: 6
        }
      },
      {
        $lookup: {
          from: "master_kategori_laporan_sub",
          localField: "master_sub_kategori_id",
          foreignField: "id",
          as: "subKategori"
        }
      },
      {
        $unwind: {
          path: "$subKategori",
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $group: {
          _id: {
            subkategori: "$subKategori.uraian",
            month: { $month: "$created_at" }
          },
          total: { $sum: 1 }
        }
      },
      {
        $group: {
          _id: "$_id.subkategori",
          monthlyData: {
            $push: {
              month: "$_id.month",
              total: "$total"
            }
          }
        }
      },
      {
        $project: {
          _id: 0,
          name: "$_id",
          data: {
            $map: {
              input: { $range: [1, 13] },
              as: "m",
              in: {
                $let: {
                  vars: {
                    found: {
                      $first: {
                        $filter: {
                          input: "$monthlyData",
                          as: "md",
                          cond: { $eq: ["$$md.month", "$$m"] }
                        }
                      }
                    }
                  },
                  in: { $ifNull: ["$$found.total", 0] }
                }
              }
            }
          }
        }
      }
    ]).toArray()

    // Warna tetap (bisa diubah sesuai kebutuhan)
    const colorMap = {
      "Jalan Rusak": "#9B59B6",
      "Banjir": "#E74C3C",
      "Sampah": "#2ECC71"
    }

    // Bentuk hasil untuk chart (Highcharts / ApexCharts)
    const series = result.map(r => ({
      type: 'line',
      name: r.name || 'Lainnya',
      data: r.data,
    //   color: colorMap[r.name] || '#3498DB'
      color: getRandomColor()
    }))

    res.status(200).json({ series })

  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Terjadi kesalahan pada server.' })
  }

})


router.post('/demografiPenggunaAplikasiUmur', async (req, res, next) => { 
const now = new Date();

const users = await getCollection('users')
const result = await users.aggregate([
  {
    $match: {
      tgl_lahir: { $exists: true, $ne: "" }
    }
  },
  {
    // Coba parsing dari berbagai format tanggal
    $addFields: {
      possibleDates: [
        { $dateFromString: { dateString: "$tgl_lahir", format: "%Y-%m-%d", onError: null } },
        { $dateFromString: { dateString: "$tgl_lahir", format: "%d-%m-%Y", onError: null } },
        { $dateFromString: { dateString: "$tgl_lahir", format: "%m-%d-%Y", onError: null } },
        { $dateFromString: { dateString: "$tgl_lahir", format: "%Y/%m/%d", onError: null } },
        { $dateFromString: { dateString: "$tgl_lahir", format: "%d/%m/%Y", onError: null } },
        { $dateFromString: { dateString: "$tgl_lahir", format: "%m/%d/%Y", onError: null } }
      ]
    }
  },
  {
    $addFields: {
      parsedDate: {
        $first: {
          $filter: {
            input: "$possibleDates",
            as: "d",
            cond: { $ne: ["$$d", null] }
          }
        }
      }
    }
  },
  {
    $addFields: {
      age: {
        $cond: [
          { $ne: ["$parsedDate", null] },
          {
            $floor: {
              $divide: [
                { $subtract: [now, "$parsedDate"] },
                1000 * 60 * 60 * 24 * 365
              ]
            }
          },
          null
        ]
      }
    }
  },
  {
    $bucket: {
      groupBy: "$age",
      boundaries: [0, 20, 30, 40, 50, 200],
      default: "Unknown",
      output: { count: { $sum: 1 } }
    }
  },
  {
    $project: {
      _id: 0,
      range: {
        $switch: {
          branches: [
            { case: { $eq: ["$_id", 0] }, then: "<20" },
            { case: { $eq: ["$_id", 20] }, then: "20-30" },
            { case: { $eq: ["$_id", 30] }, then: "31-40" },
            { case: { $eq: ["$_id", 40] }, then: "41-50" },
            { case: { $eq: ["$_id", 50] }, then: ">50" }
          ],
          default: "Unknown"
        }
      },
      count: 1
    }
  }
]).toArray();

// ----------------------------
// Tahap Node.js: isi yang kosong dengan nilai 0
// ----------------------------
const ageRanges = ["<20", "20-30", "31-40", "41-50", ">50"];
const randomColor = () => `#${Math.floor(Math.random() * 16777215).toString(16)}`;

// Buat map hasil query (biar gampang cari)
const dataMap = result.reduce((acc, item) => {
  acc[item.range] = item.count;
  return acc;
}, {});

// Isi semua range (yang tidak ada jadi 0)
const formatted = ageRanges.map(range => ({
  type: 'column',
  name: range,
  data: [dataMap[range] || 0],
  color: randomColor()
}));


  // console.log("demografiPenggunaAplikasi"); 
  res.status(200).json(formatted);
})

router.post('/avgTimeVerifikasi', async (req, res, next) => { 
  console.log("avgTimeVerifikasi"); 
  res.status(200).json({ message: 'Gagal mengambil data avgTimeVerifikasi' });
})

router.post('/demografiPengguna', async (req, res, next) => { 
  console.log("demografiPengguna"); 
  res.status(200).json({ message: 'Gagal mengambil data demografiPengguna' });
})

router.post('/kinerjaOPD', async (req, res, next) => { 
  console.log("kinerjaOPD"); 
  res.status(200).json({ message: 'Gagal mengambil data kinerjaOPD' });
})

router.post('/sebaranAduan', async (req, res, next) => { 
  console.log("sebaranAduan"); 
  res.status(200).json({ message: 'Gagal mengambil data sebaranAduan' });
})

// ================================================================



router.post('/total_laporan', async (req, res) => {
  try {
    const post = await getCollection('post');
    const post_handle = await getCollection('post_handle');
    const menu_klp = await getCollection('menu_klp');
    
    const { start_date, end_date, kategori_id } = req.body || {};
    const user_id = req.user.id;
    const user_role_id = req.user.auth.authorization; // ID role dari JWT payload

    // ====== CEK ROLE USER DARI COLLECTION menu_klp ======
    const roleData = await menu_klp.findOne({ id: user_role_id });
    
    if (!roleData) {
      return res.status(401).json({
        success: false,
        message: "Role user tidak ditemukan"
      });
    }

    const filter = {};

    // Filter tanggal jika dikirim
    if (start_date && end_date) {
      filter.created_at = {
        $gte: new Date(start_date),
        $lte: new Date(end_date + "T23:59:59")
      };
    }

    // Filter kategori jika dikirim
    if (kategori_id) {
      filter.master_kategori_id = kategori_id;
    }

    // ====== CEK ROLE BERDASARKAN URAIAN ======
    // Asumsikan uraian yang mengidentifikasi Administrator adalah "Administrator" atau "Admin OPD"
    const isAdministrator = roleData.uraian === "Administrator" || roleData.uraian === "Admin Pusat";
    const isAdminOPD = roleData.uraian === "Admin OPD";

    if (isAdminOPD) {
      // Ambil post_id dari post_handle berdasarkan unit kerja user
      const user_unit_kerja = req.user.auth.master_unit_kerja_id;
      
      const post_handles = await post_handle.find({
        master_unit_kerja_id: user_unit_kerja
      }).toArray();

      const post_ids = post_handles.map(ph => ph.post_id);

      if (post_ids.length === 0) {
        // Jika tidak ada post yang di-handle, return 0 untuk semua
        return res.status(200).json({
          success: true,
          user_info: {
            role_id: user_role_id,
            role_name: roleData.uraian,
            unit_kerja: user_unit_kerja
          },
          data: {
            total_laporan: 0,
            total_diproses: 0,
            total_ditolak: 0,
            total_selesai: 0,
            persentase: {
              diproses: 0,
              ditolak: 0,
              selesai: 0
            }
          }
        });
      }

      filter.id = { $in: post_ids };
    }
    // Jika role = Administrator, tidak perlu filter unit kerja, lihat semua

    // ====== Total Laporan Keseluruhan ======
    const total_laporan = await post.countDocuments(filter);

    // ====== Total Laporan Diproses (Status 1-5) ======
    const total_diproses = await post.countDocuments({
      ...filter,
      status: { $in: [1, 2, 4, 5] }
    });

    // ====== Total Laporan Ditolak (Status 0) ======
    const total_ditolak = await post.countDocuments({
      ...filter,
      status: { $in: [3, 7] }
    });

    // ====== Total Laporan Selesai (Status 6) ======
    const total_selesai = await post.countDocuments({
      ...filter,
      status: 6
    });

    return res.status(200).json({
      success: true,
      user_info: {
        role_id: user_role_id,
        role_name: roleData.uraian,
        is_administrator: isAdministrator,
        is_admin_opd: isAdminOPD
      },
      data: {
        total_laporan,
        total_diproses,
        total_ditolak,
        total_selesai,
        persentase: {
          diproses: total_laporan > 0 ? Math.round((total_diproses / total_laporan) * 100) : 0,
          ditolak: total_laporan > 0 ? Math.round((total_ditolak / total_laporan) * 100) : 0,
          selesai: total_laporan > 0 ? Math.round((total_selesai / total_laporan) * 100) : 0
        }
      }
    });

  } catch (err) {
    console.error(err);
    return res.status(500).json({
      success: false,
      message: "Gagal mengambil data laporan totals"
    });
  }
});

module.exports = router