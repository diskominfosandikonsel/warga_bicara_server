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
    const post = await getCollection('notifikasi');
    const page = parseInt(req.body.page) || 1;
    const limit = 10;
    const cari = req.body.cari || '';

    // const { master_kategori_laporan_id, master_kategori_laporan_sub_id, status } = req.body;

    const userIdRaw = req.user?.id || req.user?._id;
    const filter = {};
    if (userIdRaw) {
      const numId = Number(userIdRaw);
      filter.$or = [
        { user_id: userIdRaw },
        { user_id: String(userIdRaw) },
        ...(!isNaN(numId) ? [{ user_id: numId }] : [])
      ];
    }

    const pipeline = [
      {
        $match: filter
      },
      {
        $lookup: {
          from: 'post',
          localField: 'post_id',
          foreignField: 'id',
          as: 'post'
        }
      },
      // Sort + paging
      { $sort: { created_at: -1 } },
      { $skip: (page - 1) * limit },
      { $limit: limit }
    ];

    const results = await post.aggregate(pipeline).toArray();

    // Hitung total data (tanpa $skip dan $limit)
    const totalData = await post.countDocuments(filter);

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


router.post('/readNotif', async (req, res, next) => {
  try {
    const data = req.body;
    const notifikasi = await getCollection('notifikasi');
    const conditions = [];

    if (data.post_id) {
      const pidStr = String(data.post_id);
      const pidNum = Number(data.post_id);
      conditions.push({ post_id: pidStr });
      if (!isNaN(pidNum)) conditions.push({ post_id: pidNum });
    }

    if (data.id) {
      conditions.push({ id: data.id });
      conditions.push({ id: String(data.id) });
    }

    if (conditions.length === 0) {
      return res.status(400).json({ success: false, message: 'id atau post_id wajib dikirim' });
    }

    const filter = conditions.length === 1 ? conditions[0] : { $or: conditions };
    const result = await notifikasi.updateMany(filter, { $set: { read: true } });
    return res.status(200).json({
      success: true,
      message: 'Notifikasi berhasil di-update',
      matchedCount: result.matchedCount,
      modifiedCount: result.modifiedCount
    });
  } catch (err) {
    console.error('Error updating readNotif:', err);
    return res.status(500).json({ success: false, message: 'Gagal update notifikasi' });
  }
})

router.post('/saveFcmToken', async (req, res) => {
  try {
    const { fcm_token } = req.body;
    const user_id = req.user?.id;

    if (!fcm_token) {
      return res.status(400).json({ success: false, message: 'fcm_token wajib diisi' });
    }

    if (!user_id) {
      return res.status(401).json({ success: false, message: 'User belum terautentikasi' });
    }

    const users = await getCollection('users');
    const numUserId = Number(user_id);
    const updateRes = await users.updateOne(
      {
        $or: [
          { id: user_id },
          { id: String(user_id) },
          ...(!isNaN(numUserId) ? [{ id: numUserId }] : []),
          { user_id: user_id },
          { user_id: String(user_id) }
        ]
      },
      { $set: { fcm_token: fcm_token, updated_at: new Date().toISOString() } }
    );

    console.log(`🔑 saveFcmToken for user ${user_id}: matched ${updateRes.matchedCount}, modified ${updateRes.modifiedCount}`);

    return res.status(200).json({
      success: true,
      message: 'FCM Token berhasil disimpan'
    });
  } catch (error) {
    console.error('Gagal menyimpan FCM token:', error);
    return res.status(500).json({ success: false, message: 'Gagal menyimpan FCM token' });
  }
});

router.post('/viewDataNotif', async (req, res, next) => {
  try {
    const notifikasi = await getCollection('notifikasi');
    const post = await getCollection('post');
    const users = await getCollection('users');

    const { post_id } = req.body;
    const user_id = req.user.id;

    // ====== VALIDASI POST_ID ======
    if (!post_id) {
      return res.status(400).json({
        success: false,
        message: "post_id wajib dikirim"
      });
    }

    // ====== CARI POST BERDASARKAN ID ======
    const postData = await post.findOne({ id: post_id });

    if (!postData) {
      return res.status(404).json({
        success: false,
        message: "Post dengan ID tersebut tidak ditemukan"
      });
    }

    // ====== AMBIL NOTIFIKASI BERDASARKAN POST_ID ======
    const notifikasiData = await notifikasi.aggregate([
      {
        $match: {
          post_id: post_id
        }
      },
      // ====== JOIN DENGAN USER (PENERIMA NOTIF) ======
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
      // ====== JOIN DENGAN POST ======
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
      // ====== JOIN DENGAN USER PEMBUAT POST ======
      {
        $lookup: {
          from: 'users',
          localField: 'post_info.user_id',
          foreignField: 'id',
          as: 'post_creator'
        }
      },
      {
        $unwind: {
          path: '$post_creator',
          preserveNullAndEmptyArrays: true
        }
      },
      // ====== JOIN KATEGORI ======
      {
        $lookup: {
          from: 'master_kategori_laporan',
          localField: 'post_info.master_kategori_id',
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
          localField: 'post_info.master_sub_kategori_id',
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
      // ====== PROJECT FIELD YANG DIPERLUKAN ======
      {
        $project: {
          _id: 0,
          notif_id: '$id',
          notif_title: '$title',
          notif_message: '$message',
          notif_read: '$read',
          notif_type: '$type',
          notif_created_at: '$created_at',
          // ====== USER INFO (PENERIMA NOTIF) ======
          receiver_user_id: '$user_info.id',
          receiver_user_name: '$user_info.nama',
          receiver_user_email: '$user_info.email',
          receiver_user_phone: '$user_info.nomor_hp',
          // ====== POST INFO ======
          post_id: '$post_info.id',
          post_title: '$post_info.title',
          post_description: '$post_info.description',
          post_status: '$post_info.status',
          post_created_at: '$post_info.created_at',
          post_kecamatan: '$post_info.nama_kecamatan',
          post_kelurahan: '$post_info.nama_kelurahan',
          // ====== POST CREATOR INFO ======
          creator_user_id: '$post_creator.id',
          creator_user_name: '$post_creator.nama',
          creator_user_email: '$post_creator.email',
          creator_user_phone: '$post_creator.nomor_hp',
          // ====== KATEGORI INFO ======
          kategori_name: '$kategori_info.uraian',
          sub_kategori_name: '$sub_kategori_info.uraian'
        }
      },
      // ====== SORT BERDASARKAN TANGGAL ======
      {
        $sort: { notif_created_at: -1 }
      }
    ]).toArray();

    // ====== CEK APAKAH ADA NOTIFIKASI ======
    if (notifikasiData.length === 0) {
      return res.status(200).json({
        success: true,
        message: "Tidak ada notifikasi untuk post ini",
        post_info: {
          post_id: postData.id,
          post_title: postData.title,
          post_status: postData.status
        },
        notifikasi_count: 0,
        data: []
      });
    }

    // ====== HITUNG TOTAL NOTIFIKASI ======
    const totalNotifikasi = notifikasiData.length;
    const unreadCount = notifikasiData.filter(n => !n.notif_read).length;

    return res.status(200).json({
      success: true,
      post_info: {
        post_id: postData.id,
        post_title: postData.title,
        post_status: postData.status
      },
      summary: {
        total_notifikasi: totalNotifikasi,
        read_count: totalNotifikasi - unreadCount,
        unread_count: unreadCount
      },
      data: notifikasiData
    });

  } catch (error) {
    console.error('Gagal mengambil data notifikasi:', error);
    return res.status(500).json({
      success: false,
      message: "Gagal mengambil data notifikasi"
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


module.exports = router