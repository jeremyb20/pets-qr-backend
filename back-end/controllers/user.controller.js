const userCtl = {}
const cloudinary = require('./../cloudinary.config');
const Pet = require('../models/pet');
const fs = require('fs-extra');
const crypto = require('crypto'); //Encripta el token de recuperacion de password
const async = require('async');
const bcrypt = require('bcryptjs');// Desencripta el token
const nodemailer = require('nodemailer');
const hbs = require('nodemailer-express-handlebars');
const path = require('path');
const jwt = require('jsonwebtoken');
require('dotenv').config();

userCtl.authenticate =  async (req, res) => {
    const { email, password } = req.body;

    Pet.getUserByUsername(email, (err, pet) => {
        if (err) throw err;
        if (!pet) {
            return res.json({ success: false, msg: 'Email not found' });
        }

        Pet.comparePassword(password, pet.password, (err, isMatch) => {
            if (err) throw err;
            if (isMatch) {
                const token = jwt.sign({ data: pet.email }, process.env.SECRET, {
                    expiresIn: 86400   // 1 week: 604800 1 day 86400 //60 one minute 
                });
                res.json({
                    success: true,
                    token: 'JWT ' + token,
                    payload: {
                        id: pet._id,
                        userState: pet.userState,
                        email: pet.email,
                        theme: pet.theme,
                    }
                })
            } else {
                return res.json({ success: false, msg: 'Wrong password' });
            }
        });
    });
}

userCtl.getUserProfileById = async (req, res) => {
    const user = await Pet.findById({_id: req.query.id});
    if(user){
        const { address, birthDate, favoriteActivities, healthAndRequirements, ownerPetName, phoneVeterinarian, veterinarianContact, email, petName, petStatus, phone, photo, photo_id, updatedAt, createdAt, newPetProfile, genderSelected, _id, race, weight, country } = user;
        res.status(200).send({ success: true, payload: {  address, birthDate, favoriteActivities, healthAndRequirements, ownerPetName, phoneVeterinarian, veterinarianContact, email, petName, petStatus, phone, photo, photo_id, updatedAt, createdAt, newPetProfile, genderSelected, _id, race, weight, country } });
    }else{
        res.status(200).send({ success: false, msg: 'User not found' });
    }
}

userCtl.getUserProfileByIdScanner = async (req, res) => {
    try {
        const {idPrimary, idSecondary} = req.params;
        const user = await Pet.findById({_id: idPrimary});
        if(user){
            if(!user.isActivated){
                if(idSecondary == '0'){
                    const { photo, petName } = user;
                    res.status(200).send({ success: true, payload: { photo, petName } });
                }else{
                    const data = user.newPetProfile.find(x => x._id == idSecond);
                    if(data){
                        const userReceived = {
                            petName: data.petName,
                            photo: data.photo
                        }
                        res.status(200).send({ success: true, payload: userReceived });
                    }else{
                        res.status(200).send({ success: false, msg: 'User not found' });
                    }
                }
            }else{
                res.status(200).send({ success: false, msg: 'User not found' });
            }
        }else{
            res.status(200).send({ success: false, msg: 'User not found' });
        }
    } catch (error) {
        res.json({success: false, msg: 'An error occurred in the process.', error: JSON.parse(JSON.stringify(error))});
    }
}

userCtl.getMyPetCode = async (req, res) => {
    const user = await Pet.findById({ _id: req.query.id });
    if (user) {
        const qrCode = {
            isActivated: user.isActivated,
            _id: user._id
        }
        if (user.isActivated) {
            const data = qrCode;
            res.status(200).send({ success: true, payload: data });
        } else {
            if (req.query.idSecond != '0') {
                const data = user.newPetProfile.find(x => x._id == req.query.idSecond);
                res.status(200).send({ success: true, payload: data });
            } else {
                const { phone, _id, photo, address, birthDate, favoriteActivities, healthAndRequirements, ownerPetName, phoneVeterinarian, veterinarianContact, petName, petStatus, genderSelected, isDigitalIdentificationActive, race, weight } = user
                res.status(200).send({ success: true, payload: { phone, _id, photo, address, birthDate, favoriteActivities, healthAndRequirements, ownerPetName, phoneVeterinarian, veterinarianContact, petName, petStatus, genderSelected, isDigitalIdentificationActive, race, weight } });
            }
        }
    } else {
        res.status(200).send({ success: false, msg: 'User not found' });
    }
}

userCtl.getMyPetInfo = async (req, res) => {
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
            const petInfo = user.newPetProfile[req.query.idSecond];
            //res.status(200).send({ success: true, payload: petInfo });
            res.status(200).send({ success: petInfo ? true : false , payload: petInfo ? petInfo : null, msg: petInfo ? '' : 'User not found'  });
          }
    }else{
          res.status(200).send({ success: false, msg: 'User not found' });
    }
  }

