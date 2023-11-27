// const mongoose = require('mongoose');
const { Schema, model } = require('mongoose');
const bcrypt = require('bcryptjs');
const passportLocalMongoose = require('passport-local-mongoose');

// User Schema
const PetSchema = new Schema({
  petName: {
    type: String
  },
  phone:{
    type: String,
    require: true
  },
  email: {
    type: String,
    require: true,
    unique: true
  },
  password: {
    type: String,
    require: true
  },
  lat: {
    type: String,
    require: false
  },
  lng: {
    type: String,
    require: false
  },
  photo: {
    type: String,
    require: true
  },
  photo_id: {
    type: String,
    require: true
  },
  isPrimary: {
    type: Boolean,
    require: true
  },
  linkTwitter: {
    type: String,
    require: false
  },
  token: {
    type: String,
    require: false
  },
  linkFacebook: {
    type: String,
    require: false
  },
  linkInstagram: {
    type: String,
    require: false
  },
  resetPasswordToken: {
    type: String,
    require: false
  },
  resetPasswordExpires: {
    type: Date,
    require: false
  },
  randomCode:{
    type: String,
    require: false
  }, 
  isActivated: {
    type: Boolean,
    require: false
  },
  stateActivation: {
    type:  String,
    require: false
  },
  genderSelected: {
    type: Number,
    require: true
  },
  userState: {
    type: Number,
    require: false
  },
  ownerPetName: {
    type: String,
    require: false
  },
  birthDate: {
    type: String,
    require: false
  },
  address: {
    type: String,
    require: false
  },
  age: {
    type: Number,
    require: false
  },
  phoneVeterinarian:{
    type: String,
    require: false
  },
  veterinarianContact: {
    type: String,
    require: false
  },
  healthAndRequirements: {
    type: String,
    require: false
  },
  favoriteActivities: {
    type: String,
    require: false
  },
  petStatus : {
    type: String,
    require: false
  },
  petStatusReport :[{
    lastPlaceLost: {
      type: String,
      require: false
    },
    date: {
      type: String,
      require: false
    },
    petStatus: {
      type: String,
      require: false
    },
    descriptionLost: {
      type: String,
      require: false
    }
  }],
  permissions: [{
    showPhoneInfo: {
      type: Boolean,
      require: false
    },
    showEmailInfo: {
      type: Boolean,
      require: false
    },
    showLinkTwitter: {
      type: Boolean,
      require: false
    },
    showLinkFacebook: {
      type: Boolean,
      require: false
    },
    showLinkInstagram: {
      type: Boolean,
      require: false
    },
    showOwnerPetName: {
      type: Boolean,
      require: false
    },
    showBirthDate: {
      type: Boolean,
      require: false
    },
    showAddressInfo: {
      type: Boolean,
      require: false
    },
    showAgeInfo: {
      type: Boolean,
      require: false
    },
    showVeterinarianContact: {
      type: Boolean,
      require: false
    },
    showPhoneVeterinarian: {
      type: Boolean,
      require: false
    },
    showHealthAndRequirements: {
      type: Boolean,
      require: false
    },
    showFavoriteActivities: {
      type: Boolean,
      require: false
    },
    showLocationInfo: {
      type:Boolean,
      require: false
    }
  }],
  newPetProfile: [
    {
        type: new Schema( 
            {
                genderSelected: {
                    type: String,
                    require: false
                },
                petName: {
                    type: String,
                    require: false
                },
                petStatus : {
                    type: String,
                    require: false
                },
                email: {
                    type: String,
                    require: false,
                },
                phone:{
                    type: String,
                    require: true
                },
                ownerPetName: {
                    type: String,
                    require: false
                },
                address: {
                    type: String,
                    require: false
                },
                birthDate: {
                    type: String,
                    require: false
                },
                favoriteActivities: {
                    type: String,
                    require: false
                },
                healthAndRequirements: {
                    type: String,
                    require: false
                },
                phoneVeterinarian:{
                    type: String,
                    require: false
                },
                veterinarianContact: {
                    type: String,
                    require: false
                },
                photo: {
                    type: String,
                    require: false
                },
                photo_id: {
                    type: String,
                    require: false
                },
                lat: {
                    type: String,
                    require: false
                },
                lng: {
                    type: String,
                    require: false
                },
                linkTwitter: {
                    type: String,
                    require: false
                },
                linkFacebook: {
                    type: String,
                    require: false
                },
                linkInstagram: {
                    type: String,
                    require: false
                },
                permissions: [{
                    showPhoneInfo: {
                        type: Boolean,
                        require: false
                    },
                    showEmailInfo: {
                        type: Boolean,
                        require: false
                    },
                    showLinkTwitter: {
                        type: Boolean,
                        require: false
                    },
                    showLinkFacebook: {
                        type: Boolean,
                        require: false
                    },
                    showLinkInstagram: {
                        type: Boolean,
                        require: false
                    },
                    showOwnerPetName: {
                        type: Boolean,
                        require: false
                    },
                    showBirthDate: {
                        type: Boolean,
                        require: false
                    },
                    showAddressInfo: {
                        type: Boolean,
                        require: false
                    },
                    showAgeInfo: {
                        type: Boolean,
                        require: false
                    },
                    showVeterinarianContact: {
                        type: Boolean,
                        require: false
                    },
                    showPhoneVeterinarian: {
                        type: Boolean,
                        require: false
                    },
                    showHealthAndRequirements: {
                        type: Boolean,
                        require: false
                    },
                    showFavoriteActivities: {
                        type: Boolean,
                        require: false
                    },
                    showLocationInfo: {
                        type:Boolean,
                        require: false
                    }
                }],
                petStatusReport :[{
                    lastPlaceLost: {
                        type: String,
                        require: false
                    },
                    date: {
                        type: String,
                        require: false
                    },
                    petStatus: {
                        type: String,
                        require: false
                    },
                    descriptionLost: {
                        type: String,
                        require: false
                    }
                }]
            },
            {  
                timestamps: true,
                versionKey: false
            }
        )
    }
  ],
}, 
{  
  timestamps: true,
  versionKey: false
});

