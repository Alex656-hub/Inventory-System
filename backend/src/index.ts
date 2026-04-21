import express, { Application } from 'express';
import cors from 'cors';
import morgan from 'morgan';
import dotenv from 'dotenv';
import { sequelize } from './config/database';
import User from './models/User';
import Category from './models/Category';
import Product from './models/Product';
import Supplier from './models/Supplier';
import Alert from './models/Alert';
import UnidadMedida from './models/UnidadMedida';
import ConfiguracionSistema from './models/ConfiguracionSistema';
import './models/EntradaInventario';
import './models/DetalleEntrada';
import './models/SalidaInventario';
import './models/DetalleSalida';
import './models/MovimientoInventario';
import Sede from './models/Sede';
import Almacen from './models/Almacen';

// Importar rutas
import authRoutes from './routes/auth.routes';
import userRoutes from './routes/user.routes';
import productRoutes from './routes/product.routes';
import categoryRoutes from './routes/category.routes';
import supplierRoutes from './routes/supplier.routes';
import unidadmedidaRoutes from './routes/unidadmedida.routes';
import entradaRoutes from './routes/entrada.routes';
import salidaRoutes from './routes/salida.routes';
import movimientoRoutes from './routes/movimiento.routes';
import analyticsRoutes from './routes/analytics.routes';
import twoFactorRoutes from './routes/twoFactorAuth.routes';
import salesRoutes from './routes/sales.routes';
import searchRoutes from './routes/search.routes';
import alertsRoutes from './routes/alerts.routes';
import reportRoutes from './routes/report.routes';
import configuracionRoutes from './routes/configuracion.routes';
import sedeRoutes from './routes/sede.routes';
import almacenRoutes from './routes/almacen.routes';

// Cargar variables de entorno
dotenv.config();

const app: Application = express();
const PORT = process.env.PORT || 3001;
const allowedOrigins = (process.env.FRONTEND_URL || 'http://localhost:3000')
  .split(',')
  .map(origin => origin.trim())
  .filter(Boolean);

// Middlewares
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    return callback(new Error(`Origin ${origin} not allowed by CORS`));
  },
  credentials: true
}));
app.use(morgan('dev'));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Rutas
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/products', productRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/suppliers', supplierRoutes);
app.use('/api/unidades', unidadmedidaRoutes);
app.use('/api/inventory/entries', entradaRoutes);
app.use('/api/inventory/exits', salidaRoutes);
app.use('/api/inventory/movements', movimientoRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/2fa', twoFactorRoutes);
app.use('/api/sales', salesRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/alerts', alertsRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/configuracion', configuracionRoutes);
app.use('/api/sedes', sedeRoutes);
app.use('/api/almacenes', almacenRoutes);

// Ruta de salud
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'API funcionando correctamente' });
});

// Sincronizar base de datos y iniciar servidor
const startServer = async () => {
  try {
    await sequelize.authenticate();
    console.log('✅ Conexión a la base de datos establecida correctamente.');
    
    // En producción, evita alterar el esquema automáticamente.
    // Usa migraciones; en dev puedes habilitar sync con un flag explícito.
    const enableDbSync = process.env.ENABLE_DB_SYNC === 'true';
    if (enableDbSync) {
      const alter = process.env.DB_SYNC_ALTER === 'true';
      await sequelize.sync({ alter });
      console.log(`✅ Modelos sincronizados con la base de datos (alter=${alter}).`);
    } else {
      console.log('ℹ️  DB sync deshabilitado (ENABLE_DB_SYNC!=true).');
    }
    
    // Crear configuración por defecto si no existe
    try {
      await ConfiguracionSistema.findOrCreate({
        where: {},
        defaults: {
          ruc: '',
          direccion: '',
        }
      });
    } catch (error) {
      console.log('⚠️ Error al crear configuración por defecto:', error);
    }
    
    app.listen(PORT, () => {
      console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('❌ Error al iniciar el servidor:', error);
    process.exit(1);
  }
};

startServer();

export default app;

