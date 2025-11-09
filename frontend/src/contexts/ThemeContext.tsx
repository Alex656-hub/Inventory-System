import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

type ThemeType = 'red' | 'teal' | 'orange' | 'amber' | 'yellow' | 'sky' | 'blue' | 'cyan' | 'zinc' | 'indigo' | 'lime' | 'emerald';

type ColorShades = {
  50: string;
  100: string;
  200: string;
  300: string;
  400: string;
  500: string;
  600: string;
  700: string;
  800: string;
  900: string;
  950: string;
};

const themes: Record<ThemeType, ColorShades> = {
  red: {
    '50': '#fef2f2',
    '100': '#ffe2e2',
    '200': '#ffc9c9',
    '300': '#ffa2a2',
    '400': '#ff6467',
    '500': '#fb2c36',
    '600': '#e7000b',
    '700': '#c10007',
    '800': '#9f0712',
    '900': '#82181a',
    '950': '#460809'
  },
  teal: {
    '50': '#f0fdfa',
    '100': '#cbfbf1',
    '200': '#96f7e4',
    '300': '#46ecd5',
    '400': '#00d5be',
    '500': '#00bba7',
    '600': '#009689',
    '700': '#00786f',
    '800': '#005f5a',
    '900': '#0b4f4a',
    '950': '#022f2e'
  },
  orange: {
    '50': '#fff7ed',
    '100': '#ffedd4',
    '200': '#ffd6a7',
    '300': '#ffb86a',
    '400': '#ff8904',
    '500': '#ff6900',
    '600': '#f54900',
    '700': '#ca3500',
    '800': '#9f2d00',
    '900': '#7e2a0c',
    '950': '#441306'
  },
  amber: {
    '50': '#fffbeb',
    '100': '#fef3c6',
    '200': '#fee685',
    '300': '#ffd230',
    '400': '#ffb900',
    '500': '#fe9a00',
    '600': '#e17100',
    '700': '#bb4d00',
    '800': '#973c00',
    '900': '#7b3306',
    '950': '#461901'
  },
  yellow: {
    '50': '#fefce8',
    '100': '#fef9c2',
    '200': '#fff085',
    '300': '#ffdf20',
    '400': '#fdc700',
    '500': '#f0b100',
    '600': '#d08700',
    '700': '#a65f00',
    '800': '#894b00',
    '900': '#733e0a',
    '950': '#432004'
  },
  sky: {
    '50': '#f0f9ff',
    '100': '#dff2fe',
    '200': '#b8e6fe',
    '300': '#74d4ff',
    '400': '#00bcff',
    '500': '#00a6f4',
    '600': '#0084d1',
    '700': '#0069a8',
    '800': '#00598a',
    '900': '#024a70',
    '950': '#052f4a'
  },
  blue: {
    '50': '#eff6ff',
    '100': '#dbeafe',
    '200': '#bedbff',
    '300': '#8ec5ff',
    '400': '#51a2ff',
    '500': '#2b7fff',
    '600': '#155dfc',
    '700': '#1447e6',
    '800': '#193cb8',
    '900': '#1c398e',
    '950': '#162456'
  },
  cyan: {
    '50': '#ecfeff',
    '100': '#cefafe',
    '200': '#a2f4fd',
    '300': '#53eafd',
    '400': '#00d3f2',
    '500': '#00b8db',
    '600': '#0092b8',
    '700': '#007595',
    '800': '#005f78',
    '900': '#104e64',
    '950': '#053345'
  },
  zinc: {
    '50': '#fafafa',
    '100': '#f4f4f5',
    '200': '#e4e4e7',
    '300': '#d4d4d8',
    '400': '#9f9fa9',
    '500': '#71717b',
    '600': '#52525c',
    '700': '#3f3f46',
    '800': '#27272a',
    '900': '#18181b',
    '950': '#09090b'
  },
  indigo: {
    '50': '#eef2ff',
    '100': '#e0e7ff',
    '200': '#c6d2ff',
    '300': '#a3b3ff',
    '400': '#7c86ff',
    '500': '#615fff',
    '600': '#4f39f6',
    '700': '#432dd7',
    '800': '#372aac',
    '900': '#312c85',
    '950': '#1e1a4d'
  },
  lime: {
    '50': '#f7fee7',
    '100': '#ecfcca',
    '200': '#d8f999',
    '300': '#bbf451',
    '400': '#9ae600',
    '500': '#7ccf00',
    '600': '#5ea500',
    '700': '#497d00',
    '800': '#3c6300',
    '900': '#35530e',
    '950': '#192e03'
  },
  emerald: {
    '50': '#ecfdf5',
    '100': '#d0fae5',
    '200': '#a4f4cf',
    '300': '#5ee9b5',
    '400': '#00d492',
    '500': '#00bc7d',
    '600': '#009966',
    '700': '#007a55',
    '800': '#006045',
    '900': '#004f3b',
    '950': '#002c22'
  }
};

type ThemeContextType = {
  theme: ThemeType;
  setTheme: (theme: ThemeType) => void;
};

export type Theme = ThemeType;

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

// Tema por defecto para el login
export const DEFAULT_THEME: Theme = 'cyan';

export const ThemeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [theme, setTheme] = useState<Theme>(DEFAULT_THEME);
  const [isInitialized, setIsInitialized] = useState(false);

  // Cargar el tema guardado del localStorage al iniciar
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') as Theme | null;
    if (savedTheme && themes[savedTheme]) {
      setTheme(savedTheme);
    } else {
      setTheme(DEFAULT_THEME);
    }
    setIsInitialized(true);
  }, []);

  // Aplicar el tema actual
  useEffect(() => {
    if (!isInitialized) return;
    
    const root = document.documentElement;
    const colorScheme = themes[theme];
    
    // Aplicar todas las variantes de color del tema
    Object.entries(colorScheme).forEach(([key, value]) => {
      root.style.setProperty(`--color-${theme}-${key}`, value);
    });
    
    // Establecer las variables CSS principales
    root.style.setProperty('--color-primary', colorScheme[500]);
    root.style.setProperty('--color-primary-dark', colorScheme[700]);
    root.style.setProperty('--color-primary-light', colorScheme[300]);
    root.style.setProperty('--color-primary-ultralight', colorScheme[100]);
    root.style.setProperty('--color-text-on-primary', theme === 'zinc' ? '#1f2937' : '#ffffff');
    
    // Guardar el tema en localStorage solo si no es la inicialización
    if (theme !== DEFAULT_THEME) {
      localStorage.setItem('theme', theme);
    } else {
      localStorage.removeItem('theme');
    }
  }, [theme, isInitialized]);

  // Función para establecer el tema del usuario
  const setUserTheme = (newTheme: Theme) => {
    setTheme(newTheme);
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme: setUserTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme debe ser usado dentro de un ThemeProvider');
  }
  return context;
};

// Exportar ThemeContext como valor por defecto
export default ThemeContext;
