"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const morgan_1 = __importDefault(require("morgan"));
const dotenv_1 = __importDefault(require("dotenv"));
const database_1 = require("./config/database");
// Importar modelos para que Sequelize los registre
require("./models/User");
require("./models/Category");
require("./models/Supplier");
require("./models/Product");
require("./models/EntradaInventario");
require("./models/DetalleEntrada");
require("./models/SalidaInventario");
require("./models/DetalleSalida");
require("./models/MovimientoInventario");
// Importar rutas
const auth_routes_1 = __importDefault(require("./routes/auth.routes"));
const user_routes_1 = __importDefault(require("./routes/user.routes"));
const product_routes_1 = __importDefault(require("./routes/product.routes"));
const category_routes_1 = __importDefault(require("./routes/category.routes"));
const supplier_routes_1 = __importDefault(require("./routes/supplier.routes"));
const entrada_routes_1 = __importDefault(require("./routes/entrada.routes"));
const salida_routes_1 = __importDefault(require("./routes/salida.routes"));
const movimiento_routes_1 = __importDefault(require("./routes/movimiento.routes"));
const analytics_routes_1 = __importDefault(require("./routes/analytics.routes"));
const twoFactorAuth_routes_1 = __importDefault(require("./routes/twoFactorAuth.routes"));
const sales_routes_1 = __importDefault(require("./routes/sales.routes"));
const search_routes_1 = __importDefault(require("./routes/search.routes"));
// Cargar variables de entorno
dotenv_1.default.config();
const app = (0, express_1.default)();
const PORT = process.env.PORT || 3001;
const allowedOrigins = (process.env.FRONTEND_URL || 'http://localhost:3000')
    .split(',')
    .map(origin => origin.trim())
    .filter(Boolean);
// Middlewares
app.use((0, cors_1.default)({
    origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin)) {
            return callback(null, true);
        }
        return callback(new Error(`Origin ${origin} not allowed by CORS`));
    },
    credentials: true
}));
app.use((0, morgan_1.default)('dev'));
app.use(express_1.default.json({ limit: '50mb' }));
app.use(express_1.default.urlencoded({ extended: true, limit: '50mb' }));
// Rutas
app.use('/api/auth', auth_routes_1.default);
app.use('/api/users', user_routes_1.default);
app.use('/api/products', product_routes_1.default);
app.use('/api/categories', category_routes_1.default);
app.use('/api/suppliers', supplier_routes_1.default);
app.use('/api/inventory/entries', entrada_routes_1.default);
app.use('/api/inventory/exits', salida_routes_1.default);
app.use('/api/inventory/movements', movimiento_routes_1.default);
app.use('/api/analytics', analytics_routes_1.default);
app.use('/api/2fa', twoFactorAuth_routes_1.default);
app.use('/api/sales', sales_routes_1.default);
app.use('/api/search', search_routes_1.default);
// Ruta de salud
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', message: 'API funcionando correctamente' });
});
// Sincronizar base de datos y iniciar servidor
const startServer = async () => {
    try {
        await database_1.sequelize.authenticate();
        console.log('✅ Conexión a la base de datos establecida correctamente.');
        // Sincronizar modelos (crear tablas si no existen)
        await database_1.sequelize.sync({ alter: true });
        console.log('✅ Modelos sincronizados con la base de datos.');
        app.listen(PORT, () => {
            console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
        });
    }
    catch (error) {
        console.error('❌ Error al iniciar el servidor:', error);
        process.exit(1);
    }
};
startServer();
exports.default = app;
