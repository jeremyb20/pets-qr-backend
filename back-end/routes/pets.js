const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const Pet = require('../models/pet');
const cloudinary = require('./../cloudinary.config');
const async = require('async');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const nodemailer = require('nodemailer');
const hbs = require('nodemailer-express-handlebars');
const path = require('path');
const fs = require('fs-extra');
require('dotenv').config();

// Authenticate
router.post('/authenticate', (req, res, next) => {
  const email = req.body.email;
  const password = req.body.password;

  Pet.getUserByUsername(email, (err, pet) => {
    if(err) throw err;
    if(!pet) {
      return res.json({success: false, msg: 'El correo ingresado no existe, favor revise de nuevo'});
    }

    Pet.comparePassword(password, pet.password, (err, isMatch) => {
      if(err) throw err;
      if(isMatch) {
        const token = jwt.sign({ data: pet.email }, process.env.SECRET, {
          expiresIn: 86400   // 1 week: 604800 1 day 86400 //60 one minute 
        });
        res.json({
          success: true,
          token: 'JWT '+ token,
          payload: {
            id: pet._id,
            userState: pet.userState,
            petName: pet.petName,
            photo: pet.photo,
            email: pet.email,
            idSecond: 0
          }
        })
      } else {
        return res.json({success: false, msg: 'Wrong password'});
      }
    });
  });
});






router.post('/delete/delete-pet', async(req, res) => {
  const obj = JSON.parse(JSON.stringify(req.body));

  Pet.findByIdAndDelete(obj._id, function (err, docs) {
    if (err){
      res.json({ success: false, msg: 'Problema favor de revisar..!' });
    }
    else{
      res.json({ success: true, msg: 'Se ha eliminado correctamente..!' });

    }
  });

});


router.post('/forgot', (req, res, next) => {
  const obj = JSON.parse(JSON.stringify(req.body));
  async.waterfall([
    function(done) {
      crypto.randomBytes(20, function(err, buf) {
        var token = buf.toString('hex');
        done(err, token);
      });
    },
    function(token, done) {
        Pet.findOne({ email: obj.email }, (err, user) => {
        if (!user) {
         return res.json({success:false,msg: 'El correo ingresado no existe, favor revise de nuevo'});
        }

        if(user != null) {
          user.resetPasswordToken = token;
          user.resetPasswordExpires = Date.now() + 3600000; // 1 hour
          user.save(function(err) {
            done(err, token, user);
          });
        }
      });
    },
    function(token, user, done) {
      var smtpTransport = nodemailer.createTransport({
        host: process.env.ZOHO_HOST,
        port: process.env.ZOHO_PORT,
        secure: true,
        logger: true,
        debug: true,
        auth: {
          user: process.env.ZOHO_USER,
          pass: process.env.ZOHO_PASSWORD
        },
        tls: {
          // do not fail on invalid certs
          rejectUnauthorized: false
        }
      });

      const handlebarOptions = {
        viewEngine: {
          extName: ".handlebars",
          partialsDir: path.resolve(__dirname, "views"),
          defaultLayout: false,
        },
        viewPath: path.resolve(__dirname, "views"),
        extName: ".handlebars",
      };
      
      smtpTransport.use(
        "compile",
        hbs(handlebarOptions)
      );

      smtpTransport.verify(function(error, success) {
        if (error) {
          console.log(error);
        } else {
          console.log("Server is ready to take our messages");
        }
      });
      var mailOptions = {
        to: user.email,
        from: '	soporte@localpetsandfamily.com',
        subject: 'Plaquitas para mascotas CR restablecimiento de la contraseña',
        template: 'email-forgot',
        context: {
          text1: 'Estimado usuario, \n\n',
          text2: 'Recibe este correo electrónico porque usted, o alguien en su representación, ha solicitado restablecer la contraseña de su cuenta.',
          text3: 'Para completar este proceso, por favor haga clic en el enlace proporcionado a continuación o cópielo y péguelo en su navegador:\n\n',
          linkSend: 'https://' + 'www.localpetsandfamily.com' + '/reset-pets/' + token + ' \n\n',
          text4: 'Si usted no solicitó este restablecimiento de contraseña, le pedimos que por favor ignore este correo electrónico. En tal caso, su contraseña seguirá siendo la misma y segura.\n\n',
          text5: 'Gracias por utilizar nuestros servicios y por mantener su cuenta segura.\n\n',
          text6: 'Atentamente.\n\n',
          text7:'Plaquitas para mascotas CR',
          textLink: 'Ir al enlace',
          link: (req.headers.host == 'localhost:8080')? 'http://localhost:4200/reset-pets/' + token  : 'https://' + 'www.localpetsandfamily.com' + '/reset-pets/' + token
        } 
      };
      smtpTransport.sendMail(mailOptions, function(err) {
        res.json({success: true, msg: 'Se ha enviado un correo electrónico a ' + user.email + ' con más instrucciones. favor de revisar la carpeta de spam si no ves el correo en tu bandeja principal'});
        done(err, 'done');
      });
    }
  ], function(err) {
    if (err) return next(err);
    res.redirect('/forgot');
  });
});

