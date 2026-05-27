import { Request, Response } from 'express';
import { alertService } from '../services/alertService';
import { getFullInventoryMetrics } from '../analytics/services/inventoryAnalysis';
import Alert from '../models/Alert';
import Product from '../models/Product';
import User from '../models/User';
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
    const recommendations = await alertService.generateRecommendations();
    res.json({ recomendaciones: recommendations });
  } catch (error) {
    console.error('Error al obtener recomendaciones:', error);
    res.status(500).json({ mensaje: 'Error interno del servidor' });
  }
};

export const getAnalytics = async (req: Request, res: Response): Promise<void> => {
  try {
    const metrics = await getFullInventoryMetrics();
    res.json(metrics);
  } catch (error) {
    console.error('Error al obtener analytics:', error);
    res.status(500).json({ mensaje: 'Error interno del servidor' });
  }
};
