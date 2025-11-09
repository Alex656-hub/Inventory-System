import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../services/auth.service';
import './Login.css';

const Login: React.FC = () => {
  // Estado para controlar qué formulario se muestra (false = login, true = registro)
  const [isActive, setIsActive] = useState(false);
  
  // Asegurar que el tema del login sea siempre cian
  useEffect(() => {
    // Aplicar tema cian al cargar el componente
    const root = document.documentElement;
    root.style.setProperty('--color-primary', 'var(--color-cyan-500)');
    root.style.setProperty('--color-primary-dark', 'var(--color-cyan-700)');
    root.style.setProperty('--color-primary-light', 'var(--color-cyan-300)');
    root.style.setProperty('--color-text-on-primary', '#ffffff');
    
    return () => {
      // No restaurar el tema aquí, se hará en el Layout después del login
    };
  }, []);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [registerData, setRegisterData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();


  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await authService.login({ email, password });
      authService.guardarSesion(response.token, response.usuario);
      navigate('/');
    } catch (err: any) {
      setError(err.response?.data?.mensaje || 'Error al iniciar sesión');
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setRegisterData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleRegisterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Registration logic will be implemented later
    console.log('Register data:', registerData);
  };

  const toggleForm = (showLogin: boolean) => {
    // Mostrar REGISTRARSE (isActive = true) o INICIAR SESIÓN (isActive = false)
    setIsActive(!showLogin);
  };

  return (
    <div className="login-container">
      <div id="container" className={isActive ? "container active" : "container"}>
        {/* Sign In Form */}
        <div className="form-container sign-in">
          <form onSubmit={handleLoginSubmit}>
            <h1>Iniciar Sesión</h1>
            {error && <div className="error-message">{error}</div>}
            <input
              type="email"
              placeholder="Correo electrónico"
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
            <button type="button" className="forgot-password" onClick={(e) => {
              e.preventDefault();
              // Lógica para recuperar contraseña
            }}>
              ¿Olvidaste tu contraseña?
            </button>
            <button type="submit" disabled={loading}>
              {loading ? 'Iniciando sesión...' : 'Iniciar Sesión'}
            </button>
            <button type="button" className="hidden" id="signUp" onClick={() => setIsActive(true)}>
              Registrarse
            </button>
          </form>
        </div>

        {/* Sign Up Form */}
        <div className="form-container sign-up">
          <form onSubmit={handleRegisterSubmit}>
            <h1>Crear Cuenta</h1>
            <span>o usa tu correo para registrarte</span>
            <input
              type="text"
              name="name"
              placeholder="Nombre completo"
              value={registerData.name}
              onChange={handleRegisterChange}
              required
            />
            <input
              type="email"
              name="email"
              placeholder="Correo electrónico"
              value={registerData.email}
              onChange={handleRegisterChange}
              required
            />
            <input
              type="password"
              name="password"
              placeholder="Contraseña"
              value={registerData.password}
              onChange={handleRegisterChange}
              required
            />
            <input
              type="password"
              name="confirmPassword"
              placeholder="Confirmar contraseña"
              value={registerData.confirmPassword}
              onChange={handleRegisterChange}
              required
            />
            <button type="submit">Registrarse</button>
          </form>
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

