"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const RefreshToken_1 = __importDefault(require("../models/RefreshToken"));
const User_1 = __importDefault(require("../models/User"));
class RefreshTokenService {
    /**
     * Genera un refresh token aleatorio
     */
    generateRefreshToken() {
        return require('crypto').randomBytes(64).toString('hex');
    }
    /**
     * Genera un access token JWT
     */
    generateAccessToken(user) {
        const payload = {
            id: user.id,
            email: user.email,
            rol: user.rol,
            twoFactorEnabled: user.twoFactorEnabled || false
        };
        const secret = process.env.JWT_SECRET || 'secret';
        const expiresIn = process.env.JWT_EXPIRE || '15m'; // Access token de corta duración
        return jsonwebtoken_1.default.sign(payload, secret, {
            expiresIn: expiresIn
        });
    }
    /**
     * Crea un nuevo refresh token para un usuario
     */
    async createRefreshToken(userId) {
        // Revocar todos los tokens anteriores del usuario
        await this.revokeAllUserTokens(userId);
        const token = this.generateRefreshToken();
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 30); // Expira en 30 días
        return await RefreshToken_1.default.create({
            token,
            userId,
            expiresAt,
            isRevoked: false,
        });
    }
    /**
     * Genera ambos tokens (access y refresh) para un usuario
     */
    async generateTokens(user) {
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
    async refreshAccessToken(refreshTokenString) {
        try {
            const refreshToken = await RefreshToken_1.default.findOne({
                where: {
                    token: refreshTokenString,
                    isRevoked: false,
                    expiresAt: {
                        [sequelize_1.Op.gt]: new Date()
                    }
                },
                include: [{
                        model: User_1.default,
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
        }
        catch (error) {
            console.error('Error refreshing token:', error);
            return null;
        }
    }
    /**
     * Revoca un refresh token específico
     */
    async revokeRefreshToken(token) {
        try {
            const result = await RefreshToken_1.default.update({ isRevoked: true }, {
                where: { token }
            });
            return result[0] > 0;
        }
        catch (error) {
            console.error('Error revoking refresh token:', error);
            return false;
        }
    }
    /**
     * Revoca todos los refresh tokens de un usuario
     */
    async revokeAllUserTokens(userId) {
        try {
            await RefreshToken_1.default.update({ isRevoked: true }, {
                where: {
                    userId,
                    isRevoked: false
                }
            });
        }
        catch (error) {
            console.error('Error revoking all user tokens:', error);
        }
    }
    /**
     * Limpia tokens expirados
     */
    async cleanupExpiredTokens() {
        try {
            await RefreshToken_1.default.destroy({
                where: {
                    [sequelize_1.Op.or]: [
                        { expiresAt: { [sequelize_1.Op.lt]: new Date() } },
                        { isRevoked: true }
                    ]
                }
            });
        }
        catch (error) {
            console.error('Error cleaning up expired tokens:', error);
        }
    }
    /**
     * Verifica si un refresh token es válido
     */
    async validateRefreshToken(token) {
        try {
            return await RefreshToken_1.default.findOne({
                where: {
                    token,
                    isRevoked: false,
                    expiresAt: {
                        [sequelize_1.Op.gt]: new Date()
                    }
                }
            });
        }
        catch (error) {
            console.error('Error validating refresh token:', error);
            return null;
        }
    }
}
exports.default = new RefreshTokenService();
