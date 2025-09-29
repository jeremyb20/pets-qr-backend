require('dotenv').config();
const mongoose = require('mongoose');
const configureWebPush = require('../config/webpush');

const init = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    configureWebPush();
    console.log('Sistema de notificaciones inicializado correctamente');
    console.log('VAPID Public Key:', process.env.VAPID_PUBLIC_KEY);
  } catch (error) {
    console.error('Error inicializando notificaciones:', error);
  }
};

init();