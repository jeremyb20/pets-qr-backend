// back-end/scripts/migrateOldQRCodes.js
const mongoose = require('mongoose');
require('dotenv').config();

mongoose.set('strictQuery', false);

// Cargar modelos con la estructura correcta
const loadModels = () => {
  try {
    console.log('🔍 Cargando modelos...');

    // Modelos nuevos en TypeScript (compilados a JS)
    const User = require('../models/User.model');
    const Pet = require('../models/Pet.model');
    const QrCode = require('../models/QrCode.model');

    // Modelo antiguo en JavaScript - nota el carácter especial
    const OldPet = require('../models/old/pet'); // pet.js con posible carácter especial

    console.log('✅ Todos los modelos cargados correctamente');
    return { User, Pet, QrCode, OldPet };
  } catch (error) {
    console.error('❌ Error cargando modelos:', error.message);
    console.log('🔄 Intentando alternativas...');

    // Intentar diferentes nombres para el archivo antiguo
    const tryOldPetNames = [
      '../models/old/pet',
      '../models/old/pēt', // con acento
      '../models/old/Pet',
      '../models/old/pet.model',
    ];

    for (const petPath of tryOldPetNames) {
      try {
        console.log(`   Probando: ${petPath}`);
        const OldPet = require(petPath);
        const User = require('../models/User.model');
        const Pet = require('../models/Pet.model');
        const QrCode = require('../models/QrCode.model');

        console.log(`✅ Éxito con: ${petPath}`);
        return { User, Pet, QrCode, OldPet };
      } catch (err) {
        // Continuar con el siguiente
      }
    }

    console.error('❌ No se pudo cargar ningún modelo antiguo');
    process.exit(1);
  }
};

const { User, Pet, QrCode, OldPet } = loadModels();