PetSchema.plugin(passportLocalMongoose);

const Pet = module.exports = model('Pet', PetSchema);

module.exports.getPetById = function(id, callback) {
    Pet.findById(id, callback);
}

module.exports.getUserByUsername = function(email, callback) {
  const query = {email: email}
  Pet.findOne(query, callback);
}

module.exports.addPet = function(newPet, callback) {
  bcrypt.genSalt(10, (err, salt) => {
    bcrypt.hash(newPet.password, salt, (err, hash) => {
      if(err) throw err;
      newPet.password = hash;
      newPet.save(callback);
    });
  });
}

module.exports.newPetGeneratorCode = function(newPet, callback) {
  bcrypt.genSalt(10, (err, salt) => {
    bcrypt.hash(newPet.password, salt, (err, hash) => {
      if(err) throw err;
      newPet.password = hash;
      callback(newPet, newPet);
    });
  });
}


module.exports.addNewCode = function(newPet, callback) {
  newPet.save(callback);
}

module.exports.getUsers = function(users, callback){
  const query = {users: users}
  Pet.find();
}

module.exports.deleteOne = function(req,res){
  Pet.findByIdAndRemove({_id:req.body.id}).then(function(data){
    res.json({success:true,msg:'Se ha eliminado correctamente.'});
  });
}

module.exports.update = function(username, callback){
  Pet.findByIdAndUpdate(username, callback);
}

module.exports.getUserMessage = function(req, callback){
  console.log(req, 'que sale');
  const query = {id: req.body._id}
  Pet.find();
}

module.exports.comparePassword = function(candidatePassword, hash, callback) {
  bcrypt.compare(candidatePassword, hash, (err, isMatch) => {
    if(err) throw err;
    callback(null, isMatch);
  });
}
