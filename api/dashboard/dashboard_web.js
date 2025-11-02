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

router.post('/demografiPenggunaAplikasi', async (req, res, next) => { 
  console.log("demografiPenggunaAplikasi"); 
  res.status(200).json({ message: 'Gagal mengambil data demografiPenggunaAplikasi' });
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

 

module.exports = router