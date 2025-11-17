import React from 'react';
import { useTheme, type Theme, themes } from '../contexts/ThemeContext';
import './Settings.css';

const themeOrder = [
  { id: 'red', name: 'Rojo' },
  { id: 'teal', name: 'Verde Azulado' },
  { id: 'orange', name: 'Naranja' },
  { id: 'amber', name: 'Ámbar' },
  { id: 'yellow', name: 'Amarillo' },
  { id: 'sky', name: 'Celeste' },
  { id: 'blue', name: 'Azul' },
  { id: 'cyan', name: 'Cian' },
  { id: 'zinc', name: 'Zinc' },
  { id: 'indigo', name: 'Índigo' },
  { id: 'lime', name: 'Lima' },
  { id: 'emerald', name: 'Esmeralda' },
] as const;

const Settings: React.FC = () => {
  const { theme, setTheme } = useTheme();

  return (
    <div className="settings-container">
      <h1>Apariencia</h1>

      <div className="settings-section">
        <h2>Seleccionar tema</h2>
        <div className="theme-options">
          {themeOrder.map(({ id, name }) => {
            const colors = themes[id];
            return (
              <div
                key={id}
                className={`theme-option ${theme === id ? 'active' : ''}`}
                onClick={() => setTheme(id as Theme)}
              >
                <div className="theme-preview">
                  <div
                    className="theme-preview-primary"
                    style={{ backgroundColor: colors[500] }}
                  />
                  <div
                    className="theme-preview-dark"
                    style={{ backgroundColor: colors[700] }}
                  />
                  <div
                    className="theme-preview-light"
                    style={{ backgroundColor: colors[300] }}
                  />
                </div>
                <span className="theme-name">{name}</span>
                {theme === id && <span className="check-icon">✓</span>}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default Settings;