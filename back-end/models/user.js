const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const passportLocalMongoose = require('passport-local-mongoose');

// User Schema
const UserSchema = mongoose.Schema ({
  name: {
    type: String
  },
  email: {
    type: String,
    require: true,
    unique: true
  },
  username: {
    type: String,
    require: true
  },
  password: {
    type: String,
    require: true
  },
  phone: {
    type: Number,
    require: false
  },
  photo: {
    type: String,
    require: false
  },
  authPhoto: {
    type: String,
    require: false
  },
  address: {
    type: String,
    require: false
  },
  resetPasswordToken: {
    type: String
  },
  resetPasswordExpires: {
    type: Date
  },
  userState: {
    type: Number,
    require: false
  },
  message: [{
    idUserSent: {
      type: String,
      require: true,
      unique: true
    },
    username: {
      type: String,
      require: true,
      unique: true
    },
    message: {
      type: String,
      require: true
    },
    date: {
      type: String,
      require: true
    },
    imageUrl: {
      type: String,
      require: false
    }
  }]
}, { autoIndex: false });

UserSchema.plugin(passportLocalMongoose);

const User = module.exports = mongoose.model('User', UserSchema);

module.exports.getUserById = function(id, callback) {
  User.findById(id, callback);
}

module.exports.getUserByUsername = function(email, callback) {
  const query = {email: email}
  User.findOne(query, callback);
}

module.exports.addUser = function(newUser, callback) {
  bcrypt.genSalt(10, (err, salt) => {
    bcrypt.hash(newUser.password, salt, (err, hash) => {
      if(err) throw err;
      newUser.password = hash;
      newUser.save(callback);
    });
  });
}

module.exports.getUsers = function(users, callback){
  const query = {users: users}
  User.find();
}

module.exports.deleteOne = function(req,res){
  User.findByIdAndRemove({_id:req.body.id}).then(function(data){
    res.json({success:true,msg:'Se ha eliminado correctamente.'});
  });
}

module.exports.update = function(username, callback){
  User.findByIdAndUpdate(username, callback);
}

module.exports.getUserMessage = function(req, callback){
  console.log(req, 'que sale');
  const query = {id: req.body._id}
  User.find();
}

module.exports.comparePassword = function(candidatePassword, hash, callback) {
  bcrypt.compare(candidatePassword, hash, (err, isMatch) => {
    if(err) throw err;
    callback(null, isMatch);
  });
}
