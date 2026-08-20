import { Request, Response } from 'express';
import { descuentoService } from '../services/descuentoService';

/**
 * Lista descuentos con filtros opcionales (fuente, tipo, categoria, activos).
 */
export const listarDescuentos = async (req: Request, res: Response): Promise<void> => {
  try {
    const { fuente, tipo, categoria_id, activos } = req.query;

    const descuentos = await descuentoService.listar({
      fuente: typeof fuente === 'string' ? fuente : undefined,
      tipo: tipo as any,
      categoria_id: categoria_id ? Number(categoria_id) : undefined,
      activos: activos === 'true'
    });

    res.json({ descuentos });
  } catch (error: any) {
    console.error('Error al listar descuentos:', error);
    res.status(500).json({ mensaje: 'Error al listar descuentos' });
  }
};

/**
 * Calcula la vista previa de un descuento: productos afectados/omitidos
 * y el descuento efectivo del lote (respetando márgenes y recomendaciones).
 */
export const vistaPreviaDescuento = async (req: Request, res: Response): Promise<void> => {
  try {
    const { tipo, producto_id, categoria_id, porcentaje, fecha_fin, productos_excluidos } = req.body || {};

    const previa = await descuentoService.vistaPrevia({
      tipo,
      producto_id: producto_id ? Number(producto_id) : undefined,
      categoria_id: categoria_id ? Number(categoria_id) : undefined,
      porcentaje: Number(porcentaje),
      fecha_fin: fecha_fin || null,
      productos_excluidos
    });

    res.json({ success: true, data: previa });
  } catch (error: any) {
    res.status(400).json({ mensaje: error.message || 'Error al calcular la vista previa' });
  }
};

/**
 * Aplica un descuento (por producto, categoría o todos los productos).
 */
export const aplicarDescuento = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.usuario) {
      res.status(401).json({ mensaje: 'Usuario no autenticado' });
      return;
    }

    const { tipo, producto_id, categoria_id, porcentaje, fecha_fin, productos_excluidos } = req.body || {};

    const resultado = await descuentoService.aplicar(
      {
        tipo,
        producto_id: producto_id ? Number(producto_id) : undefined,
        categoria_id: categoria_id ? Number(categoria_id) : undefined,
        porcentaje: Number(porcentaje),
        fecha_fin: fecha_fin || null,
        productos_excluidos
      },
      req.usuario.id
    );

    res.json({ success: true, data: resultado });
  } catch (error: any) {
    res.status(400).json({ mensaje: error.message || 'Error al aplicar el descuento' });
  }
};

/**
 * Revierte un descuento individual (solo masivo/manual).
 */
export const revertirDescuento = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    await descuentoService.revertir(Number(id));

    res.json({ success: true, mensaje: 'Descuento revertido correctamente' });
  } catch (error: any) {
    res.status(400).json({ mensaje: error.message || 'Error al revertir el descuento' });
  }
};

/**
 * Revierte en lote descuentos masivos de una categoría o globales.
 */
export const revertirDescuentoMasivo = async (req: Request, res: Response): Promise<void> => {
  try {
    const { tipo, categoria_id } = req.body || {};

    const revertidos = await descuentoService.revertirMasivo({
      tipo,
      categoria_id: categoria_id ? Number(categoria_id) : undefined
    });

    res.json({ success: true, data: { revertidos } });
  } catch (error: any) {
    res.status(400).json({ mensaje: error.message || 'Error al revertir el descuento masivo' });
  }
};