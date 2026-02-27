// Importar modelos
import User from './User';
import Category from './Category';
import Product from './Product';
import Supplier from './Supplier';
import EntradaInventario from './EntradaInventario';
import DetalleEntrada from './DetalleEntrada';
import SalidaInventario from './SalidaInventario';
import DetalleSalida from './DetalleSalida';
import MovimientoInventario from './MovimientoInventario';
import Alert from './Alert';

// Exportar modelos
export {
  User,
  Category,
  Product,
  Supplier,
  EntradaInventario,
  DetalleEntrada,
  SalidaInventario,
  DetalleSalida,
  MovimientoInventario,
  Alert
};

// Exportar tipos
export * from './User';
export * from './Category';
export * from './Product';
export * from './Supplier';
export * from './EntradaInventario';
export * from './DetalleEntrada';
export * from './SalidaInventario';
export * from './DetalleSalida';
export * from './MovimientoInventario';
export * from './Alert';

// Definir asociaciones adicionales
Product.hasMany(Alert, { foreignKey: 'product_id', as: 'alerts' });
User.hasMany(Alert, { foreignKey: 'user_id', as: 'alerts' });