userCtl.editProfileInfo = async ( req,res )=> {
    const { address, birthDate, favoriteActivities, healthAndRequirements, ownerPetName, phoneVeterinarian, veterinarianContact, petName , petStatus, genderSelected, race, weight, country } = req.body;
    try {
        await Pet.findByIdAndUpdate(req.body._id, { address, birthDate, favoriteActivities, healthAndRequirements, ownerPetName, phoneVeterinarian, veterinarianContact, petName , petStatus, genderSelected, race, weight, country });
        res.send({msg: 'The information was updated correctly', success: true});
    } catch (error) {
        res.json({success: false, msg: 'An error occurred in the process.', error: JSON.parse(JSON.stringify(error))});
    }
}

userCtl.editPetProfile = async ( req,res )=> {
    const { address, birthDate, favoriteActivities, healthAndRequirements, ownerPetName, phoneVeterinarian, veterinarianContact, petName , petStatus, genderSelected, phone , race, weight, country} = req.body;
    try {
        await Pet.findOneAndUpdate(
            { _id: req.body._id, 'newPetProfile._id': req.body.secondaryId },
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
                'newPetProfile.$.race': race,
                'newPetProfile.$.weight': weight,
                'newPetProfile.$.country': country
              }
            },
        );
        res.send({msg: 'The information was updated correctly', success: true});
    } catch (error) {
        res.json({success: false, msg: 'An error occurred in the process.', error: JSON.parse(JSON.stringify(error))});
    }
}

userCtl.editPhotoProfile = async ( req,res )=> {
    const { idPrincipal, idSecondary, idPhoto } = req.body;

    const result = await cloudinary.uploader.upload((req.file != undefined) ? req.file.path: req.body.image, {folder: "mascotas_cr"});

    try {
        if(idSecondary === '0') {
            if(idPhoto != undefined){
                await cloudinary.uploader.destroy(idPhoto);
            }
            await Pet.findByIdAndUpdate(idPrincipal, { 
                photo: result.secure_url,
                photo_id: result.public_id,
            });
            await fs.unlink(req.file.path);
        }else{
            if(idPhoto != undefined){
                await cloudinary.uploader.destroy(idPhoto);
            }
            await Pet.findOneAndUpdate(
                { _id: idPrincipal, 'newPetProfile._id': idSecondary },
                {
                  $set: {
                    'newPetProfile.$.photo': result.secure_url, 
                    'newPetProfile.$.photo_id': result.public_id, 
                  }
                },
            );
            await fs.unlink(req.file.path);
        }
        res.send({msg: 'The information was updated correctly', success: true});
    } catch (error) {
        res.json({success: false, msg: 'An error occurred in the process.', error: JSON.parse(JSON.stringify(error))});
    }
}

userCtl.editThemeProfile = async ( req,res )=> {
    const { theme } = req.body;
    try {
        await Pet.findByIdAndUpdate(req.body._id, { theme });
        res.send({msg: 'The information was updated correctly', success: true});
    } catch (error) {
        res.json({success: false, msg: 'An error occurred in the process.', error: JSON.parse(JSON.stringify(error))});
    }
}

userCtl.updatePetViewed = async ( req,res )=> {
    const { lat, lng, dateViewed } = req.body;
    try { 

        const data = { lat, lng, dateViewed }
        await Pet.findOneAndUpdate(
            { _id: req.body._id, 'newPetProfile._id': req.body.secondaryId },
            {
              $push: {
                'newPetProfile.$.petViewCounter': data,  
              }
            },{new: true}
        );
        res.send({msg: 'The information was updated correctly', success: true});
    } catch (error) {
        res.json({success: false, msg: 'An error occurred in the process.', error: JSON.parse(JSON.stringify(error))});
    }
}