router.get('/reset-pets/:token', (req, res) => {
  Pet.findOne({ resetPasswordToken: req.params.token, resetPasswordExpires: { $gt: Date.now() } }, function(err, user) {
    if (!user) {
      return res.json({success:false,msg: err});
    }else{
      res
      .status(200)
      .json({ user: user, token: req.params.token });
    }
  });
});


router.post('/reset-pets/', function(req, res) {
  req.params.token = req.body.token;
  async.waterfall([
    function(done) {
      Pet.findOne({ resetPasswordToken: req.params.token, resetPasswordExpires: { $gt: Date.now() } }, function(err, user) {
        if (!user) {
          return  res.json({success:false,msg: 'El token de restablecimiento de contraseña no es válido o ha caducado..'});
        }else if(req.body.password === req.body.confirm){
          user.password = req.body.password;
          user.resetPasswordToken = undefined;
          user.resetPasswordExpires = undefined;

            bcrypt.genSalt(10, function(err, salt) {
            if (err) return next(err);

              bcrypt.hash(user.password, salt, function(err, hash) {
                if (err) return next(err);
                user.password = hash;
                user.save(function(err) {
                  done(err, user);
                });
              });
            });
        }else{
          return  res.json({success:false,msg: 'Password do not match..'});
        }
      });
    },
    function(user, done) {
      var smtpTransport = nodemailer.createTransport({
        host: process.env.ZOHO_HOST,
        port: process.env.ZOHO_PORT,
        secure: true,
        logger: true,
        debug: true,
        auth: {
          user: process.env.ZOHO_USER,
          pass: process.env.ZOHO_PASSWORD
        },
        tls: {
          // do not fail on invalid certs
          rejectUnauthorized: false
        }
      });
    
      const handlebarOptions = {
        viewEngine: {
          extName: ".handlebars",
          partialsDir: path.resolve(__dirname, "views"),
          defaultLayout: false,
        },
        viewPath: path.resolve(__dirname, "views"),
        extName: ".handlebars",
      };
      
      smtpTransport.use(
        "compile",
        hbs(handlebarOptions)
      );

      smtpTransport.verify(function(error, success) {
        if (error) {
          console.log(error);
        } else {
          console.log("Server is ready to take our messages");
        }
      });
    
      var mailOptions = {
        to: user.email,
        from: '	soporte@localpetsandfamily.com',
        subject: 'Plaquitas para mascotas CR, restablecimiento de la contraseña',
        template: 'index',
        context: {
          text: 'La contraseña de su correo ' + user.email + ' ha sido actualizada satisfactoriamente.\n',
          link: 'https://www.localpetsandfamily.com/login-pets',
          textLink: 'Iniciar sesión'
        } 
      };

      smtpTransport.sendMail(mailOptions, function(err) {
        res.json({success:true,msg: 'Su contraseña ha sido actualizada satisfactoriamente.'});
        done(err);
      });
    }
  ], function(err) {
    res.redirect('/login');
  });
});


module.exports = router;
