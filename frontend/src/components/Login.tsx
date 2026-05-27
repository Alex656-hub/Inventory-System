import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../services/auth.service';
import './Login.css';

const Login: React.FC = () => {
  // Estado para controlar qué formulario se muestra (false = login, true = registro)
  const [isActive, setIsActive] = useState(false);
  
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
  const [error, setError] = useState('');
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
      const response = await authService.login2FA(resolvedEmail, twoFactorCode);
      authService.guardarSesion(response.usuario);
      navigate('/');
    } catch (err: any) {
      setError(err.response?.data?.mensaje || 'Código 2FA inválido');
    } finally {
      setLoading(false);
    }
  };

  const toggleForm = (showLogin: boolean) => {
    // Mostrar REGISTRARSE (isActive = true) o INICIAR SESIÓN (isActive = false)
    setIsActive(!showLogin);
  };

  const reset2FA = () => {
    setShow2FA(false);
    setTwoFactorCode('');
    setPendingEmail('');
    setError('');
  };

  return (
    <div className="login-container">
      <div id="container" className={isActive ? "container active" : "container"}>
        {/* Sign In Form */}
        <div className="form-container sign-in">
          {!show2FA ? (
            <form onSubmit={handleLoginSubmit}>
              <h1>Iniciar Sesión</h1>
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
              <button type="button" className="forgot-password" onClick={(e) => e.preventDefault()}>
                ¿Olvidaste tu contraseña?
              </button>
              <button type="submit" disabled={loading}>
                {loading ? 'Iniciando sesión...' : 'Iniciar Sesión'}
              </button>
              <button type="button" className="hidden" id="signUp" onClick={() => setIsActive(true)}>
                Registrarse
              </button>
            </form>
          ) : (
            <form onSubmit={handle2FASubmit}>
              <h1>Verificación 2FA</h1>
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

        {/* Sign Up Form */}
        <div className="form-container sign-up">
          <div className="register-placeholder">
            <h1>Crear Cuenta</h1>
            <p>El registro de nuevos usuarios está disponible solo para administradores.</p>
            <p>Contacta al administrador del sistema para crear una cuenta.</p>
          </div>
        </div>

        {/* Toggle Panel */}
        <div className="toggle-container">
          <div className="toggle">
            <div className="toggle-panel toggle-left">
              <h1>¡Bienvenido de nuevo!</h1>
              <p>Ingresa tus credenciales para acceder al sistema</p>
              <button 
                type="button" 
                className="ghost" 
                id="signIn" 
                onClick={() => toggleForm(true)}
                style={{ cursor: 'pointer' }}
              >
                Iniciar Sesión
              </button>
            </div>
            <div className="toggle-panel toggle-right">
              <h1>¡Hola, amigo!</h1>
              <p>Regístrate con tus datos personales para acceder al sistema</p>
              <button 
                type="button" 
                className="ghost" 
                id="signUp" 
                onClick={() => toggleForm(false)}
                style={{ cursor: 'pointer' }}
              >
                Registrarse
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;

