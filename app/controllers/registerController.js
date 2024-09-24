const multer = require('multer');
const mysql = require('mysql2');
const path = require('path');
const fs = require('fs');
const nodemailer = require('nodemailer');
const bcrypt = require('bcrypt');


const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'nicholastarigan10@gmail.com',
        pass: 'gkgd wwnm ncis vbqq'
    }
});

const pool = mysql.createPool(require('../../config/db'))
const db = pool.promise();

const uploadDir = path.join(__dirname, '../../uploads');

if(!fs.existsSync(uploadDir)){
    fs.mkdirSync(uploadDir, {recursive:true});
}

const storage = multer.memoryStorage();

const upload = multer({
    storage: storage,
    dest: 'uploads/',
});

exports.uploadDocs = (req, res, next) => { 
    upload.fields([
        { name: 'npwp_perusahaan', maxCount: 1},
        { name: 'siup', maxCount: 1},
        { name: "akta_pendirian_perusahaan", maxCount: 1},
        { name: "pengesahan_akta_dari_menteri", maxCount: 1},
        { name: "ktp_direktur_perusahaan", maxCount: 1}
    ])(req, res, (err) => {
        if( err) {
            return res.status(400).json({message: 'Error uploading files', error: err.message});
        }
        next();
    })
}

exports.createUserAsCompany = async (req, res) => {
    const body = req.body;
    const namaPerusahaan = body.nama_perusahaan;
    const penanggungJawabPerusahaan = body.penanggung_jawab_perusahaan;
    const alamatLengkap = body.alamat_lengkap;
    const provinsi = body.provinsi;
    const kabupaten = body.kabupaten;
    const kecamatan = body.kecamatan;
    const kelurahan = body.kelurahan;
    const kodePos = body.kode_pos;
    
    const namaBank = body.nama_bank;
    const lokasiKCP = body.lokasi_kcp;
    const nomorRekening = body.nomor_rekening;
    const namaPemilikRekening = body.nama_pemilik_rekening;


    const requiredFields = [
        namaPerusahaan,
        penanggungJawabPerusahaan,
        alamatLengkap,
        provinsi,
        kabupaten,
        kecamatan,
        kelurahan,
        kodePos,
        namaBank,
        lokasiKCP,
        nomorRekening,
        namaPemilikRekening,
    ];

    for (const field of requiredFields) {
        if (!field) {
            return res.status(400).json({ message: "Semua field harus diisi!"});
        }
    }

    let npwpPerusahaan = req.files.npwp_perusahaan;
    let siup = req.files.siup;
    let aktaPendirianPerusahaan = req.files.akta_pendirian_perusahaan;
    let pengesahanAktaDariMenteri = req.files.pengesahan_akta_dari_menteri;
    let ktpDirekturPerusahaan = req.files.ktp_direktur_perusahaan;

    const fileFields = [
        npwpPerusahaan,
        siup,
        aktaPendirianPerusahaan,
        pengesahanAktaDariMenteri,
        ktpDirekturPerusahaan
    ];
    for(const file of fileFields){
        if(!file){
            return res.status(400).json({
                message: "Dokumen file tidak lengkap!"
            })
        }
    }

    for(const file of fileFields){
        const data = file[0];
        if(data.mimetype != "image/jpeg" && data.mimetype != "image/png" && data.mimetype != "application/pdf"){
            return res.status(400).json({message: "Format dokumen tidak diizinkan, harus berformat JPG, PNG atau PDF."})
        }

        const maxSize = 15 * 1024 * 1024;
        if (data.size > maxSize){
            return res.status(400).json({
                message: "Maksimal ukuran dokumen 15MB."
            })
        }
    }

    const uploadDirCorps = path.join(__dirname, `../../uploads/${namaPerusahaan}`)

    if(!fs.existsSync(uploadDirCorps)){
        fs.mkdirSync(uploadDirCorps, {recursive:true});
    }

    const now = Date.now();

    for(const data of fileFields){
        const file = data[0];
        fs.writeFileSync(`${uploadDirCorps}/${file.fieldname}_${now}${path.extname(file.originalname)}`, file.buffer, (err) => {
            if(err){
                return res.status(500).json({message: "Internal server error!", error: err.message})
            }
        });
    }

    try{
        
        const sql = `INSERT INTO company (
            nama_perusahaan,
            penanggung_jawab_perusahaan,
            alamat_lengkap,
            provinsi,
            kabupaten,
            kecamatan,
            kelurahan,
            kode_pos,
            nama_bank,
            lokasi_kcp,
            nomor_rekening,
            nama_pemilik_rekening,
            npwp_perusahaan,
            siup,
            akta_pendirian_peruisahaan,
            pengesahan_akta_dari_menteri,
            ktp_direktur_perusahaan
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
        
        const result = await db.query(sql, [
            namaPerusahaan,
            penanggungJawabPerusahaan,
            alamatLengkap,
            provinsi,
            kabupaten,
            kecamatan,
            kelurahan,
            kodePos,
            namaBank,
            lokasiKCP,
            nomorRekening,
            namaPemilikRekening,
            npwpPerusahaan,
            siup,
            aktaPendirianPerusahaan,
            pengesahanAktaDariMenteri,
            ktpDirekturPerusahaan,
        ]);

    }catch (err){

    }

}

const generateVerificationCode = () => {
    return Math.floor(10000 + Math.random() * 90000);
}

exports.registUser = async (req, res) => {
    const body = req.body;
    const namaLengkap = body.nama_lengkap;
    const sebutan = body.sebutan;
    const email = body.email;
    const password = body.password;
    const confirmPassword = body.confirm_password;
    const fields = [
        namaLengkap,
        sebutan,
        email,
        password,
        confirmPassword,
    ]

    for(const field of fields){
        if(!field){
            return res.status(400).json({
                message: "Semua field harus lengkap!"
            })
        }
    }

    if (password != confirmPassword){
        return res.status(400).json({
            message: "Password tidak sama dengan konfirmasi password"
        });
    }

    try{
        const hashedPassword = bcrypt.hashSync(password, 10);
        const verificationCode = generateVerificationCode();

        const sql = `insert into user(nama_lengkap, sebutan, email, password, verified, verification_code) values (?, ?, ?, ?, ?, ?)`;
        const [result] = await db.query(sql, [
            namaLengkap, sebutan, email, hashedPassword, 0, verificationCode
        ]);
        

        const mailOptions = {
            from: 'nicholastarigan10@gmail.com',
            to: email,
            subject: 'RegistLogee Verifikasi Akun',
            html: `<p>Kode verifikasi Anda adalah:<strong>${verificationCode}</strong></p>`
        };

        transporter.sendMail(mailOptions, function(error, info) {
            if(error){
                console.log('error');
                return res.status(500).json({message:"Internal Server Error", error: error.message})
            }else{
                return res.status(200).json({
                    message: "Berhasil membuat akun, verifikasi akun anda melalui email!",
                    userId: result.insertId
                });
            }
        })
    }catch(err){
        return res.status(500).json({
            message: "Internal Server Error!",
            error: err.message
        });
    }
}

exports.verifyCode = async (req,res) => {
    const body = req.body;
    const verificationCode = body.verification_code;
    const userId = body.user_id;

    const [[result]] = await db.query('select verification_code from user where id = ?', [userId]);

    if(verificationCode != result.verification_code){
        return res.status(400).json({
            message: "Kode salah!"
        });
    }

    await db.query('update user set verified = 1 where id = ?', [userId]);
    return res.json({
        message: "Berhasil verifikasi akun!"
    });
}

exports.resendCode = async (req,res) => {
    const body = req.body;
    const userId = body.user_id;
    const newCode = generateVerificationCode();
    const [[result]] = await db.query('select * from user where id = ?', [userId]);

    const mailOptions = {
        from: 'nicholastarigan10@gmail.com',
        to: result.email,
        subject: 'RegistLogee Verifikasi Akun',
        html: `<p>Kode verifikasi Anda adalah:<strong>${newCode}</strong></p>`
    };

    try{
        await transporter.sendMail(mailOptions);
        await db.query('update user set verification_code = ? where id = ?', [
            newCode,
            userId
        ]);
        return res.json({
            message: "Berhasil mengirim kode ulang!"
        });
    }catch(err){
        console.log(err.message);
        return res.status(500).json({
            message: "Internal Server Error!",
            error: err.message
        });
    }
}