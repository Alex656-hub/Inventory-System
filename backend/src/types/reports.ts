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
