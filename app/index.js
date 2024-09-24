const express = require('express')
const bodyParser = require('body-parser')
const multer = require('multer');
const upload = multer();

const app = express()
const registerRoutes = require('./routes/registerRoutes')

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended:true}));
app.use(upload.array());

app.use('/register', registerRoutes);

module.exports = app