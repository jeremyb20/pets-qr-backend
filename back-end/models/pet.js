const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const passportLocalMongoose = require('passport-local-mongoose');

// User Schema
const PetSchema = mongoose.Schema ({
  petName: {
    type: String
  },
  phone:{
    type: Number,
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
    require: true
  },
  lng: {
    type: String,
    require: true
  },
  photo: {
    type: String,
    require: false
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
  notifications: [{
    message: {
      type: String,
      require: true
    },
    userPetName: {
      type: String,
      require: true
    },
    isNewMsg: {
      type: Boolean,
      require: true
    },
    dateMsg: {
      type: String,
      require: true
    },
    idPet: {
      type: String,
      require: true
    },
    photo: {
      type: String,
      require: false
    },
  }],

  permissions: [{
    showPhoneInfo: {
      type: Boolean,
      require: true
    },
    showEmailInfo: {
      type: Boolean,
      require: true
    },
    showLinkTwitter: {
      type: Boolean,
      require: true
    },
    showLinkFacebook: {
      type: Boolean,
      require: true
    },
    showLinkInstagram: {
      type: Boolean,
      require: true
    },
    showOwnerPetName: {
      type: Boolean,
      require: true
    },
    showBirthDate: {
      type: Boolean,
      require: true
    },
    showAddressInfo: {
      type: Boolean,
      require: true
    },
    showAgeInfo: {
      type: Boolean,
      require: true
    },
    showVeterinarianContact: {
      type: Boolean,
      require: true
    },
    showPhoneVeterinarian: {
      type: Boolean,
      require: true
    },
    showHealthAndRequirements: {
      type: Boolean,
      require: true
    },
    showFavoriteActivities: {
      type: Boolean,
      require: true
    },
    showLocationInfo: {
      type:Boolean,
      require: true
    }
  }],
  productsList: [{
    productName: {
      type: String,
      require: true
    },
    size: {
      type: String,
      require: true
    },
    color: {
      type: String,
      require: true
    },
    description: {
      type: String,
      require: true
    },
    cost: {
      type: String,
      require: true
    },
    quantity: {
      type: String,
      require: true
    },
    firstPhoto: {
      type: String,
      require: true
    },
    secondPhoto: {
      type: String,
      require: true
    },
  }],
  code: [{
    petName: {
      type: String,
      require: true
    },
    email: {
      type: String,
      require: true
    },
    idPrincipal: {
      type:String,
      require: true
    },
    comment: {
      type: String,
      require: true
    },
    total : {
      type: String,
      require: true
    },
    productName : {
      type: String,
      require: true
    },
    description: {
      type: String,
      require: true
    },
    cost: {
      type: String,
      require: true
    },
    idCan: {
      type: String,
      require: true
    },
    petPhoto: {
      type: String,
      require: true
    },
    status: {
      type: String,
      require: true
    },
    link: {
      type: String,
      require: true
    }
  }],
  resetPasswordToken: {
    type: String
  },
  resetPasswordExpires: {
    type: Date
  },
  randomCode:{
    type: String,
    require: true
  }, 
  isActivated: {
    type: Boolean,
    require: true
  },
  stateActivation: {
    type:  String,
    require: true
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
    require: true
  },
  birthDate: {
    type: String,
    require: true
  },
  address: {
    type: String,
    require: true
  },
  age: {
    type: Number,
    require: true
  },
  phoneVeterinarian:{
    type: Number,
    require: true
  },
  veterinarianContact: {
    type: String,
    require: true
  },
  healthAndRequirements: {
    type: String,
    require: true
  },
  favoriteActivities: {
    type: String,
    require: true
  },
  petStatus : {
    type: String,
    require: true
  },
  petStatusReport :[{
    lastPlaceLost: {
      type: String,
      require: true
    },
    date: {
      type: String,
      require: true
    },
    petStatus: {
      type: String,
      require: true
    },
    descriptionLost: {
      type: String,
      require: true
    }
  }],
  calendar: [{
    title: {
      type: String,
      require: true
    },
    date: {
      type: String,
      require: true
    },
    enddate: {
      type: String,
      require: true
    },
    description: {
      type: String,
      require: true
    }
  }],
  newPetProfile: [
    {
      petName: {
        type: String
      },
      phone:{
        type: Number,
        require: true
      },
      email: {
        type: String,
        require: true,
        unique: true
      },
      lat: {
        type: String,
        require: true
      },
      lng: {
        type: String,
        require: true
      },
      photo: {
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
          require: true
        },
        showEmailInfo: {
          type: Boolean,
          require: true
        },
        showLinkTwitter: {
          type: Boolean,
          require: true
        },
        showLinkFacebook: {
          type: Boolean,
          require: true
        },
        showLinkInstagram: {
          type: Boolean,
          require: true
        },
        showOwnerPetName: {
          type: Boolean,
          require: true
        },
        showBirthDate: {
          type: Boolean,
          require: true
        },
        showAddressInfo: {
          type: Boolean,
          require: true
        },
        showAgeInfo: {
          type: Boolean,
          require: true
        },
        showVeterinarianContact: {
          type: Boolean,
          require: true
        },
        showPhoneVeterinarian: {
          type: Boolean,
          require: true
        },
        showHealthAndRequirements: {
          type: Boolean,
          require: true
        },
        showFavoriteActivities: {
          type: Boolean,
          require: true
        },
        showLocationInfo: {
          type:Boolean,
          require: true
        }
      }],
      userState: {
        type: Number,
        require: false
      },
      ownerPetName: {
        type: String,
        require: true
      },
      birthDate: {
        type: String,
        require: true
      },
      address: {
        type: String,
        require: true
      },
      age: {
        type: Number,
        require: true
      },
      phoneVeterinarian:{
        type: Number,
        require: true
      },
      veterinarianContact: {
        type: String,
        require: true
      },
      healthAndRequirements: {
        type: String,
        require: true
      },
      favoriteActivities: {
        type: String,
        require: true
      },
      petStatus : {
        type: String,
        require: true
      },
      petStatusReport :[{
        lastPlaceLost: {
          type: String,
          require: true
        },
        date: {
          type: String,
          require: true
        },
        petStatus: {
          type: String,
          require: true
        },
        descriptionLost: {
          type: String,
          require: true
        }
      }],
      calendar: [{
        title: {
          type: String,
          require: true
        },
        date: {
          type: String,
          require: true
        },
        enddate: {
          type: String,
          require: true
        },
        description: {
          type: String,
          require: true
        }
      }],
    }
  ]
}, { autoIndex: false });

PetSchema.plugin(passportLocalMongoose);

const Pet = module.exports = mongoose.model('Pet', PetSchema);

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
