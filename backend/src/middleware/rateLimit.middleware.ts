// backend/src/middleware/rateLimit.middleware.ts
import { Request, Response, NextFunction } from 'express';
import NodeCache from 'node-cache';

interface RateLimitOptions {
  ventanaSegundos: number;
  maxIntentos: number;
  mensaje?: string;
}

// Almacenamiento en memoria (se limpia solo vía TTL)
const intentos = new NodeCache({ stdTTL: 0, checkperiod: 60 });

/**
 * Rate limiter simple en memoria por IP.
 * Suficiente para un solo proceso de backend; si se escala horizontalmente,
 * migrar a un almacén compartido (p. ej. Redis).
 */
export const rateLimit = ({ ventanaSegundos, maxIntentos, mensaje }: RateLimitOptions) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const key = `rl:${req.ip}`;
    const registro: number[] = intentos.get(key) || [];
    const ahora = Date.now();
    const ventanaMs = ventanaSegundos * 1000;

    const recientes = registro.filter((ts) => ahora - ts < ventanaMs);

    if (recientes.length >= maxIntentos) {
      res.status(429).json({
        mensaje: mensaje || 'Demasiados intentos. Inténtalo de nuevo más tarde.',
        codigo: 'RATE_LIMIT_EXCEDIDO'
      });
      return;
    }

    recientes.push(ahora);
    intentos.set(key, recientes, ventanaSegundos);
    next();
  };
};
