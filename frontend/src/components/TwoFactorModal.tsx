import React, { useState } from 'react';
import { authService } from '../services/auth.service';
import './TwoFactorModal.css';

interface TwoFactorModalProps {
  onClose: () => void;
  onSessionChanged: () => void;
}

type Paso = 'inicio' | 'qr' | 'respaldos' | 'desactivar';

const TwoFactorModal: React.FC<TwoFactorModalProps> = ({ onClose, onSessionChanged }) => {
  const { usuario } = authService.obtenerSesion();
  const activado = !!usuario?.twoFactorEnabled;

  const [paso, setPaso] = useState<Paso>('inicio');
  const [qrCode, setQrCode] = useState('');
  const [codigo, setCodigo] = useState('');
  const [password, setPassword] = useState('');
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [error, setError] = useState('');
  const [exito, setExito] = useState('');
  const [loading, setLoading] = useState(false);

  const refrescarSesion = async () => {
    try {
      const perfil = await authService.obtenerPerfil();
      authService.guardarSesion(perfil);
    } catch {
      // La sesión se corregirá en el próximo checkAuth
    }
  };

  const iniciarActivacion = async () => {
    setError('');
    setLoading(true);
    try {
      const data = await authService.configurar2FA();
      setQrCode(data.qrCode);
      setPaso('qr');
    } catch (err: any) {
      setError(err.response?.data?.mensaje || 'Error al generar el código QR');
    } finally {
      setLoading(false);
    }
  };

  const confirmarActivacion = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await authService.activar2FA(codigo);
      setBackupCodes(data.backupCodes || []);
      setPaso('respaldos');
    } catch (err: any) {
      const cod = err.response?.data?.codigo;
      if (cod === 'RATE_LIMIT_EXCEDIDO') {
        setError('Demasiados intentos. Espera unos minutos.');
      } else {
        setError(err.response?.data?.mensaje || 'Código inválido o expirado');
      }
    } finally {
      setLoading(false);
    }
  };

  const finalizarActivacion = async () => {
    await refrescarSesion();
    onSessionChanged();
  };

  const confirmarDesactivacion = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await authService.desactivar2FA(password);
      setExito('Verificación en dos pasos desactivada');
      await refrescarSesion();
      setTimeout(onSessionChanged, 1200);
    } catch (err: any) {
      if (err.response?.status === 401 && err.response?.data?.codigo === 'PASSWORD_INCORRECTA') {
        setError('Contraseña incorrecta');
      } else {
        setError(err.response?.data?.mensaje || 'Error al desactivar');
      }
    } finally {
      setLoading(false);
    }
  };

  const copiarCodigos = async () => {
    try {
      await navigator.clipboard.writeText(backupCodes.join('\n'));
      setExito('Códigos copiados al portapapeles');
    } catch {
      setError('No se pudo copiar. Anota los códigos manualmente.');
    }
  };

  const descargarCodigos = () => {
    const contenido = `Códigos de respaldo - Sistema de Inventario\nUsuario: ${usuario?.email}\n\n${backupCodes.join('\n')}\n`;
    const blob = new Blob([contenido], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'codigos-respaldo-2fa.txt';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content modal-small tfa-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Seguridad</h2>
          <button className="modal-close" onClick={onClose}>
            <i className='bx bx-x'></i>
          </button>
        </div>
        <div className="modal-body">

          {error && <div className="tfa-alert tfa-alert-error">{error}</div>}
          {exito && !error && <div className="tfa-alert tfa-alert-success">{exito}</div>}

          {/* ===== ESTADO ACTIVADO ===== */}
          {activado && paso === 'inicio' && (
            <>
              <div className="tfa-status tfa-status-on">
                <i className='bx bx-check-shield'></i>
                <div>
                  <strong>Protegido</strong>
                  <p>Tu cuenta está protegida con verificación en dos pasos.</p>
                </div>
              </div>
              <div className="modal-actions">
                <button className="btn-cancel" onClick={onClose}>Cerrar</button>
                <button className="tfa-btn-danger" onClick={() => { setPaso('desactivar'); setError(''); setExito(''); }}>
                  Desactivar
                </button>
              </div>
            </>
          )}

          {/* ===== CONFIRMAR DESACTIVACIÓN CON CONTRASEÑA ===== */}
          {activado && paso === 'desactivar' && (
            <form onSubmit={confirmarDesactivacion}>
              <p className="tfa-texto">
                Para desactivar la verificación en dos pasos, ingresa tu contraseña.
              </p>
              <div className="mf-group">
                <label>Contraseña</label>
                <input
                  type="password"
                  className="mf-field"
                  placeholder="Tu contraseña"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  autoFocus
                />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn-cancel" onClick={() => setPaso('inicio')}>Cancelar</button>
                <button type="submit" className="tfa-btn-danger" disabled={loading}>
                  {loading ? 'Desactivando...' : 'Desactivar 2FA'}
                </button>
              </div>
            </form>
          )}

          {/* ===== ESTADO DESACTIVADO: INICIO ===== */}
          {!activado && paso === 'inicio' && (
            <>
              <div className="tfa-status tfa-status-off">
                <i className='bx bx-shield-quarter'></i>
                <div>
                  <strong>Sin protección extra</strong>
                  <p>Activa la verificación en dos pasos para agregar una capa adicional de seguridad a tu cuenta.</p>
                </div>
              </div>
              <div className="modal-actions">
                <button className="btn-cancel" onClick={onClose}>Cerrar</button>
                <button className="btn-save" onClick={iniciarActivacion} disabled={loading}>
                  {loading ? 'Generando...' : 'Activar verificación'}
                </button>
              </div>
            </>
          )}

          {/* ===== PASO QR ===== */}
          {!activado && paso === 'qr' && (
            <>
              <ol className="tfa-pasos">
                <li>Abre Google Authenticator o una app similar en tu teléfono.</li>
                <li>Escanea este código QR.</li>
                <li>Ingresa el código de 6 dígitos que aparezca.</li>
              </ol>
              {qrCode && (
                <div className="tfa-qr-wrap">
                  <img src={qrCode} alt="Código QR de autenticación" className="tfa-qr" />
                </div>
              )}
              <form onSubmit={confirmarActivacion}>
                <div className="mf-group">
                  <label>Código de verificación</label>
                  <input
                    type="text"
                    className="mf-field tfa-input-codigo"
                    placeholder="000000"
                    maxLength={6}
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    value={codigo}
                    onChange={e => setCodigo(e.target.value.trim())}
                    required
                    autoFocus
                  />
                </div>
                <div className="modal-actions">
                  <button type="button" className="btn-cancel" onClick={() => setPaso('inicio')}>Atrás</button>
                  <button type="submit" className="btn-save" disabled={loading || codigo.length !== 6}>
                    {loading ? 'Verificando...' : 'Confirmar'}
                  </button>
                </div>
              </form>
            </>
          )}

          {/* ===== PASO CÓDIGOS DE RESPALDO ===== */}
          {!activado && paso === 'respaldos' && (
            <>
              <div className="tfa-alert tfa-alert-success">
                Verificación en dos pasos activada correctamente.
              </div>
              <p className="tfa-texto">
                Guarda estos códigos de respaldo en un lugar seguro. Cada uno funciona una sola vez
                si no tienes acceso a tu teléfono.
              </p>
              <div className="tfa-codigos-grid">
                {backupCodes.map((c) => (
                  <span key={c} className="tfa-codigo">{c}</span>
                ))}
              </div>
              <div className="tfa-codigos-acciones">
                <button type="button" className="btn-cancel" onClick={copiarCodigos}>
                  <i className='bx bx-copy'></i> Copiar
                </button>
                <button type="button" className="btn-cancel" onClick={descargarCodigos}>
                  <i className='bx bx-download'></i> Descargar
                </button>
              </div>
              <div className="modal-actions">
                <button className="btn-save" onClick={finalizarActivacion}>Listo</button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default TwoFactorModal;