userCtl.registerNewPet = async(req, res, next) => {
    const { email, phone, isActivated, password, country, userState } = req.body;
    const emailFound = await Pet.findOne({email: email }); 
    if(emailFound){ 
        res.json({ success: false, msg: 'The email already exists in the system' });
        return;
    }else{
        try {
            const newPet = new Pet( {
                email, 
                phone, 
                country,
                isActivated, 
                password,  
                userState,
                hostName: req.headers.referer,
                newPetProfile:[],
                theme: 'theme-default-light',
            });
        
            Pet.addPet(newPet, async(_err, pPet, _done) => {
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
                        to: email,
                        from: 'soporte@localpetsandfamily.com',
                        subject: 'Registro Exitoso en Plaquitas para mascotas CR',
                        template: 'email-new-pet',
                        context: {
                            text1: 'Hola \n\n',
                            text2: '¡Nos complace informarte que tu registro en Plaquitas para mascotas CR se ha realizado con éxito!',
                            text3: 'Tu cuenta ha sido creada y ahora tienes acceso a todas las emocionantes funcionalidades de nuestra plataforma. A continuación, te proporcionamos algunos detalles importantes:\n\n',
                            email: email,
                            text4: 'Por favor, asegúrate de mantener segura tu información de inicio de sesión y no la compartas con nadie. Si alguna vez olvidas tu contraseña, puedes restablecerla a través de la opción Olvidé mi contraseña en la página de inicio de sesión.\n\n',
                            text5: 'Te animamos a explorar Plaquitas para mascotas CR y comenzar a disfrutar de nuestros servicios. Si tienes alguna pregunta o necesitas asistencia, no dudes en ponerte en contacto con nuestro equipo de soporte.\n\n',
                            text6: 'Gracias por unirte a nuestra comunidad. Esperamos que tengas una experiencia excepcional en Plaquitas para mascotas CR.\n\n',
                            text7: '¡Bienvenido a bordo! ',
                            text8: 'Atentamente,',
                            text9: 'El Equipo de Plaquitas para mascotas CR',
                            textLink: 'Iniciar Sesión',
                            link: (req.headers.host == 'localhost:8080')? 'http://localhost:4200/login-pets'  : req.headers.referer + '/login'
                        } 
                    };
            
                        smtpTransport.sendMail(mailOptions, function(err) {
                        res.json({ success: true, msg: 'Your pet has been created successfully.' });
                    });
                } catch (error) { 
                    res.json({success: false, msg: 'The email already exists in the system', error: JSON.parse(JSON.stringify(error))});
                    next(error);
                }
            });
        } catch (error) { 
            res.json({success: false, msg: 'An error occurred in the process.', error: JSON.parse(JSON.stringify(error))});
        }
    }

}

userCtl.registerNewPetByQRcode = async(req, res, next) => {
    const code = await Pet.findById({_id: req.body._id});
    if(code.randomCode === req.body.codeGenerator){
        const emailFound = await Pet.findOne({email: req.body.email});
        if(emailFound){ 
            res.json({ success: false, msg: 'The email already exists in the system' });
        }else{
            try {
                const { email, userState, phone, isActivated, password, _id, country } = req.body; 
                 
                const newPet = {
                    _id, 
                    email,
                    userState,
                    password, 
                    isActivated,
                    phone,
                    country, 
                    theme: 'theme-default-light'
                }

                Pet.newPetGeneratorCode(newPet, async(_err, pPet, _done) => {
                    await Pet.findByIdAndUpdate(pPet._id, { 
                        email: pPet.email,
                        password: pPet.password, 
                        userState: pPet.userState, 
                        isActivated: pPet.isActivated,
                        phone: pPet.phone, 
                        country: pPet.country, 
                        newPetProfile: []
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
                                        text1: 'Hola \n\n',
                                        text2: '¡Nos complace informarte que tu registro en Plaquitas para mascotas CR se ha realizado con éxito!',
                                        text3: 'Tu cuenta ha sido creada y ahora tienes acceso a todas las emocionantes funcionalidades de nuestra plataforma. A continuación, te proporcionamos algunos detalles importantes:\n\n', 
                                        email: email,
                                        text4: 'Por favor, asegúrate de mantener segura tu información de inicio de sesión y no la compartas con nadie. Si alguna vez olvidas tu contraseña, puedes restablecerla a través de la opción Olvidé mi contraseña en la página de inicio de sesión.\n\n',
                                        text5: 'Te animamos a explorar Plaquitas para mascotas CR y comenzar a disfrutar de nuestros servicios. Si tienes alguna pregunta o necesitas asistencia, no dudes en ponerte en contacto con nuestro equipo de soporte.\n\n',
                                        text6: 'Gracias por unirte a nuestra comunidad. Esperamos que tengas una experiencia excepcional en Plaquitas para mascotas CR.\n\n',
                                        text7: '¡Bienvenido a bordo! ' ,
                                        text8: 'Atentamente,',
                                        text9: 'El Equipo de Plaquitas para mascotas CR',
                                        textLink: 'Iniciar Sesión',
                                        link: (req.headers.host == 'localhost:8080') ? 'http://localhost:4200/login-pets' : req.headers.referer + '/login'
                                    }
                                };

                                smtpTransport.sendMail(mailOptions, function (err) {
                                    res.json({ success: true, msg: 'Your pet has been created successfully.' });
                                });
                            } catch (error) {
                                res.json({success: false, msg: 'An error occurred in the process.', error: JSON.parse(JSON.stringify(error))});
                                next(error);
                            }

                    }).catch( error => {
                        res.json({success: false, msg: 'An error occurred in the process.', error: JSON.parse(JSON.stringify(error))});
                    })
                })
                
            } catch (error) {
                res.json({success: false, msg: 'An error occurred in the process.', error: JSON.parse(JSON.stringify(error))});
            }
        }
    }else{
        await fs.unlink(req.file.path);
        res.json({ success: false, msg: 'Invalid code' });
    }
}

