import { Request, Response } from 'express';
import { CuotaService } from '../services/cuotaService';
import { CuotaPago } from '../models';

export const getCuotasByCliente = async (req: Request, res: Response): Promise<void> => {
  try {
    const { clienteId } = req.params;
    const { estado, soloVencidas, pagina = 1, limite = 20 } = req.query;

    const clienteIdNum = parseInt(clienteId, 10);
    if (isNaN(clienteIdNum)) {
      res.status(400).json({ mensaje: 'ID de cliente inválido' });
      return;
    }

    const cuotas = await CuotaService.getByCliente(clienteIdNum, {
      estado: estado as string,
      soloVencidas: soloVencidas === 'true',
    });

    // Paginación manual
    const total = cuotas.length;
    const offset = (Number(pagina) - 1) * Number(limite);
    const items = cuotas.slice(offset, offset + Number(limite));

    res.json({
      cuotas: items,
      paginacion: {
        total,
        pagina: Number(pagina),
        limite: Number(limite),
        totalPaginas: Math.ceil(total / Number(limite)),
      },
    });
  } catch (error) {
    console.error('Error al obtener cuotas por cliente:', error);
    res.status(500).json({ mensaje: 'Error interno del servidor' });
  }
};

export const getAging = async (req: Request, res: Response): Promise<void> => {
  try {
    const aging = await CuotaService.getAging();
    res.json(aging);
  } catch (error) {
    console.error('Error al obtener aging:', error);
    res.status(500).json({ mensaje: 'Error interno del servidor' });
  }
};

export const getCartera = async (req: Request, res: Response): Promise<void> => {
  try {
    const cartera = await CuotaService.getCartera();
    res.json(cartera);
  } catch (error) {
    console.error('Error al obtener cartera de cuentas por cobrar:', error);
    res.status(500).json({ mensaje: 'Error interno del servidor' });
  }
};

export const getAgingCliente = async (req: Request, res: Response): Promise<void> => {
  try {
    const { clienteId } = req.params;
    const clienteIdNum = parseInt(clienteId, 10);
    if (isNaN(clienteIdNum)) {
      res.status(400).json({ mensaje: 'ID de cliente inválido' });
      return;
    }

    const aging = await CuotaService.getAgingCliente(clienteIdNum);
    res.json(aging);
  } catch (error) {
    console.error('Error al obtener aging por cliente:', error);
    res.status(500).json({ mensaje: 'Error interno del servidor' });
  }
};

export const pagarCuota = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { fecha_pago, observaciones } = req.body;

    const cuotaId = parseInt(id, 10);
    if (isNaN(cuotaId)) {
      res.status(400).json({ mensaje: 'ID de cuota inválido' });
      return;
    }

    const fechaPago = fecha_pago ? new Date(fecha_pago) : new Date();

    const cuota = await CuotaService.pagarCuota(cuotaId, fechaPago, observaciones);

    if (!cuota) {
      res.status(404).json({ mensaje: 'Cuota no encontrada' });
      return;
    }

    // Obtener la cuota completa con relaciones para la respuesta
    const cuotaCompleta = await CuotaPago.findByPk(cuotaId, {
      include: [{
        association: 'salida',
        attributes: ['id', 'numero_documento', 'fecha', 'total', 'cliente_nombre', 'cliente_documento'],
      }],
    });

    res.json({
      mensaje: 'Cuota pagada exitosamente',
      cuota: cuotaCompleta,
    });
  } catch (error) {
    console.error('Error al pagar cuota:', error);
    res.status(500).json({ mensaje: 'Error interno del servidor' });
  }
};