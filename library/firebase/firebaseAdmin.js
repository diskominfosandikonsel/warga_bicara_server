const { initializeApp, cert, getApps } = require('firebase-admin/app');
const { getMessaging } = require('firebase-admin/messaging');
const path = require('path');

const serviceAccountPath = path.join(__dirname, '../../firebase-service-account.json');

let messagingInstance = null;

try {
  const serviceAccount = require(serviceAccountPath);

  if (!getApps().length) {
    initializeApp({
      credential: cert(serviceAccount)
    });
    console.log('✅ Firebase Admin SDK berhasil diinisialisasi');
  }
  messagingInstance = getMessaging();
} catch (error) {
  console.error('❌ Gagal menginisialisasi Firebase Admin SDK:', error.message);
}

/**
 * Kirim Push Notification ke satu atau beberapa token FCM
 * @param {string|string[]} fcmTokens - Token FCM tujuan
 * @param {string} title - Judul notifikasi
 * @param {string} body - Isi pesan notifikasi
 * @param {Object} dataPayload - Data tambahan (misal: { post_id: "123", type: "chat" })
 */
const sendPushNotification = async (fcmTokens, title, body, dataPayload = {}) => {
  try {
    if (!messagingInstance) {
      console.error('❌ Firebase Messaging SDK belum terinisialisasi');
      return null;
    }

    if (!fcmTokens) {
      console.log('⚠️ Tidak ada token FCM tujuan');
      return null;
    }

    const tokens = Array.isArray(fcmTokens) ? fcmTokens : [fcmTokens];
    const validTokens = tokens.filter(t => t && typeof t === 'string' && t.trim().length > 0);

    if (validTokens.length === 0) {
      console.log('⚠️ Token FCM tidak valid');
      return null;
    }

    const message = {
      notification: {
        title: title || 'Warga Bicara',
        body: body || ''
      },
      data: {
        title: title || 'Warga Bicara',
        body: body || '',
        ...Object.keys(dataPayload).reduce((acc, key) => {
          acc[key] = String(dataPayload[key]);
          return acc;
        }, {})
      },
      android: {
        priority: 'high',
        notification: {
          title: title || 'Warga Bicara',
          body: body || '',
          icon: 'ic_notification',
          color: '#F59E0B',
          sound: 'default',
          channelId: 'warga_bicara_channel_v11',
          priority: 'high',
          visibility: 'public',
          defaultSound: true,
          defaultVibrateTimings: true,
          notificationCount: 1
        }
      }
    };

    if (validTokens.length === 1) {
      message.token = validTokens[0];
      const response = await messagingInstance.send(message);
      console.log('🚀 FCM push notification berhasil dikirim:', response);
      return response;
    } else {
      message.tokens = validTokens;
      const response = await messagingInstance.sendEachForMulticast(message);
      console.log(`🚀 FCM multicast notification dikirim (${response.successCount} sukses, ${response.failureCount} gagal)`);
      return response;
    }
  } catch (error) {
    console.error('❌ Gagal mengirim FCM notification:', error);
    return null;
  }
};

module.exports = {
  sendPushNotification
};
