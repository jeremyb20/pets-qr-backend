const userCtl = {}
const cloudinary = require('cloudinary').v2;
const Pet = require('../models/pet');
const fs = require('fs-extra');
const nodemailer = require('nodemailer');
const hbs = require('nodemailer-express-handlebars');
const path = require('path');

userCtl.getUserProfileById = async (req, res) => {
    const user = await Pet.findById({_id: req.query.id});
    if(user){
        const { address, birthDate, favoriteActivities, healthAndRequirements, ownerPetName, phoneVeterinarian, veterinarianContact, email, petName, petStatus, phone, photo, photo_id, updatedAt, createdAt, newPetProfile, genderSelected, _id } = user;
        res.status(200).send({ success: true, payload: {  address, birthDate, favoriteActivities, healthAndRequirements, ownerPetName, phoneVeterinarian, veterinarianContact, email, petName, petStatus, phone, photo, photo_id, updatedAt, createdAt, newPetProfile, genderSelected, _id } });
    }else{
        res.status(200).send({ success: false, msg: 'User not found' });
    }
}

userCtl.getMyPetCode = async (req, res) => {
  const user = await Pet.findById({_id: req.query.id});
  if(user){
        const qrCode = {
            isActivated: user.isActivated,
            _id: user._id
        }
        if(user.isActivated){
            const data = qrCode;
            res.status(200).send({ success: true, payload: data });
        }else{
            if(req.query.idSecond != '0'){
                const data = user.newPetProfile.find(x => x._id == req.query.idSecond);
                res.status(200).send({ success: true, payload: data });
            }else{
                res.status(200).send({ success: true, payload: user });
            }
        }
  }else{
        res.status(200).send({ success: false, msg: 'User not found' });
  }
}

userCtl.editProfileInfo = async ( req,res )=> {
    const { address, birthDate, favoriteActivities, healthAndRequirements, ownerPetName, phoneVeterinarian, veterinarianContact, petName , petStatus, genderSelected } = req.body;
    try {
        await Pet.findByIdAndUpdate(req.body._id, { address, birthDate, favoriteActivities, healthAndRequirements, ownerPetName, phoneVeterinarian, veterinarianContact, petName , petStatus, genderSelected });
        res.send({msg: 'The information was updated correctly', success: true});
    } catch (error) {
        res.json({success: false, msg: 'An error occurred in the process.', error: JSON.parse(JSON.stringify(error))});
    }
}

userCtl.editProfileSecondaryInfo = async ( req,res )=> {
    const { address, birthDate, favoriteActivities, healthAndRequirements, ownerPetName, phoneVeterinarian, veterinarianContact, petName , petStatus, genderSelected, phone } = req.body;
    try {
        if(req.body.idSecond === 0) {
            await Pet.findByIdAndUpdate(req.body._id, { address, birthDate, favoriteActivities, healthAndRequirements, ownerPetName, phoneVeterinarian, veterinarianContact, petName , petStatus, genderSelected, phone });
        }else{
            await Pet.findOneAndUpdate(
                { _id: req.body._id, 'newPetProfile._id': req.body.idSecond },
                {
                  $set: {
                    'newPetProfile.$.address': address, 
                    'newPetProfile.$.birthDate': birthDate,
                    'newPetProfile.$.favoriteActivities': favoriteActivities,
                    'newPetProfile.$.healthAndRequirements': healthAndRequirements,
                    'newPetProfile.$.ownerPetName': ownerPetName,
                    'newPetProfile.$.phoneVeterinarian': phoneVeterinarian,
                    'newPetProfile.$.veterinarianContact': veterinarianContact,
                    'newPetProfile.$.petName': petName,
                    'newPetProfile.$.petStatus': petStatus,
                    'newPetProfile.$.genderSelected': genderSelected,
                    'newPetProfile.$.phone': phone,
                  }
                },
            );
        }
        res.send({msg: 'The information was updated correctly', success: true});
    } catch (error) {
        res.json({success: false, msg: 'An error occurred in the process.', error: JSON.parse(JSON.stringify(error))});
    }
}