const migrateOldQRCodes = async () => {
  try {
    console.log('🚀 Iniciando migración de QR Codes antiguos...');

    const dbUri = process.env.BD_URL || 'mongodb://localhost:27017/petsqr';
    await mongoose.connect(dbUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log('✅ Conectado a MongoDB');

    // Verificar estadísticas
    const oldRecordsCount = await OldPet.countDocuments({
      $or: [
        { randomCode: { $exists: true, $ne: null } },
        { isActivated: { $exists: true, $ne: null } },
        { stateActivation: { $exists: true, $ne: null } },
      ],
    });

    const existingQrCodesCount = await QrCode.countDocuments();

    console.log('\n📊 ESTADO ACTUAL:');
    console.log(`   📁 Registros antiguos con QR: ${oldRecordsCount}`);
    console.log(`   📱 QR Codes en nuevo modelo: ${existingQrCodesCount}`);

    if (oldRecordsCount === 0) {
      console.log('\n❌ No hay registros antiguos con datos QR para migrar');
      process.exit(0);
    }

    console.log('\n🔄 ¿Comenzar migración de QR Codes? (s/n)');

    process.stdin.setEncoding('utf8');
    process.stdin.once('data', async (input) => {
      if (input.toString().trim().toLowerCase() !== 's') {
        console.log('❌ Migración cancelada');
        process.exit(0);
      }

      await performQRMigration(oldRecordsCount);
    });
  } catch (error) {
    console.error('💥 Error:', error.message);
    process.exit(1);
  }
};

const performQRMigration = async (totalRecords) => {
  try {
    console.log(`\n🎯 Migrando ${totalRecords} QR Codes antiguos...`);

    // Obtener todos los registros antiguos que tienen datos QR
    const oldRecords = await OldPet.find({
      $or: [
        { randomCode: { $exists: true, $ne: null } },
        { isActivated: { $exists: true, $ne: null } },
        { stateActivation: { $exists: true, $ne: null } },
      ],
    });

    let processed = 0;
    let qrCodesCreated = 0;
    let qrCodesUpdated = 0;
    let errors = 0;

    for (const oldRecord of oldRecords) {
      try {
        console.log(
          `\n📝 [${processed + 1}/${totalRecords}] Procesando: ${
            oldRecord.email
          }`
        );
        console.log(`   🔑 Código: ${oldRecord.randomCode}`);
        console.log(`   📊 Estado: ${oldRecord.stateActivation}`);
        console.log(`   ✅ Activado: ${oldRecord.isActivated}`);

        // Buscar el usuario correspondiente en el nuevo sistema
        const user = await User.findOne({ email: oldRecord.email });

        if (!user) {
          console.log(`   ⚠️ Usuario no encontrado para: ${oldRecord.email}`);
          processed++;
          continue;
        }

        console.log(`   👤 Usuario encontrado: ${user.name}`);

        // Buscar si ya existe un QR Code con este randomCode
        let qrCode = await QrCode.findOne({ randomCode: oldRecord.randomCode });

        if (qrCode) {
          // Actualizar QR Code existente
          qrCode.status = getQRStatus(oldRecord);
          qrCode.assignedTo = user._id;
          qrCode.activatedBy = user._id;
          qrCode.activationDate = oldRecord.isActivated ? new Date() : null;
          qrCode.hostName = oldRecord.hostName;

          await qrCode.save();
          qrCodesUpdated++;
          console.log(`   🔄 QR Code actualizado: ${qrCode._id}`);
        } else {
          // Crear nuevo QR Code
          qrCode = new QrCode({
            randomCode: oldRecord.randomCode,
            status: getQRStatus(oldRecord),
            assignedTo: user._id,
            activatedBy: user._id,
            activationDate: oldRecord.isActivated ? new Date() : null,
            hostName: oldRecord.hostName,
            purchaseInfo: {
              price: 0,
              seller: 'sistema_antiguo',
            },
          });

          await qrCode.save();
          qrCodesCreated++;
          console.log(`   ✅ QR Code creado: ${qrCode._id}`);
        }

        // Buscar mascotas asociadas a este usuario para asignar el QR Code
        await assignQRCodeToPets(user, qrCode);

        processed++;
      } catch (recordError) {
        console.error(`   ❌ Error procesando registro:`, recordError.message);
        errors++;
        processed++;
      }
    }

    await showQRMigrationSummary(
      qrCodesCreated,
      qrCodesUpdated,
      totalRecords,
      errors
    );
  } catch (error) {
    console.error('💥 Error durante migración QR:', error);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Conexión cerrada');
    process.exit(0);
  }
};

const getQRStatus = (oldRecord) => {
  if (oldRecord.isActivated && oldRecord.stateActivation === 'Terminado') {
    return 'activated';
  } else if (oldRecord.isActivated) {
    return 'assigned';
  } else {
    return 'available';
  }
};

const assignQRCodeToPets = async (user, qrCode) => {
  try {
    // Buscar mascotas de este usuario que no tengan QR code asignado
    const userPets = await Pet.find({
      owner: user._id,
      qrCode: { $exists: false },
    }).limit(1);

    if (userPets.length > 0) {
      const pet = userPets[0];
      pet.qrCode = qrCode._id;
      await pet.save();

      // Actualizar el QR Code con la mascota asignada
      qrCode.assignedPet = pet._id;
      await qrCode.save();

      console.log(`   🐕 QR asignado a mascota: ${pet.petName}`);
      return true;
    } else {
      // Si no hay mascotas sin QR, buscar cualquier mascota del usuario
      const anyUserPet = await Pet.findOne({ owner: user._id });
      if (anyUserPet) {
        anyUserPet.qrCode = qrCode._id;
        await anyUserPet.save();

        qrCode.assignedPet = anyUserPet._id;
        await qrCode.save();

        console.log(
          `   🐕 QR asignado a mascota existente: ${anyUserPet.petName}`
        );
        return true;
      } else {
        console.log(`   ℹ️ No hay mascotas para asignar QR`);
        return false;
      }
    }
  } catch (error) {
    console.error(`   ❌ Error asignando QR a mascotas:`, error.message);
    return false;
  }
};

const showQRMigrationSummary = async (created, updated, total, errors) => {
  console.log('\n🎉 MIGRACIÓN QR CODES COMPLETADA');
  console.log('='.repeat(50));
  console.log(`📊 RESUMEN FINAL:`);
  console.log(`   ✅ QR Codes creados: ${created}`);
  console.log(`   🔄 QR Codes actualizados: ${updated}`);
  console.log(`   📝 Registros procesados: ${total}`);
  console.log(`   ❌ Errores: ${errors}`);

  const finalQrCount = await QrCode.countDocuments();
  const activatedQrCount = await QrCode.countDocuments({ status: 'activated' });
  const assignedQrCount = await QrCode.countDocuments({ status: 'assigned' });
  const availableQrCount = await QrCode.countDocuments({ status: 'available' });

  console.log('\n📈 ESTADO FINAL QR CODES:');
  console.log(`   📱 Total: ${finalQrCount}`);
  console.log(`   ✅ Activados: ${activatedQrCount}`);
  console.log(`   🔄 Asignados: ${assignedQrCount}`);
  console.log(`   📦 Disponibles: ${availableQrCount}`);

  // Mostrar algunos ejemplos
  console.log('\n🔍 EJEMPLOS MIGRADOS:');
  const sampleQRCodes = await QrCode.find()
    .populate('assignedTo', 'name email')
    .populate('assignedPet', 'petName')
    .limit(3);

  sampleQRCodes.forEach((qr, index) => {
    console.log(`   ${index + 1}. Código: ${qr.randomCode}`);
    console.log(`      Estado: ${qr.status}`);
    console.log(`      Usuario: ${qr.assignedTo?.name || 'N/A'}`);
    console.log(`      Mascota: ${qr.assignedPet?.petName || 'N/A'}`);
  });

  console.log('\n💡 Verificación completada');
};

migrateOldQRCodes();
