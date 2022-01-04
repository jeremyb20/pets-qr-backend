const express = require('express');
const router = express.Router();
const passport = require('passport');
const jwt = require('jsonwebtoken');
const Pet = require('../models/pet');
const cloudinary = require('cloudinary').v2;
const async = require('async');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const nodemailer = require('nodemailer');
const app = express();
const hbs = require('nodemailer-express-handlebars');
const path = require('path');
require('dotenv').config();

const { google } = require('googleapis')

// Require oAuth2 from our google instance.
const { OAuth2 } = google.auth

// Create a new instance of oAuth and set our Client ID & Client Secret.
const oAuth2Client = new OAuth2(
  process.env.GOOGLE_CLIENT,process.env.GOOGLE_SECRET
)

// Call the setCredentials method on our oAuth2Client instance and set our refresh token.
oAuth2Client.setCredentials({
  refresh_token:process.env.GOOGLE_REFRESH_TOKEN,
})



var fileupload = require('express-fileupload');
const pet = require('../models/pet');

app.use(fileupload({
  useTempFiles:true
}));

cloudinary.config({
  cloud_name:process.env.CLOUD_NAME,
  api_key: process.env.API_KEY_CLOUDINARY,
  api_secret: process.env.API_SECRET
});

// Register aqui hay ebviar la foto
router.post('/register/new-pet', async(req, res, next) => {
  const obj = JSON.parse(JSON.stringify(req.body));
  Pet.findOne({email: obj.email}, async function (err, myUser) {
    
    if (!err){
      if(myUser){
        res.json({ success: false, msg: 'El correo ya existe en el sistema' });
      }else{
          const result = await cloudinary.uploader.upload(req.file != undefined ? req.file.path : obj.image);
          let newPet = new Pet({
            petName: obj.petName,
            phone: obj.phone,
            email: obj.email.toLowerCase(),
            password: obj.password,
            lat: obj.lat,
            lng: obj.lng,
            userState: obj.userState,
            genderSelected: obj.genderSelected,
            photo: result.secure_url == undefined ? obj.image : result.secure_url,
            petStatus: obj.petStatus,
            isActivated: false,
            phoneVeterinarian: 00000000,
            permissions: {
              showPhoneInfo: true,
              showEmailInfo: true,
              showLinkTwitter: true,
              showLinkFacebook: true,
              showLinkInstagram: true,
              showOwnerPetName: true,
              showBirthDate: true,
              showAddressInfo: true,
              showAgeInfo: true,
              showVeterinarianContact: true,
              showPhoneVeterinarian: true,
              showHealthAndRequirements: true,
              showFavoriteActivities: true,
              showLocationInfo: true
            }
          });
        Pet.addPet(newPet, async (user, done) => {
          try {
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
                to: newPet.email,
                from: 'soporte@localpetsandfamily.com',
                subject: 'LocalPetsAndFamily registro realizado exitosamente',
                attachments: [
                  {filename: 'localpetslogo.jpg', path:'./src/assets/localpetslogo.jpg'}
                ],
                template: 'index',
                context: {
                  text: 'Recibe esto porque usted (u otra persona) se ha registrado dentro de nuestra plataforma .\n\n' +
                  'Haga clic en el siguiente enlace en su navegador para poder iniciar sesion:\n\n' +
                  'Si no lo solicitó, ignore este correo electrónico.\n',
                  link: 'https://www.localpetsandfamily.com/login-pets',
                  textLink: 'Ir a iniciar sesión'
                } 
              };
            
              smtpTransport.sendMail(mailOptions, function(err) {
                res.json({ success: true, msg: 'Su registro ha sido authenticado correctamente. Haz click en ok para iniciar sesión' });
              });
            } catch (err) {
              res.json({ success: false, msg: 'Este Correo Ya existe.!' });
              next(err);
            }
        });
      }
      
    } else {
      res.json({ success: false, msg: 'Ocurrió un problema favor de reportar al administrador' });
    }
      
    })
});

router.post('/register/new-petByUserPet', async(req, res) => {
  var id ='60219dea321aed00155e1659';
  const obj = JSON.parse(JSON.stringify(req.body));
  const result = await cloudinary.uploader.upload(req.file != undefined? req.file.path: obj.image);

  const newpet = {
    petName: obj.petName,
    ownerPetName: obj.ownerPetName,
    birthDate: obj.birthDate,
    address: obj.address,
    email: obj.email,
    age: obj.age,
    veterinarianContact: obj.veterinarianContact,
    phoneVeterinarian:obj.phoneVeterinarian,
    healthAndRequirements: obj.healthAndRequirements,
    favoriteActivities: obj.favoriteActivities,
    lat: obj.lat,
    lng: obj.lng,
    userState: obj.userState,
    genderSelected:obj.genderSelected,
    photo: result.secure_url == undefined ? obj.image : result.secure_url,
    phone: obj.phone,
    petStatus: obj.petStatus,
    permissions : {
      showPhoneInfo: true,
      showEmailInfo: true,
      showLinkTwitter: true,
      showLinkFacebook: true,
      showLinkInstagram: true,
      showOwnerPetName: true,
      showBirthDate: true,
      showAddressInfo: true,
      showAgeInfo: true,
      showVeterinarianContact: true,
      showPhoneVeterinarian: true,
      showHealthAndRequirements: true,
      showFavoriteActivities: true,
      showLocationInfo: true
    }
  }

  var notifications = {
    message: 'El usuario con el correo '+ obj.email+ ' ha registrado un can bajo su dominio',
    userPetName: newpet.petName,
    isNewMsg: true,
    dateMsg: new Date(),
    photo: newpet.photo,
    idPet: obj._id
  }

  Pet.findOneAndUpdate({ _id: req.body._id }, { $push: { newPetProfile: newpet }},{new: true}).then(function(data){
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
      to: 'soporte@localpetsandfamily.com',
      from: 'soporte@localpetsandfamily.com',
      subject: 'LocalPetsAndFamily registro de nuevo can',
      attachments: [
        {filename: 'localpetslogo.jpg', path:'./src/assets/localpetslogo.jpg'}
      ],
      template: 'products',
      context: {
        text: 'El usuario con el correo '+ obj.email+ ' ha registrado un nuevo can \n',
        photo: newpet.photo
      } 
    };
  
    smtpTransport.sendMail(mailOptions, function(err) {
      res.json({success:true,msg: 'Se ha registrado correctamente el can bajo su correo de perfil!'});
    });
  });

  Pet.findOneAndUpdate({ _id: id }, { $push: { notifications: notifications  }},{new: true}).then(function(data){
    console.log('Se ha enviado al admin');
  });
});

