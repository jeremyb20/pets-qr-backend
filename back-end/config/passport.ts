import {
  Strategy as JwtStrategy,
  ExtractJwt,
  StrategyOptions,
} from 'passport-jwt';
import passport, { PassportStatic } from 'passport';
import User from '../models/User.model';
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
  jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
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
