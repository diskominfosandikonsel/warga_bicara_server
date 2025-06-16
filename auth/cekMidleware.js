const express = require('express');
const router = express.Router();
const { connectRedis, redisClient } = require('../library/redist/redist');
const jwt = require('jsonwebtoken');

router.get('/checkAuth', async (req, res, next)=>{
//    const authHeader = req.get('authorization');
//    const token = authHeader.split(' ')[1];
// //    res.send(JSON.stringify({
// //     message:"checkAuth 👌"+req.users
// //    }))

//   try {
//     // Verify JWT
//     const payload = jwt.verify(token, process.env.TOKEN_SECRET);
//     req.user = payload;

//     // Cek blacklist
//     const blacklisted = await redisClient.exists(`blacklist:${token}`);
//     if (blacklisted) {
//       return res.status(403).json({ message: 'Token sudah tidak berlaku (blacklisted)' });
//     }

//     // Cek whitelist
//     const whitelisted = await redisClient.exists(`whitelist:${token}`);
//     if (!whitelisted) {
//       return res.status(403).json({ message: 'Token tidak terdaftar di whitelist' });
//    }
   
//    // res.send(req.user)
//    next();
// } catch (err) {
//    return res.status(401).json({ message: 'Token tidak valid atau kedaluwarsa' });
// }

// res.send(req.user)
if (!req.user) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  res.json({ message: 'Selamat datang', user: req.user });

})

module.exports = router;
