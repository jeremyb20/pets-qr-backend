const adminCtl = {}
const cloudinary = require('cloudinary').v2;
const Pet = require('../models/pet');
const fs = require('fs-extra');

adminCtl.getAllUsers = async (_req, res) => {
    const users = await Pet.find();
    if (users.length == 0) {
        res.status(200).send({ success: false, msg: 'An error occurred in the process.' });
    } else {
        const object = [];
        users.forEach(item => {
            if(!item.isActivated){
              var newPetObject = [];
              if(item.newPetProfile.length>0){
                item.newPetProfile.forEach(element => {
                  var pet  = {
                    _id:item._id,
                    idParental: element._id,
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
                id: item._id,
                petName: item.petName,
                email: item.email,
                phone: item.phone,
                age: item.age,
                birthDate: item.birthDate,
                ownerPetName: item.ownerPetName,
                petStatus: item.petStatus,
                updatedAt: item.updatedAt,
                createdAt: item.createdAt,
                userState: item.userState,
                newPetProfile: (newPetObject.length > 0) ? newPetObject : null
              }  
              object.push(test);
            }
        })
        res.status(200).send({ success: true, payload: object });
    }
}

adminCtl.getNewCodes =  async( _req,res )=> {
  const users = await Pet.find();
  if (users.length == 0) {
      res.status(200).send({ success: false, msg: 'An error occurred in the process.' });
  } else {
    const object = [];
      users.forEach(item => {
      if(item.isActivated){
        var code = {
          id: item._id,
          randomCode: item.randomCode,
          isActivated: item.isActivated,
          stateActivation: item.stateActivation,
          updatedAt: item.updatedAt,
          link: 'https://www.localpetsandfamily.com/myPetCode/' + item._id +'/'+ 0
        }
        object.push(code);  
      }
    })
    res.status(200).send({ success: true, payload: object });
  }
}

adminCtl.deleteUserById  = async(req,res )=> {
    const photo = await Pet.findByIdAndDelete(req.query.id);
    if(photo.image_id){
       await cloudinary.uploader.destroy(photo.image_id);
    }
   
    res.send({success: true, msg: 'The information was updated correctly'});
}

adminCtl.editUser = async ( req,res )=> {
    const { petName, email, phone, age, birthDate, ownerPetName, petStatus, userState } = req.body;
    try {
       await Pet.findByIdAndUpdate(req.body.id,{
        petName,
        email,
        phone,
        age,
        birthDate,
        ownerPetName,
        petStatus,
        userState
      });
      res.send({msg: 'The information was updated correctly', success: true});
    } catch (err) {
      res.json({success: false, msg: 'An error occurred in the process.'});
      next(err);
    }
}

adminCtl.createNewCode =  async( req,res )=> {
  Pet.findOne({randomCode: req.body.randomCode}, async function (err, myUser) {
    if (!err){
      if(myUser){
        res.json({ success: false, msg: 'An error occurred in the process.' });
      }else{
          let newPet = new Pet({
            randomCode: req.body.randomCode,
            isActivated: req.body.isActivated,
            stateActivation: req.body.stateActivation
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

adminCtl.updateStateActivationCode = async ( req,res )=> {
  const { stateActivation } = req.body;
  try {
     await Pet.findByIdAndUpdate(req.body.id,{
      stateActivation
    });
    res.send({msg: 'The information was updated correctly', success: true});
  } catch (err) {
    res.json({success: false, msg: 'An error occurred in the process.'});
    next(err);
  }
}



module.exports = adminCtl;