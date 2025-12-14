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
// ✅xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
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

// router.post('/kinerjaOPD', async (req, res, next) => { 
//   console.log("kinerjaOPD"); 
//   res.status(200).json({ message: 'Gagal mengambil data kinerjaOPD' });
// })

// router.post('/sebaranAduan', async (req, res, next) => { 
//   console.log("sebaranAduan"); 
//   res.status(200).json({ message: 'Gagal mengambil data sebaranAduan' });
// })

// ==========================================================================================



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
        // role_id: user_role_id,
        role_name: roleData.uraian,
        // is_administrator: isAdministrator,
        // is_admin_opd: isAdminOPD
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

router.post('/trending_topics_detail', async (req, res) => {
  try {
    const post = await getCollection('post');
    // const master_kategori = await getCollection('master_kategori_laporan');
    // const master_sub_kategori = await getCollection('master_kategori_laporan_sub');
    
    const { limit_days = 30, top_n = 10 } = req.body || {};

    // ====== HITUNG POSTINGAN DARI N HARI TERAKHIR ======
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - limit_days);

    const filter = {
      created_at: { $gte: startDate },
      status: 6
    };

    // ====== AGREGASI BERDASARKAN KATEGORI DAN SUB-KATEGORI ======
    const trendingData = await post.aggregate([
      {
        $match: filter
      },
      {
        $lookup: {
          from: 'master_kategori_laporan',
          localField: 'master_kategori_id',
          foreignField: 'id',
          as: 'kategori_info'
        }
      },
      {
        $unwind: {
          path: '$kategori_info',
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $lookup: {
          from: 'master_kategori_laporan_sub',
          localField: 'master_sub_kategori_id',
          foreignField: 'id',
          as: 'sub_kategori_info'
        }
      },
      {
        $unwind: {
          path: '$sub_kategori_info',
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $group: {
          _id: {
            kategori_id: '$master_kategori_id',
            kategori_name: '$kategori_info.uraian',
            sub_kategori_id: '$master_sub_kategori_id',
            sub_kategori_name: '$sub_kategori_info.uraian'
          },
          total_posts: { $sum: 1 }
        }
      },
      {
        $sort: { total_posts: -1 }
      },
      {
        $limit: top_n
      },
      {
        $project: {
          _id: 0,
          kategori_id: '$_id.kategori_id',
          kategori_name: '$_id.kategori_name',
          sub_kategori_id: '$_id.sub_kategori_id',
          sub_kategori_name: '$_id.sub_kategori_name',
          total_posts: 1
        }
      }
    ]).toArray();

    // ====== HITUNG TOTAL DAN PERSENTASE ======
    const total_all_posts = await post.countDocuments(filter);
    const trendingWithPercentage = trendingData.map(item => ({
      ...item,
      percentage: total_all_posts > 0 ? Math.round((item.total_posts / total_all_posts) * 100) : 0
    }));

    return res.status(200).json({
      success: true,
      data_trending: 'Per ' + limit_days + ' Hari',
      metadata: {
        period_days: limit_days,
        total_posts: total_all_posts,
        top_n_categories: top_n,
        start_date: startDate,
        end_date: new Date()
      },
      data: trendingWithPercentage
    });

  } catch (err) {
    console.error(err);
    return res.status(500).json({
      success: false,
      message: "Gagal mengambil data trending topics detail"
    });
  }
});

router.post('/kinerjaOPD', async (req, res, next) => { 
  try {
    const post = await getCollection('post');
    const post_handle = await getCollection('post_handle');
    const unit_kerja = await getCollection('unit_kerja');
    const menu_klp = await getCollection('menu_klp');
    
    const { start_date, end_date, unit_kerja_filter } = req.body || {};
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

    // ====== CEK ROLE BERDASARKAN URAIAN ======
    const isAdministrator = roleData.uraian === "Administrator" || roleData.uraian === "Admin Pusat";
    const isAdminOPD = roleData.uraian === "Admin OPD";

    // ====== FILTER TANGGAL ======
    const dateFilter = {};
    if (start_date && end_date) {
      dateFilter.created_at = {
        $gte: new Date(start_date),
        $lte: new Date(end_date + "T23:59:59")
      };
    }

    // ====== FILTER UNIT KERJA ======
    let unitKerjaQuery = {};
    
    if (isAdminOPD) {
      // Jika Admin OPD, hanya lihat unit kerjanya sendiri
      const user_unit_kerja = req.user.auth.master_unit_kerja_id;
      unitKerjaQuery = {
        id: user_unit_kerja
      };
    } else if (unit_kerja_filter) {
      // Jika Administrator dengan filter, gunakan regex search
      unitKerjaQuery = {
        unit_kerja: { $regex: unit_kerja_filter, $options: 'i' }
      };
    } else {
      // Default Administrator: tampilkan unit kerja dengan kategori: Sekretariat, Badan, Dinas, Satuan
      unitKerjaQuery = {
        $or: [
          { unit_kerja: { $regex: 'Sekretariat', $options: 'i' } },
          { unit_kerja: { $regex: 'Badan', $options: 'i' } },
          { unit_kerja: { $regex: 'Dinas', $options: 'i' } },
          { unit_kerja: { $regex: 'Satuan', $options: 'i' } }
        ]
      };
    }

    // ====== AMBIL SEMUA UNIT KERJA SESUAI FILTER ======
    const allUnitKerja = await unit_kerja.find(unitKerjaQuery).toArray();

    if (allUnitKerja.length === 0) {
      return res.status(200).json({
        success: true,
        user_info: {
          role_name: roleData.uraian,
          is_admin_opd: isAdminOPD,
          unit_kerja: isAdminOPD ? req.user.auth.master_unit_kerja_id : null
        },
        metadata: {
          total_opd: 0,
          filter_applied: isAdminOPD ? 'Unit kerja Anda' : (unit_kerja_filter || 'Default (Sekretariat, Badan, Dinas, Satuan)'),
          period: {
            start_date: start_date || 'Semua waktu',
            end_date: end_date || 'Semua waktu'
          }
        },
        data: []
      });
    }

    // ====== AMBIL ID UNIT KERJA ======
    const unitKerjaIds = allUnitKerja.map(uk => uk.id);

    // ====== AMBIL DATA KINERJA PER UNIT KERJA ======
    const detailKinerja = await post_handle.aggregate([
      {
        $match: {
          master_unit_kerja_id: { $in: unitKerjaIds }
        }
      },
      {
        $lookup: {
          from: 'post',
          localField: 'post_id',
          foreignField: 'id',
          as: 'post_info'
        }
      },
      {
        $unwind: {
          path: '$post_info',
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $match: dateFilter.created_at ? {
          'post_info.created_at': dateFilter.created_at
        } : {}
      },
      {
        $group: {
          _id: '$master_unit_kerja_id',
          total_posts: { $sum: 1 },
          diproses: {
            $sum: {
              $cond: [
                { $in: ['$post_info.status', [1, 2, 4, 5]] },
                1,
                0
              ]
            }
          },
          ditolak: {
            $sum: {
              $cond: [
                { $in: ['$post_info.status', [3, 7]] },
                1,
                0
              ]
            }
          },
          selesai: {
            $sum: {
              $cond: [
                { $eq: ['$post_info.status', 6] },
                1,
                0
              ]
            }
          }
        }
      },
      {
        $project: {
          _id: 1,
          total_posts: 1,
          diproses: 1,
          ditolak: 1,
          selesai: 1,
          persentase: {
            diproses: {
              $cond: [
                { $gt: ['$total_posts', 0] },
                { $round: [{ $multiply: [{ $divide: ['$diproses', '$total_posts'] }, 100] }, 2] },
                0
              ]
            },
            ditolak: {
              $cond: [
                { $gt: ['$total_posts', 0] },
                { $round: [{ $multiply: [{ $divide: ['$ditolak', '$total_posts'] }, 100] }, 2] },
                0
              ]
            },
            selesai: {
              $cond: [
                { $gt: ['$total_posts', 0] },
                { $round: [{ $multiply: [{ $divide: ['$selesai', '$total_posts'] }, 100] }, 2] },
                0
              ]
            }
          }
        }
      }
    ]).toArray();

    // ====== BUAT MAP DARI DATA KINERJA ======
    const kinerjaMap = {};
    detailKinerja.forEach(item => {
      kinerjaMap[item._id] = item;
    });

    // ====== GABUNGKAN: SEMUA UNIT KERJA + DATA KINERJA ======
    const completeKinerjaData = allUnitKerja.map(uk => {
      const kinerja = kinerjaMap[uk.id];
      if (kinerja) {
        return {
          unit_kerja_id: uk.id,
          unit_kerja_name: uk.unit_kerja,
          total_posts: kinerja.total_posts,
          diproses: kinerja.diproses,
          ditolak: kinerja.ditolak,
          selesai: kinerja.selesai,
          persentase: kinerja.persentase
        };
      } else {
        return {
          unit_kerja_id: uk.id,
          unit_kerja_name: uk.unit_kerja,
          total_posts: 0,
          diproses: 0,
          ditolak: 0,
          selesai: 0,
          persentase: {
            diproses: 0,
            ditolak: 0,
            selesai: 0
          }
        };
      }
    });

    // ====== SORT BERDASARKAN TOTAL POSTS (DESCENDING) ======
    completeKinerjaData.sort((a, b) => b.total_posts - a.total_posts);

    return res.status(200).json({
      success: true,
      user_info: {
        role_name: roleData.uraian,
        is_admin_opd: isAdminOPD,
        unit_kerja: isAdminOPD ? req.user.auth.master_unit_kerja_id : null
      },
      metadata: {
        total_opd: completeKinerjaData.length,
        filter_applied: isAdminOPD ? 'Unit kerja Anda' : (unit_kerja_filter || 'Default (Sekretariat, Badan, Dinas, Satuan)'),
        period: {
          start_date: start_date || 'Semua waktu',
          end_date: end_date || 'Semua waktu'
        }
      },
      data: completeKinerjaData
    });

  } catch (err) {
    console.error(err);
    return res.status(500).json({
      success: false,
      message: "Gagal mengambil data kinerja OPD"
    });
  }
})

router.post('/sebaranAduan', async (req, res, next) => { 
  try {
    const post = await getCollection('post');
    
    const { start_date, end_date } = req.body || {};

    // ====== FILTER TANGGAL ======
    const dateFilter = {};
    if (start_date && end_date) {
      dateFilter.created_at = {
        $gte: new Date(start_date),
        $lte: new Date(end_date + "T23:59:59")
      };
    }

    // ====== FILTER STATUS (HANYA SELESAI) ======
    const statusFilter = { status: 6 };

    // ====== GABUNGKAN SEMUA FILTER ======
    const combinedFilter = { ...dateFilter, ...statusFilter };

    // ====== AMBIL SEMUA KECAMATAN UNIK (TANPA FILTER TANGGAL) ======
    const allKecamatan = await post.aggregate([
      {
        $group: {
          _id: '$nama_kecamatan'
        }
      },
      {
        $match: {
          _id: { $ne: null, $ne: '' }
        }
      },
      {
        $sort: { _id: 1 }
      },
      {
        $project: {
          _id: 0,
          kecamatan_name: '$_id'
        }
      }
    ]).toArray();

    // ====== AGREGASI SEBARAN ADUAN PER KECAMATAN (SESUAI FILTER TANGGAL & STATUS) ======
    const sebaranData = await post.aggregate([
      {
        $match: combinedFilter
      },
      {
        $group: {
          _id: '$nama_kecamatan',
          total_aduan: { $sum: 1 }
        }
      },
      {
        $match: {
          _id: { $ne: null, $ne: '' }
        }
      },
      {
        $project: {
          _id: 0,
          kecamatan_name: '$_id',
          total_aduan: 1
        }
      }
    ]).toArray();

    // ====== BUAT MAP DARI DATA SEBARAN ======
    const sebaranMap = {};
    sebaranData.forEach(item => {
      sebaranMap[item.kecamatan_name] = item.total_aduan;
    });

    // ====== GABUNGKAN: SEMUA KECAMATAN + DATA SEBARAN (ISI 0 JIKA TIDAK ADA) ======
    const completeSebaranData = allKecamatan.map(kec => ({
      kecamatan_name: kec.kecamatan_name,
      total_aduan: sebaranMap[kec.kecamatan_name] || 0
    }));

    // ====== SORT BERDASARKAN TOTAL ADUAN (DESCENDING) ======
    completeSebaranData.sort((a, b) => b.total_aduan - a.total_aduan);

    // ====== HITUNG TOTAL ADUAN ======
    const total_all_aduan = completeSebaranData.reduce((sum, item) => sum + item.total_aduan, 0);

    // ====== FORMAT DATA UNTUK HIGHCHARTS ======
    const categories = completeSebaranData.map(item => item.kecamatan_name);
    const data = completeSebaranData.map(item => item.total_aduan);

    return res.status(200).json({
      success: true,
      metadata: {
        total_kecamatan: completeSebaranData.length,
        total_aduan: total_all_aduan,
        period: {
          start_date: start_date || 'Semua waktu',
          end_date: end_date || 'Semua waktu'
        }
      },
      chart: {
        backgroundColor: 'transparent',
        type: 'column',
        title: {
          text: 'Sebaran Aduan Per Wilayah',
          align: 'left'
        },
        credits: {
          enabled: false
        },
        xAxis: {
          categories: categories,
          crosshair: true,
          accessibility: {
            description: 'Kecamatan'
          }
        },
        yAxis: {
          title: {
            text: 'Jumlah Aduan'
          }
        },
        plotOptions: {
          column: {
            pointPadding: 0.2,
            borderWidth: 0
          }
        },
        series: [
          {
            type: 'column',
            name: 'Jumlah Aduan',
            data: data
          }
        ]
      }
    });

  } catch (err) {
    console.error(err);
    return res.status(500).json({
      success: false,
      message: "Gagal mengambil data sebaran aduan"
    });
  }
})


router.post('/total_laporan_by_status', async (req, res) => {

    try {
    const post = await getCollection('post');
    // const page = parseInt(req.body.page) || 1;
    // const limit = 10;
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
      // { $sort: { created_at: -1 } },
      // { $skip: (page - 1) * limit },
      // { $limit: limit }
    ];

    const results = await post.aggregate(pipeline).toArray();

    // Hitung total data (tanpa $skip dan $limit)
    const totalData = await post.countDocuments({
      title: { $regex: cari, $options: 'i' }
    });

    res.status(200).json({
      // currentPage: page,
      // totalPage: Math.ceil(totalData / limit),
      // totalData,
      data: results,

    });
  } catch (error) {
    console.error('Gagal mengambil data post:', error);
    res.status(500).json({ message: 'Gagal mengambil data' });
  }

});

router.post('/trending_topics_detail_post', async (req, res) => {
  try {
    const post = await getCollection('post');
    const post_handle = await getCollection('post_handle');
    
    const { 
      limit_days = 30, 
      master_kategori_id,  // ✅ Ganti dari sub_kategori_id
      limit = 10,
      page = 1
    } = req.body || {};

    if (!master_kategori_id) {
      return res.status(400).json({
        success: false,
        message: "master_kategori_id wajib dikirim"
      });
    }

    // ====== HITUNG POSTINGAN DARI N HARI TERAKHIR ======
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - limit_days);

    const filter = {
      created_at: { $gte: startDate },
      status: 6,
      master_kategori_id: master_kategori_id  // ✅ Filter berdasarkan master_kategori_id
    };

    // ====== HITUNG TOTAL DATA ======
    const total_posts = await post.countDocuments(filter);

    // ====== AMBIL DETAIL POST DENGAN PAGINATION ======
    const detailPosts = await post.aggregate([
      {
        $match: filter
      },
      // ====== JOIN KATEGORI ======
      {
        $lookup: {
          from: 'master_kategori_laporan',
          localField: 'master_kategori_id',
          foreignField: 'id',
          as: 'kategori_info'
        }
      },
      {
        $unwind: {
          path: '$kategori_info',
          preserveNullAndEmptyArrays: true
        }
      },
      // ====== JOIN SUB KATEGORI ======
      {
        $lookup: {
          from: 'master_kategori_laporan_sub',
          localField: 'master_sub_kategori_id',
          foreignField: 'id',
          as: 'sub_kategori_info'
        }
      },
      {
        $unwind: {
          path: '$sub_kategori_info',
          preserveNullAndEmptyArrays: true
        }
      },
      // ====== LEFT JOIN USER (PELAPOR) ======
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
      // ====== LEFT JOIN LAMPIRAN POST ======
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
            },
            {
              $project: {
                _id: 0,
                id: 1,
                file: 1,
                filetype: 1,
                filethumbnail: 1,
                created_at: 1
              }
            }
          ],
          as: 'lampiran'
        }
      },
      // ====== LEFT JOIN POST_KETERANGAN (STATUS SAMA DENGAN POST) ======
      {
        $lookup: {
          from: 'post_keterangan',
          let: { postId: '$id', postStatus: '$status' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ['$post_id', '$$postId'] },
                    { $eq: ['$status', '$$postStatus'] }
                  ]
                }
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
            // ====== LEFT JOIN LAMPIRAN POST_KETERANGAN ======
            {
              $lookup: {
                from: 'lampiran',
                let: { keteranganId: '$id' },
                pipeline: [
                  {
                    $match: {
                      $expr: {
                        $and: [
                          { $eq: ['$tabel_id', '$$keteranganId'] },
                          { $eq: ['$tabel', 'post_keterangan'] }
                        ]
                      }
                    }
                  },
                  {
                    $project: {
                      _id: 0,
                      id: 1,
                      file: 1,
                      filetype: 1,
                      filethumbnail: 1,
                      created_at: 1
                    }
                  }
                ],
                as: 'keterangan_lampiran'
              }
            },
            {
              $project: {
                _id: 0,
                id: 1,
                post_id: 1,
                keterangan: 1,
                status: 1,
                created_at: 1,
                user_id: 1,
                admin_name: '$admin_info.nama',
                admin_username: '$admin_info.username',
                keterangan_lampiran: 1,
                keterangan_lampiran_count: { $size: '$keterangan_lampiran' }
              }
            },
            {
              $sort: { created_at: -1 }
            }
          ],
          as: 'post_keterangan'
        }
      },
      // ====== LEFT JOIN POST_HANDLE + UNIT_KERJA ======
      {
        $lookup: {
          from: 'post_handle',
          let: { postId: '$id' },
          pipeline: [
            {
              $match: {
                $expr: { $eq: ['$post_id', '$$postId'] }
              }
            },
            {
              $lookup: {
                from: 'unit_kerja',
                localField: 'master_unit_kerja_id',
                foreignField: 'id',
                as: 'unit_kerja_info'
              }
            },
            {
              $unwind: {
                path: '$unit_kerja_info',
                preserveNullAndEmptyArrays: true
              }
            },
            {
              $project: {
                _id: 0,
                id: 1,
                master_unit_kerja_id: 1,
                unit_kerja_name: '$unit_kerja_info.unit_kerja',
                created_at: 1
              }
            }
          ],
          as: 'post_handle'
        }
      },
      // ====== LEFT JOIN RATING ======
      {
        $lookup: {
          from: 'rating',
          localField: 'id',
          foreignField: 'post_id',
          as: 'rating'
        }
      },
      // ====== LEFT JOIN LOKASI ======
      {
        $lookup: {
          from: 'post_lokasi',
          localField: 'id',
          foreignField: 'post_id',
          as: 'lokasi'
        }
      },
      // ====== PROJECT FIELD YANG DIPERLUKAN ======
      {
        $project: {
          _id: 0,
          id: 1,
          title: 1,
          description: 1,
          status: 1,
          kategori_name: '$kategori_info.uraian',
          sub_kategori_name: '$sub_kategori_info.uraian',
          user_name: '$user_info.nama',
          user_email: '$user_info.email',
          user_phone: '$user_info.nomor_hp',
          created_at: 1,
          nama_kecamatan: 1,
          nama_kelurahan: 1,
          lampiran_count: { $size: '$lampiran' },
          lampiran: 1,
          post_keterangan_count: { $size: '$post_keterangan' },
          post_keterangan: 1,
          post_handle_count: { $size: '$post_handle' },
          post_handle: 1,
          rating_count: { $size: '$rating' },
          rating: 1,
          lokasi_count: { $size: '$lokasi' },
          lokasi: 1
        }
      },
      // ====== SORT DAN PAGINATION ======
      {
        $sort: { created_at: -1 }
      },
      {
        $skip: (page - 1) * limit
      },
      {
        $limit: parseInt(limit)
      }
    ]).toArray();

    return res.status(200).json({
      success: true,
      // metadata: {
      //   period_days: limit_days,
      //   master_kategori_id: master_kategori_id,  // ✅ Update field
      //   total_posts: total_posts,
      //   current_page: page,
      //   total_pages: Math.ceil(total_posts / limit),
      //   limit_per_page: limit,
      //   start_date: startDate,
      //   end_date: new Date()
      // },
      data: detailPosts
    });

  } catch (err) {
    console.error(err);
    return res.status(500).json({
      success: false,
      message: "Gagal mengambil detail post trending topics"
    });
  }
});



module.exports = router