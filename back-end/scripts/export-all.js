const MongoDBExporter = require('./export-mongo-json');
require('dotenv').config();

async function exportAllCollections() {
  // Configuración - RELLENA CON TUS DATOS REALES
  const connectionString = process.env.BD_CONNECTION_STRING;
  const databaseName = process.env.BD_NAME;

  const exporter = new MongoDBExporter(connectionString, databaseName);

  try {
    console.log('🚀 Iniciando exportación de TODAS las colecciones...');
    await exporter.exportAllCollections('./mongo_exports');
    console.log('✅ Exportación completada exitosamente!');
  } catch (error) {
    console.error('❌ Error en la exportación:', error.message);
  } finally {
    await exporter.close();
  }
}

// Ejecutar si es el archivo principal
if (require.main === module) {
  exportAllCollections();
}

module.exports = exportAllCollections;
