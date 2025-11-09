import React from 'react';
import { useTheme, type Theme } from '../contexts';
import './Settings.css';

type ThemeInfo = {
  id: string;
  name: string;
  colors: {
    primary: string;
    dark: string;
    light: string;
  };
};

const themeNames: Record<string, string> = {
  red: 'Rojo',
  teal: 'Verde Azulado',
  orange: 'Naranja',
  amber: 'Ámbar',
  yellow: 'Amarillo',
  sky: 'Celeste',
  blue: 'Azul',
  cyan: 'Cian',
  zinc: 'Zinc',
  indigo: 'Índigo',
  lime: 'Lima',
  emerald: 'Esmeralda'
};

const Settings: React.FC = () => {
  const { theme, setTheme } = useTheme();

  const themeList: ThemeInfo[] = Object.entries(themeNames).map(([id, name]) => ({
    id,
    name,
    colors: {
      primary: `var(--color-${id}-500)`,
      dark: `var(--color-${id}-700)`,
      light: `var(--color-${id}-300)`
    }
  }));

  return (
    <div className="settings-container">
      <h1>Configuraciones</h1>
      
      <div className="settings-section">
        <h2>Apariencia</h2>
        <div className="theme-selector">
          <h3>Seleccionar tema</h3>
          <div className="theme-options">
            {themeList.map((t) => (
              <div 
                key={t.id}
                className={`theme-option ${theme === t.id ? 'active' : ''}`}
                onClick={() => setTheme(t.id as any)}
                style={{
                  '--color-primary': t.colors.primary,
                  '--color-dark': t.colors.dark,
                  '--color-light': t.colors.light,
                } as React.CSSProperties}
                title={t.name}
              >
                <div className="theme-preview">
                  <div className="theme-preview-primary" style={{ backgroundColor: t.colors.primary }}></div>
                  <div className="theme-preview-dark" style={{ backgroundColor: t.colors.dark }}></div>
                  <div className="theme-preview-light" style={{ backgroundColor: t.colors.light }}></div>
                </div>
                <span className="theme-name">{t.name}</span>
                {theme === t.id && <span className="check-icon">✓</span>}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
