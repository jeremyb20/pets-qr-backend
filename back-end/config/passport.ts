// const JwtStrategy = require('passport-jwt').Strategy;
// const ExtractJwt = require('passport-jwt').ExtractJwt;
// const User = require('../models/user');
// require('dotenv').config();

// module.exports = function(passport) {
//   let opts = {};
//   opts.jwtFromRequest = ExtractJwt.fromAuthHeaderWithScheme('jwt');
//   opts.secretOrKey = process.env.SECRET;
//   passport.use(new JwtStrategy(opts, (jwt_payload, done) => {
//     User.getUserById(jwt_payload.data._id, (err, user) => {
//       if(err) {
//         return done(err, false);
//       }

//       if(user) {
//         return done(null, user);
//       } else {
//         return done(null, false);
//       }
//     });

//     User.getUsers(jwt_payload.data, (err, user) => {
//       if(err) {
//         return done(err, false);
//       }

//       if(user) {
//         return done(null, user);
//       } else {
//         return done(null, false);
//       }
//     });

//   }));

//   passport.serializeUser(function(user, done) {
//     done(null, user.id);
//   });

//   passport.deserializeUser(function(id, done) {
//     User.findById(id, function(err, user) {
//       done(err, user);
//     });
//   });
// }

import {
  Strategy as JwtStrategy,
  ExtractJwt,
  StrategyOptions,
} from 'passport-jwt';
import passport, { PassportStatic } from 'passport';
import User, { IUser } from '../models/User';
import 'dotenv/config';

// Interface para el payload del JWT
interface JwtPayload {
  data: {
    _id: string;
    email?: string;
    username?: string;
  };
  iat?: number;
  exp?: number;
}

const opts: StrategyOptions = {
  jwtFromRequest: ExtractJwt.fromAuthHeaderWithScheme('jwt'),
  secretOrKey: process.env.SECRET as string,
};

export default function configurePassport(passport: PassportStatic): void {
  // Estrategia JWT
  passport.use(
    new JwtStrategy(opts, async (jwt_payload: JwtPayload, done) => {
      try {
        if (!jwt_payload.data || !jwt_payload.data._id) {
          console.log('JWT payload incompleto - faltan datos');
          return done(null, false);
        }

        const user = await User.findById(jwt_payload.data._id).exec();

        if (user) {
          console.log('Usuario encontrado:', user.email);
          return done(null, user);
        } else {
          console.log('Usuario no encontrado con ID:', jwt_payload.data._id);
          return done(null, false);
        }
      } catch (err) {
        console.error('Error en JWT Strategy:', err);
        return done(err, false);
      }
    })
  );

  // Serialización
  passport.serializeUser((user: any, done) => {
    done(null, user._id);
  });

  // Deserialización
  passport.deserializeUser(async (id: string, done) => {
    try {
      const user = await User.findById(id).exec();
      done(null, user);
    } catch (err) {
      done(err, null);
    }
  });
}