userCtl.registerNewPetfromUserProfile = async(req, res, next) => {
    const { genderSelected, petName, petStatus, email, phone, ownerPetName, address, birthDate, favoriteActivities, healthAndRequirements, phoneVeterinarian, veterinarianContact, country } = req.body;
    try {
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
            country,
            photo: result.secure_url,
            photo_id: result.public_id,
            permissions : permissions
        };
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

userCtl.forgot = async(req, res, next) => {
    const { email } = req.body;
    async.waterfall([
        function (done) {
            crypto.randomBytes(20, function (err, buf) {
                var token = buf.toString('hex');
                done(err, token);
            });
        },
        function (token, done) {
            Pet.findOne({ email: email }, (err, user) => {
                if (!user) {
                    return res.json({ success: false, msg: 'Email not found' });
                }

                if (user != null) {
                    user.resetPasswordToken = token;
                    user.resetPasswordExpires = Date.now() + 3600000; // 1 hour
                    user.save(function (err) {
                        done(err, token, user);
                    });
                }
            });
        },
        function (token, user, done) {
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
                to: user.email,
                from: '	soporte@localpetsandfamily.com',
                subject: 'Plaquitas para mascotas CR restablecimiento de la contraseña',
                template: 'email-forgot',
                context: {
                    text1: 'Estimado usuario, \n\n',
                    text2: 'Recibe este correo electrónico porque usted, o alguien en su representación, ha solicitado restablecer la contraseña de su cuenta.',
                    text3: 'Para completar este proceso, por favor haga clic en el enlace proporcionado a continuación o cópielo y péguelo en su navegador:\n\n',
                    linkSend: req.headers.referer + '/reset-password/' + token + ' \n\n',
                    text4: 'Si usted no solicitó este restablecimiento de contraseña, le pedimos que por favor ignore este correo electrónico. En tal caso, su contraseña seguirá siendo la misma y segura.\n\n',
                    text5: 'Gracias por utilizar nuestros servicios y por mantener su cuenta segura.\n\n',
                    text6: 'Atentamente.\n\n',
                    text7: 'Plaquitas para mascotas CR',
                    textLink: 'Ir al enlace',
                    link: (req.headers.host == 'localhost:8080') ? 'http://localhost:4200/reset-password/' + token : req.headers.referer + '/reset-password/' + token
                }
            };
            smtpTransport.sendMail(mailOptions, function (err) {
                res.json({ success: true, msg: 'Se ha enviado un correo electrónico a ' + user.email + ' con más instrucciones. favor de revisar la carpeta de spam si no ves el correo en tu bandeja principal' });
                done(err, 'done');
            });
        }
    ], function (err) {
        res.json({ success: false, msg: 'An error occurred in the process.', error: JSON.parse(JSON.stringify(err)) });
    });
}

userCtl.resetPassword = async(req, res, next) => {
    req.params.token = req.body.token;
    const { token, password } = req.body;
    async.waterfall([
        function (done) {
            Pet.findOne({ resetPasswordToken: token, resetPasswordExpires: { $gt: Date.now() } }, function (err, user) {
                if (!user) {
                    return res.json({ success: false, msg: 'El token de restablecimiento de contraseña no es válido o ha caducado..' });
                } else{
                    user.password = password;
                    user.resetPasswordToken = undefined;
                    user.resetPasswordExpires = undefined;

                    bcrypt.genSalt(10, function (err, salt) {
                        if (err) return next(err);

                        bcrypt.hash(user.password, salt, function (err, hash) {
                            if (err) return next(err);
                            user.password = hash;
                            user.save(function (err) {
                                done(err, user);
                            });
                        });
                    });
                }
            });
        },
        function (user, done) {
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
                to: user.email,
                from: '	soporte@localpetsandfamily.com',
                subject: 'Plaquitas para mascotas CR, restablecimiento de la contraseña',
                template: 'index',
                context: {
                    text: 'La contraseña de su correo ' + user.email + ' ha sido actualizada satisfactoriamente.\n',
                    link: req.headers.referer + '/login',
                    textLink: 'Iniciar sesión'
                }
            };

            smtpTransport.sendMail(mailOptions, function (err) {
                res.json({ success: true, msg: 'Your password has been successfully updated.' });
            });
        }
    ], function (err) {
        res.json({ success: false, msg: 'An error occurred in the process.', error: JSON.parse(JSON.stringify(err)) });
    });
}

module.exports = userCtl;