// scripts/fixEmailIndex.js
require('dotenv').config();
const mongoose = require('mongoose');
const Pet = require('../models/Pet'); // Ajusta la ruta

const fixEmailIndex = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // 1. Encontrar documentos con email null o vacío
    const problematicDocs = await Pet.find({
      $or: [{ email: null }, { email: '' }, { email: { $exists: false } }],
    });

    console.log(
      `📊 Found ${problematicDocs.length} documents with email issues`
    );

    // 2. Actualizar documentos problemáticos
    if (problematicDocs.length > 0) {
      console.log('🔄 Fixing problematic documents...');

      for (const doc of problematicDocs) {
        // Generar un email temporal único
        const tempEmail = `temp-${doc._id.toString()}@fixed.com`;
        await Pet.updateOne({ _id: doc._id }, { $set: { email: tempEmail } });
        console.log(`✅ Fixed document ${doc._id} with email: ${tempEmail}`);
      }
    }

    // 3. Eliminar el índice problemático
    console.log('🗑️ Removing problematic index...');
    try {
      await Pet.collection.dropIndex('email_1');
      console.log('✅ Index email_1 removed');
    } catch (error) {
      console.log('ℹ️ Index email_1 already removed or does not exist');
    }

    // 4. Crear nuevo índice con sparse para permitir nulls
    console.log('🔨 Creating new sparse index...');
    await Pet.collection.createIndex(
      { email: 1 },
      {
        unique: true,
        sparse: true,
        name: 'email_sparse_unique',
      }
    );
    console.log('✅ Sparse unique index created for email');

    console.log('🎉 Email index fix completed successfully!');
  } catch (error) {
    console.error('❌ Error fixing email index:', error);
  } finally {
    await mongoose.connection.close();
  }
};

fixEmailIndex();