userCtl.registerNewPet = async(req, res, next) => {
    const {petName, phone, email, password, genderSelected, userState, petStatus, isActivated } = req.body;

    Pet.findOne({email: email}, async (err, myUser) => {
        if (!err){
          if(myUser){
            await fs.unlink(req.file.path);
            res.json({ success: false, msg: 'The email already exists in the system' });
          }else{
            const result = await cloudinary.uploader.upload((req.file != undefined) ? req.file.path: req.body.photo, {folder: "mascotas_cr"});
            const permissions = { showPhoneInfo: true, showEmailInfo: true, showLinkTwitter: true, showLinkFacebook: true, showLinkInstagram: true, showOwnerPetName: true, showBirthDate: true, showAddressInfo: true, showAgeInfo: true, showVeterinarianContact: true, showPhoneVeterinarian: true, showHealthAndRequirements: true, showFavoriteActivities: true, showLocationInfo: true }
            const newPet = new Pet( {
              petName,
              phone,
              userState,
              email,
              password,
              petStatus,
              genderSelected,
              isActivated,
              photo: result.secure_url,
              photo_id: result.public_id,
              permissions : permissions
            });
          
            Pet.addPet(newPet, async(_err, pPet, _done) => {
              try {
                await fs.unlink(req.file.path);
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
                  to: email,
                  from: 'soporte@localpetsandfamily.com',
                  subject: 'Registro Exitoso en Plaquitas para mascotas CR',
                  template: 'email-new-pet',
                  context: {
                    text1: 'Estimado, ' + petName + '\n\n',
                    text2: '¡Nos complace informarte que tu registro en Plaquitas para mascotas CR se ha realizado con éxito!',
                    text3: 'Tu cuenta ha sido creada y ahora tienes acceso a todas las emocionantes funcionalidades de nuestra plataforma. A continuación, te proporcionamos algunos detalles importantes:\n\n',
                    petName: petName,
                    email: email,
                    text4: 'Por favor, asegúrate de mantener segura tu información de inicio de sesión y no la compartas con nadie. Si alguna vez olvidas tu contraseña, puedes restablecerla a través de la opción Olvidé mi contraseña en la página de inicio de sesión.\n\n',
                    text5: 'Te animamos a explorar Plaquitas para mascotas CR y comenzar a disfrutar de nuestros servicios. Si tienes alguna pregunta o necesitas asistencia, no dudes en ponerte en contacto con nuestro equipo de soporte.\n\n',
                    text6: 'Gracias por unirte a nuestra comunidad. Esperamos que tengas una experiencia excepcional en Plaquitas para mascotas CR.\n\n',
                    text7: '¡Bienvenido a bordo! ' + petName,
                    text8: 'Atentamente,',
                    text9: 'El Equipo de Plaquitas para mascotas CR',
                    textLink: 'Iniciar Sesión',
                    link: (req.headers.host == 'localhost:8080')? 'http://localhost:4200/login-pets'  : 'https://' + 'www.localpetsandfamily.com' + '/login-pets'
                  } 
                };
              
                smtpTransport.sendMail(mailOptions, function(err) {
                  res.json({ success: true, msg: 'Your pet has been created successfully.' });
                });
                } catch (err) {
                    res.json({success: false, message: 'The email already exists in the system'});
                    next(err);
                }
            });
          }
        }
    });  
}

