import { Op } from 'sequelize';
import { CuotaPago, SalidaInventario, OperacionStock, Client } from '../models';
import { addDays, addMonths } from 'date-fns';

interface CuotaPagoCreateData {
  salida_id: number | null;
  operacion_id?: number | null;
  numero_cuota: number;
  monto_capital: number;
  monto_interes: number;
  monto_total: number;
  fecha_vencimiento: Date;
  estado: 'pendiente' | 'pagada' | 'atrasada';
  garantia_tipo: 'dni' | 'telefono' | 'ninguna';
  garantia_valor: string;
  aval_nombre?: string | null;
  aval_contacto?: string | null;
  aval_direccion?: string | null;
  responsable_cobro?: string | null;
}

/**
 * Fuente genérica para generar el cronograma de cuotas.
 * Compatible tanto con SalidaInventario (flujo legado) como con
 * OperacionStock (ventas a crédito del módulo Operaciones de Stock).
 */
export interface CuotaSource {
  id: number;
  num_cuotas: number;
  interes_mensual?: number | null;
  total: number;
  primer_vencimiento?: Date | string | null;
  frecuencia_cuota?: string | null;
  garantia_tipo?: string;
  garantia_valor?: string;
  aval_nombre?: string | null;
  aval_contacto?: string | null;
  aval_direccion?: string | null;
  responsable_cobro?: string | null;
}

interface AgingBucket {
  actual: number;
  '1-30': number;
  '31-60': number;
  '61-90': number;
  '90+': number;
}

/**
 * Fila de la cartera de cuentas por cobrar (un cliente con saldo pendiente).
 * cliente_id puede ser null cuando la deuda proviene de una salida legada
 * sin cliente real asociado en la tabla Client.
 */
export interface CarteraCliente {
  cliente_id: number | null;
  nombre: string;
  documento: string;
  cuotas_pendientes: number;
  saldo_capital: number;
  total: number;
  aging: AgingBucket;
}

export class CuotaService {
  /**
   * Genera el cronograma de cuotas usando sistema francés (cuota fija)
   * Redondeo a 2 decimales, diferencia absorbida en la última cuota.
   * tipoReferencia determina si las cuotas se vinculan a una salida
   * (flujo legado) o a una operación de stock (módulo Operaciones de Stock).
   */
  static generateSchedule(fuente: CuotaSource, tipoReferencia: 'salida' | 'operacion' = 'salida'): CuotaPagoCreateData[] {
    const n = fuente.num_cuotas;
    if (n <= 0) return [];

    const i = (fuente.interes_mensual || 0) / 100; // decimal mensual
    const PV = Number(fuente.total); // valor presente = total venta

    // Fórmula cuota fija (sistema francés): PMT = PV * i / (1 - (1+i)^-n)
    const cuotaFija = i > 0
      ? PV * i / (1 - Math.pow(1 + i, -n))
      : PV / n;

    // Redondeo interno a 4 decimales para precisión
    const cuotaFijaRedondeada = Math.round(cuotaFija * 10000) / 10000;

    const cuotas: CuotaPagoCreateData[] = [];
    let saldoPendiente = PV;
    let fecha = fuente.primer_vencimiento ? new Date(fuente.primer_vencimiento) : new Date();

    for (let k = 1; k <= n; k++) {
      const interes = Math.round(saldoPendiente * i * 100) / 100;
      let capital = Math.round((cuotaFijaRedondeada - interes) * 100) / 100;

      // En la última cuota, ajustar diferencia por redondeo
      if (k === n) {
        capital = Math.round(saldoPendiente * 100) / 100;
      }

      const montoTotal = Math.round((capital + interes) * 100) / 100;
      saldoPendiente = Math.round((saldoPendiente - capital) * 100) / 100;

      cuotas.push({
        salida_id: tipoReferencia === 'salida' ? fuente.id : null,
        operacion_id: tipoReferencia === 'operacion' ? fuente.id : null,
        numero_cuota: k,
        monto_capital: capital,
        monto_interes: interes,
        monto_total: montoTotal,
        fecha_vencimiento: new Date(fecha),
        estado: 'pendiente',
        garantia_tipo: (fuente.garantia_tipo as 'dni' | 'telefono' | 'ninguna') || 'ninguna',
        garantia_valor: fuente.garantia_valor || '',
        aval_nombre: fuente.aval_nombre || null,
        aval_contacto: fuente.aval_contacto || null,
        aval_direccion: fuente.aval_direccion || null,
        responsable_cobro: fuente.responsable_cobro || null,
      });

      // Avanzar fecha según frecuencia
      if (fuente.frecuencia_cuota === 'semanal') {
        fecha = addDays(fecha, 7);
      } else if (fuente.frecuencia_cuota === 'quincenal') {
        fecha = addDays(fecha, 15);
      } else {
        // mensual por defecto
        fecha = addMonths(fecha, 1);
      }
    }

    return cuotas;
  }

