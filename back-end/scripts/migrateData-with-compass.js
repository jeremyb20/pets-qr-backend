// back-end/scripts/migrateData-with-compass.js
const mongoose = require('mongoose');
require('dotenv').config();

mongoose.set('strictQuery', false);

const User = require('../models/User');
const Pet = require('../models/Pet');
const OldPet = require('../models/old/pet');

const generateMemberId = async () => {
  let memberId;
  let isUnique = false;
  let attempts = 0;
  const maxAttempts = 100; // Prevenir loop infinito

  while (!isUnique && attempts < maxAttempts) {
    // Generar un número de 6 dígitos (100000 - 999999)
    memberId = Math.floor(100000 + Math.random() * 900000).toString();

    // Verificar si ya existe
    const existingUser = await User.findOne({ memberId });
    if (!existingUser) {
      isUnique = true;
    }

    attempts++;

    if (attempts >= maxAttempts) {
      throw new Error(
        'No se pudo generar un memberId único después de 100 intentos'
      );
    }
  }

  console.log(`   🆔 MemberId generado: ${memberId}`);
  return memberId;
};

const migrateData = async () => {
  try {
    console.log('🚀 Iniciando migración con MongoDB Compass...');

    const dbUri = process.env.BD_URL || 'mongodb://localhost:27017/petsqr';

    await mongoose.connect(dbUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log('✅ Conectado a MongoDB');

    // Verificar qué colecciones existen
    const collections = await mongoose.connection.db
      .listCollections()
      .toArray();
    console.log('\n📂 COLECCIONES EN LA BASE DE DATOS:');
    collections.forEach((collection) => {
      console.log(`   - ${collection.name}`);
    });

    // Ver estadísticas
    const oldCount = await OldPet.countDocuments();
    const userCount = await User.countDocuments();
    const petCount = await Pet.countDocuments();

    console.log('\n📊 ESTADO ACTUAL:');
    console.log(`   📁 pets (colección actual): ${oldCount} registros`);
    console.log(`   👤 users (nuevo): ${userCount} registros`);
    console.log(`   🐕 pets (nueva colección): ${petCount} registros`);

    if (oldCount === 0) {
      console.log('\n❌ No hay registros en la colección "pets"');
      console.log(
        '💡 Verifica en Compass que la colección "pets" existe y tiene datos'
      );

      // Mostrar algunos documentos de ejemplo para debug
      const sampleDocs = await OldPet.find().limit(2);
      console.log('🔍 Documentos de ejemplo:', sampleDocs);

      process.exit(1);
    }

    console.log('\n🔄 ¿Comenzar migración? (s/n)');

    process.stdin.setEncoding('utf8');
    process.stdin.once('data', async (input) => {
      if (input.trim().toLowerCase() !== 's') {
        console.log('❌ Migración cancelada');
        process.exit(0);
      }

      await performMigration(oldCount);
    });
  } catch (error) {
    console.error('💥 Error:', error.message);
    process.exit(1);
  }
};

const performMigration = async (totalRecords) => {
  try {
    console.log(
      `\n🎯 Migrando ${totalRecords} registros de "pets" a nuevo modelo...`
    );

    // Mostrar un documento de ejemplo para ver la estructura
    const sampleDoc = await OldPet.findOne();
    console.log('🔍 Estructura de documento ejemplo:');
    console.log('   Email:', sampleDoc.email);
    console.log(
      '   Mascotas:',
      sampleDoc.newPetProfile ? sampleDoc.newPetProfile.length : 0
    );

    let processed = 0;
    let usersCreated = 0;
    let petsCreated = 0;
    let errors = 0;

    // Obtener todos los registros
    const oldRecords = await OldPet.find({});

    for (const oldRecord of oldRecords) {
      try {
        console.log(
          `\n📝 [${processed + 1}/${totalRecords}] Procesando: ${
            oldRecord.email
          }`
        );

        // 1. Crear usuario
        let user = await User.findOne({ email: oldRecord.email });
        if (!user) {
          user = await createUserFromOldRecord(oldRecord);
          usersCreated++;
          console.log(`   👤 Usuario creado: ${user._id}`);
        } else {
          console.log(`   ⚠️ Usuario ya existe: ${user.email}`);
        }

        // 2. Migrar mascotas
        if (oldRecord.newPetProfile && oldRecord.newPetProfile.length > 0) {
          console.log(
            `   🐕 Migrando ${oldRecord.newPetProfile.length} mascotas...`
          );
          const petsMigrated = await migratePets(oldRecord.newPetProfile, user);
          petsCreated += petsMigrated;
          console.log(`   ✅ ${petsMigrated} mascotas migradas`);
        } else {
          console.log(`   ℹ️ No hay mascotas para migrar`);
        }

        processed++;
      } catch (recordError) {
        console.error(`   ❌ Error:`, recordError.message);
        errors++;
        processed++;
      }
    }

    await showMigrationSummary(usersCreated, petsCreated, totalRecords, errors);
  } catch (error) {
    console.error('💥 Error durante migración:', error);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Conexión cerrada');
    process.exit(0);
  }
};

const createUserFromOldRecord = async (oldRecord) => {
  // Generar memberId único
  const memberId = await generateMemberId();
  const user = new User({
    memberId: memberId,
    name: oldRecord.ownerPetName || oldRecord.email.split('@')[0] || 'Usuario',
    email: oldRecord.email,
    username: oldRecord.email,
    password: oldRecord.password,
    phone: `+506 ${oldRecord.phone}`,
    country: oldRecord.country,
    theme: 'dark' || oldRecord.theme,
    photoProfile: oldRecord.photoProfile,
    photo_id_profile: oldRecord.photo_id_profile,
    isActivated: oldRecord.isActivated || false,
    userStatus: oldRecord.userState || 1,
    role: 3,
    resetPasswordToken: oldRecord.resetPasswordToken,
    resetPasswordExpires: oldRecord.resetPasswordExpires,
    token: oldRecord.token,
    randomCode: oldRecord.randomCode,
    stateActivation: oldRecord.stateActivation,
    hostName: oldRecord.hostName,
    pets: [],
  });

  await user.save();
  return user;
};

const migratePets = async (petProfiles, user) => {
  let petsCreated = 0;

  for (const petProfile of petProfiles) {
    try {
      const pet = new Pet({
        owner: user._id,
        petName: petProfile.petName || 'Mascota',
        genderSelected: petProfile.genderSelected,
        race: petProfile.race,
        weight: petProfile.weight,
        petStatus: petProfile.petStatus || 'active',
        birthDate: petProfile.birthDate,
        favoriteActivities: petProfile.favoriteActivities,
        healthAndRequirements: petProfile.healthAndRequirements,
        phoneVeterinarian: petProfile.phoneVeterinarian,
        veterinarianContact: petProfile.veterinarianContact,
        photo: petProfile.photo,
        photo_id: petProfile.photo_id,
        address: petProfile.address,
        lat: petProfile.lat,
        lng: petProfile.lng,
        linkTwitter: petProfile.linkTwitter,
        linkFacebook: petProfile.linkFacebook,
        linkInstagram: petProfile.linkInstagram,
        isDigitalIdentificationActive:
          petProfile.isDigitalIdentificationActive || false,
        petViewCounter: petProfile.petViewCounter || [],
        permissions:
          petProfile.permissions && petProfile.permissions.length > 0
            ? petProfile.permissions[0]
            : {},
        petStatusReport: petProfile.petStatusReport || [],
      });

      await pet.save();
      user.pets.push(pet._id);
      petsCreated++;
    } catch (petError) {
      console.error(
        `      ❌ Error en mascota "${petProfile.petName}":`,
        petError.message
      );
    }
  }

  if (user.isModified('pets')) {
    await user.save();
  }

  return petsCreated;
};

const showMigrationSummary = async (
  usersCreated,
  petsCreated,
  totalRecords,
  errors
) => {
  console.log('\n🎉 MIGRACIÓN COMPLETADA');
  console.log('='.repeat(50));
  console.log(`📊 RESUMEN FINAL:`);
  console.log(`   👤 Usuarios creados: ${usersCreated}`);
  console.log(`   🐕 Mascotas migradas: ${petsCreated}`);
  console.log(`   📝 Registros procesados: ${totalRecords}`);
  console.log(`   ❌ Errores: ${errors}`);

  const finalUserCount = await User.countDocuments();
  const finalPetCount = await Pet.countDocuments();

  console.log('\n📈 ESTADO FINAL:');
  console.log(`   👤 Colección "users": ${finalUserCount} documentos`);
  console.log(`   🐕 Colección "pets": ${finalPetCount} documentos`);

  console.log('\n💡 Verifica en MongoDB Compass:');
  console.log('   1. Colección "users" - debería tener los usuarios');
  console.log('   2. Colección "pets" - debería tener las mascotas');
  console.log('   3. Campo "pets" en users - array con referencias a mascotas');
};

migrateData();
