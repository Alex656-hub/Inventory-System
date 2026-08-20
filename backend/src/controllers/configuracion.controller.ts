import { Request, Response } from 'express';
import { ConfiguracionSistema } from '../models';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

// Configuración de multer para subir archivos
const storage = multer.memoryStorage();
const upload = multer({ 
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Solo se permiten archivos de imagen'));
    }
  }
});

// Obtener configuración actual del sistema
export const obtenerConfiguracion = async (req: Request, res: Response): Promise<void> => {
  try {
    let configuracion = await ConfiguracionSistema.findOne();
    
    // Si no existe configuración, crear una por defecto
    if (!configuracion) {
      configuracion = await ConfiguracionSistema.create({
        ruc: '',
        direccion: '',
        umbral_liquidez: 1000,
      });
    }

    res.json(configuracion);
  } catch (error) {
    console.error('Error al obtener configuración:', error);
    res.status(500).json({ mensaje: 'Error al obtener configuración del sistema' });
  }
};

// Guardar configuración del sistema (con posible logo)
export const guardarConfiguracion = async (req: Request, res: Response): Promise<void> => {
  try {
    const { ruc, direccion } = req.body;
    const logoFile = req.file;

    let configuracion = await ConfiguracionSistema.findOne();

    if (!configuracion) {
      // Crear nueva configuración
      const nuevaConfig: any = {
        ruc,
        direccion,
        umbral_liquidez: 1000,
      };

      if (logoFile) {
        // Convertir imagen a base64
        const base64Image = logoFile.buffer.toString('base64');
        const mimeType = logoFile.mimetype;
        nuevaConfig.logo = `data:${mimeType};base64,${base64Image}`;
        nuevaConfig.logo_filename = logoFile.originalname;
      }

      configuracion = await ConfiguracionSistema.create(nuevaConfig);
      await configuracion.reload();
    } else {
      // Actualizar configuración existente
      const datosActualizados: any = {
        ruc,
        direccion,
      };

      if (logoFile) {
        // Convertir imagen a base64
        const base64Image = logoFile.buffer.toString('base64');
        const mimeType = logoFile.mimetype;
        datosActualizados.logo = `data:${mimeType};base64,${base64Image}`;
        datosActualizados.logo_filename = logoFile.originalname;
      }

      await configuracion.update(datosActualizados);
      await configuracion.reload();
    }

    res.json({
      mensaje: 'Configuración guardada exitosamente',
      configuracion
    });
  } catch (error) {
    console.error('Error al guardar configuración:', error);
    res.status(500).json({ mensaje: 'Error al guardar configuración del sistema' });
  }
};

// Actualizar configuración sin logo
export const actualizarConfiguracion = async (req: Request, res: Response): Promise<void> => {
  try {
    const { ruc, direccion } = req.body;

    let configuracion = await ConfiguracionSistema.findOne();

    if (!configuracion) {
      configuracion = await ConfiguracionSistema.create({
        ruc,
        direccion,
        umbral_liquidez: 1000,
      });
    } else {
      await configuracion.update({ ruc, direccion });
    }

    res.json({
      mensaje: 'Configuración actualizada exitosamente',
      configuracion
    });
  } catch (error) {
    console.error('Error al actualizar configuración:', error);
    res.status(500).json({ mensaje: 'Error al actualizar configuración del sistema' });
  }
};

// Eliminar logo
export const eliminarLogo = async (req: Request, res: Response): Promise<void> => {
  try {
    const configuracion = await ConfiguracionSistema.findOne();

    if (!configuracion) {
      res.status(404).json({ mensaje: 'No se encontró configuración del sistema' });
      return;
    }

    await configuracion.update({
      logo: undefined,
      logo_filename: undefined
    });

    res.json({ mensaje: 'Logo eliminado exitosamente' });
  } catch (error) {
    console.error('Error al eliminar logo:', error);
    res.status(500).json({ mensaje: 'Error al eliminar logo' });
  }
};

// Middleware para subir logo
export const uploadLogo = upload.single('logo');
