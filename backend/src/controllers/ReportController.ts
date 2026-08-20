// backend/src/controllers/ReportController.ts
import { Request, Response } from 'express';
import { Op } from 'sequelize';
import { ReportService } from '../services/ReportService';
import { ReportParams, DemandForecastReportData, StockMovementsReportData, FinancialKpisReportData } from '../types/reports';
import { advancedDemandForecasting } from '../analytics/services/advancedDemandForecasting';
import { getInventoryMetrics } from '../analytics/services/inventoryAnalysis';
import { getFinancialProjections } from '../analytics/services/financialProjections';
import Product from '../models/Product';
import MovimientoInventario from '../models/MovimientoInventario';
import User from '../models/User';
import StockPorSede from '../models/StockPorSede';
import Sede from '../models/Sede';
import Almacen from '../models/Almacen';
import UnidadMedida from '../models/UnidadMedida';
import Category from '../models/Category';
import { descuentoService } from '../services/descuentoService';
import { esPromoActiva, calcularPrecioPromo } from '../analytics/services/promotionUtils';

const reportService = new ReportService();

const fmtSoles = (value: number): string =>
  `S/ ${value.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export const generateReport = async (req: Request, res: Response) => {
  try {
    const params: ReportParams = req.body;

    if (!params.type || !params.format) {
      return res.status(400).json({ message: 'Type and format are required' });
    }

    let data: any;

    // Obtener datos según tipo
    if (params.type === 'inventory_status') {
      const products = await Product.findAll({
        where: { activo: true },
        include: [{ model: require('../models/Category').default, as: 'categoria' }]
      });

      data = {
        products: products.map(p => ({
          id: p.id,
          name: p.nombre,
          stock_actual: p.stock_actual,
          stock_minimo: p.stock_minimo,
          category: p.categoria?.nombre || 'Sin categoría'
        })),
        generatedAt: new Date()
      };
    } else if (params.type === 'demand_forecast') {
      const products = await Product.findAll({
        where: { activo: true },
        order: [['stock_actual', 'DESC']],
        limit: 50,
        include: [{ model: require('../models/Category').default, as: 'categoria', attributes: ['nombre'] }]
      });

      const productos: DemandForecastReportData['productos'] = [];
      for (const p of products) {
        try {
          const forecast = await advancedDemandForecasting.getAdvancedForecast(p.id, 30);
          const historial = (forecast.historicalData || []).slice(-5);
          productos.push({
            id: p.id,
            codigo: p.codigo,
            nombre: p.nombre,
            categoria: p.categoria?.nombre || 'Sin categoría',
            ventas_30d: historial.reduce((s, h) => s + h.quantity, 0),
            pronostico_30d: forecast.forecast.reduce((s, f) => s + f.predicted, 0),
            limite_inferior: forecast.forecast.reduce((s, f) => s + f.lower, 0),
            limite_superior: forecast.forecast.reduce((s, f) => s + f.upper, 0),
            mape: typeof forecast.mape === 'number' ? forecast.mape : null
          });
        } catch {
          productos.push({
            id: p.id,
            codigo: p.codigo,
            nombre: p.nombre,
            categoria: p.categoria?.nombre || 'Sin categoría',
            ventas_30d: 0,
            pronostico_30d: 0,
            limite_inferior: 0,
            limite_superior: 0,
            mape: null
          });
        }
      }

      data = {
        productos,
        periodo: 5,
        generatedAt: new Date()
      } as DemandForecastReportData;
    } else if (params.type === 'stock_movements') {
      const where: any = {};

      if (params.startDate || params.endDate) {
        where.fecha = {};
        if (params.startDate) where.fecha[Op.gte] = String(params.startDate);
        if (params.endDate) where.fecha[Op.lte] = String(params.endDate);
      } else {
        where.fecha = { [Op.gte]: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) };
      }

      const movimientos = await MovimientoInventario.findAll({
        where,
        include: [
          { model: Product, as: 'producto', attributes: ['codigo', 'nombre'] },
          { model: User, as: 'usuario', attributes: ['usuario', 'email'] }
        ],
        order: [['fecha', 'DESC']],
        limit: 1000
      });

      const filas: StockMovementsReportData['movimientos'] = movimientos.map(m => ({
        id: m.id,
        fecha: m.fecha,
        tipo_movimiento: m.tipo_movimiento,
        tipo_referencia: m.tipo_referencia,
        referencia_id: m.referencia_id,
        codigo: m.producto?.codigo || '-',
        producto: m.producto?.nombre || '-',
        cantidad: m.cantidad,
        precio_unitario: Number(m.precio_unitario) || 0,
        stock_anterior: m.stock_anterior,
        stock_nuevo: m.stock_nuevo,
        usuario: m.usuario?.usuario || m.usuario?.email || '-',
        motivo: m.motivo
      }));

      data = {
        movimientos: filas,
        desde: params.startDate ? String(params.startDate) : undefined,
        hasta: params.endDate ? String(params.endDate) : undefined,
        totalEntradas: filas
          .filter(f => f.tipo_movimiento === 'entrada')
          .reduce((s, f) => s + f.cantidad, 0),
        totalSalidas: filas
          .filter(f => f.tipo_movimiento === 'salida')
          .reduce((s, f) => s + f.cantidad, 0),
        generatedAt: new Date()
      } as StockMovementsReportData;
    } else if (params.type === 'financial_kpis') {
      const [metrics, proyecciones] = await Promise.all([
        getInventoryMetrics(),
        getFinancialProjections(6)
      ]);

      const kpis: FinancialKpisReportData['kpis'] = [
        { clave: 'totalProducts', descripcion: 'Total de productos', valor: String(metrics.totalProducts) },
        { clave: 'totalInventoryValue', descripcion: 'Valor total del inventario', valor: fmtSoles(metrics.totalInventoryValue) },
        { clave: 'inventoryTurnover', descripcion: 'Rotación de inventario', valor: `${metrics.inventoryTurnover}x` },
        { clave: 'daysSalesOfInventory', descripcion: 'Días de inventario', valor: `${metrics.daysSalesOfInventory} días` },
        { clave: 'grossMargin', descripcion: 'Margen bruto', valor: `${metrics.grossMargin}%` },
        { clave: 'lowStockItems', descripcion: 'Productos con stock bajo', valor: String(metrics.lowStockItems) },
        { clave: 'outOfStockItems', descripcion: 'Productos agotados', valor: String(metrics.outOfStockItems) },
        { clave: 'stockoutRate', descripcion: 'Tasa de agotamiento', valor: `${metrics.stockoutRate}%` },
        { clave: 'carryingCost', descripcion: 'Costo de mantenimiento (25%)', valor: fmtSoles(metrics.carryingCost) },
        { clave: 'slowMovingItems', descripcion: 'Productos de lento movimiento', valor: String(metrics.slowMovingItems) },
        { clave: 'averageStockValue', descripcion: 'Valor promedio por producto', valor: fmtSoles(metrics.averageStockValue) }
      ];

      data = {
        kpis,
        proyecciones: proyecciones.map(p => ({
          date: p.date,
          projectedRevenue: p.projectedRevenue,
          projectedExpenses: p.projectedExpenses,
          projectedProfit: p.projectedProfit
        })),
        generatedAt: new Date()
      } as FinancialKpisReportData;
    } else {
      return res.status(400).json({ message: 'Report type not implemented yet' });
    }

    let buffer: Buffer;
    switch (params.type) {
      case 'demand_forecast':
        buffer = params.format === 'pdf'
          ? await reportService.generateDemandForecastPDF(data)
          : await reportService.generateDemandForecastExcel(data);
        break;
      case 'stock_movements':
        buffer = params.format === 'pdf'
          ? await reportService.generateStockMovementsPDF(data)
          : await reportService.generateStockMovementsExcel(data);
        break;
      case 'financial_kpis':
        buffer = params.format === 'pdf'
          ? await reportService.generateFinancialKpisPDF(data)
          : await reportService.generateFinancialKpisExcel(data);
        break;
      default:
        buffer = params.format === 'pdf'
          ? await reportService.generatePDF(params.type, params, data)
          : await reportService.generateExcel(params.type, params, data);
    }

    res.setHeader('Content-Type', params.format === 'pdf' ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${params.type}.${params.format}"`);
    res.send(buffer);
  } catch (error) {
    console.error('Error generating report:', error);
    res.status(500).json({ message: 'Error generating report' });
  }
};

