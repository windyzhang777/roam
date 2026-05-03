import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useContext, useEffect, useState } from 'react';
import { useColorScheme } from 'react-native';

type Theme = 'dark' | 'light' | 'system';

interface ThemeColors {
  highlight: string;
  background: string;
  foreground: string;
  card: string;
  // cardForeground: string;
  // popover: string;
  // popoverForeground: string;
  primary: string;
  primaryForeground: string;
  muted: string;
  mutedForeground: string;
  // accent: string;
  // accentForeground: string;
  border: string;
  destructive: string;
}

const lightColors: ThemeColors = {
  highlight: '#FEF3C7',
  background: '#FFFFFF',
  foreground: '#282124',
  card: '#FFFFFF',
  primary: '#C29037',
  primaryForeground: '#836427',
  muted: '#F4F0F2',
  mutedForeground: '#8F7587',
  border: '#EDEAEC',
  destructive: '#DA553B',
};

const darkColors: ThemeColors = {
  highlight: '#5C4556',
  background: '#312328',
  foreground: '#FCFCFC',
  card: '#462b3a',
  primary: '#DFB73E',
  primaryForeground: '#836427',
  muted: '#553549',
  mutedForeground: '#C290AC',
  border: '#5C4556',
  destructive: '#E06B53',
};

interface ThemeProviderProps {
  children: React.ReactNode;
  defaultTheme?: Theme;
  storageKey?: string;
}

export function ThemeProvider({ children, defaultTheme = 'system', storageKey = 'app-theme', ...props }: ThemeProviderProps) {
  const systemScheme = useColorScheme();
  const [theme, setTheme] = useState<Theme>(defaultTheme);

  useEffect(() => {
    AsyncStorage.getItem(storageKey).then((stored) => {
      if (stored !== 'dark' && stored !== 'light' && stored !== 'system') return;
      setTheme(stored);
    });
  }, []);

  const resolvedTheme = theme === 'system' ? (systemScheme ?? 'dark') : theme;
  const isDark = resolvedTheme === 'dark';
  const colors = isDark ? darkColors : lightColors;

  const value = {
    theme,
    setTheme: (theme: Theme) => {
      setTheme(theme);
      AsyncStorage.setItem(storageKey, theme);
    },
    colors,
    isDark,
  };

  return (
    <ThemeContext.Provider {...props} value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

// ThemeContext
interface IThemeProvider {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  colors: ThemeColors;
  isDark: boolean;
}
const defaultThemeContext: IThemeProvider = {
  theme: 'system',
  setTheme: () => null,
  colors: lightColors,
  isDark: false,
};
const ThemeContext = createContext<IThemeProvider>(defaultThemeContext);
export const useThemeContext = () => {
  const themeContext = useContext(ThemeContext);
  if (!themeContext) {
    console.error('Theme context is used out of scope');
    return defaultThemeContext;
  }
  return {
    theme: themeContext.theme,
    setTheme: themeContext.setTheme,
    colors: themeContext.colors,
    isDark: themeContext.isDark,
  };
};
