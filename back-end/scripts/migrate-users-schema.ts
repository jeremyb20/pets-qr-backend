import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

mongoose.set('strictQuery', false);

interface UserDocument extends mongoose.Document {
  _id: mongoose.Types.ObjectId;
  permissions?: any;
  configuration?: any;
  email: string;
  createdAt?: Date;
  updatedAt?: Date;
}

interface MigrationStats {
  processed: number;
  usersUpdated: number;
  errors: number;
}

const migratePermissionsToConfiguration = async (): Promise<void> => {
  try {
    console.log('🚀 Iniciando migración de permissions a configuration...');
    console.log(
      '⚠️  ATENCIÓN: Este script moverá permissions a configuration.permissions'
    );

    const dbUri =
      process.env.BD_URL || 'mongodb://localhost:27017/tu_base_de_datos';
    await mongoose.connect(dbUri);

    console.log('✅ Conectado a MongoDB');

    let UserModel;
    try {
      UserModel = mongoose.model<UserDocument>('User');
      console.log('✅ Modelo User cargado exitosamente');
    } catch (error) {
      console.log('⚠️ Creando modelo dinámico...');
      const userSchema = new mongoose.Schema(
        {},
        {
          strict: false,
          collection: 'users',
          timestamps: true,
        }
      );
      UserModel = mongoose.model<UserDocument>('User', userSchema);
    }

    // Buscar usuarios que tienen permissions en el nivel principal
    const usersWithPermissions = await UserModel.countDocuments({
      permissions: { $exists: true, $ne: null },
    });

    console.log(
      `📊 Usuarios con permissions a migrar: ${usersWithPermissions}`
    );

    if (usersWithPermissions === 0) {
      console.log('\n✅ No hay permissions para migrar');
      process.exit(0);
    }

    console.log('\n⚠️  Este script:');
    console.log('   1. Moverá permissions a configuration.permissions');
    console.log('   2. ELIMINARÁ permissions del nivel principal');
    console.log('🔄 ¿Continuar con la migración? (s/n)');

    process.stdin.setEncoding('utf8');
    process.stdin.once('data', async (input: Buffer) => {
      const userInput = input.toString().trim().toLowerCase();

      if (userInput !== 's') {
        console.log('❌ Proceso cancelado');
        process.exit(0);
      }

      await performPermissionsMigration(usersWithPermissions, UserModel);
    });
  } catch (error) {
    console.error('💥 Error:', error);
    process.exit(1);
  }
};

const performPermissionsMigration = async (
  totalUsers: number,
  UserModel: mongoose.Model<UserDocument>
): Promise<void> => {
  try {
    console.log(`\n🎯 Migrando ${totalUsers} usuarios...`);

    // Obtener usuarios con permissions
    const users = await UserModel.find({
      permissions: { $exists: true, $ne: null },
    }).lean();

    console.log(`📦 ${users.length} usuarios con permissions encontrados`);

    const stats: MigrationStats = {
      processed: 0,
      usersUpdated: 0,
      errors: 0,
    };

    for (const user of users) {
      try {
        console.log(
          `\n👤 [${stats.processed + 1}/${totalUsers}] Migrando: ${user.email}`
        );

        // Verificar si ya tiene configuration.permissions para no sobrescribir
        const hasExistingConfigPermissions = user.configuration?.permissions;

        if (!hasExistingConfigPermissions && user.permissions) {
          const result = await UserModel.updateOne(
            { _id: user._id },
            {
              $set: {
                'configuration.permissions': user.permissions,
              },
              $unset: {
                permissions: '',
              },
            }
          );

          if (result.modifiedCount > 0) {
            stats.usersUpdated++;
            console.log(
              `   ✅ Permissions movidos a configuration.permissions`
            );
            console.log(`   🗑️  Permissions eliminado del nivel principal`);
          } else {
            console.log(`   ⏭️ Sin cambios necesarios`);
          }
        } else if (hasExistingConfigPermissions) {
          console.log(`   ⏭️ Ya tiene configuration.permissions, omitiendo...`);
        } else {
          console.log(`   ⏭️ No hay permissions para migrar`);
        }

        stats.processed++;
      } catch (userError) {
        console.error(`   ❌ Error migrando usuario ${user.email}:`, userError);
        stats.errors++;
        stats.processed++;
      }
    }

    await showFinalSummary(stats);
  } catch (error) {
    console.error('💥 Error durante el proceso:', error);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Conexión cerrada');
    process.exit(0);
  }
};

const showFinalSummary = async (stats: MigrationStats): Promise<void> => {
  console.log('\n🎉 MIGRACIÓN DE PERMISSIONS COMPLETADA');
  console.log('='.repeat(50));
  console.log(`📊 RESUMEN:`);
  console.log(`   👥 Usuarios procesados: ${stats.processed}`);
  console.log(`   ✅ Usuarios actualizados: ${stats.usersUpdated}`);
  console.log(`   ❌ Errores: ${stats.errors}`);

  console.log('\n💡 Estructura final:');
  console.log('   ⚙️ configuration: {');
  console.log('        theme: { ... }');
  console.log('        permissions: {');
  console.log('          showPhoneInfo: true,');
  console.log('          showEmailInfo: true,');
  console.log('          showPersonalInfo: true');
  console.log('        }');
  console.log('      }');
  console.log('   🗑️  Permissions eliminado del nivel principal');
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

migratePermissionsToConfiguration();
