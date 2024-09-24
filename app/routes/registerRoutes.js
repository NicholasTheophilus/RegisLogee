const controller = require('../controllers/registerController')
const router = require('express').Router()

router.post('/company', controller.uploadDocs,controller.createUserAsCompany)
router.post('/user', controller.registUser);
router.post('/verify', controller.verifyCode);
router.get('/resend-code', controller.resendCode);

module.exports = router;