const nodemailer = require("nodemailer");
const {respondError422} = require("../utilitas/errorHandler");

// Create a test account or replace with real credentials.
const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 587,
  secure: false, // true for 465, false for other ports
  auth: {
    user: "wargabicara.konsel@gmail.com",
    pass: "mxfg kdzd ljtq ofgu",
  },
});

const kirimEmail =  async (req, res, next, result, dataUserdb)=>{
    console.log('Node mailer kirim email');
    console.log(result);
    
    const info = await transporter.sendMail({
    from: '"Warga Bicara Kab. Konawe Selatan" <wargabicara.konsel@gmail.com>',
    // to: "fasya080895@gmail.com",
    to: dataUserdb.email,
    subject: "Confirm Reset Password",
    // text: "Apakah anda yakin akan merubah password anda?", // plain‑text body
    html: `
            <html lang="id">
            <head>
            <meta charset="UTF-8" />
            <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
            <title>Reset Password</title>
            <style>
                body {
                font-family: Arial, sans-serif;
                background-color: #f4f4f7;
                margin: 0;
                padding: 0;
                }
                .email-container {
                max-width: 600px;
                margin: auto;
                background-color: #ffffff;
                padding: 40px;
                border-radius: 8px;
                box-shadow: 0 2px 5px rgba(0,0,0,0.1);
                }
                h1 {
                color: #333333;
                }
                p {
                color: #555555;
                line-height: 1.6;
                }
                .button {
                display: inline-block;
                background-color: #007bff;
                color: #ffffff;
                padding: 12px 24px;
                margin-top: 20px;
                text-decoration: none;
                border-radius: 5px;
                }
                .footer {
                text-align: center;
                font-size: 12px;
                color: #999999;
                margin-top: 20px;
                }
            </style>
            </head>
            <body>
            <div class="email-container">
                <h1>Reset Password Anda</h1>
                <p>Halo,</p>
                <p>Anda menerima email ini karena kami menerima permintaan reset password untuk akun Anda.</p>
                <p>Silakan klik tombol di bawah ini untuk mengkonfirmasi password baru yang telah anda masukan:</p>
                <a href="`+process.env.HOSTSERVER+`/api/v1/auth/resetM/confirm?token=`+result+`" class="button">Reset Password</a>
                <p>Jika Anda tidak meminta reset password, abaikan email ini dan tidak ada tindakan yang diperlukan.</p>
                <p>Terima kasih,<br>Tim Support</p>
                <div class="footer">
                &copy; 2025 Warga Bicara Kab. Konawe Selatan.
                </div>
            </div>
            </body>
            </html>
    
    `, // HTML body
  })
  .then(results =>{
    console.log(results)
    // console.log("Message sent:", info);
    res.send(JSON.stringify({ "message" : "konfirmasi reset password anda di kirim ke email anda. silahkan klik link yang di kirim ke email anda"}))
  })
  .catch(err =>{

    console.log(err);
    respondError422(res, next, "Gagal mengirim email")
    // res.send('email tidak Terkirim')

  })

}


module.exports = {
    kirimEmail:kirimEmail
}