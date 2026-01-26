import { sequelize } from '../config/database';
import RefreshToken from '../models/RefreshToken';
import RefreshTokenService from '../services/refreshToken.service';

/**
 * Script para configurar el sistema de refresh tokens
 * 1. Crea la tabla de refresh tokens si no existe
 * 2. Limpia tokens expirados
 */
async function setupRefreshTokens() {
  try {
    console.log('🔄 Configurando sistema de refresh tokens...');
    
    // 1. Sincronizar la base de datos (creará la tabla si no existe)
    console.log('📊 Sincronizando base de datos...');
    await sequelize.sync({ alter: true });
    console.log('✅ Base de datos sincronizada');
    
    // 2. Limpiar tokens expirados existentes
    console.log('🧹 Limpiando tokens expirados...');
    await RefreshTokenService.cleanupExpiredTokens();
    console.log('✅ Tokens expirados limpiados');
    
    // 3. Verificar configuración
    console.log('🔍 Verificando configuración...');
    const count = await RefreshToken.count();
    console.log(`📈 Tokens activos en la base de datos: ${count}`);
    
    console.log('✅ Sistema de refresh tokens configurado exitosamente');
    
  } catch (error) {
    console.error('❌ Error al configurar refresh tokens:', error);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

// Ejecutar el script
if (require.main === module) {
  setupRefreshTokens()
    .then(() => {
      console.log('🎉 Configuración completada');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Error en la configuración:', error);
      process.exit(1);
    });
}

export default setupRefreshTokens;
