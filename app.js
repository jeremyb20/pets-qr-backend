const express = require('express');
const morgan = require('morgan');
const multer = require('multer');
const path = require('path');
const exphbs = require('express-handlebars');
const cors = require('cors');
const compression = require('compression');
require('dotenv').config();
const app = express();


//settings
app.set('views', path.join(__dirname, 'public'));

app.use(cors())
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({limit: "50mb", extended: false, parameterLimit:50000}));
app.use(compression())

app.use(function (req, res, next) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'Origin, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, X-Response-Time, X-PINGOTHER, X-CSRF-Token,Authorization');
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  res.setHeader('Access-Control-Allow-Credentials', true);
  next();
});

const storage = multer.diskStorage({
  destination: path.join(__dirname, 'public/uploads'),
  filename: (_req, file, cd) => {
    cd(null, new Date().getTime() + path.extname(file.originalname));
  }
});
app.use(multer({storage}).single('image'));

app.use("/api/pet", require('./back-end/routes/pets'));
app.use("/api/admin", require('./back-end/routes/admin'));
app.use("/api/user", require('./back-end/routes/users'));

app.use("/api/catalog", require('./back-end/routes/catalog'));

// Start Server
app.use(express.static(__dirname + '/dist/plaquitas-cr'));
app.get('/*', function(_req,res){
    res.sendFile(path.join(__dirname+'/dist/plaquitas-cr/index.html'))
})


module.exports = app;
