import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../services/auth.service';
import './Login.css';

const Login: React.FC = () => {
  // Asegurar que el tema del login sea siempre sky azul
  useEffect(() => {
    // Aplicar tema sky al cargar el componente
    const root = document.documentElement;
    root.style.setProperty('--color-primary', 'var(--color-sky-500)');
    root.style.setProperty('--color-primary-dark', 'var(--color-sky-700)');
    root.style.setProperty('--color-primary-light', 'var(--color-sky-300)');
    root.style.setProperty('--color-text-on-primary', '#ffffff');
    
    return () => {
      // No restaurar el tema aquí, se hará en el Layout después del login
    };
  }, []);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [show2FA, setShow2FA] = useState(false);
  const [pendingEmail, setPendingEmail] = useState('');
  const [pendingTempToken, setPendingTempToken] = useState('');  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();


  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const credenciales: any = { password };
      const esEmail = email.includes('@');
      if (esEmail) {
        credenciales.email = email;
      } else {
        credenciales.usuario = email;
      }

      const response = await authService.login(credenciales);
      
      if (response.requiere2FA) {
        setShow2FA(true);
        setPendingEmail(email);
        setPendingTempToken(response.token || '');
        setError('');
      } else {
        authService.guardarSesion(response.usuario);
        navigate('/');
      }
    } catch (err: any) {
      setError(err.response?.data?.mensaje || 'Error al iniciar sesión');
    } finally {
      setLoading(false);
    }
  };

  const handle2FASubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const esEmail = pendingEmail.includes('@');
      const resolvedEmail = esEmail
        ? pendingEmail
        : `${pendingEmail}@credisa.com`;
      const response = await authService.login2FA(resolvedEmail, twoFactorCode, pendingTempToken);
      authService.guardarSesion(response.usuario);
      navigate('/');
    } catch (err: any) {
      setError(err.response?.data?.mensaje || 'Código 2FA inválido');
    } finally {
      setLoading(false);
    }
  };

  const reset2FA = () => {
    setShow2FA(false);
    setTwoFactorCode('');
    setPendingEmail('');
    setPendingTempToken('');
    setError('');
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-brand">
          <div className="login-brand-icon">
            <i className='bx bxs-box'></i>
          </div>
          <h1>Sistema de Inventario</h1>
        </div>

        {!show2FA ? (
          <form onSubmit={handleLoginSubmit}>
            {error && <div className="error-message">{error}</div>}
            <input
              type="text"
              placeholder="Usuario o correo electrónico"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <input
              type="password"
              placeholder="Contraseña"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <button type="submit" disabled={loading}>
              {loading ? 'Iniciando sesión...' : 'Iniciar Sesión'}
            </button>
          </form>
        ) : (
          <form onSubmit={handle2FASubmit}>
            <h2>Verificación 2FA</h2>
            <p>Ingresa el código de tu aplicación autenticadora</p>
            {error && <div className="error-message">{error}</div>}
            <input
              type="text"
              placeholder="Código de 6 dígitos"
              value={twoFactorCode}
              onChange={(e) => setTwoFactorCode(e.target.value)}
              maxLength={6}
              required
              autoFocus
            />
            <button type="submit" disabled={loading}>
              {loading ? 'Verificando...' : 'Verificar'}
            </button>
            <button
              type="button"
              className="back-button"
              onClick={reset2FA}
            >
              ← Volver al login
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default Login;