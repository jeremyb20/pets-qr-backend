import app from './app';
import mongoose from 'mongoose';
import dotenv from 'dotenv';

// Configurar variables de entorno
dotenv.config();

// Configuración de Mongoose
mongoose.set('strictQuery', false);

const connectDB = async (): Promise<void> => {
  try {
    // En Mongoose 8.x, ya no se necesitan useNewUrlParser y useUnifiedTopology
    await mongoose.connect(process.env.BD_URL!);

    console.log('✅ DB Connected to', mongoose.connection.name);
    console.log(`📊 Database: ${mongoose.connection.db?.databaseName}`);
    console.log(
      `🔗 Host: ${mongoose.connection.host}:${mongoose.connection.port}`
    );

    // Manejar eventos de conexión
    mongoose.connection.on('error', (error) => {
      console.error('❌ MongoDB connection error:', error);
    });

    mongoose.connection.on('disconnected', () => {
      console.log('⚠️ MongoDB disconnected');
    });

    mongoose.connection.on('reconnected', () => {
      console.log('✅ MongoDB reconnected');
    });
  } catch (error) {
    console.error('❌ Error connecting to MongoDB:', error);
    process.exit(1);
  }
};

const startServer = async (): Promise<void> => {
  try {
    // Conectar a la base de datos primero
    await connectDB();

    // Iniciar servidor
    const port = parseInt(process.env.PORT || '8080', 10);

    const server = app.listen(port, '0.0.0.0', () => {
      console.log('\n🚀 Server started successfully');
      console.log(`📍 Port: ${port}`);
      console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`🕒 Started at: ${new Date().toISOString()}`);
      console.log(`🔗 Health check: http://localhost:${port}/health`);
      console.log('──────────────────────────────────────────────');
    });

    // Manejo graceful de shutdown
    const gracefulShutdown = (signal: string): void => {
      console.log(`\n🛑 Received ${signal}. Starting graceful shutdown...`);

      server.close((err) => {
        if (err) {
          console.error('❌ Error during server shutdown:', err);
          process.exit(1);
        }

        console.log('✅ HTTP server closed.');

        // mongoose.connection.close(false, () => {
        //   console.log('✅ MongoDB connection closed.');
        //   console.log('👋 Graceful shutdown completed.');
        //   process.exit(0);
        // });
      });

      // Force close after 10 seconds
      setTimeout(() => {
        console.log('⏰ Forcing shutdown after timeout...');
        process.exit(1);
      }, 10000);
    };

    // Manejar señales de terminación
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGUSR2', () => gracefulShutdown('SIGUSR2')); // Para nodemon

    // Manejar unhandled rejections
    process.on('unhandledRejection', (reason, promise) => {
      console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
      gracefulShutdown('UNHANDLED_REJECTION');
    });

    // Manejar uncaught exceptions
    process.on('uncaughtException', (error) => {
      console.error('❌ Uncaught Exception:', error);
      gracefulShutdown('UNCAUGHT_EXCEPTION');
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

// Iniciar la aplicación
startServer().catch(console.error);
