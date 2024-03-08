const adminCtl = {}
const cloudinary = require('cloudinary').v2;
const Pet = require('../models/pet');
const fs = require('fs-extra');
require('dotenv').config();


adminCtl.getAllUsers = async (_req, res) => {
    const users = await Pet.find();
    if (users.length == 0) {
        res.send({ success: false, msg: 'An error occurred in the process.' });
    } else {
        const object = [];
        users.forEach(item => {
            if (!item.isActivated) {
                var newPetObject = [];
                if (item.newPetProfile.length > 0) {
                    item.newPetProfile.forEach(element => {
                        var pet = {
                            _id: item._id,
                            idParental: element._id,
                            petName: element.petName,
                            email: element.email,
                            phone: element.phone,
                            photo: element.photo,
                            age: element.age,
                            birthDate: element.birthDate,
                            ownerPetName: element.ownerPetName,
                            petStatus: element.petStatus,
                            photo_id: element.photo_id,                            
                            isDigitalIdentificationActive: (element.isDigitalIdentificationActive)? true: false
                        }
                        newPetObject.push(pet);
                    })
                }

                var test = {
                    id: item._id,
                    // petName: item.petName,
                    email: item.email,
                    // phone: item.phone,
                    // age: item.age,
                    // birthDate: item.birthDate,
                    // ownerPetName: item.ownerPetName,
                    petStatus: item.petStatus,
                    updatedAt: item.updatedAt,
                    createdAt: item.createdAt,
                    userState: item.userState,
                    //isDigitalIdentificationActive: item.isDigitalIdentificationActive,
                    newPetProfile: (newPetObject.length > 0) ? newPetObject : null
                }
                object.push(test);
            }
        })
        res.status(200).send({ success: true, payload: object });
    }
}

adminCtl.getNewCodes = async (req, res) => {
    const users = await Pet.find();
    if (users.length == 0) {
        res.status(200).send({ success: false, msg: 'An error occurred in the process.' });
    } else {
        const object = [];
        users.forEach(item => {
            if (item.isActivated) {
                if(item.hostName == req.headers.referer){
                    const host = item.hostName ? item.hostName : req.headers.referer;
                    var code = {
                        id: item._id,
                        randomCode: item.randomCode,
                        isActivated: item.isActivated,
                        stateActivation: item.stateActivation,
                        updatedAt: item.updatedAt,
                        link: host + 'myPetCode/' + item._id + '/' + 0
                    }
                    object.push(code);
                }
            }
        })
        res.status(200).send({ success: true, payload: object });
    }
}

adminCtl.deleteUserById = async (req, res) => {
    const photo = await Pet.findByIdAndDelete(req.query.id);
    if (photo.image_id) {
        await cloudinary.uploader.destroy(photo.image_id);
    }

    res.send({ success: true, msg: 'The information was updated correctly' });
}

adminCtl.editUser = async (req, res) => {
    const { petName, email, phone, age, birthDate, ownerPetName, petStatus, userState, isDigitalIdentificationActive } = req.body;
    try {
        await Pet.findByIdAndUpdate(req.body.id, {
            petName,
            email,
            phone,
            age,
            birthDate,
            ownerPetName,
            petStatus,
            userState,
            isDigitalIdentificationActive
        });
        res.send({ msg: 'The information was updated correctly', success: true });
    } catch (err) {
        res.json({ success: false, msg: 'An error occurred in the process.' });
        next(err);
    }
}

adminCtl.editUserSecondLevel = async ( req,res )=> {
    const { isDigitalIdentificationActive } = req.body;
    try {
        if(req.body.idSecond === 0) {
            await Pet.findByIdAndUpdate(req.body._id, { isDigitalIdentificationActive });
        }else{
            await Pet.findOneAndUpdate(
                { _id: req.body._id, 'newPetProfile._id': req.body.idParental },
                {
                    $set: {
                        'newPetProfile.$.isDigitalIdentificationActive': isDigitalIdentificationActive
                    }
                },
            );
        }
        res.send({msg: 'The information was updated correctly', success: true});
    } catch (error) {
        res.json({success: false, msg: 'An error occurred in the process.', error: JSON.parse(JSON.stringify(error))});
    }
}

