import mongoose from 'mongoose';
import dotenv from 'dotenv';
import QrCode from '../models/QrCode.model';

dotenv.config();

mongoose.set('strictQuery', false);

interface OldPetDocument extends mongoose.Document {
  _id: mongoose.Types.ObjectId;
  email: string;
  randomCode?: string;
  isActivated?: boolean;
  stateActivation?: string;
  hostName?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

interface MigrationStats {
  processed: number;
  qrCodesCreated: number;
  qrCodesUpdated: number;
  qrCodesDeleted: number;
  errors: number;
}

const migrateAndCleanOldQRCodes = async (): Promise<void> => {
  try {
    console.log('🚀 Iniciando migración y LIMPIEZA de QR Codes antiguos...');

    const dbUri = process.env.BD_URL || 'mongodb://localhost:27017/petsqr';
    await mongoose.connect(dbUri);

    console.log('✅ Conectado a MongoDB');

    const OldPet = await loadOldPetModel();

    // Contar registros a migrar
    const oldRecordsCount = await OldPet.countDocuments({
      randomCode: { $exists: true, $ne: null },
      $or: [
        { email: { $exists: false } },
        { email: null },
        { email: '' },
        { email: /admin|system|test|qr@/i },
      ],
    });

    const existingQrCodesCount = await QrCode.countDocuments();

    console.log('\n📊 ESTADO ACTUAL:');
    console.log(
      `   📁 QR Codes antiguos a migrar/eliminar: ${oldRecordsCount}`
    );
    console.log(`   📱 QR Codes en nuevo modelo: ${existingQrCodesCount}`);

    if (oldRecordsCount === 0) {
      console.log('\n❌ No hay QR Codes antiguos para migrar y eliminar');
      process.exit(0);
    }

    console.log(
      '\n⚠️  ATENCIÓN: Este script MIGRARÁ y luego ELIMINARÁ los QR codes antiguos'
    );
    console.log('🔄 ¿Continuar con migración y ELIMINACIÓN? (s/n)');

    process.stdin.setEncoding('utf8');
    process.stdin.once('data', async (input: Buffer) => {
      const userInput = input.toString().trim().toLowerCase();

      if (userInput !== 's') {
        console.log('❌ Proceso cancelado');
        process.exit(0);
      }

      await performMigrationAndCleanup(oldRecordsCount, OldPet);
    });
  } catch (error) {
    console.error('💥 Error:', error);
    process.exit(1);
  }
};

const loadOldPetModel = (): mongoose.Model<OldPetDocument> => {
  try {
    const oldPetModule = require('../models/old/pet');
    console.log('✅ Modelo antiguo cargado');
    return oldPetModule.default || oldPetModule;
  } catch (error) {
    console.log('❌ No se pudo cargar modelo antiguo, creando dinámico...');
    const oldPetSchema = new mongoose.Schema(
      {},
      {
        strict: false,
        collection: 'pets',
        timestamps: true,
      }
    );
    return mongoose.model<OldPetDocument>('OldPet', oldPetSchema);
  }
};

const performMigrationAndCleanup = async (
  totalRecords: number,
  OldPet: mongoose.Model<OldPetDocument>
): Promise<void> => {
  try {
    console.log(`\n🎯 FASE 1: Migrando ${totalRecords} QR Codes...`);

    // Obtener todos los QR codes a migrar
    const oldRecords = await OldPet.find(
      {
        randomCode: { $exists: true, $ne: null },
        $or: [
          { email: { $exists: false } },
          { email: null },
          { email: '' },
          { email: /admin|system|test|qr@/i },
        ],
      },
      {
        email: 1,
        randomCode: 1,
        isActivated: 1,
        stateActivation: 1,
        hostName: 1,
        createdAt: 1,
        updatedAt: 1,
      }
    ).lean();

    console.log(`📦 ${oldRecords.length} QR codes obtenidos para migración`);

    const stats: MigrationStats = {
      processed: 0,
      qrCodesCreated: 0,
      qrCodesUpdated: 0,
      qrCodesDeleted: 0,
      errors: 0,
    };

    // FASE 1: Migración
    const migratedCodes: string[] = [];

    for (const oldRecord of oldRecords) {
      try {
        // Verificar que randomCode existe antes de procesar
        if (!oldRecord.randomCode) {
          console.log(
            `\n📝 [${
              stats.processed + 1
            }/${totalRecords}] ❌ QR sin código, omitiendo...`
          );
          stats.processed++;
          continue;
        }

        console.log(
          `\n📝 [${stats.processed + 1}/${totalRecords}] Migrando: ${
            oldRecord.randomCode
          }`
        );

        // Verificar si ya existe este QR Code
        let qrCode = await QrCode.findOne({ randomCode: oldRecord.randomCode });

        if (qrCode) {
          console.log(`   ⚠️ Ya existe, actualizando...`);
          if (!qrCode.assignedTo) {
            // qrCode.status = getQRStatus(oldRecord);
            qrCode.status = 'available';
            qrCode.hostName = oldRecord.hostName;
            qrCode.updatedAt = new Date();
            await qrCode.save();
            stats.qrCodesUpdated++;
          } else {
            console.log(`   ⏭️ Ya asignado, omitiendo...`);
          }
        } else {
          // Crear nuevo QR Code
          qrCode = new QrCode({
            randomCode: oldRecord.randomCode,
            // status: getQRStatus(oldRecord),
            status: 'available',
            assignedTo: undefined,
            activatedBy: undefined,
            assignedPet: undefined,
            activationDate: oldRecord.isActivated
              ? oldRecord.updatedAt || new Date()
              : null,
            hostName: oldRecord.hostName,
            purchaseInfo: { price: 0, seller: 'sistema_antiguo' },
            createdAt: oldRecord.createdAt || new Date(),
            updatedAt: oldRecord.updatedAt || new Date(),
          });

          await qrCode.save();
          stats.qrCodesCreated++;
          console.log(`   ✅ Migrado: ${qrCode._id}`);
        }

        // Guardar código para posterior eliminación (ya verificamos que existe)
        migratedCodes.push(oldRecord.randomCode);
        stats.processed++;
      } catch (recordError) {
        console.error(`   ❌ Error migrando:`, recordError);
        stats.errors++;
        stats.processed++;
      }
    }

    // FASE 2: Eliminación de registros antiguos
    console.log('\n🗑️  FASE 2: Eliminando QR codes antiguos...');
    console.log(`   📋 ${migratedCodes.length} códigos a eliminar`);

    if (migratedCodes.length > 0) {
      try {
        // OPCIÓN 1: Eliminar solo los campos QR (mantener el registro)
        const resultPartial = await OldPet.updateMany(
          { randomCode: { $in: migratedCodes } },
          {
            $unset: {
              randomCode: '',
              isActivated: '',
              stateActivation: '',
              hostName: '',
            },
          }
        );

        console.log(
          `   ✅ Campos QR eliminados de ${resultPartial.modifiedCount} registros`
        );
        stats.qrCodesDeleted = resultPartial.modifiedCount;
      } catch (deleteError) {
        console.error(`   ❌ Error eliminando registros:`, deleteError);
      }
    }

    await showFinalSummary(stats, migratedCodes.length);
  } catch (error) {
    console.error('💥 Error durante el proceso:', error);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Conexión cerrada');
    process.exit(0);
  }
};

const getQRStatus = (oldRecord: OldPetDocument): string => {
  if (oldRecord.isActivated && oldRecord.stateActivation === 'Terminado') {
    return 'assigned';
  } else if (oldRecord.isActivated) {
    return 'assigned';
  } else {
    return 'available';
  }
};

const showFinalSummary = async (
  stats: MigrationStats,
  totalToDelete: number
): Promise<void> => {
  console.log('\n🎉 PROCESO COMPLETADO');
  console.log('='.repeat(50));
  console.log(`📊 RESUMEN MIGRACIÓN:`);
  console.log(`   ✅ QR Codes creados: ${stats.qrCodesCreated}`);
  console.log(`   🔄 QR Codes actualizados: ${stats.qrCodesUpdated}`);
  console.log(`   📝 Procesados: ${stats.processed}`);
  console.log(`   ❌ Errores: ${stats.errors}`);

  console.log(`\n🗑️  RESUMEN ELIMINACIÓN:`);
  console.log(
    `   ✅ Registros limpiados: ${stats.qrCodesDeleted}/${totalToDelete}`
  );

  // Verificar estado final
  const finalQrCount = await QrCode.countDocuments();
  const availableQrCount = await QrCode.countDocuments({
    status: 'available',
    assignedTo: { $exists: false },
  });

  console.log(`\n📈 ESTADO FINAL:`);
  console.log(`   📱 Total QR Codes en nuevo modelo: ${finalQrCount}`);
  console.log(`   📦 Disponibles para venta: ${availableQrCount}`);

  console.log(
    '\n💡 Los QR codes ahora están solo en el nuevo modelo y listos para ventas'
  );
};

// Manejar errores no capturados
process.on('unhandledRejection', (error) => {
  console.error('💥 Error no manejado:', error);
  process.exit(1);
});

process.on('uncaughtException', (error) => {
  console.error('💥 Excepción no capturada:', error);
  process.exit(1);
});

migrateAndCleanOldQRCodes();