  /**
   * Marca una cuota como pagada
   */
  static async pagarCuota(cuotaId: number, fechaPago: Date = new Date(), observaciones?: string): Promise<CuotaPago | null> {
    const cuota = await CuotaPago.findByPk(cuotaId);
    if (!cuota) return null;

    cuota.estado = 'pagada';
    cuota.fecha_pago = fechaPago;
    if (observaciones) {
      cuota.observaciones = observaciones;
    }
    await cuota.save();
    return cuota;
  }

  /**
   * Obtiene cuotas de un cliente:
   * - cuotas de salidas (a través de salidas_inventario.cliente_documento)
   * - cuotas de operaciones de stock (a través de operaciones_stock.cliente_id)
   */
  static async getByCliente(clienteId: number, filtros?: { estado?: string; soloVencidas?: boolean }): Promise<any[]> {
    const where: any = {};

    if (filtros?.estado) {
      where.estado = filtros.estado;
    }

    if (filtros?.soloVencidas) {
      where.fecha_vencimiento = { [Op.lt]: new Date() };
      where.estado = 'pendiente';
    }

    const [cuotasSalida, cuotasOperacion] = await Promise.all([
      // Cuotas de salidas (flujo legado)
      CuotaPago.findAll({
        where,
        include: [{
          model: SalidaInventario,
          as: 'salida',
          where: { cliente_documento: { [Op.ne]: null } },
          required: true,
        }],
        order: [['fecha_vencimiento', 'ASC']],
      }),
      // Cuotas de operaciones de stock (módulo Operaciones de Stock)
      CuotaPago.findAll({
        where,
        include: [{
          model: OperacionStock,
          as: 'operacion',
          where: { cliente_id: clienteId },
          required: true,
          include: [{ model: Client, as: 'cliente', attributes: ['id', 'nombre', 'numero_documento'] }],
        }],
        order: [['fecha_vencimiento', 'ASC']],
      }),
    ]);

    // Filtrar por cliente_id en memoria ya que no hay FK directa
    // TODO: optimizar con subquery o vista
    const filtradas = cuotasSalida.filter(c => c.salida?.cliente_documento === String(clienteId));

    return this.enriquecerCuotas([...filtradas, ...cuotasOperacion]);
  }

  /**
   * Enriquece las cuotas para la vista de Cuentas por Cobrar sin tocar el frontend:
   * - Agrega total_cuotas por cronograma (para mostrar "1 / 3").
   * - Para cuotas de operaciones, inyecta un objeto salida calculado con el
   *   número de documento (referencia de la operación o "OP-<id>").
   */
  private static enriquecerCuotas(cuotas: CuotaPago[]): any[] {
    const conteo: Record<string, number> = {};
    for (const c of cuotas) {
      const key = c.operacion_id ? `op-${c.operacion_id}` : `sal-${c.salida_id}`;
      conteo[key] = (conteo[key] || 0) + 1;
    }

    return cuotas.map((c) => {
      const item: any = c.toJSON ? c.toJSON() : c;
      const key = c.operacion_id ? `op-${c.operacion_id}` : `sal-${c.salida_id}`;
      item.total_cuotas = conteo[key] || 0;

      if (c.operacion_id && !item.salida) {
        item.salida = {
          id: c.operacion_id,
          numero_documento: c.operacion?.referencia || `OP-${c.operacion_id}`,
          fecha: c.operacion?.fecha_emision,
          total: Number(c.operacion?.costo_total) || 0,
          cliente_nombre: c.operacion?.cliente?.nombre || '',
          cliente_documento: c.operacion?.cliente?.numero_documento || String(c.operacion?.cliente_id || ''),
        };
      }

      return item;
    });
  }