adminCtl.deletePetByIdForAdmin = async(req, res, next) => {
    try {
        await Pet.findByIdAndUpdate( req.body.idPrimary , { $pull: { newPetProfile: { _id: req.body.idSecond } } } ).then( async function(data){
            if (req.body.photo_id) {
               await cloudinary.uploader.destroy(req.body.photo_id); 
            }
            
            res.json({ success: true, msg: 'Delete successfull.' });
        })   
    } catch (error) {
        res.json({ success: false, msg: 'An error occurred in the process.', error: JSON.parse(JSON.stringify(error)) });
    }
}

adminCtl.createNewCode = async (req, res) => {
    Pet.findOne({ randomCode: req.body.randomCode }, async function (err, myUser) {
        if (!err) {
            if (myUser) {
                res.json({ success: false, msg: 'An error occurred in the process.' });
            } else {
                let newPet = new Pet({
                    randomCode: req.body.randomCode,
                    isActivated: req.body.isActivated,
                    stateActivation: req.body.stateActivation,
                    hostName: req.headers.referer
                });

                Pet.addNewCode(newPet, async (user, done) => {
                    try {
                        res.json({ success: true, msg: 'The process was successfully completed.' });
                    } catch (err) {
                        res.json({ success: false, msg: 'An error occurred in the process.' });
                        next(err);
                    }
                });
            }

        } else {
            res.json({ success: false, msg: 'An error occurred in the process.' });
        }
    })
}

adminCtl.updateStateActivationCode = async (req, res) => {
    const { stateActivation } = req.body;
    try {
        await Pet.findByIdAndUpdate(req.body.id, {
            stateActivation,
            hostName: req.headers.referer
        });
        res.send({ msg: 'The information was updated correctly', success: true });
    } catch (err) {
        res.json({ success: false, msg: 'An error occurred in the process.' });
        next(err);
    }
}

adminCtl.getLocationAllPets = async(req, res) => {
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
                _id: element._id,
                idPrimary: item._id,
                petName: element.petName,
                email: element.email,
                lat:element.lat,
                lng:element.lng,
                photo:element.photo,
                showPanel: true,
                petStatus: element.petStatus
              }
              object.push(pet);
          })
        } 
      }
    })
    res.json(object)
    });
};


adminCtl.updateFirstProfile = async(req, res, next) => {
    const {  address, age, birthDate, country, email, favoriteActivities, genderSelected, healthAndRequirements, isDigitalIdentificationActive, lat, lng, ownerPetName,  petName, petStatus,  phone, phoneVeterinarian, photo, photo_id, race,  userState, veterinarianContact, weight } = req.body;
    
    const permissions = { showPhoneInfo: true, showEmailInfo: true, showLinkTwitter: true, showLinkFacebook: true, showLinkInstagram: true, showOwnerPetName: true, showBirthDate: true, showAddressInfo: true, showAgeInfo: true, showVeterinarianContact: true, showPhoneVeterinarian: true, showHealthAndRequirements: true, showFavoriteActivities: true, showLocationInfo: true }
    const newPet = { address, age, birthDate, country, email, favoriteActivities, genderSelected, healthAndRequirements, isDigitalIdentificationActive, lat, lng, ownerPetName, permissions: permissions, petName, petStatus, petStatusReport: [], phone, phoneVeterinarian, photo, photo_id, race,  userState, veterinarianContact, weight };

    try {
        await Pet.findByIdAndUpdate(req.body.id, { $push: { newPetProfile: newPet }},{new: true}).then( async function(data){ 
            res.json({ success: true, msg: 'Your pet has been updated successfully.' });
        })   
    } catch (error) {
        res.json({ success: false, msg: 'An error occurred in the process.', error: JSON.parse(JSON.stringify(error)) });
    }
}

adminCtl.updateLocationPet  = async (req, res) => {
    try {
        await Pet.findOneAndUpdate(
            { _id: req.body.idPrimary, 'newPetProfile._id': req.body.idSecondary },
            {
                $set: {
                    'newPetProfile.$.lat': req.body.lat,
                    'newPetProfile.$.lng': req.body.lng
                }
            },
        );
        res.send({msg: 'The information was updated correctly', success: true});
    } catch (error) {
        res.json({success: false, msg: 'An error occurred in the process.', error: JSON.parse(JSON.stringify(error))});
    }
}

adminCtl.sortNewPetProfile = async (req, res) => {
    try {
        await Pet.findByIdAndUpdate(req.body._id, req.body);
        res.send({msg: 'The information was updated correctly', success: true});
    } catch (error) {
        res.json({success: false, msg: 'An error occurred in the process.', error: JSON.parse(JSON.stringify(error))});
    }
}


module.exports = adminCtl;