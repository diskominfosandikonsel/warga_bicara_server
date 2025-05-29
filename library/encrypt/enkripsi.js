const crypto = require('crypto');

// FUNGSI =============== Enkripsi dan dekripsi
function getKeyIV(keyStr) {
  const hash = crypto.createHash('sha256').update(keyStr).digest(); // 32-byte key
  const iv = hash.slice(0, 16); // IV 16 byte
  return { key: hash, iv };
}

async function decrypt(encryptedText, keyStr) {
    return new Promise((resolve) => {
        
        if (!encryptedText || !keyStr) {
          console.log('Encrypted text dan kunci tidak boleh kosong');
          throw new Error('Encrypted text dan kunci tidak boleh kosong');
        }
      
        try {
          const { key, iv } = getKeyIV(keyStr);
          const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
      
          let decrypted = decipher.update(encryptedText, 'base64', 'utf8');
          decrypted += decipher.final('utf8');
      
          resolve(decrypted);
        } catch (err) {
          console.log(`Dekripsi gagal`);
          throw new Error(`Dekripsi gagal: ${err.message}`);
        }

    })

} 

async function encrypt(text, keyStr) {
        return new Promise((resolve) => {
            if (!text || !keyStr) {
              console.log('Teks dan kunci tidak boleh kosong');
              throw new Error('Teks dan kunci tidak boleh kosong');
            }
          
            try {
              const { key, iv } = getKeyIV(keyStr);
              const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
          
              let encrypted = cipher.update(text, 'utf8', 'base64');
              encrypted += cipher.final('base64');
          
              resolve(encrypted);
            } catch (err) {
              console.log(`Enkripsi gagal: ${err.message}`);
              throw new Error(`Enkripsi gagal: ${err.message}`);
            }

        })
} 
// FUNGSI =============== Enkripsi dan dekripsi


module.exports = {
    encrypt:encrypt,
    decrypt:decrypt,
    getKeyIV:getKeyIV

}