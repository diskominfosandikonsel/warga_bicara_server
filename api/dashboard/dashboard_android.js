const express = require('express')
const router = express.Router()
const {getCollection} = require('../../db/mongodb/controller') 
const uniqid = require('uniqid')

var upload = require('../../library/multer/fileMulter');
const IMAGE = require('../../library/multer/image');

const { ObjectId } = require('mongodb');
const id = require('volleyball/lib/id');



// router.post('/viewDatax', async (req, res, next) => { 
//   console.log("req.user.id");
//   console.log(req.user.id);
  
//   try {
//     const post = await getCollection('post');
//     const page = parseInt(req.body.page) || 1;
//     const limit = 10;
//     const cari = req.body.cari || '';
//     const kategori = req.body.kategori || '';

//     const pipeline = [
//       {
//         $match: {
//             status: 6,
//             master_kategori_id: {$regex: kategori, $options: 'i'},
//             title: { $regex: cari, $options: 'i' }
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
//           localField: 'id',
//           foreignField: 'post_id',
//           as: 'lokasi'
//         }
//       },

//       {
//         $lookup: {
//           from: 'rating',
//           localField: 'id',
//           foreignField: 'post_id',
//           as: 'rating'
//         }
//       },

//     {
//         $lookup: {
//           from: 'tindak_lanjut_laporan',
//           localField: 'id',
//           foreignField: 'post_id',
//           as: 'tindak_lanjut_laporan'
//         }
//       },

//       // ====== LOOKUP COMMENTS ======
//       // ====== LOOKUP COMMENTS ======
//       {
//         $lookup: {
//           from: 'comments',
//           let: { postId: '$id' },
//           pipeline: [
//             {
//               $match: {
//                 $expr: { $eq: ['$post_id', '$$postId'] }
//               }
//             },
//             {
//               $count: 'total'
//             }
//           ],
//           as: 'comments_count'
//         }
//       },
//       // ====== LOOKUP LIKES (TOTAL) ======
//       {
//         $lookup: {
//           from: 'likes',
//           let: { postId: '$id' },
//           pipeline: [
//             {
//               $match: {
//                 $expr: { $eq: ['$post_id', '$$postId'] }
//               }
//             },
//             {
//               $count: 'total'
//             }
//           ],
//           as: 'likes_count'
//         }
//       },      
      
//       // Update lookup post_keterangan dengan join ke users untuk info admin
//       {
//         $lookup: {
//           from: 'post_keterangan',
//           let: { postId: '$id' },
//           pipeline: [
//             {
//               $match: {
//                 $expr: { $eq: ['$post_id', '$$postId'] }
//               }
//             },
//             {
//               $lookup: {
//                 from: 'users',
//                 localField: 'user_id',
//                 foreignField: 'id',
//                 as: 'admin_info'
//               }
//             },
//             {
//               $unwind: {
//                 path: '$admin_info',
//                 preserveNullAndEmptyArrays: true
//               }
//             },
//             {
//                 $project: {
//                     'admin_info.nama': 1,
//                     'admin_info.username': 1,
//                     // field lain yang ingin kamu pertahankan di post_keterangan
//                     keterangan: 1,
//                     status: 1,
//                     created_at: 1,
//                     user_id: 1,
//                     post_id: 1,
//                     id: 1
//                 }
//             },            
//             {
//               $addFields: {
//                 admin_name: '$admin_info.nama'
//               }
//             },
//             {
//               $sort: { created_at: -1 }
//             }
//           ],
//           as: 'post_keterangan'
//         }
//       },        

//       {
//         $lookup: {
//           from: 'users',
//           localField: 'user_id',
//           foreignField: 'id',
//           as: 'createdBy'
//         }
//       },

//       {
//         $unwind: {
//           path: '$createdBy',
//           preserveNullAndEmptyArrays: true
//         }
//       }, 
//       {
//         $addFields: {
//           createdBy: '$createdBy.nama'
//         }
//       }, 

//       {
//         $sort: { createdAt: -1 }
//       },
//       // {
//       //   $skip: (page - 1) * limit
//       // },
//       // {
//       //   $limit: limit
//       // }
//     ];

//     const results = await post.aggregate(pipeline).toArray();

//     console.log(results);
    
//     // Hitung total data (tanpa $skip dan $limit)
//     const totalData = await post.countDocuments({
//       user_id: req.user.id,
//       title: { $regex: cari, $options: 'i' }
//     });

//     res.status(200).json({
//       // currentPage: page,
//       // totalPage: Math.ceil(totalData / limit),
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
    const kategori = req.body.kategori || '';
    const user_id = req.user.id;

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

      {
        $lookup: {
          from: 'tindak_lanjut_laporan',
          localField: 'id',
          foreignField: 'post_id',
          as: 'tindak_lanjut_laporan'
        }
      },

      // ====== LOOKUP COMMENTS ======
      {
        $lookup: {
          from: 'comments',
          let: { postId: '$id' },
          pipeline: [
            {
              $match: {
                $expr: { $eq: ['$post_id', '$$postId'] }
              }
            },
            {
              $count: 'total'
            }
          ],
          as: 'comments_count'
        }
      },

      // ====== LOOKUP LIKES (TOTAL) ======
      {
        $lookup: {
          from: 'likes',
          let: { postId: '$id' },
          pipeline: [
            {
              $match: {
                $expr: { $eq: ['$post_id', '$$postId'] }
              }
            },
            {
              $count: 'total'
            }
          ],
          as: 'likes_count'
        }
      },

      // ====== LOOKUP LIKES (CEK USER SUDAH LIKE ATAU BELUM) ======
      {
        $lookup: {
          from: 'likes',
          let: { postId: '$id' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ['$post_id', '$$postId'] },
                    { $eq: ['$user_id', user_id] }
                  ]
                }
              }
            }
          ],
          as: 'user_like'
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

      // ====== ADD FIELDS UNTUK HITUNG & TOGGLE ======
      {
        $addFields: {
          createdBy: '$createdBy.nama',
          total_comments: {
            $cond: [
              { $gt: [{ $size: '$comments_count' }, 0] },
              { $arrayElemAt: ['$comments_count.total', 0] },
              0
            ]
          },
          total_likes: {
            $cond: [
              { $gt: [{ $size: '$likes_count' }, 0] },
              { $arrayElemAt: ['$likes_count.total', 0] },
              0
            ]
          },
          toggle_likes: {
            $cond: [
              { $gt: [{ $size: '$user_like' }, 0] },
              true,
              false
            ]
          }
        }
      },

      // ====== REMOVE TEMPORARY FIELDS ======
      {
        $project: {
          comments_count: 0,
          likes_count: 0,
          user_like: 0
        }
      },

      {
        $sort: { createdAt: -1 }
      }
    ];

    const results = await post.aggregate(pipeline).toArray();

    console.log(results);
    
    // Hitung total data (tanpa $skip dan $limit)
    const totalData = await post.countDocuments({
      status: 6,
      title: { $regex: cari, $options: 'i' },
      master_kategori_id: {$regex: kategori, $options: 'i'}
    });

    res.status(200).json({
      totalData,
      data: results
    });
  } catch (error) {
    console.error('Gagal mengambil data post:', error);
    res.status(500).json({ message: 'Gagal mengambil data' });
  }
})

module.exports = router
