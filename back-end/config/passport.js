const JwtStrategy = require('passport-jwt').Strategy;
const ExtractJwt = require('passport-jwt').ExtractJwt;
const User = require('../models/user');
const Company = require('../models/pet');
require('dotenv').config();

module.exports = function(passport) {
  let opts = {};
  opts.jwtFromRequest = ExtractJwt.fromAuthHeaderWithScheme('jwt');
  opts.secretOrKey = process.env.SECRET;
  passport.use(new JwtStrategy(opts, (jwt_payload, done) => {
    User.getUserById(jwt_payload.data._id, (err, user) => {
      if(err) {
        return done(err, false);
      }

      if(user) {
        return done(null, user);
      } else {
        return done(null, false);
      }
    });

    User.getUsers(jwt_payload.data, (err, user) => {
      if(err) {
        return done(err, false);
      }

      if(user) {
        return done(null, user);
      } else {
        return done(null, false);
      }
    });

    Company.getCompanyById(jwt_payload.data._id, (err, company) => {
      if(err) {
        return done(err, false);
      }

      if(company) {
        return done(null, company);
      } else {
        return done(null, false);
      }
    });


    Company.getUsers(jwt_payload.data, (err, company) => {
      if(err) {
        return done(err, false);
      }

      if(company) {
        return done(null, company);
      } else {
        return done(null, false);
      }
    });

  }));

  passport.serializeUser(function(user, done) {
    done(null, user.id);
  });
  
  passport.deserializeUser(function(id, done) {
    User.findById(id, function(err, user) {
      done(err, user);
    });
  });
}