userCtl.registerNewPetByQRcode = async(req, res, next) => {
    const code = await Pet.findById({_id: req.body._id});
    if(code.randomCode === req.body.codeGenerator){
        Pet.findOne({email: req.body.email}, async (err, myUser) => {
            if (!err){
                if(myUser){
                  await fs.unlink(req.file.path);
                  res.json({ success: false, msg: 'The email already exists in the system' });
                }else{
                    const { email, address, birthDate, userState, favoriteActivities, healthAndRequirements, ownerPetName, phoneVeterinarian, veterinarianContact, petName, petStatus, genderSelected, phone, isActivated, password, _id } = req.body;
                    const result = await cloudinary.uploader.upload((req.file != undefined) ? req.file.path: req.body.photo, {folder: "mascotas_cr"});
                    const permissions = { showPhoneInfo: true, showEmailInfo: true, showLinkTwitter: true, showLinkFacebook: true, showLinkInstagram: true, showOwnerPetName: true, showBirthDate: true, showAddressInfo: true, showAgeInfo: true, showVeterinarianContact: true, showPhoneVeterinarian: true, showHealthAndRequirements: true, showFavoriteActivities: true, showLocationInfo: true }
                    const newPet = {
                        _id, 
                        email,
                        address,
                        birthDate,
                        userState,
                        favoriteActivities,
                        healthAndRequirements,
                        ownerPetName,
                        phoneVeterinarian,
                        veterinarianContact,
                        password,
                        petStatus,
                        genderSelected,
                        isActivated,
                        petName,
                        phone,
                        photo: result.secure_url,
                        photo_id: result.public_id,
                        permissions : permissions
                    }

                    Pet.newPetGeneratorCode(newPet, async(_err, pPet, _done) => {
                        await Pet.findByIdAndUpdate(pPet._id, { 
                            email: pPet.email,
                            password: pPet.password,
                            address: pPet.address, 
                            birthDate: pPet.birthDate, 
                            userState: pPet.userState,
                            favoriteActivities: pPet.favoriteActivities, 
                            healthAndRequirements: pPet.healthAndRequirements, 
                            ownerPetName: pPet.ownerPetName, 
                            phoneVeterinarian: pPet.phoneVeterinarian, 
                            veterinarianContact: pPet.veterinarianContact, 
                            petName: pPet.petName, 
                            petStatus: pPet.petStatus, 
                            genderSelected: pPet.genderSelected, 
                            isActivated: pPet.isActivated,
                            phone: pPet.phone,
                            photo: pPet.photo,
                            photo_id: pPet.photo_id,
                            permissions: pPet.permissions
                          }).then( async function(data, err){
                                try {
                                    await fs.unlink(req.file.path);
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

                                    smtpTransport.verify(function (error, success) {
                                        if (error) {
                                            console.log(error);
                                        } else {
                                            console.log("Server is ready to take our messages");
                                        }
                                    });

                                    var mailOptions = {
                                        to: email,
                                        from: 'soporte@localpetsandfamily.com',
                                        subject: 'Registro Exitoso en Plaquitas para mascotas CR',
                                        template: 'email-new-pet',
                                        context: {
                                            text1: 'Estimado, ' + petName + '\n\n',
                                            text2: '¡Nos complace informarte que tu registro en Plaquitas para mascotas CR se ha realizado con éxito!',
                                            text3: 'Tu cuenta ha sido creada y ahora tienes acceso a todas las emocionantes funcionalidades de nuestra plataforma. A continuación, te proporcionamos algunos detalles importantes:\n\n',
                                            petName: petName,
                                            email: email,
                                            text4: 'Por favor, asegúrate de mantener segura tu información de inicio de sesión y no la compartas con nadie. Si alguna vez olvidas tu contraseña, puedes restablecerla a través de la opción Olvidé mi contraseña en la página de inicio de sesión.\n\n',
                                            text5: 'Te animamos a explorar Plaquitas para mascotas CR y comenzar a disfrutar de nuestros servicios. Si tienes alguna pregunta o necesitas asistencia, no dudes en ponerte en contacto con nuestro equipo de soporte.\n\n',
                                            text6: 'Gracias por unirte a nuestra comunidad. Esperamos que tengas una experiencia excepcional en Plaquitas para mascotas CR.\n\n',
                                            text7: '¡Bienvenido a bordo! ' + petName,
                                            text8: 'Atentamente,',
                                            text9: 'El Equipo de Plaquitas para mascotas CR',
                                            textLink: 'Iniciar Sesión',
                                            link: (req.headers.host == 'localhost:8080') ? 'http://localhost:4200/login-pets' : 'https://' + 'www.localpetsandfamily.com' + '/login-pets'
                                        }
                                    };

                                    smtpTransport.sendMail(mailOptions, function (err) {
                                        res.json({ success: true, msg: 'Your pet has been created successfully.' });
                                    });
                                } catch (err) {
                                    res.json({ success: false, message: 'The email already exists in the system' });
                                    next(err);
                                }

                        }).catch( error => {
                            console.log(error, 'que raro ');
                        })
                    })
                }
            }
        })
    }else{
        await fs.unlink(req.file.path);
        res.json({ success: false, msg: 'Invalid code' });
    }
}

userCtl.registerNewPetfromUserProfile = async(req, res, next) => {
    const { genderSelected, petName, petStatus, email, phone, ownerPetName, address, birthDate, favoriteActivities, healthAndRequirements, phoneVeterinarian, veterinarianContact } = req.body;
    const result = await cloudinary.uploader.upload((req.file != undefined) ? req.file.path: req.body.photo, {folder: "mascotas_cr"});
    const permissions = { showPhoneInfo: true, showEmailInfo: true, showLinkTwitter: true, showLinkFacebook: true, showLinkInstagram: true, showOwnerPetName: true, showBirthDate: true, showAddressInfo: true, showAgeInfo: true, showVeterinarianContact: true, showPhoneVeterinarian: true, showHealthAndRequirements: true, showFavoriteActivities: true, showLocationInfo: true }
    const newPet = {
        genderSelected, 
        petName, 
        petStatus, 
        email,
        phone, 
        ownerPetName, 
        address, 
        birthDate, 
        favoriteActivities, 
        healthAndRequirements, 
        phoneVeterinarian, 
        veterinarianContact,
        photo: result.secure_url,
        photo_id: result.public_id,
        permissions : permissions
    };

    try {
        await Pet.findByIdAndUpdate(req.body._id, { $push: { newPetProfile: newPet }},{new: true}).then( async function(data){
            await fs.unlink(req.file.path);
            res.json({ success: true, msg: 'Your pet has been created successfully.' });
        })   
    } catch (error) {
        res.json({ success: false, msg: 'An error occurred in the process.', error: JSON.parse(JSON.stringify(error)) });
    }
}

userCtl.deletePetById = async(req, res, next) => {

    try {
        await Pet.findByIdAndUpdate( req.body.idPrimary , { $pull: { newPetProfile: { _id: req.body._id } } } ).then( async function(data){
            await cloudinary.uploader.destroy(req.body.photo_id);
            res.json({ success: true, msg: 'Your pet has been deleted successfully.' });
        })   
    } catch (error) {
        res.json({ success: false, msg: 'An error occurred in the process.', error: JSON.parse(JSON.stringify(error)) });
    }
}

module.exports = userCtl;