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
    const userId = (req as any).usuario?.id;
    
    // 1. Generar nuevas recomendaciones basadas en alertas activas
    await recommendationService.generateAllRecommendations(userId);
    
    // 2. Obtener todas las recomendaciones pendientes con sus relaciones
    const recommendations = await Recommendation.findAll({
      where: { estado: 'PENDIENTE' },
      include: [
        { model: Product, as: 'product' },
        { model: Supplier, as: 'supplier' },
        { model: Alert, as: 'alert' }
      ],
      order: [['createdAt', 'DESC']]
    });

    // 3. Calcular resumen financiero
    const resumen = {
      total: recommendations.length,
      pendientes: recommendations.filter(r => r.estado === 'PENDIENTE').length,
      urgentes: recommendations.filter(r => r.prioridad === 'URGENTE').length,
      costoTotalEstimado: recommendations.reduce((sum, r) => sum + (r.costo_estimado || 0), 0)
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

export const acceptRecommendation = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const recommendation = await recommendationService.acceptRecommendation(Number(id));
    res.json({ mensaje: 'Recomendación aceptada exitosamente', recomendacion: recommendation });
  } catch (error: any) {
    res.status(500).json({ mensaje: error.message });
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

export const executeRecommendation = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const result = await recommendationService.executeRecommendation(Number(id));
    if (result.success) {
      res.json({ mensaje: result.message });
    } else {
      res.status(400).json({ mensaje: result.message });
    }
  } catch (error: any) {
    res.status(500).json({ mensaje: error.message });
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
