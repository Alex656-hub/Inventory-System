// backend/src/types/reports.ts
export interface ReportParams {
  type: 'inventory_status' | 'stock_movements' | 'financial_kpis' | 'demand_forecast';
  startDate?: Date;
  endDate?: Date;
  filters?: { categoryId?: number; supplierId?: number };
  format: 'pdf' | 'excel';
}

export interface InventoryReportData {
  products: Array<{
    id: number;
    name: string;
    stock_actual: number;
    stock_minimo: number;
    category: string;
  }>;
  generatedAt: Date;
}

export interface DemandForecastRow {
  id: number;
  codigo: string;
  nombre: string;
  categoria: string;
  ventas_30d: number;
  pronostico_30d: number;
  limite_inferior: number;
  limite_superior: number;
  mape: number | null;
}

export interface DemandForecastReportData {
  productos: DemandForecastRow[];
  periodo: number;
  generatedAt: Date;
}

export interface StockMovementRow {
  id: number;
  fecha: Date | string;
  tipo_movimiento: string;
  tipo_referencia?: string;
  referencia_id?: number;
  codigo: string;
  producto: string;
  cantidad: number;
  precio_unitario: number;
  stock_anterior: number;
  stock_nuevo: number;
  usuario: string;
  motivo?: string;
}

export interface StockMovementsReportData {
  movimientos: StockMovementRow[];
  desde?: string;
  hasta?: string;
  totalEntradas: number;
  totalSalidas: number;
  generatedAt: Date;
}

export interface FinancialKpi {
  clave: string;
  descripcion: string;
  valor: string;
}

export interface FinancialKpisReportData {
  kpis: FinancialKpi[];
  proyecciones: Array<{
    date: string;
    projectedRevenue: number;
    projectedExpenses: number;
    projectedProfit: number;
  }>;
  generatedAt: Date;
}
