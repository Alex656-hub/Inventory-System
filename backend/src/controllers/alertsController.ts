import { Request, Response } from 'express';
import { alertService } from '../services/alertService';
import { recommendationService } from '../services/recommendationService';
import { getFullInventoryMetrics } from '../analytics/services/inventoryAnalysis';
import Alert from '../models/Alert';
import Product from '../models/Product';
import User from '../models/User';
import Supplier from '../models/Supplier';
import Recommendation from '../models/Recommendation';
import { Op } from 'sequelize';

export const getAlerts = async (req: Request, res: Response): Promise<void> => {
  try {
    const { pagina = 1, limite = 10, resolved, type, severity } = req.query;

    const offset = (Number(pagina) - 1) * Number(limite);
    const where: any = {};

    if (resolved !== undefined) {
      where.resolved = resolved === 'true';
    }

    if (type) {
      where.type = type;
    }

    if (severity) {
      where.severity = severity;
    }

    const { count, rows } = await Alert.findAndCountAll({
      where,
      include: [
        {
          model: Product,
          as: 'product',
          attributes: ['id', 'codigo', 'nombre']
        },
        {
          model: User,
          as: 'user',
          attributes: ['id', 'nombre', 'email']
        }
      ],
      limit: Number(limite),
      offset,
      order: [['createdAt', 'DESC']]
    });

    res.json({
      alertas: rows,
      paginacion: {
        total: count,
        pagina: Number(pagina),
        limite: Number(limite),
        totalPaginas: Math.ceil(count / Number(limite))
      }
    });
  } catch (error) {
    console.error('Error al obtener alertas:', error);
    res.status(500).json({ mensaje: 'Error interno del servidor' });
  }
};

export const checkAlerts = async (req: Request, res: Response): Promise<void> => {
  try {
    await alertService.checkAllAlerts();
    res.json({ mensaje: 'Verificación de alertas completada' });
  } catch (error) {
    console.error('Error al verificar alertas:', error);
    res.status(500).json({ mensaje: 'Error interno del servidor' });
  }
};

export const resolveAlert = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const alert = await Alert.findByPk(id);
    if (!alert) {
      res.status(404).json({ mensaje: 'Alerta no encontrada' });
      return;
    }

    alert.resolved = true;
    await alert.save();

    res.json({ mensaje: 'Alerta resuelta exitosamente' });
  } catch (error) {
    console.error('Error al resolver alerta:', error);
    res.status(500).json({ mensaje: 'Error interno del servidor' });
  }
};

export const getRecommendations = async (req: Request, res: Response): Promise<void> => {
  try {
    const { estado = 'pendientes' } = req.query;

    // Mapear filtro de estado
    const estadoMap: Record<string, any> = {
      pendientes: 'PENDIENTE',
      aceptadas: 'ACEPTADA',
      rechazadas: 'RECHAZADA',
      todas: undefined
    };
    const estadoKey = String(estado);
    const estadoFilter = estadoKey in estadoMap ? estadoMap[estadoKey] : 'PENDIENTE';
    const where: any = {};
    if (estadoFilter !== undefined) {
      where.estado = estadoFilter;
    }

    // Obtener las recomendaciones con sus relaciones según el filtro
    const recommendations = await Recommendation.findAll({
      where,
      include: [
        { model: Product, as: 'product' },
        { model: Supplier, as: 'supplier' },
        { model: Alert, as: 'alert' }
      ],
      order: [['createdAt', 'DESC']]
    });

    // Resumen financiero: siempre sobre el conjunto PENDIENTE (hub de decisiones accionable)
    const pending = await Recommendation.findAll({
      where: { estado: 'PENDIENTE' },
      attributes: ['id', 'tipo', 'prioridad', 'costo_estimado', 'impacto_estimado']
    });

    // Nota: las columnas DECIMAL llegan como string; envolver con Number() para
    // evitar concatenación ("0" + "5225.00" => "05225.00") y usar Math.round en vez de .toFixed.
    const capitalEnRiesgo = pending
      .filter(r => r.tipo === 'REORDEN')
      .reduce((sum, r) => sum + (Number(r.costo_estimado) || 0), 0);

    const capitalInmovilizado = pending
      .filter(r => r.tipo === 'PROMOCION')
      .reduce((sum, r) => sum + (Number(r.impacto_estimado) || 0), 0);

    const resumen = {
      total: recommendations.length,
      pendientes: pending.filter(r => r.estado === 'PENDIENTE').length,
      urgentes: pending.filter(r => r.prioridad === 'URGENTE').length,
      costoTotalEstimado: pending.reduce((sum, r) => sum + (Number(r.costo_estimado) || 0), 0),
      capitalEnRiesgo: Math.round(capitalEnRiesgo * 100) / 100,
      capitalInmovilizado: Math.round(capitalInmovilizado * 100) / 100,
      accionesPendientes: pending.filter(r => r.prioridad === 'URGENTE').length
    };

    res.json({ 
      recomendaciones: recommendations,
      resumen 
    });
  } catch (error) {
    console.error('Error al obtener recomendaciones:', error);
    res.status(500).json({ mensaje: 'Error interno del servidor' });
  }
};

