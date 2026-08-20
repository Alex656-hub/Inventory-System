import { Op } from 'sequelize';
import jwt from 'jsonwebtoken';
import RefreshToken from '../models/RefreshToken';
import User from '../models/User';
import { getJwtExpiresIn, getJwtSecret } from '../config/env';

export interface TokenResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: string;
}

class RefreshTokenService {
  /**
   * Genera un refresh token aleatorio
   */
  private generateRefreshToken(): string {
    return require('crypto').randomBytes(64).toString('hex');
  }

  /**
   * Genera un access token JWT
   */
  private generateAccessToken(user: User): string {
    const payload = {
      id: user.id,
      email: user.email,
      rol: user.rol,
      twoFactorEnabled: user.twoFactorEnabled || false
    };

    const secret: string = getJwtSecret();
    const expiresIn: string = getJwtExpiresIn('15m'); // Access token de corta duración

    return jwt.sign(payload, secret, {
      expiresIn: expiresIn
    } as jwt.SignOptions);
  }

  /**
   * Crea un nuevo refresh token para un usuario
   * Nota: NO revoca los tokens previos aquí. La revocación de todas las
   * sesiones solo debe ocurrir al iniciar sesión (generateTokens) o en logoutAll.
   * Revocar todo en cada refresh rompía las sesiones de otras pestañas/dispositivos.
   */
  async createRefreshToken(userId: number): Promise<RefreshToken> {
    const token = this.generateRefreshToken();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30); // Expira en 30 días

    return await RefreshToken.create({
      token,
      userId,
      expiresAt,
      isRevoked: false,
    });
  }

  /**
   * Genera ambos tokens (access y refresh) para un usuario.
   * Al iniciar sesión sí se revocan todas las sesiones anteriores.
   */
  async generateTokens(user: User): Promise<TokenResponse> {
    await this.revokeAllUserTokens(user.id);

    const accessToken = this.generateAccessToken(user);
    const refreshToken = await this.createRefreshToken(user.id);

    return {
      accessToken,
      refreshToken: refreshToken.token,
      expiresIn: 15 * 60, // 15 minutos en segundos
      tokenType: 'Bearer'
    };
  }

  /**
   * Refresca un access token usando un refresh token
   */
  async refreshAccessToken(refreshTokenString: string): Promise<TokenResponse | null> {
    try {
      const refreshToken = await RefreshToken.findOne({
        where: {
          token: refreshTokenString,
          isRevoked: false,
          expiresAt: {
            [Op.gt]: new Date()
          }
        },
        include: [{
          model: User,
          as: 'user'
        }]
      });

      if (!refreshToken || !refreshToken.user) {
        return null;
      }

      // Generar nuevo access token
      const accessToken = this.generateAccessToken(refreshToken.user);

      // Opcional: crear nuevo refresh token para mayor seguridad
      const newRefreshToken = await this.createRefreshToken(refreshToken.userId);
      
      // Revocar el refresh token anterior
      await refreshToken.update({ isRevoked: true });

      return {
        accessToken,
        refreshToken: newRefreshToken.token,
        expiresIn: 15 * 60,
        tokenType: 'Bearer'
      };
    } catch (error) {
      console.error('Error refreshing token:', error);
      return null;
    }
  }

  /**
   * Revoca un refresh token específico
   */
  async revokeRefreshToken(token: string): Promise<boolean> {
    try {
      const result = await RefreshToken.update(
        { isRevoked: true },
        {
          where: { token }
        }
      );
      return result[0] > 0;
    } catch (error) {
      console.error('Error revoking refresh token:', error);
      return false;
    }
  }

  /**
   * Revoca todos los refresh tokens de un usuario
   */
  async revokeAllUserTokens(userId: number): Promise<void> {
    try {
      await RefreshToken.update(
        { isRevoked: true },
        {
          where: {
            userId,
            isRevoked: false
          }
        }
      );
    } catch (error) {
      console.error('Error revoking all user tokens:', error);
    }
  }

  /**
   * Limpia tokens expirados
   */
  async cleanupExpiredTokens(): Promise<void> {
    try {
      await RefreshToken.destroy({
        where: {
          [Op.or]: [
            { expiresAt: { [Op.lt]: new Date() } },
            { isRevoked: true }
          ]
        }
      });
    } catch (error) {
      console.error('Error cleaning up expired tokens:', error);
    }
  }
}

export default new RefreshTokenService();