// Authenticate
router.post('/authenticate', (req, res, next) => {
  const email = req.body.email;
  const password = req.body.password;

  Pet.getUserByUsername(email, (err, pet) => {
    if(err) throw err;
    if(!pet) {
      return res.json({success: false, msg: 'Email not found'});
    }

    Pet.comparePassword(password, pet.password, (err, isMatch) => {
      if(err) throw err;
      if(isMatch) {
        const token = jwt.sign({data: pet}, process.env.SECRET, {
          expiresIn: 86400   // 1 week: 604800 1 day 86400 //60 one minute 
        });
        res.json({
          success: true,
          token: 'JWT '+token,
          pet: {
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



router.put('/update/updateProfilePet', async(req, res, next) => {
  const obj = JSON.parse(JSON.stringify(req.body));

  const petUpdate = {
    petName: obj.petName,
    ownerPetName: obj.ownerPetName,
    birthDate: obj.birthDate,
    address: obj.address,
    email: obj.email,
    age: obj.age,
    phone: obj.phone,
    veterinarianContact: obj.veterinarianContact,
    phoneVeterinarian: obj.phoneVeterinarian,
    healthAndRequirements: obj.healthAndRequirements,
    favoriteActivities: obj.favoriteActivities,
    linkTwitter: obj.linkTwitter,
    linkFacebook: obj.linkFacebook,
    linkInstagram: obj.linkInstagram,
  }

  await Pet.findOne({_id: req.body._id }, (err, pet) => {
    if (!pet) {
      return res.json({success:false,msg: 'Usuario no encontrado'});
    }
    if(pet != null) {
      if(obj.idSecond == 0){
        var arrayPet = [];
        arrayPet.push(pet);
        arrayPet.forEach(element => {
          element["petName"] = petUpdate.petName;
          element["ownerPetName"] = petUpdate.ownerPetName;
          element["birthDate"] = petUpdate.birthDate;
          element["address"] = petUpdate.address;
          element["email"] = petUpdate.email;
          element["age"] = petUpdate.age;
          element["veterinarianContact"] = petUpdate.veterinarianContact;
          element["phone"] = petUpdate.phone;
          element["phoneVeterinarian"] = petUpdate.phoneVeterinarian;
          element["healthAndRequirements"] = petUpdate.healthAndRequirements;
          element["favoriteActivities"] = petUpdate.favoriteActivities;
          element["linkTwitter"] = petUpdate.linkTwitter;
          element["linkFacebook"] = petUpdate.linkFacebook;
          element["linkInstagram"] = petUpdate.linkInstagram;
          pet.save();
          try {
            res.json({ success: true, msg: 'Se ha actualizado correctamente..!' });
          } catch (err) {
            res.json({ success: false, msg: err });
            next(err);
          }
        })
      }else {
        var arrayPet = [];
        arrayPet.push(pet.newPetProfile);
        arrayPet.forEach(element => {
          element.forEach(item => {
            if(item._id == obj.idSecond){
              item["petName"] = petUpdate.petName;
              item["ownerPetName"] = petUpdate.ownerPetName;
              item["birthDate"] = petUpdate.birthDate;
              item["address"] = petUpdate.address;
              item["email"] = petUpdate.email;
              item["age"] = petUpdate.age;
              item["phone"] = petUpdate.phone;
              item["phoneVeterinarian"] = petUpdate.phoneVeterinarian;
              item["veterinarianContact"] = petUpdate.veterinarianContact;
              item["healthAndRequirements"] = petUpdate.healthAndRequirements;
              item["favoriteActivities"] = petUpdate.favoriteActivities;
              item["linkTwitter"] = petUpdate.linkTwitter;
              item["linkFacebook"] = petUpdate.linkFacebook;
              item["linkInstagram"] = petUpdate.linkInstagram;
              item["showLocationInfo"] = petUpdate.showLocationInfo;
              pet.save();
              try {
                res.json({ success: true, msg: 'Se ha actualizado correctamente..!' });
              } catch (err) {
                res.json({ success: false, msg: err });
                next(err);
              }
            }
          })
        })
      }
     }
   });
});


router.put('/register/new-pet-code-generator', async(req, res, next) => {
  const obj = JSON.parse(JSON.stringify(req.body));
  const result = await cloudinary.uploader.upload(req.file != undefined ? req.file.path : obj.image);
  const petUpdate = {
    petName: obj.petName,
    phone: obj.phone,
    email: obj.email.toLowerCase(),
    password: obj.password,
    lat: obj.lat,
    lng: obj.lng,
    userState: obj.userState,
    genderSelected: obj.genderSelected,
    photo: result.secure_url == undefined ? obj.image : result.secure_url,
    petStatus: obj.petStatus,
    isActivated: false,
    password: obj.password,
    phoneVeterinarian: 00000000,
  }

  await Pet.findOne({_id: req.body._id }, (err, pet) => {
    if (!pet) {
      return res.json({success:false,msg: 'Codigo no encontrado'});
    }
    if(pet != null) {

      Pet.findOne({email: obj.email}, async function (err, myUser) {
    
        if (!err){
          if(myUser){
            res.json({ success: false, msg: 'El correo ya existe en el sistema' });
          }else{
            if(obj.codeGenerator === pet.randomCode){
              if(pet.isActivated){
                if(obj.idSecond == 0){
                  Pet.newPetGeneratorCode(petUpdate, async (user, done) => {
                    try {
                      var arrayPet = [];
                      arrayPet.push(pet);

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
                        console.log(success,'que trae');
                        console.log(error,'que trae dos');
                        if (error) {
                          console.log(error);
                          res.json({ success: false, msg: 'El correo no existe favor verifique que las letras sean las correctas no se aceptan mayusculas' });
                        } else {
                          arrayPet.forEach(element => {
                            var permissions = {
                              showPhoneInfo: true,
                              showEmailInfo: true,
                              showLinkTwitter: true,
                              showLinkFacebook: true,
                              showLinkInstagram: true,
                              showOwnerPetName: true,
                              showBirthDate: true,
                              showAddressInfo: true,
                              showAgeInfo: true,
                              showVeterinarianContact: true,
                              showPhoneVeterinarian: true,
                              showHealthAndRequirements: true,
                              showFavoriteActivities: true,
                              showLocationInfo: true
                            }
                            
                            element["petName"] = user.petName;
                            element["permissions"] = permissions;
                            element["phone"] = user.phone;
                            element["email"] = user.email;
                            element["lat"] = user.lat;
                            element["lng"] = user.lng;
                            element["userState"] = user.userState;
                            element["genderSelected"] = user.genderSelected;
                            element["photo"] = user.photo;
                            element["phoneVeterinarian"] = user.phoneVeterinarian;
                            element["petStatus"] = user.petStatus;
                            element["password"] = user.password;
                            element["isActivated"] = false;
                          })
                          pet.save();
                          var mailOptions = {
                            to: user.email,
                            from: 'soporte@localpetsandfamily.com',
                            subject: 'LocalPetsAndFamily registro realizado exitosamente',
                            attachments: [
                              {filename: 'localpetslogo.jpg', path:'./src/assets/localpetslogo.jpg'}
                            ],
                            template: 'index',
                            context: {
                              text: 'Recibe esto porque usted (u otra persona) se ha registrado dentro de nuestra plataforma .\n\n' +
                              'Haga clic en el siguiente enlace en su navegador para poder iniciar sesion:\n\n' +
                              'Si no lo solicitó, ignore este correo electrónico.\n',
                              link: 'https://www.localpetsandfamily.com/login-pets',
                              textLink: 'Ir a iniciar sesión'
                            } 
                          };
                        
                          smtpTransport.sendMail(mailOptions, function(err) {
                            res.json({ success: true, msg: 'Su registro ha sido authenticado correctamente. Haz click en ok para iniciar sesión' });
                          });
                        }
                      });
                    
                     
                    } catch (err) {
                      res.json({ success: false, msg: err });
                      next(err);
                    }
                  })
                }
              }else{
                res.json({ success: false, msg: 'Este codigo ya ha sido registrado' });
              }
            }else{
              res.json({ success: false, msg: 'El codigo es el incorrecto verifique que las letras sean minuscula y mayuscula' });
            }
          }
        }
      })
     }
   });
});

router.put('/update/updateLocationPet', async(req, res, next) => {
  const obj = JSON.parse(JSON.stringify(req.body));

  const petUpdate = {
    lat: obj.lat,
    lng: obj.lng,
  }

  await Pet.findOne({_id: req.body._id }, (err, pet) => {
    if (!pet) {
      return res.json({success:false,msg: 'Usuario no encontrado'});
    }
     if(pet != null) {
       var arrayPet = [];
      arrayPet.push(pet);
      if(obj.idSecond == 0){
        arrayPet.forEach(element => {
          element["lat"] = petUpdate.lat;
          element["lng"] = petUpdate.lng;
          pet.save();
          try {
            res.json({ success: true, msg: 'Se ha actualizado correctamente..!' });
          } catch (err) {
            res.json({ success: false, msg: err });
            next(err);
          }
        })
      }else{
        arrayPet[0].newPetProfile.forEach(element => {
          if(element._id == obj.idSecond){
            element["lat"] = petUpdate.lat;
            element["lng"] = petUpdate.lng;
            pet.save();
            try {
              res.json({ success: true, msg: 'Se ha actualizado correctamente..!' });
            } catch (err) {
              res.json({ success: false, msg: err });
              next(err);
            }
          }
        })
      }
     }
   });
});

router.put('/update/updatePhotoPetProfile', async(req, res, next) => {
  const obj = JSON.parse(JSON.stringify(req.body));

  const result = await cloudinary.uploader.upload(req.file != undefined? req.file.path: obj.image);
  let newPet = {
    photo: result.secure_url == undefined ? obj.image : result.secure_url
  };

  await Pet.findOne({_id: req.body._id }, (err, pet) => {
    if (!pet) {
      return res.json({success:false,msg: 'Usuario no encontrado'});
    }
     if(pet != null) {
       var arrayPet = [];
       arrayPet.push(pet);
       if(obj.idSecond == 0){
        arrayPet.forEach(element => {
            element["photo"] = newPet.photo;
            pet.save();
            try {
              res.json({ success: true, msg: 'Se ha actualizado correctamente..!' });
            } catch (err) {
              res.json({ success: false, msg: err });
              next(err);
            }
        })
      }else {
        arrayPet[0].newPetProfile.forEach(element => {
          if (element._id == obj.idSecond) {
            element["photo"] = newPet.photo;
            pet.save();
            try {
              res.json({ success: true, msg: 'Se ha actualizado correctamente..!' });
            } catch (err) {
              res.json({ success: false, msg: err });
              next(err);
            }
          }   
        })
      }
     }
   });
});

router.get('/getPetDataList', function(req, res){
  var id = req.query.id;
  var idSecond = req.query.idSecond;
  var view = req.query.view;
  Pet.findById(id, function(err, results){
    if(err){
      res.json({ success: false, msg: err });
      return;
    }
    if(results != undefined){
      if(idSecond == 0) {
        if(results.isActivated){
          var pet = {
            isActivated: results.isActivated,
          }
          res.json({ success: true, pet });
        }else{
          var firstLetters = results.email;
          var lastLetters = results.email;
          var phone = results.phone;
          var phoneVetrinarian = results.phoneVeterinarian;
          const test5 = phoneVetrinarian.toString().slice(phoneVetrinarian.toString().length - 2);
          let test = firstLetters.slice(0,5);
          const test2 = lastLetters.slice(lastLetters.length - 4);
          const test3 = Math.floor(Math.random() * (12 - 5 + 1)) + 5;
          const test4 = phone.toString().slice(phone.toString().length - 2);
        

          function makeid(length) {
            var result = [];
            var characters = '*******************************';
            var charactersLength = characters.length;
            for (var i = 0; i < length; i++) {
              result.push(characters.charAt(Math.floor(Math.random() *
                charactersLength)));
            }
            return result.join('');
          }
          

          var pet = {
            petName: results.petName,
            ownerPetName: results.ownerPetName,
            phone: (view == 1)? results.phone: (view == 2 && results.petStatus == 'Perdido' )? 63050037: (view == 3 && results.petStatus == 'Perdido' )?63050037: '******'+test4 ,
            email:(view == 1)? results.email: (view == 2 && results.petStatus == 'Perdido' )? results.email: (view == 3 && results.petStatus == 'Perdido' )?results.email: test+ makeid(test3) +test2,
            photo: results.photo,
            userState: results.userState,
            lat: results.lat,
            lng: results.lng,
            birthDate: results.birthDate,
            address: results.address,
            age: results.age,
            isActivated: results.isActivated,
            veterinarianContact: results.veterinarianContact,
            phoneVeterinarian: (view == 1)? results.phoneVeterinarian: (view == 2 && results.petStatus == 'Perdido')? 63050037: (view == 3 && results.petStatus == 'Perdido' )?63050037:  '******'+test5,
            healthAndRequirements: results.healthAndRequirements,
            favoriteActivities: results.favoriteActivities,
            petStatus: results.petStatus,
            linkTwitter: results.linkTwitter,
            linkFacebook: results.linkFacebook,
            linkInstagram: results.linkInstagram,
          }
          res.json({ success: true, pet });
        }
      }else {
        if(results!= null) {
            results.newPetProfile.forEach(element => {
            if (element._id == idSecond) {
              const test4 = element.phone.toString().slice(element.phone.toString().length - 2);
              const test5 = element.phoneVeterinarian.toString().slice(element.phoneVeterinarian.toString().length - 2);
              let test = element.email.slice(0,5);
              const test2 = element.email.slice(element.email.length - 4);
              const test3 = Math.floor(Math.random() * (12 - 5 + 1)) + 5;
              function makeid(length) {
                var result = [];
                var characters = '*******************************';
                var charactersLength = characters.length;
                for (var i = 0; i < length; i++) {
                  result.push(characters.charAt(Math.floor(Math.random() *
                    charactersLength)));
                }
                return result.join('');
              }
              var pet = {
                petName: element.petName,
                ownerPetName: element.ownerPetName,
                phone:  (view == 1)? element.phone: (view == 2 && element.petStatus == 'Perdido' )? 63050037: (view == 3 && element.petStatus == 'Perdido' )?63050037: '******'+test4,
                email:(view == 1)? element.email:(view == 2 && element.petStatus == 'Perdido' )? element.email : (view == 3 && element.petStatus == 'Perdido' )?element.email:  test+ makeid(test3) +test2,
                photo: element.photo,
                userState: element.userState,
                lat: element.lat,
                lng: element.lng,
                birthDate: element.birthDate,
                address: element.address,
                age: element.age,
                veterinarianContact: element.veterinarianContact,
                phoneVeterinarian: (view == 1)? element.phoneVeterinarian: (view == 2 && element.petStatus == 'Perdido')? 63050037 : (view == 3 && element.petStatus == 'Perdido' )?63050037: '******'+test5 ,
                healthAndRequirements: element.healthAndRequirements,
                favoriteActivities: element.favoriteActivities,
                // calendar: element.calendar,
                // code: element.code,
                petStatus: element.petStatus,
                linkTwitter: element.linkTwitter,
                linkFacebook: element.linkFacebook,
                linkInstagram: element.linkInstagram
              }
              res.json({ success: true, pet });
            }
          })
        }
        
      }
    }else{
      res.json({ success: false, msg: 'El usuario o id no existe en el sistema' });
    }
  });
});

router.get('/getHistoryShopList/:id', function(req, res){
  var id = req.params.id;
  Pet.findById(id, function(err, results){
    if(err){
      res.json({ success: false, msg: err });
      return;
    }
    if(results.code.length> 0 ){
      var object = [];
      results.code.forEach(item => {
        var product =  {
          comment: item.comment,
          cost: item.cost,
          description: item.description,
          idCan: item.idCan,
          petName: item.petName,
          productName: item.productName,
          status: item.status,
          _id: item._id
        }
        object.push(product);
      })
      res.json(object)
    }
  });
});

router.get('/getAllProfileList/:id', function(req, res){
  var id = req.params.id;
  Pet.findById(id, function(err, results){
    if(err){
      res.json({ success: false, msg: err });
      return;
    }
    let object = [];

    results.newPetProfile.forEach(item => {
      var test = {
        id: item._id,
        petName : item.petName,
        photo: item.photo
      }

      object.push(test);
    })

    var pet = {
      petName: results.petName,
      photo: results.photo,
      newPetProfile: object
    }

    res.json(pet)
  });
});

router.get('/getCalendarData/:id/:idSecond', function(req, res){
  var id = req.params.id;
  var idSecond = req.params.idSecond;
  Pet.findById(id, function(err, results){
    if(err){
      res.json({ success: false, msg: err });
      return;
    }

    // if(idSecond == 0) {
    //   var pet = {
    //     calendar: results.calendar,
    //     token: results.token
    //    }
    //    res.json(pet)
    // }else {
    //   results.newPetProfile.forEach(element => {
    //     if (element._id == idSecond) {
    //       var pet = {
    //         calendar: results.calendar,
    //         token: results.token
    //       }
    //       res.json(pet)
    //     }
    //   })
    // }
    var pet = {
      calendar: results.calendar,
      token: results.token
     }
     res.json(pet)
  });
});

router.get('/getLocationInfo/:id/:idSecond', function(req, res){
  var id = req.params.id;
  var idSecond = req.params.idSecond;
  Pet.findById(id, function(err, results){
    if(err){
      res.json({ success: false, msg: err });
      return;
    }

    if(idSecond == 0) {
      var pet = {
        lat: results.lat,
        lng: results.lng,
        photo: results.photo
       }
       res.json(pet)
    }else {
      results.newPetProfile.forEach(element => {
        if (element._id == idSecond) {
          var pet = {
            lat: results.lat,
            lng: results.lng,
            photo: results.photo
           }
          res.json(pet)
        }
      })
    }
  });
});


router.post('/register/newPetEvent', async(req, res) => {
  const obj = JSON.parse(JSON.stringify(req.body));
  let newCalendarEvent = {
    title: obj.title,
    date: obj.date,
    enddate: obj.enddate,
    description: obj.description
  };
  Pet.findOneAndUpdate({ _id: req.body._id }, { $push: { calendar: newCalendarEvent } }, { new: true }).then(function (data) {
    res.json({ success: true, msg: 'Evento registrado correctamente..!' });
  });
});

router.post('/delete/delete-calendar-event', async(req, res) => {
  const obj = JSON.parse(JSON.stringify(req.body));
  var object = {
    isNewMsg: obj.isNewMsg,
    idEventUpdate: obj.idEventUpdate
  }

  await Pet.findOne({_id: req.body._id }, (err, pet) => {
    if (!pet) {
      return res.json({success:false,msg: 'Usuario no encontrado'});
    }
     if(pet != null) {
      for (var i =0; i < pet.calendar.length; i++){
        if (pet.calendar[i]._id == object.idEventUpdate) {
          pet.calendar.splice(i,1);
          pet.save();
          try {
            res.json({ success: true, msg: 'Se ha eliminado correctamente..!' });
          } catch (err) {
            res.json({ success: false, msg: err });
            next(err);
          }
          break;
        }
      }
     }
   });
});

router.put('/update/updatePetEvent', async(req, res) => {
  const obj = JSON.parse(JSON.stringify(req.body));
  let updateCalendarEvent = {
    title: obj.title,
    date: obj.date,
    enddate: obj.enddate,
    description: obj.description,
    idEventUpdate: obj.idEventUpdate
  };
  Pet.findOne({_id: req.body._id }, (err, pet) => {
    if (!pet) {
      return res.json({success:false,msg: 'Usuario no encontrado'});
    }
    if(pet != null) {
       var arrayPet = [];
      arrayPet.push(pet);
      arrayPet.forEach(element => {
        element["calendar"].forEach(item => {
          if (item._id == obj.idEventUpdate) {
            item["title"] = updateCalendarEvent.title;
            item["date"] = updateCalendarEvent.date;
            item["enddate"] = updateCalendarEvent.enddate;
            item["description"] = updateCalendarEvent.description;
          
            pet.save();
            try {
              res.json({ success: true, msg: 'Se ha actualizado correctamente..!' });
            } catch (err) {
              res.json({ success: false, msg: err });
              next(err);
            }
          }  
         }) 
      })
    }
  });
});

router.post('/register/generateQrCodePet', async(req, res) => {
  var id ='60219dea321aed00155e1659';
  const obj = JSON.parse(JSON.stringify(req.body));
  const objProducts = JSON.parse(obj.products);

  objProducts.forEach(item => {
    if(item.idCan == obj._id){
      item.link = 'https://' + req.headers.host + '/myPetCode/' + obj._id +'/'+ 0
    }else {
      item.link = 'https://' + req.headers.host + '/myPetCode/' + obj._id +'/'+ item.idCan
    }
  })

  var notifications = {
    message: 'El usuario '+ obj.petName+ ' ha solicitado un collar',
    userPetName: obj.petName,
    isNewMsg: true,
    dateMsg: new Date(),
    photo: obj.photo,
    idPet: obj._id
  }

  Pet.findOneAndUpdate({ _id: req.body._id }, { $push: { code: objProducts }},{new: true}).then(function(data){
    res.json({success:true,msg: 'Su compra se generado correctamente, el administrador se va contactar contigo, por mientras ve su estado del codigo en tu perfil!'});
  });

  Pet.findOneAndUpdate({ _id: id }, { $push: { notifications: notifications  }},{new: true}).then(function(data){
    console.log('Se ha enviado al admin');
  });
});

router.put('/update/updateStatusQrCodePet', async(req, res, next) => {
  const obj = JSON.parse(JSON.stringify(req.body));

  var object = {
    status: obj.status
  }


  var notifications = {
    message: 'Se ha cambiado el estado del producto a '+ object.status+' Favor de revisar en (Mi carrito de compras)',
    userPetName: 'Admin',
    isNewMsg: true,
    dateMsg: new Date(),
    idPet: req.body._id,
    photo: obj.photo
  }

  await Pet.findOne({_id: req.body._id }, (err, pet) => {
    if (!pet) {
      return res.json({success:false,msg: 'Usuario no encontrado'});
    }
     if(pet != null) {
       var arrayPet = [];
      arrayPet.push(pet);
      arrayPet.forEach(element => {
          element["code"].forEach(item => {
            if(item["_id"] == obj.idItemSelected){
              item["status"] = object.status;
              pet.save();
              try {
                res.json({ success: true, msg: 'Se ha actualizado correctamente..!' });
              } catch (err) {
                res.json({ success: false, msg: err });
                next(err);
              }
            }
          }) 
      })
     }
   });
   Pet.findOneAndUpdate({ _id: req.body._id }, { $push: { notifications: notifications  }},{new: true}).then(function(data){
    console.log('Se ha enviado correctamente');
  });
});

router.put('/update/updateStateActivationCode', async(req, res, next) => {
  const obj = JSON.parse(JSON.stringify(req.body));
  var object = {
    status: obj.status
  }

  await Pet.findOne({_id: req.body._id }, (err, pet) => {
    if (!pet) {
      return res.json({success:false,msg: 'Usuario no encontrado'});
    }
     if(pet != null) {
       var arrayPet = [];
      arrayPet.push(pet);
      arrayPet.forEach(element => {
        element["stateActivation"] = object.status;
        pet.save();
        try {
          res.json({ success: true, msg: 'Se ha actualizado correctamente..!' });
        } catch (err) {
          res.json({ success: false, msg: err });
          next(err);
        } 
      })
     }
   });
});


// Permissions

router.get('/getPermissionsData/:id/:idSecond', function(req, res){
  var id = req.params.id;
  var idSecond = req.params.idSecond;
  Pet.findById(id, function(err, results){
    if(err){
      res.json({ success: false, msg: err });
      return;
    }

    if(idSecond == 0) {
      var pet = {
        permissions: results.permissions
       }
       res.json(pet)
    }else {
      results.newPetProfile.forEach(element => {
        if (element._id == idSecond) {
          var pet = {
            permissions: element.permissions
          }
          res.json(pet)
        }
      })
    }
  });
});

router.put('/update/updatePetPermissions', async(req, res, next) => {
  const object = JSON.parse(JSON.stringify(req.body));
  await Pet.findOne({_id: req.body._id }, (err, pet) => {
    if (!pet) {
      return res.json({success:false,msg: 'Usuario no encontrado'});
    }
     if(pet != null) {
       var arrayPet = [];
      if(object.idSecondary == 0 ){
        arrayPet.push(pet);
        arrayPet.forEach(element => {
          if(element["permissions"].length == 0){
            element["permissions"].push(object);
          }
          element["permissions"].forEach(item => {
            item["showPhoneInfo"] = object.showPhoneInfo;
            item["showEmailInfo"] = object.showEmailInfo;
            item["showLinkTwitter"] = object.showLinkTwitter;
            item["showLinkFacebook"] = object.showLinkFacebook;
            item["showLinkInstagram"] = object.showLinkInstagram;
            item["showOwnerPetName"] = object.showOwnerPetName;
            item["showBirthDate"] = object.showBirthDate;
            item["showAddressInfo"] = object.showAddressInfo;
            item["showAgeInfo"] = object.showAgeInfo;
            item["showVeterinarianContact"] = object.showVeterinarianContact;
            item["showPhoneVeterinarian"] = object.showPhoneVeterinarian;
            item["showHealthAndRequirements"] = object.showHealthAndRequirements;
            item["showFavoriteActivities"] = object.showFavoriteActivities;
            item["showLocationInfo"] = object.showLocationInfo;
          }) 
          pet.save();
          try {
            res.json({ success: true, msg: 'Se ha actualizado correctamente..!' });
          } catch (err) {
            res.json({ success: false, msg: err });
            next(err);
          }
        })
      }else{
        arrayPet.push(pet.newPetProfile);
        arrayPet.forEach(element => {
          element.forEach(item => {
            if(item._id == object.idSecondary){
              item["permissions"].forEach(val => {
                val["showPhoneInfo"] = object.showPhoneInfo;
                val["showEmailInfo"] = object.showEmailInfo;
                val["showLinkTwitter"] = object.showLinkTwitter;
                val["showLinkFacebook"] = object.showLinkFacebook;
                val["showLinkInstagram"] = object.showLinkInstagram;
                val["showOwnerPetName"] = object.showOwnerPetName;
                val["showBirthDate"] = object.showBirthDate;
                val["showAddressInfo"] = object.showAddressInfo;
                val["showAgeInfo"] = object.showAgeInfo;
                val["showVeterinarianContact"] = object.showVeterinarianContact;
                val["showPhoneVeterinarian"] = object.showPhoneVeterinarian;
                val["showHealthAndRequirements"] = object.showHealthAndRequirements;
                val["showFavoriteActivities"] = object.showFavoriteActivities;
                val["showLocationInfo"] = object.showLocationInfo;
                pet.save();
                try {
                  res.json({ success: true, msg: 'Se ha actualizado correctamente..!' });
                } catch (err) {
                  res.json({ success: false, msg: err });
                  next(err);
                }
              }) 
            }
          });
        })
      }
     }
   });
});

// Permissions




// admin 

router.get('/getAllPets', function(req, res){
    Pet.find({}, function(err, pets){
    if(err){
      res.json({ success: false, msg: err });
      next();
    }
    const object = [];
    pets.forEach(item => {
      if(!item.isActivated){
        var newPetObject = [];
        if(item.newPetProfile.length>0){
          item.newPetProfile.forEach(element => {
            var pet  = {
              _id:item._id,
              idPet: element._id,
              petName: element.petName,
              email: element.email,
              phone: element.phone,
              age: element.age,
              birthDate: element.birthDate,
              ownerPetName: element.ownerPetName,
              petStatus: element.petStatus
            }
            newPetObject.push(pet);
          })
        }
        
        var test = {
          idPet: item._id,
          petName: item.petName,
          email: item.email,
          phone: item.phone,
          age: item.age,
          birthDate: item.birthDate,
          ownerPetName: item.ownerPetName,
          petStatus: item.petStatus,
          newPetProfile: (newPetObject.length > 0)? newPetObject: null
        }  
        object.push(test);
      }
    })
    res.json(object)
  });
});

router.get('/getLocationAllPets', function(req, res){
  Pet.find({}, function(err, pets){
  if(err){
    res.json({ success: false, msg: err });
    next();
  }
  const object = [];
  pets.forEach(item => {
    if(!item.isActivated){
      var newPetObject = [];
      if(item.newPetProfile.length>0){
        item.newPetProfile.forEach(element => {
          var pet  = {
            _id:item._id,
            idPet: element._id,
            petName: element.petName,
            email: element.email,
            lat:element.lat,
            lng:element.lng,
            photo:element.photo,
            showPanel: true,
            petStatus: element.petStatus
          }
          newPetObject.push(pet);
        })
      }
      
      var test = {
        idPet: item._id,
        petName: item.petName,
        email: item.email,
        lat:item.lat,
        lng:item.lng,
        petStatus: item.petStatus,
        photo:item.photo,
        newPetProfile: (newPetObject.length > 0)? newPetObject: null
      }  
      object.push(test);
    }
  })
  res.json(object)
});
});


router.get('/getNewCodes', function(req, res){
  Pet.find({}, function(err, pets){
  if(err){
    res.json({ success: false, msg: err });
    next();
  }
  const object = [];
  pets.forEach(item => {
    if(item.isActivated){
      var test = {
        idPet: item._id,
        randomCode: item.randomCode,
        isActivated: item.isActivated,
        stateActivation: item.stateActivation,
        link: 'https://' + req.headers.host + '/myPetCode/' + item._id +'/'+ 0
        // newPetProfile: (newPetObject.length > 0)? newPetObject: null
      }
      object.push(test);  
    }
  })
  res.json(object)
});
});

router.post('/register/new-code-generator', async(req, res, next) => {
  const obj = JSON.parse(JSON.stringify(req.body));
  Pet.findOne({randomCode: obj.randomCode}, async function (err, myUser) {
    
    if (!err){
      if(myUser){
        res.json({ success: false, msg: 'El codigo ya existe en el sistema' });
      }else{
          let newPet = new Pet({
            randomCode: obj.randomCode,
            isActivated: obj.isActivated,
            stateActivation: obj.stateActivation
          });

        Pet.addNewCode(newPet, async (user, done) => {
          try {
              res.json({ success: true, msg: 'Se ha registrado el nuevo codigo' });
            } catch (err) {
              res.json({ success: false, msg: 'Este codigo ya existe.!' });
              next(err);
            }
        });
      }
      
    } else {
      res.json({ success: false, msg: 'Ocurrió un problema favor de revisar' });
    }
      
    })
});

router.get('/getAllCodePetsList', function(req, res){
  Pet.find({}, function(err, pets){
  if(err){
    res.json({ success: false, msg: err });
    next();
  }
  const object = [];
  // pets.forEach(item => {
  //   if(item.code.length> 0){
  //     var it = {
  //       showPanel: true,
  //       email: item.email,
  //       code: item.code
  //     }
  //     object.push(it);
  //   }
  // })

  pets.forEach(item => {
    if(item.code.length> 0){
      item.code.forEach(value => {
        var val = {
          comment: value.comment,
          cost: value.cost,
          description: value.description,
          email: value.email,
          idCan: value.idCan,
          idPrincipal: value.idPrincipal,
          link: value.link,
          petName: value.petName,
          petPhoto: value.petPhoto,
          productName: value.productName,
          status: value.status,
          showPanel: true,
          _id: value._id
        }
        object.push(val);
      })
    }
  })
  res.json(object)
});
});

router.get('/lost/getAllLostPets', function(req, res){
  Pet.find({}, function(err, pets){
  if(err){
    res.json({ success: false, msg: err });
    next();
  }
  var arrayObj = []
  pets.forEach((item)=> {
    if(item.petStatus == 'Perdido'){
      var object = {
        link :'https://' + req.headers.host + '/myPetCode/' + item._id +'/'+ 0,
        photo: item.photo,
        petName: item.petName,
        petStatusReport: item.petStatusReport
      }
      arrayObj.push(object);
    }
    if(item.newPetProfile.length>0) {
      item.newPetProfile.forEach(value => {
        if(value.petStatus == 'Perdido'){
          var object = {
            link : 'https://' + req.headers.host + '/myPetCode/' + item._id +'/'+ value._id,
            photo: value.photo,
            petName: value.petName,
            petStatusReport: value.petStatusReport
          }
          arrayObj.push(object);
        }
      })
    }
  })
  res.json(arrayObj);
});
});


router.get('/getAdminDataList', function(req, res){
  var id ='60219dea321aed00155e1659';
  Pet.findById(id, function(err, results){
    if(err){
      res.json({ success: false, msg: err });
      return;
    }

   var pet = {
      petName: results.petName,
      ownerPetName: results.ownerPetName,
      phone: results.phone,
      email: results.email,
      photo: results.photo,
      userState: results.userState,
      lat: results.lat,
      lng: results.lng,
      birthDate: results.birthDate,
      address: results.address,
      age: results.age,
      veterinarianContact: results.veterinarianContact,
      phoneVeterinarian: results.phoneVeterinarian,
      healthAndRequirements: results.healthAndRequirements,
      favoriteActivities: results.favoriteActivities,
      calendar: results.calendar,
      code: results.code,
      petStatus: results.petStatus,
      notifications: results.notifications
    }
    res.json(pet)
  });
});

router.get('/getAllProductShopList', function(req, res){
  var id ='60219dea321aed00155e1659';
  Pet.findById(id, function(err, results){
    if(err){
      res.json({ success: false, msg: err });
      return;
    }

    if(results.productsList.length> 0 ){
      var pet = {
        productsList: results.productsList
      }
      res.json(pet)
    }
  });
});

router.post('/register/new-product', async(req, res) => {
  const obj = JSON.parse(JSON.stringify(req.body));

  let newProductList = {
    productName: obj.productName,
    size: obj.size,
    color: obj.color,
    cost: obj.cost,
    description: obj.description,
    quantity: obj.quantity
  };

  Pet.findOneAndUpdate({ _id: obj._id }, { $push: { productsList: newProductList }},{new: true}).then(function(data){
    res.json({success:true,msg: 'Nuevo codigo Se ha generado correctamente el administrador se va contactar contigo, por mientras ve su estado del codigo en tu perfil!'});
  });

});


router.put('/update/new-product', async(req, res) => {
  const obj = JSON.parse(JSON.stringify(req.body));

  let newProductList = {
    productName: obj.productName,
    size: obj.size,
    color: obj.color,
    cost: obj.cost,
    description: obj.description,
    quantity: obj.quantity,
    idProduct: obj.idProduct
  };

  await Pet.findOne({_id: obj._id }, (err, pet) => {
    if (!pet) {
      return res.json({success:false,msg: 'Usuario no encontrado'});
    }
     if(pet != null) {
       var arrayPet = [];
      arrayPet.push(pet);
      arrayPet.forEach(element => {
          element["productsList"].forEach(item => {
            if(item._id == newProductList.idProduct){
              item["productName"] = newProductList.productName;
              item["size"] = newProductList.size;
              item["color"] = newProductList.color;
              item["cost"] = newProductList.cost;
              item["description"] = newProductList.description;
              item["quantity"] = newProductList.quantity;
            }
          }) 
          pet.save();
          try {
            res.json({ success: true, msg: 'Se ha actualizado correctamente..!' });
          } catch (err) {
            res.json({ success: false, msg: err });
            next(err);
          }
      })
     }
    });

});


router.put('/register/registerPhotoPetProduct', async(req, res) => {
  const obj = JSON.parse(JSON.stringify(req.body));

  const result = await cloudinary.uploader.upload(req.file != undefined? req.file.path: obj.image);
  let newPet = {
    idProduct : obj.idProduct,
    isFistPhoto : obj.isFistPhoto,
    photo: result.secure_url == undefined ? obj.image : result.secure_url
  };

  await Pet.findOne({_id: obj._id }, (err, pet) => {
    if (!pet) {
      return res.json({success:false,msg: 'Usuario no encontrado'});
    }
     if(pet != null) {
       var arrayPet = [];
      arrayPet.push(pet);
      arrayPet.forEach(element => {
          element["productsList"].forEach(item => {
            if(item._id == newPet.idProduct){
              if(newPet.isFistPhoto == 'true'){
                item["firstPhoto"] = newPet.photo;
              }
              if(newPet.isFistPhoto == 'false'){
                item["secondPhoto"] = newPet.photo; 
              }
            }
          }) 
          pet.save();
          try {
            res.json({ success: true, msg: 'Se ha actualizado correctamente..!' });
          } catch (err) {
            res.json({ success: false, msg: err });
            next(err);
          }
      })
     }
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

// admin

//Notifications 
router.get('/notifications/getNotificationsList/:id', function(req, res){
  var id = req.params.id;
  Pet.findById(id, function(err, results){
    if(err){
      res.json({ success: false, msg: err });
      return;
    }
    res.json(results.notifications)
  });
});



router.put('/update/updateNotificationsList', async(req, res, next) => {
  const obj = JSON.parse(JSON.stringify(req.body));
  var object = {
    isNewMsg: obj.isNewMsg,
    idItem: obj.idItem
  }

  await Pet.findOne({_id: req.body._id }, (err, pet) => {
    if (!pet) {
      return res.json({success:false,msg: 'Usuario no encontrado'});
    }
     if(pet != null) {
       var arrayPet = [];
      arrayPet.push(pet);
      arrayPet.forEach(element => {
          element["notifications"].forEach(item => {
            if(item._id == object.idItem){
              item["isNewMsg"] = false;
            }
          }) 
          pet.save();
          try {
            res.json({ success: true, msg: 'Se ha actualizado correctamente..!' });
          } catch (err) {
            res.json({ success: false, msg: err });
            next(err);
          }
      })
     }
   });
});

router.post('/delete/delete-pet-profile', async(req, res) => {
  const obj = JSON.parse(JSON.stringify(req.body));
  var object = {
    idItem: obj.idItem
  }

  await Pet.findOne({_id: req.body._id }, (err, pet) => {
    if (!pet) {
      return res.json({success:false,msg: 'Usuario no encontrado'});
    }
     if(pet != null) {
      for (var i =0; i < pet.newPetProfile.length; i++){
        if (pet.newPetProfile[i]._id == object.idItem) {
          pet.newPetProfile.splice(i,1);
          pet.save();
          try {
            res.json({ success: true, msg: 'Se ha eliminado correctamente..!' });
          } catch (err) {
            res.json({ success: false, msg: err });
            next(err);
          }
          break;
        }
      }
     }
   });

});


router.put('/delete/deleteNotificationsList', async(req, res, next) => {
  const obj = JSON.parse(JSON.stringify(req.body));
  var object = {
    isNewMsg: obj.isNewMsg,
    idItem: obj.idItem
  }

  await Pet.findOne({_id: req.body._id }, (err, pet) => {
    if (!pet) {
      return res.json({success:false,msg: 'Usuario no encontrado'});
    }
     if(pet != null) {
      for (var i =0; i < pet.notifications.length; i++){
        if (pet.notifications[i]._id == object.idItem) {
          pet.notifications.splice(i,1);
          pet.save();
          try {
            res.json({ success: true, msg: 'Se ha eliminado correctamente..!' });
          } catch (err) {
            res.json({ success: false, msg: err });
            next(err);
          }
          break;
        }
      }
     }
   });
});



//Notifications


// reports
router.post('/report/reportLostPetStatus', async(req, res) => {
  const obj = JSON.parse(JSON.stringify(req.body));
  let reportPetLost = {
    lastPlaceLost: obj.lastPlaceLost,
    date: obj.date,
    petStatus: obj.petStatus,
    descriptionLost: obj.descriptionLost
  };

  var notifications = {
    message: 'Se ha reportado a '+obj.petName +' como '+ reportPetLost.petStatus+'',
    userPetName: obj.petName,
    isNewMsg: true,
    dateMsg: new Date(),
    idPet: req.body._id,
    photo: 'https://cdn2.iconfinder.com/data/icons/cute-husky-emoticon/512/husky_emoji_sad-512.png'
  }

  await Pet.findOne({_id: req.body._id }, (err, pet) => {
    if (!pet) {
      return res.json({success:false,msg: 'Usuario no encontrado'});
    }
     if(pet != null) {
      var arrayPet = [];
      if(obj.idSecondary == 0 ){
        arrayPet.push(pet);
        arrayPet.forEach(element => {
          element["petStatus"] = reportPetLost.petStatus;
          if (element["petStatusReport"].length > 0) {
            var indexToRemove = 0;
            var numberToRemove = 1;
            element["petStatusReport"].splice(indexToRemove, numberToRemove);
          }
          element["petStatusReport"].push(reportPetLost)

          pet.save();
          try {
            res.json({ success: true, msg: 'Se ha reportado correctamente.. al administrador del sitio!' });
          } catch (err) {
            res.json({ success: false, msg: err });
            next(err);
          }
        })
      }else{
        pet.newPetProfile.forEach(element => {
          if(element._id == obj.idSecondary){
            element["petStatus"] = reportPetLost.petStatus;
            if (element["petStatusReport"].length > 0) {
              var indexToRemove = 0;
              var numberToRemove = 1;
              element["petStatusReport"].splice(indexToRemove, numberToRemove);
            }
            element["petStatusReport"].push(reportPetLost)
  
            pet.save();
            try {
              res.json({ success: true, msg: 'Se ha reportado correctamente.. al administrador del sitio!' });
            } catch (err) {
              res.json({ success: false, msg: err });
              next(err);
            }
          }
        })
      }
     }
   });

  Pet.findOneAndUpdate({ _id: String(process.env.ADMIN_ID) }, { $push: { notifications: notifications  }},{new: true}).then(function(data){
    console.log('Se ha enviado correctamente');
  });
});


router.put('/update/updateReportLostPetStatus', async(req, res, next) => {
  const obj = JSON.parse(JSON.stringify(req.body));
  let newPet = {
    status: obj.petStatus 
  };

  var notifications = {
    message: 'Se ha reportado a '+obj.petName +' como '+ newPet.status+'',
    userPetName: obj.petName,
    isNewMsg: true,
    dateMsg: new Date(),
    idPet: req.body._id,
    photo: 'https://cdn2.iconfinder.com/data/icons/cute-husky-emoticon/512/husky_emoji_happy-512.png'
  }

  await Pet.findOne({_id: req.body._id }, (err, pet) => {
    if (!pet) {
      return res.json({success:false,msg: 'Usuario no encontrado'});
    }
     if(pet != null) {
       var arrayPet = [];
      arrayPet.push(pet);
      arrayPet.forEach(element => {
          element["petStatus"] = newPet.status;
          if(element["petStatusReport"].length> 0){
            var indexToRemove = 0;
            var numberToRemove = 1;
            element["petStatusReport"].splice(indexToRemove, numberToRemove);
          }
          pet.save();
          try {
            res.json({ success: true, msg: 'Se ha actualizado correctamente..!' });
          } catch (err) {
            res.json({ success: false, msg: err });
            next(err);
          }
      })
     }
   });

   Pet.findOneAndUpdate({ _id: String(process.env.ADMIN_ID) }, { $push: { notifications: notifications  }},{new: true}).then(function(data){
    console.log('Se ha enviado correctamente');
  });
});

// reports


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
         return res.json({success:false,msg: 'Email not found'});
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
        subject: 'LocalPetsAndFamily restablecimiento de la contraseña',
        attachments: [
          {filename: 'localpetslogo.jpg', path:'./src/assets/localpetslogo.jpg'}
        ],
        template: 'index',
        context: {
          text: 'Recibe esto porque usted (u otra persona) ha solicitado el restablecimiento de la contraseña de su cuenta.\n\n' +
          'Haga clic en el siguiente enlace o péguelo en su navegador para completar el proceso:\n\n' +
          'Si no lo solicitó, ignore este correo electrónico y su contraseña permanecerá sin cambios.\n',
          link: (req.headers.host == 'localhost:8080')? 'https://localhost:4100/reset-pets/' + token  : 'https://' + req.headers.host + '/reset-pets/' + token,
          textLink: 'Ir al enlace'
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
        subject: 'LocalPetsAndFamily restablecimiento de la contraseña',
        attachments: [
          {filename: 'localpetslogo.jpg', path:'./src/assets/localpetslogo.jpg'}
        ],
        template: 'index',
        context: {
          text: 'La contraseña de su correo ' + user.email + ' ha sido actualizada satisfactoriamente.\n',
          link: 'https://www.localpetsandfamily.com/login-pets',
          textLink: 'Ir a iniciar sesión'
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

//---------------CALENDAR--------------//

router.post('/calendar/authentication', function(req, resp){
  const fs = require('fs');
  const { google } = require('googleapis')
  const tkn = req.body.token;
  // If modifying these scopes, delete token.json.
  const SCOPES = ['https://www.googleapis.com/auth/calendar.readonly'];
  // The file token.json stores the user's access and refresh tokens, and is
  // created automatically when the authorization flow completes for the first
  // time.
  const TOKEN_PATH = 'token.json';

  // Load client secrets from a local file.
  fs.readFile('credentials.json', (err, content) => {
    if (err) return authorize(content, listEvents); //console.log('Error loading client secret file:', err);
    // Authorize a client with credentials, then call the Google Calendar API.
    // authorize(JSON.parse(content), listEvents);
  });

  /**
   * Create an OAuth2 client with the given credentials, and then execute the
   * given callback function.
   * @param {Object} credentials The authorization client credentials.
   * @param {function} callback The callback to call with the authorized client.
   */
  function authorize(credentials, callback) {

      credentials = process.env.GOOGLE_SECRET, process.env.GOOGLE_CLIENT, process.env.GOOGLE_REDIRECT_URIS; 

      const oAuth2Client = new google.auth.OAuth2(process.env.GOOGLE_CLIENT, process.env.GOOGLE_SECRET, process.env.GOOGLE_REDIRECT_URIS);

      // Check if we have previously stored a token.
      fs.readFile(TOKEN_PATH, (err, token) => {
          if(token == undefined){
            Pet.findOne({_id: req.body._id }, (error, pet) => {
              if (!pet) {
                return res.json({success:false,msg: 'Usuario no encontrado'});
              }
               if(pet != null) {
                 var arrayPet = [];
                arrayPet.push(pet);
                arrayPet.forEach(element => {
                    element["token"] = '';
                    pet.save();
                    try {
                      console.log('opppps');
                    } catch (err) {
                      console.log('token error' , err);
                    }
                })
               }
             });
          }
          if (err) return getAccessToken(oAuth2Client, callback);
          oAuth2Client.setCredentials(JSON.parse(token));
          callback(oAuth2Client);
      });
  }

  /**
   * Get and store new token after prompting for user authorization, and then
   * execute the given callback with the authorized OAuth2 client.
   * @param {google.auth.OAuth2} oAuth2Client The OAuth2 client to get token for.
   * @param {getEventsCallback} callback The callback for the authorized client.
   */
  function getAccessToken(oAuth2Client, callback) {
      oAuth2Client.getToken(tkn, (err, token) => {
        if(token != null){
          if (err) return console.error('Error retrieving access token', err);
          oAuth2Client.setCredentials(token);
          // Store the token to disk for later program executions
          fs.writeFile(TOKEN_PATH, JSON.stringify(token), (err) => {
            if (err) return console.error(err);
            resp.json({success:false,status: 200, msg: 'Se genero el token correctamente'});
          });
          callback(oAuth2Client);
        }else{
          resp.json({success:false, msg: 'Este token no sirve'});
        }
      });
  }

  /**
   * Lists the next 10 events on the user's primary calendar.
   * @param {google.auth.OAuth2} auth An authorized OAuth2 client.
   */
  function listEvents(auth) {
    // async function fun(){
    const calendar = google.calendar({version: 'v3', auth});
    calendar.events.list({
      calendarId: 'primary',
      timeMin: (new Date()).toISOString(),
      maxResults: 10,
      singleEvents: true,
      orderBy: 'startTime',
    }, (err, res) => {
      if (err){
        const TOKEN_PATH = 'token.json';
        console.log('The API returned an error: ' + err);
        const fs = require('fs')
        fs.readFile(TOKEN_PATH, (err, token) => {
          if(token){
            fs.unlinkSync(TOKEN_PATH)
          }
        })
        Pet.findOne({_id: req.body._id }, (error, pet) => {
          if (!pet) {
            return res.json({success:false,msg: 'Usuario no encontrado'});
          }
           if(pet != null) {
             var arrayPet = [];
            arrayPet.push(pet);
            arrayPet.forEach(element => {
              element["token"] = '';
                pet.save();
                try {
                  console.log('token eliminado');
                } catch (err) {
                  console.log('token error' , error);
                }

            })
           }
         });
        return resp.json({success:false,status: 200, msg: 'Se cerro la sesion, por favor inicie sesion de nuevo'});
      } 
      const events = res.data.items;
      if (events.length) {
       var arrayEvents = [];
        events.map((event, i) => {
          arrayEvents.push(event);  
        });
        resp.json({success:true,events: arrayEvents});

        Pet.findOne({_id: req.body._id }, (error, pet) => {
          if (!pet) {
            return res.json({success:false,msg: 'Usuario no encontrado'});
          }
           if(pet != null) {
             var arrayPet = [];
            arrayPet.push(pet);
            arrayPet.forEach(element => {
              element["token"] = req.body.token;
                pet.save();
                try {
                  console.log('token hecho');
                } catch (err) {
                  console.log('token error' , error);
                }

            })
           }
         });
      } else {
        res.json({success:true,msg: 'No se han encontrado ningun evento'});
        console.log('No upcoming events found.');
      }
    });
  }
  //fun();
//  }
});


router.post('/calendar/close-sesion', async(req, res, next) => {
  const TOKEN_PATH = 'token.json';
  await Pet.findOne({_id: req.body._id }, (err, pet) => {
    if (!pet) {
      return res.json({success:false,msg: 'Usuario no encontrado'});
    }
     if(pet != null) {
        var arrayPet = [];
          arrayPet.push(pet);
          arrayPet.forEach(element => {
            element["token"] = '';
            pet.save();
            try {
              const fs = require('fs')
              fs.readFile(TOKEN_PATH, (err, token) => {
                if(token){
                  fs.unlinkSync(TOKEN_PATH)
                }
              })
              res.json({success:true,msg: 'Sesion terminada' });
            } catch (err) {
              console.log('token error' , err);
            }
        })
     }
   });
});


router.post('/calendar/send-new-event', function(req, resp) {
  const obj = JSON.parse(JSON.stringify(req.body));
  // Create a new calender instance.
  const calendar = google.calendar({ version: 'v3', auth: oAuth2Client });

  // Create a new event start date instance for temp uses in our calendar.
  const eventStartTime = new Date()
  eventStartTime.setDate(eventStartTime.getDate()+ parseInt(obj.date))

  // Create a new event end date instance for temp uses in our calendar.
  const eventEndTime = new Date()
  eventEndTime.setDate(eventEndTime.getDate()+ parseInt(obj.enddate))
  eventEndTime.setMinutes(eventEndTime.getMinutes() + 45)

  // Create a dummy event for temp uses in our calendar
  const event = {
    summary: obj.title,
    // location: `3595 California St, San Francisco, CA 94118`,
    description: obj.description,
    colorId: 1,
    start: {
      dateTime: eventStartTime,
      timeZone: 'America/Denver',
    },
    end: {
      dateTime: eventEndTime,
      timeZone: 'America/Denver',
    },
  }

  // Check if we a busy and have an event on our calendar for the same time.
  calendar.freebusy.query(
    {
      resource: {
        timeMin: eventStartTime,
        timeMax: eventEndTime,
        timeZone: 'America/Denver',
        items: [{ id: 'primary' }],
      },
    },
    (err, res) => {
      // Check for errors in our query and log them if they exist.
      if (err) return console.error('Free Busy Query Error: ', err)

      // Create an array of all events on our calendar during that time.
      const eventArr = res.data.calendars.primary.busy

      // Check if event array is empty which means we are not busy
      if (eventArr.length === 0)
        // If we are not busy create a new calendar event.
        return calendar.events.insert(
          { calendarId: 'primary', resource: event },
          err => {
            // Check for errors and log them if they exist.
            if (err) return resp.json({success:false,msg: 'Error creando el mensaje: '+err+'.'});
            // Else log that the event was created.
            return  resp.json({success:true,msg: 'Evento creado exitosamente.'});
          }
        )

      // If event array is not empty log that we are busy.
      return resp.json({success:false,msg: 'Lo sentimos, el usuario tiene una cita pendiente a esa hora'});
    }
  )
});


router.post('/calendar/delete-event', (req, res, next) => {
  const obj = JSON.parse(JSON.stringify(req.body));
  // Create a new calender instance.
  const calendar = google.calendar({ version: 'v3', auth: oAuth2Client });

  var params = {
    calendarId: 'primary',
    eventId: obj.eventId,
  };

  calendar.events.delete(params, function(err) {
    if (err) {
      console.log('The API returned an error delete: ' + err);
      return;
    }
    res.json({success:true,msg: 'Evento eliminado exitosamente.'});
  });
});

router.post('/calendar/edit-event', (req, res, next) => {
  const obj = JSON.parse(JSON.stringify(req.body));
  // Create a new calender instance.
  const calendar = google.calendar({ version: 'v3', auth: oAuth2Client });

  const event = calendar.events.get({"calendarId": 'primary', "eventId": obj.eventId});


  // Create a new event start date instance for temp uses in our calendar.
  const eventStartTime = new Date()
  eventStartTime.setDate(eventStartTime.getDate()+ parseInt(obj.date))

  // Create a new event end date instance for temp uses in our calendar.
  const eventEndTime = new Date()
  eventEndTime.setDate(eventEndTime.getDate()+ parseInt(obj.enddate))
  eventEndTime.setMinutes(eventEndTime.getMinutes() + 45)

  // Create a dummy event for temp uses in our calendar
  const eventObj = {
    summary: obj.title,
    // location: `3595 California St, San Francisco, CA 94118`,
    description: obj.description,
    colorId: 1,
    start: {
      dateTime: eventStartTime,
      timeZone: 'America/Denver',
    },
    end: {
      dateTime: eventEndTime,
      timeZone: 'America/Denver',
    },
  }

  calendar.events.patch({
    'calendarId': 'primary',
    'eventId': obj.eventId,
    'resource': eventObj
  }).then(function(err){
    if (!err) {
      console.log('The API returned an error edit: ' + err);
      return;
    }
    res.json({success:true,msg: 'Evento actualizado exitosamente.'});
  });
});


module.exports = router;