  /**
   * Obtiene aging de cartera general
   */
  static async getAging(): Promise<AgingBucket> {
    const cuotas = await CuotaPago.findAll({
      where: {
        estado: 'pendiente',
      },
      attributes: ['monto_total', 'fecha_vencimiento'],
      raw: true,
    });

    return this.calcularAging(cuotas);
  }

  /**
   * Obtiene aging de cartera por cliente
   */
  static async getAgingCliente(clienteId: number): Promise<AgingBucket> {
    const [cuotasSalida, cuotasOperacion] = await Promise.all([
      CuotaPago.findAll({
        where: { estado: 'pendiente' },
        include: [{
          model: SalidaInventario,
          as: 'salida',
          where: { cliente_documento: String(clienteId) },
          required: true,
        }],
        attributes: ['monto_total', 'fecha_vencimiento'],
        raw: true,
        nest: true,
      }),
      CuotaPago.findAll({
        where: { estado: 'pendiente' },
        include: [{
          model: OperacionStock,
          as: 'operacion',
          where: { cliente_id: clienteId },
          required: true,
        }],
        attributes: ['monto_total', 'fecha_vencimiento'],
        raw: true,
        nest: true,
      }),
    ]);

    return this.calcularAging([...cuotasSalida, ...cuotasOperacion]);
  }

  /**
   * Obtiene la cartera de cuentas por cobrar: un resumen por cliente
   * con saldo pendiente (cuotas en estado pendiente o atrasada).
   * Agrupa cuotas de operaciones de stock (cliente_id) y de salidas
   * legadas (resolviendo cliente_documento contra Client por id o DNI).
   */
  static async getCartera(): Promise<CarteraCliente[]> {
    const [cuotasSalida, cuotasOperacion] = await Promise.all([
      CuotaPago.findAll({
        where: { estado: { [Op.in]: ['pendiente', 'atrasada'] } },
        include: [{
          model: SalidaInventario,
          as: 'salida',
          where: { cliente_documento: { [Op.ne]: null } },
          required: true,
        }],
        attributes: ['monto_capital', 'monto_total', 'fecha_vencimiento'],
      }),
      CuotaPago.findAll({
        where: { estado: { [Op.in]: ['pendiente', 'atrasada'] } },
        include: [{
          model: OperacionStock,
          as: 'operacion',
          where: { cliente_id: { [Op.ne]: null } },
          required: true,
          include: [{ model: Client, as: 'cliente', attributes: ['id', 'nombre', 'numero_documento'] }],
        }],
        attributes: ['monto_capital', 'monto_total', 'fecha_vencimiento'],
      }),
    ]);

    // Resolver clientes legados (salidas sin operación) contra la tabla Client
    const legacyDocs = [...new Set(
      cuotasSalida
        .map(c => c.salida?.cliente_documento)
        .filter((d): d is string => !!d)
    )];
    const orClauses: any[] = [];
    for (const doc of legacyDocs) {
      const numeric = Number(doc);
      if (Number.isInteger(numeric) && numeric > 0) orClauses.push({ id: numeric });
      orClauses.push({ numero_documento: doc });
    }
    let clientesResueltos: Client[] = [];
    if (orClauses.length > 0) {
      clientesResueltos = await Client.findAll({ where: { [Op.or]: orClauses } });
    }

    const grupos = new Map<string, {
      cliente_id: number | null;
      nombre: string;
      documento: string;
      cuotas: Array<{ monto_capital: number | string; monto_total: number | string; fecha_vencimiento: Date | string }>;
    }>();

    const agregar = (key: string, base: { cliente_id: number | null; nombre: string; documento: string }, cuota: { monto_capital: number | string; monto_total: number | string; fecha_vencimiento: Date | string }) => {
      if (!grupos.has(key)) grupos.set(key, { ...base, cuotas: [] });
      grupos.get(key)!.cuotas.push(cuota);
    };

    for (const c of cuotasSalida) {
      const doc = c.salida?.cliente_documento;
      const nombre = c.salida?.cliente_nombre || 'Cliente';
      const match = clientesResueltos.find(
        cl => String(cl.id) === String(doc) || cl.numero_documento === doc
      );
      const key = match ? `client-${match.id}` : `legacy-${doc}|${nombre}`;
      agregar(key, {
        cliente_id: match ? match.id : null,
        nombre: match ? match.nombre : nombre,
        documento: match ? match.numero_documento : (doc || ''),
      }, {
        monto_capital: c.monto_capital,
        monto_total: c.monto_total,
        fecha_vencimiento: c.fecha_vencimiento,
      });
    }

    for (const c of cuotasOperacion) {
      const cl = c.operacion?.cliente;
      const key = cl ? `client-${cl.id}` : `op-${c.operacion_id}`;
      agregar(key, {
        cliente_id: cl ? cl.id : null,
        nombre: cl ? cl.nombre : 'Cliente',
        documento: cl ? cl.numero_documento : '',
      }, {
        monto_capital: c.monto_capital,
        monto_total: c.monto_total,
        fecha_vencimiento: c.fecha_vencimiento,
      });
    }

    const resultado: CarteraCliente[] = [];
    for (const g of grupos.values()) {
      const total = Math.round(g.cuotas.reduce((s, c) => s + (Number(c.monto_total) || 0), 0) * 100) / 100;
      const saldoCapital = Math.round(g.cuotas.reduce((s, c) => s + (Number(c.monto_capital) || 0), 0) * 100) / 100;
      resultado.push({
        cliente_id: g.cliente_id,
        nombre: g.nombre,
        documento: g.documento,
        cuotas_pendientes: g.cuotas.length,
        saldo_capital: saldoCapital,
        total,
        aging: this.calcularAging(g.cuotas),
      });
    }

    return resultado.sort((a, b) => b.total - a.total);
  }