export const generateRecommendations = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).usuario?.id;
    const nuevas = await recommendationService.generateAllRecommendations(userId);
    res.json({ mensaje: 'Generación completada', nuevas: nuevas.length });
  } catch (error) {
    console.error('Error al generar recomendaciones:', error);
    res.status(500).json({ mensaje: 'Error interno del servidor' });
  }
};

export const acceptRecommendation = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { descuento, promocion_hasta } = req.body || {};
    const recommendation = await recommendationService.acceptRecommendation(Number(id), {
      descuento: descuento !== undefined ? Number(descuento) : undefined,
      promocion_hasta: promocion_hasta || null
    });
    res.json({ mensaje: 'Recomendación aceptada exitosamente', recomendacion: recommendation });
  } catch (error: any) {
    res.status(400).json({ mensaje: error.message });
  }
};

export const rejectRecommendation = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const recommendation = await recommendationService.rejectRecommendation(Number(id));
    res.json({ mensaje: 'Recomendación rechazada exitosamente', recomendacion: recommendation });
  } catch (error: any) {
    res.status(500).json({ mensaje: error.message });
  }
};

export const getRecommendationMetrics = async (req: Request, res: Response): Promise<void> => {
  try {
    const metrics = await recommendationService.getDecisionMetrics();
    res.json({ metricas: metrics });
  } catch (error) {
    console.error('Error al obtener métricas de recomendaciones:', error);
    res.status(500).json({ mensaje: 'Error interno del servidor' });
  }
};

export const getRecommendationHistory = async (req: Request, res: Response): Promise<void> => {
  try {
    const { pagina = 1, limite = 10, estado, tipo } = req.query;
    const history = await recommendationService.getRecommendationHistory({
      pagina: Number(pagina),
      limite: Number(limite),
      estado: estado as string | undefined,
      tipo: tipo as string | undefined
    });
    res.json(history);
  } catch (error) {
    console.error('Error al obtener historial de recomendaciones:', error);
    res.status(500).json({ mensaje: 'Error interno del servidor' });
  }
};

export const reopenRecommendation = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const recommendation = await recommendationService.reopenRecommendation(Number(id));
    res.json({ mensaje: 'Recomendación reabierta exitosamente', recomendacion: recommendation });
  } catch (error: any) {
    res.status(400).json({ mensaje: error.message });
  }
};

export const getAnalytics = async (req: Request, res: Response): Promise<void> => {
  try {
    const { fechaInicio, fechaFin } = req.query;
    const metrics = await getFullInventoryMetrics({
      fechaInicio: fechaInicio as string | undefined,
      fechaFin: fechaFin as string | undefined
    });
    res.json(metrics);
  } catch (error) {
    console.error('Error al obtener analytics:', error);
    res.status(500).json({ mensaje: 'Error interno del servidor' });
  }
};
