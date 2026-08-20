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
import Recommendation from './Recommendation';
import UnidadMedida from './UnidadMedida';
import ConfiguracionSistema from './ConfiguracionSistema';
import Sede from './Sede';
import Almacen from './Almacen';
import Personal from './Personal';
import RefreshToken from './RefreshToken';
import Client from './Client';
import OperacionStock from './OperacionStock';
import StockPorSede from './StockPorSede';
import DetalleOperacion from './DetalleOperacion';
import DailySale from './sales';
import CuotaPago from './CuotaPago';
import Descuento from './Descuento';

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
  Alert,
  Recommendation,
  UnidadMedida,
  ConfiguracionSistema,
  Sede,
  Almacen,
  Personal,
  RefreshToken,
  Client,
  OperacionStock,
  StockPorSede,
  DetalleOperacion,
  DailySale,
  CuotaPago,
  Descuento
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
export * from './Recommendation';
export * from './UnidadMedida';
export * from './ConfiguracionSistema';
export * from './Sede';
export * from './Almacen';
export * from './Personal';
export * from './CuotaPago';
export * from './Descuento';

// Definir asociaciones adicionales
Product.hasMany(Alert, { foreignKey: 'product_id', as: 'alerts' });
User.hasMany(Alert, { foreignKey: 'user_id', as: 'alerts' });
Product.hasMany(Recommendation, { foreignKey: 'product_id', as: 'recommendations' });
Alert.hasMany(Recommendation, { foreignKey: 'alert_id', as: 'recommendations' });
User.hasMany(Recommendation, { foreignKey: 'user_id', as: 'recommendations' });

// Cuotas - SalidaInventario associations
SalidaInventario.hasMany(CuotaPago, { foreignKey: 'salida_id', as: 'cuotas' });
// Cuotas - OperacionStock associations
OperacionStock.hasMany(CuotaPago, { foreignKey: 'operacion_id', as: 'cuotasOperacion' });
