"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MovimientoInventario = exports.DetalleSalida = exports.SalidaInventario = exports.DetalleEntrada = exports.EntradaInventario = exports.Supplier = exports.Product = exports.Category = exports.User = void 0;
// Importar modelos
const User_1 = __importDefault(require("./User"));
exports.User = User_1.default;
const Category_1 = __importDefault(require("./Category"));
exports.Category = Category_1.default;
const Product_1 = __importDefault(require("./Product"));
exports.Product = Product_1.default;
const Supplier_1 = __importDefault(require("./Supplier"));
exports.Supplier = Supplier_1.default;
const EntradaInventario_1 = __importDefault(require("./EntradaInventario"));
exports.EntradaInventario = EntradaInventario_1.default;
const DetalleEntrada_1 = __importDefault(require("./DetalleEntrada"));
exports.DetalleEntrada = DetalleEntrada_1.default;
const SalidaInventario_1 = __importDefault(require("./SalidaInventario"));
exports.SalidaInventario = SalidaInventario_1.default;
const DetalleSalida_1 = __importDefault(require("./DetalleSalida"));
exports.DetalleSalida = DetalleSalida_1.default;
const MovimientoInventario_1 = __importDefault(require("./MovimientoInventario"));
exports.MovimientoInventario = MovimientoInventario_1.default;
// Exportar tipos
__exportStar(require("./User"), exports);
__exportStar(require("./Category"), exports);
__exportStar(require("./Product"), exports);
__exportStar(require("./Supplier"), exports);
__exportStar(require("./EntradaInventario"), exports);
__exportStar(require("./DetalleEntrada"), exports);
__exportStar(require("./SalidaInventario"), exports);
__exportStar(require("./DetalleSalida"), exports);
__exportStar(require("./MovimientoInventario"), exports);
