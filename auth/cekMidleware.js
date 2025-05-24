const express = require('express');
const router = express.Router();


router.get('/checkAuth', (req, res)=>{
//    res.send(JSON.stringify({
//     message:"checkAuth 👌"+req.users
//    }))
   res.send(req.user)
})

module.exports = router;