  /**
   * Calcula el aging (monto por rango de días de atraso) a partir de cuotas.
   * Comparte la lógica entre el aging general y el aging por cliente.
   */
  private static calcularAging(cuotas: Array<{ monto_total: number | string; fecha_vencimiento: Date | string }>): AgingBucket {
    const hoy = new Date();
    const aging: AgingBucket = {
      actual: 0,
      '1-30': 0,
      '31-60': 0,
      '61-90': 0,
      '90+': 0,
    };

    for (const c of cuotas) {
      const venc = new Date(c.fecha_vencimiento);
      const diffDays = Math.floor((hoy.getTime() - venc.getTime()) / (1000 * 60 * 60 * 24));
      const monto = Number(c.monto_total);

      if (diffDays <= 0) {
        aging.actual += monto;
      } else if (diffDays <= 30) {
        aging['1-30'] += monto;
      } else if (diffDays <= 60) {
        aging['31-60'] += monto;
      } else if (diffDays <= 90) {
        aging['61-90'] += monto;
      } else {
        aging['90+'] += monto;
      }
    }

    // Redondear a 2 decimales
    Object.keys(aging).forEach(k => {
      aging[k as keyof AgingBucket] = Math.round(aging[k as keyof AgingBucket] * 100) / 100;
    });

    return aging;
  }

  /**
   * Job diario: marca cuotas vencidas como 'atrasada'
   * Ejecutar via cron: 0 0 * * * (medianoche)
   */
  static async checkOverdue(): Promise<number> {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    const [updatedCount] = await CuotaPago.update(
      { estado: 'atrasada' },
      {
        where: {
          estado: 'pendiente',
          fecha_vencimiento: { [Op.lt]: hoy },
        },
      }
    );

    console.log(`[CuotaService.checkOverdue] ${updatedCount} cuotas marcadas como atrasadas`);
    return updatedCount;
  }
}