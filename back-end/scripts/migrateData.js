// back-end/scripts/migrateData.js
const mongoose = require('mongoose');
require('dotenv').config();

// Importar modelos NUEVOS - ajusta las rutas según tu estructura
const User = require('../models/User.model');
const Pet = require('../models/Pet.model');

// Importar modelo VIEJO desde la nueva ubicación
const OldPet = require('../models/old/pet'); // ⬅️ Ruta corregida

const migrateData = async () => {
  try {
    // Conectar a la base de datos
    await mongoose.connect(
      process.env.MONGODB_URI || 'mongodb://localhost:27017/your-db-name',
      {
        useNewUrlParser: true,
        useUnifiedTopology: true,
      }
    );
    console.log('✅ Conectado a MongoDB');

    console.log('🔄 Iniciando migración de datos...');

    // Verificar que podemos acceder al modelo OldPet
    const oldRecordsCount = await OldPet.countDocuments();
    console.log(
      `📊 Encontrados ${oldRecordsCount} registros en OldPet para migrar`
    );

    const oldRecords = await OldPet.find({}).limit(10); // ⬅️ Limita para probar primero

    let usersCreated = 0;
    let petsCreated = 0;
    let errors = 0;

    for (const [index, oldRecord] of oldRecords.entries()) {
      try {
        console.log(
          `\n🔹 Procesando registro ${index + 1}/${
            oldRecords.length
          } - Email: ${oldRecord.email}`
        );

        // 1. Verificar si el usuario ya existe
        let user = await User.findOne({ email: oldRecord.email });

        if (!user) {
          console.log(`👤 Creando usuario: ${oldRecord.email}`);

          user = new User({
            name: oldRecord.ownerPetName || 'Usuario Sin Nombre',
            email: oldRecord.email,
            username: oldRecord.email, // Usar email como username temporal
            password: oldRecord.password,
            phone: oldRecord.phone,
            country: oldRecord.country,
            theme: oldRecord.theme || 'dark',
            photoProfile: oldRecord.photoProfile,
            photo_id_profile: oldRecord.photo_id_profile,
            isActivated: oldRecord.isActivated || false,
            userState: oldRecord.userState || 1,
            resetPasswordToken: oldRecord.resetPasswordToken,
            resetPasswordExpires: oldRecord.resetPasswordExpires,
            token: oldRecord.token,
            randomCode: oldRecord.randomCode,
            stateActivation: oldRecord.stateActivation,
            hostName: oldRecord.hostName,
          });

          await user.save();
          usersCreated++;
          console.log(`✅ Usuario creado: ${user._id}`);
        } else {
          console.log(`⚠️ Usuario ya existe: ${user.email}`);
        }

        // 2. Migrar mascotas (newPetProfile)
        if (oldRecord.newPetProfile && oldRecord.newPetProfile.length > 0) {
          console.log(
            `🐕 Encontradas ${oldRecord.newPetProfile.length} mascotas`
          );

          for (const [
            petIndex,
            petProfile,
          ] of oldRecord.newPetProfile.entries()) {
            try {
              // Verificar si la mascota ya existe para este usuario
              const existingPet = await Pet.findOne({
                owner: user._id,
                petName: petProfile.petName,
              });

              if (existingPet) {
                console.log(`⚠️ Mascota ya existe: ${petProfile.petName}`);
                continue;
              }

              const newPet = new Pet({
                owner: user._id,
                petName: petProfile.petName || 'Mascota Sin Nombre',
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
                    : {
                        showPhoneInfo: true,
                        showEmailInfo: true,
                        showLinkTwitter: true,
                        showLinkFacebook: true,
                        showLinkInstagram: true,
                        showOwnerPetName: true,
                        showBirthDate: true,
                        showAddressInfo: true,
                        showAgeInfo: true,
                        showVeterinarianContact: true,
                        showPhoneVeterinarian: true,
                        showHealthAndRequirements: true,
                        showFavoriteActivities: true,
                        showLocationInfo: true,
                      },
                petStatusReport: petProfile.petStatusReport || [],
              });

              await newPet.save();
              petsCreated++;

              // Agregar referencia al usuario
              if (!user.pets.includes(newPet._id)) {
                user.pets.push(newPet._id);
              }

              console.log(
                `✅ Mascota ${petIndex + 1} creada: ${newPet.petName}`
              );
            } catch (petError) {
              console.error(
                `❌ Error creando mascota ${petIndex + 1}:`,
                petError.message
              );
              errors++;
            }
          }

          // Guardar usuario con referencias actualizadas
          if (user.isModified('pets')) {
            await user.save();
            console.log(`✅ Referencias de mascotas actualizadas para usuario`);
          }
        } else {
          console.log('ℹ️ No hay mascotas para migrar en este registro');
        }
      } catch (recordError) {
        console.error(
          `❌ Error procesando registro ${index + 1}:`,
          recordError.message
        );
        errors++;
      }
    }

    console.log('\n🎉 MIGRACIÓN COMPLETADA');
    console.log(`📊 Resumen:`);
    console.log(`   👤 Usuarios creados: ${usersCreated}`);
    console.log(`   🐕 Mascotas migradas: ${petsCreated}`);
    console.log(`   ❌ Errores: ${errors}`);
    console.log(`   📝 Registros procesados: ${oldRecords.length}`);
  } catch (error) {
    console.error('💥 ERROR GENERAL:', error);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Conexión cerrada');
    process.exit(0);
  }
};

// Ejecutar migración
migrateData();
