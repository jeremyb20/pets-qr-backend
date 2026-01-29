const { MongoClient } = require('mongodb');
const fs = require('fs');
const path = require('path');

class MongoDBExporter {
  constructor(connectionString, databaseName) {
    this.connectionString = connectionString;
    this.databaseName = databaseName;
    this.client = new MongoClient(this.connectionString);
  }

  async connect() {
    try {
      await this.client.connect();
      console.log('✅ Conectado a MongoDB Atlas');
      return this.client.db(this.databaseName);
    } catch (error) {
      console.error('❌ Error conectando a MongoDB:', error);
      throw error;
    }
  }

  async exportCollection(collectionName, outputPath = null) {
    try {
      const db = await this.connect();
      const collection = db.collection(collectionName);

      // Obtener todos los documentos
      console.log(`📥 Exportando colección: ${collectionName}`);
      const documents = await collection.find({}).toArray();

      // Crear nombre de archivo
      const fileName =
        outputPath || `${collectionName}_export_${Date.now()}.json`;

      // Escribir archivo JSON
      fs.writeFileSync(fileName, JSON.stringify(documents, null, 2));
      console.log(
        `✅ Exportación completada: ${documents.length} documentos guardados en ${fileName}`
      );

      return { fileName, count: documents.length };
    } catch (error) {
      console.error(`❌ Error exportando ${collectionName}:`, error);
      throw error;
    }
  }

  async exportAllCollections(outputDir = './exports') {
    try {
      const db = await this.connect();

      // Crear directorio de exportación
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }

      // Obtener todas las colecciones
      const collections = await db.listCollections().toArray();
      console.log(`📚 Encontradas ${collections.length} colecciones`);

      const results = [];

      for (const collectionInfo of collections) {
        const collectionName = collectionInfo.name;

        // Saltar colecciones del sistema
        if (collectionName.startsWith('system.')) {
          console.log(`⏭️  Saltando colección del sistema: ${collectionName}`);
          continue;
        }

        const result = await this.exportCollection(
          collectionName,
          path.join(outputDir, `${collectionName}.json`)
        );
        results.push(result);
      }

      console.log('\n📊 Resumen de exportación:');
      results.forEach((result) => {
        console.log(`   📄 ${result.fileName}: ${result.count} documentos`);
      });

      return results;
    } catch (error) {
      console.error('❌ Error en exportación general:', error);
      throw error;
    }
  }

  async close() {
    await this.client.close();
    console.log('🔌 Conexión cerrada');
  }
}

// USO DEL SCRIPT
async function main() {
  // Configuración - RELLENA ESTOS DATOS
  const connectionString = process.env.BD_URL;
  const databaseName = process.env.BD_NAME;

  const exporter = new MongoDBExporter(connectionString, databaseName);

  try {
    // Opción 1: Exportar una colección específica
    await exporter.exportCollection('usuarios', './usuarios_export.json');

    // Opción 2: Exportar TODAS las colecciones
    // await exporter.exportAllCollections('./mongo_exports');
  } catch (error) {
    console.error('Error en el proceso:', error);
  } finally {
    await exporter.close();
  }
}

// Ejecutar solo si es el archivo principal
if (require.main === module) {
  main();
}

module.exports = MongoDBExporter;