export const generateKardexPDF = async (req: Request, res: Response) => {
  try {
    const { producto_id, fecha_desde, fecha_hasta } = req.body;

    if (!producto_id || !fecha_desde || !fecha_hasta) {
      return res.status(400).json({ message: 'Producto, fecha_desde y fecha_hasta son requeridos' });
    }

    // Obtener datos del producto
    const producto = await Product.findByPk(producto_id, {
      include: [
        { model: Category, as: 'categoria', attributes: ['nombre'] }
      ]
    });

    if (!producto) {
      return res.status(404).json({ message: 'Producto no encontrado' });
    }

    // Obtener movimientos del producto en el período
    const movimientos = await MovimientoInventario.findAll({
      where: {
        producto_id,
        fecha: {
          [Op.gte]: fecha_desde,
          [Op.lte]: fecha_hasta
        }
      },
      order: [['fecha', 'ASC'], ['id', 'ASC']]
    });

    // Calcular kardex (método promedio)
    let stockAcumulado = 0;
    let costoAcumulado = 0;
    let totalEntradas = 0;
    let totalSalidas = 0;

    const kardex = movimientos.map((mov) => {
      let costoUnitario = 0;

      if (mov.tipo_movimiento === 'entrada') {
        stockAcumulado += mov.cantidad;
        costoAcumulado += mov.cantidad * Number(mov.precio_unitario);
        costoUnitario = stockAcumulado > 0 ? costoAcumulado / stockAcumulado : Number(mov.precio_unitario);
        totalEntradas += mov.cantidad;
      } else if (mov.tipo_movimiento === 'salida') {
        costoUnitario = stockAcumulado > 0 ? costoAcumulado / stockAcumulado : Number(mov.precio_unitario);
        stockAcumulado -= mov.cantidad;
        costoAcumulado -= mov.cantidad * costoUnitario;
        totalSalidas += mov.cantidad;
      } else {
        stockAcumulado = mov.stock_nuevo;
        costoUnitario = stockAcumulado > 0 ? costoAcumulado / stockAcumulado : Number(mov.precio_unitario);
      }

      const precioLista = Number(mov.precio_lista) || 0;
      const descuento = Number(mov.descuento) || 0;

      return {
        fecha: mov.fecha,
        tipo_movimiento: mov.tipo_movimiento,
        referencia: mov.tipo_referencia,
        entrada_cantidad: mov.tipo_movimiento === 'entrada' ? mov.cantidad : 0,
        entrada_costo_unitario: mov.tipo_movimiento === 'entrada' ? Number(mov.precio_unitario) : 0,
        entrada_precio_lista: mov.tipo_movimiento === 'entrada' ? precioLista : 0,
        entrada_descuento: mov.tipo_movimiento === 'entrada' ? descuento : 0,
        entrada_valor_total: mov.tipo_movimiento === 'entrada' ? mov.cantidad * Number(mov.precio_unitario) : 0,
        salida_cantidad: mov.tipo_movimiento === 'salida' ? mov.cantidad : 0,
        salida_costo_unitario: mov.tipo_movimiento === 'salida' ? costoUnitario : 0,
        salida_precio_lista: mov.tipo_movimiento === 'salida' ? precioLista : 0,
        salida_descuento: mov.tipo_movimiento === 'salida' ? descuento : 0,
        salida_valor_total: mov.tipo_movimiento === 'salida' ? mov.cantidad * costoUnitario : 0,
        saldo_cantidad: stockAcumulado,
        saldo_costo_unitario: costoUnitario,
        saldo_valor_total: stockAcumulado * costoUnitario
      };
    });

    const data = {
      producto: {
        id: producto.id,
        codigo: producto.codigo,
        nombre: producto.nombre,
        categoria: producto.categoria?.nombre
      },
      periodo: {
        desde: fecha_desde,
        hasta: fecha_hasta
      },
      kardex,
      resumen: {
        total_entradas: totalEntradas,
        total_salidas: totalSalidas
      }
    };

    const buffer = await reportService.generateKardexPDF(data);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="kardex_${producto.codigo}_${fecha_desde}_${fecha_hasta}.pdf"`);
    res.send(buffer);
  } catch (error) {
    console.error('Error generating Kardex PDF:', error);
    res.status(500).json({ message: 'Error al generar Kardex PDF' });
  }
};

export const generateInventarioExcel = async (req: Request, res: Response) => {
  try {
    const { sede_id, almacen_id } = req.body;

    // Obtener stock por sede con información completa
    const where: any = {};
    if (sede_id) where.sede_id = sede_id;
    if (almacen_id) where.almacen_id = almacen_id;

    const stockData = await StockPorSede.findAll({
      where,
      include: [
        { model: Product, as: 'producto', where: { activo: true } },
        { model: Sede, as: 'sede', attributes: ['nombre'] },
        { model: Almacen, as: 'almacen', attributes: ['nombre'] }
      ]
    });

    // Obtener unidades de medida para cada producto
    const productos = await Product.findAll({
      where: { activo: true },
      include: [
        { model: Category, as: 'categoria', attributes: ['nombre'] },
        { model: UnidadMedida, as: 'unidad', attributes: ['nombre', 'abreviatura'] }
      ]
    });

    const productosMap = new Map(productos.map(p => [p.id, p]));
    const descuentosEfectivos = await descuentoService.getDescuentosEfectivos(productos as any);

    // Transformar datos para Excel
    const inventarioData = stockData.map(stock => {
      const producto = productosMap.get(stock.producto_id);
      if (!producto) return null;

      const eff = descuentosEfectivos.get(producto.id);
      const promoProduct = {
        descuento_promocion: eff?.descuento_promocion ?? 0,
        promocion_hasta: eff?.promocion_hasta,
        precio_venta: producto.precio_venta
      };
      const promoActiva = esPromoActiva(promoProduct);
      const precioPromo = calcularPrecioPromo(promoProduct);
      const descuento = Number(eff?.descuento_promocion) || 0;

      return {
        codigo: producto.codigo,
        nombre: producto.nombre,
        categoria: producto.categoria?.nombre || 'Sin categoría',
        sede: stock.sede?.nombre || 'Sin sede',
        almacen: stock.almacen?.nombre || 'Sin almacén',
        stock_actual: stock.cantidad_actual,
        unidad: producto.unidad?.abreviatura || 'und',
        costo_unitario: Number(producto.precio_compra) || 0,
        valor_total: stock.cantidad_actual * (Number(producto.precio_compra) || 0),
        descuento_promocion: descuento,
        precio_venta: Number(producto.precio_venta) || 0,
        precio_promo: promoActiva
          ? (precioPromo ?? 0)
          : null,
        valor_promo: promoActiva
          ? stock.cantidad_actual * (precioPromo ?? 0)
          : null
      };
    }).filter(Boolean);

    const buffer = await reportService.generateInventarioExcel({ productos: inventarioData as any });

    const filename = sede_id 
      ? `inventario_sede_${sede_id}_${new Date().toISOString().split('T')[0]}.xlsx`
      : `inventario_${new Date().toISOString().split('T')[0]}.xlsx`;

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(buffer);
  } catch (error) {
    console.error('Error generating Inventario Excel:', error);
    res.status(500).json({ message: 'Error al generar reporte de inventario' });
  }
};

export const getInventarioData = async (req: Request, res: Response) => {
  try {
    const { sede_id, almacen_id } = req.query;

    const where: any = {};
    if (sede_id) where.sede_id = sede_id;
    if (almacen_id) where.almacen_id = almacen_id;

    const stockData = await StockPorSede.findAll({
      where,
      include: [
        { model: Product, as: 'producto', where: { activo: true } },
        { model: Sede, as: 'sede', attributes: ['nombre'] },
        { model: Almacen, as: 'almacen', attributes: ['nombre'] }
      ]
    });

    const productos = await Product.findAll({
      where: { activo: true },
      include: [
        { model: Category, as: 'categoria', attributes: ['nombre'] },
        { model: UnidadMedida, as: 'unidad', attributes: ['nombre', 'abreviatura'] }
      ]
    });

    const productosMap = new Map(productos.map(p => [p.id, p]));
    const descuentosEfectivos = await descuentoService.getDescuentosEfectivos(productos as any);

    const inventarioData = stockData.map(stock => {
      const producto = productosMap.get(stock.producto_id);
      if (!producto) return null;

      const eff = descuentosEfectivos.get(producto.id);
      const promoProduct = {
        descuento_promocion: eff?.descuento_promocion ?? 0,
        promocion_hasta: eff?.promocion_hasta,
        precio_venta: producto.precio_venta
      };
      const promoActiva = esPromoActiva(promoProduct);
      const precioPromo = calcularPrecioPromo(promoProduct);
      const descuento = Number(eff?.descuento_promocion) || 0;

      return {
        codigo: producto.codigo,
        nombre: producto.nombre,
        categoria: producto.categoria?.nombre || 'Sin categoría',
        sede: stock.sede?.nombre || 'Sin sede',
        almacen: stock.almacen?.nombre || 'Sin almacén',
        stock_actual: stock.cantidad_actual,
        unidad: producto.unidad?.abreviatura || 'und',
        costo_unitario: Number(producto.precio_compra) || 0,
        valor_total: stock.cantidad_actual * (Number(producto.precio_compra) || 0),
        descuento_promocion: descuento,
        precio_venta: Number(producto.precio_venta) || 0,
        precio_promo: promoActiva
          ? (precioPromo ?? 0)
          : null,
        valor_promo: promoActiva
          ? stock.cantidad_actual * (precioPromo ?? 0)
          : null
      };
    }).filter(Boolean);

    res.json({ productos: inventarioData, total: inventarioData.length });
  } catch (error) {
    console.error('Error al obtener datos de inventario:', error);
    res.status(500).json({ message: 'Error al obtener datos de inventario' });
  }
};
