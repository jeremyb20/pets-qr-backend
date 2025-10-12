// import { IUser } from '../../models/User';

// declare global {
//   namespace Express {
//     interface User extends IUser {}

//     interface Request {
//       user?: IUser & {
//         id: string;
//       };
//     }
//   }
// }

// export {};

// import { IUser } from '../../models/User';

// declare global {
//   namespace Express {
//     // Extender el User de Passport para que sea compatible con IUser
//     interface User extends IUser {}

//     // Extender Request para incluir user
//     interface Request {
//       user?: IUser;
//     }
//   }
// }

// export {};

import { IUser } from '../../models/User';

declare global {
  namespace Express {
    // Extender el User de Passport para que sea compatible con IUser
    interface User extends IUser {}

    // Extender Request para incluir user
    interface Request {
      user?: IUser;
    }
  }
}

export {};
