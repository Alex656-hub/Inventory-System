import { Op, Model } from 'sequelize';
import { Product, SalidaInventario, DetalleSalida } from '../../models';
import { subMonths, format, parseISO, addMonths } from 'date-fns';

// Definir interfaces para los tipos
export interface HistoricalData {
  month: string;
  quantity: number;
  revenue: number;
}

interface SaleRecord {
  id: number;
  fecha: Date | string;
  numero_documento: string;
  detalles: Array<{
    id: number;
    cantidad: number;
    precio_unitario: number;
    producto: {
      id: number;
      nombre: string;
      categoria_id: number;
    };
  }>;
}

interface ForecastData {
  month: string;
  forecastedQuantity: number;
  confidenceInterval: {
    lower: number;
    upper: number;
  };
}

interface SalesQueryParams {
  productId?: number;
  categoryId?: number;
  months: number;
}

/**
 * Servicio para pronóstico de demanda de productos
 */

export interface DemandForecastOptions {
  productId?: number;
  categoryId?: number;
  monthsToForecast?: number;
  confidenceLevel?: number;
}

/**
 * Obtiene el pronóstico de demanda para un producto o categoría
 */
export const getDemandForecast = async (options: DemandForecastOptions = {}) => {
  const {
    productId,
    categoryId,
    monthsToForecast = 3,
    confidenceLevel = 0.95
  } = options;

  try {
    // Obtener datos históricos de ventas
    const historicalData = await getHistoricalSalesData({
      productId,
      categoryId,
      months: 12 // Últimos 12 meses de datos
    });

    // Aquí iría la lógica de pronóstico real
    // Por ahora, devolvemos un pronóstico simple basado en el promedio móvil
    const forecast = calculateSimpleMovingAverage(
      historicalData.map(d => ({ month: d.month, quantity: d.quantity })),
      monthsToForecast
    );

    return {
      success: true,
      forecast,
      confidence: confidenceLevel,
      historicalData
    };
  } catch (error) {
    console.error('Error en el pronóstico de demanda:', error);
    const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
    return {
      success: false,
      error: 'Error al calcular el pronóstico de demanda',
      details: errorMessage
    };
  }
};

/**
 * Obtiene datos históricos de ventas
 */
async function getHistoricalSalesData(
  params: SalesQueryParams
): Promise<HistoricalData[]> {
  const { productId, categoryId, months } = params;
  const endDate = new Date();
  const startDate = subMonths(endDate, months);

  // Construir condiciones de consulta
  const where: any = {
    fecha: {
      [Op.gte]: startDate,
      [Op.lte]: endDate,
      [Op.not]: null
    },
    estado: 'completado' // Solo ventas completadas
  };

  // Incluir detalles de la venta
  const include: any[] = [
    {
      model: DetalleSalida,
      as: 'detalles',
      include: [
        {
          model: Product,
          as: 'producto',
          attributes: ['id', 'nombre', 'categoria_id']
        }
      ]
    }
  ];

  // Aplicar filtros
  if (productId) {
    include[0].include[0].where = { producto_id: productId };
  } else if (categoryId) {
    include[0].include[0].include[0].where = { categoria_id: categoryId };
  }

  // Obtener datos de salidas de inventario (ventas)
  const sales = (await SalidaInventario.findAll({
    where,
    include,
    order: [['fecha', 'ASC']]
  })) as unknown as SaleRecord[];

  // Procesar datos para agrupar por mes
  const monthlyData = sales.reduce<Record<string, HistoricalData>>(
    (acc, sale) => {
      const saleDate = typeof sale.fecha === 'string' 
        ? parseISO(sale.fecha) 
        : new Date(sale.fecha);
      
      const month = format(saleDate, 'yyyy-MM');
      
      if (!acc[month]) {
        acc[month] = {
          month,
          quantity: 0,
          revenue: 0
        };
      }

      // Sumar cantidades y montos de los detalles
      sale.detalles.forEach(detalle => {
        acc[month].quantity += detalle.cantidad;
        acc[month].revenue += detalle.precio_unitario * detalle.cantidad;
      });

      return acc;
    },
    {} as Record<string, HistoricalData>
  );

  return Object.values(monthlyData);
}

/**
 * Calcula un pronóstico simple usando promedio móvil
 */
function calculateSimpleMovingAverage(
  historicalData: Array<{ month: string; quantity: number }>,
  periods: number
): ForecastData[] {
  if (historicalData.length === 0) return [];

  // Ordenar por mes por si acaso
  const sortedData = [...historicalData].sort((a, b) => 
    a.month.localeCompare(b.month)
  );

  // Calcular el promedio de los últimos 3 meses
  const lastMonths = sortedData
    .slice(-3)
    .reduce((sum, data) => sum + data.quantity, 0);
  
  const average = Math.round(lastMonths / Math.min(3, sortedData.length) || 1);

  // Obtener la última fecha de los datos históricos
  const lastDataPoint = sortedData[sortedData.length - 1];
  if (!lastDataPoint) return [];

  // Generar pronóstico para los próximos meses
  const forecast: ForecastData[] = [];
  const lastDate = new Date(lastDataPoint.month + '-01');
  
  for (let i = 1; i <= periods; i++) {
    const forecastDate = addMonths(lastDate, i);
    
    forecast.push({
      month: format(forecastDate, 'yyyy-MM'),
      forecastedQuantity: average,
      confidenceInterval: {
        lower: Math.max(0, Math.round(average * 0.8)), // -20% (mínimo 0)
        upper: Math.round(average * 1.2)  // +20%
      }
    });
  }

  return forecast;
}

/**
 * Calcula el error cuadrático medio (MSE) para evaluar el modelo
 */
function calculateMeanSquaredError(actual: number[], predicted: number[]): number {
  if (actual.length !== predicted.length) {
    throw new Error('Los arreglos deben tener la misma longitud');
  }

  let sumSquaredError = 0;
  for (let i = 0; i < actual.length; i++) {
    const error = actual[i] - predicted[i];
    sumSquaredError += error * error;
  }

  return sumSquaredError / actual.length;
}
