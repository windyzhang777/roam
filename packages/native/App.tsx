import { ThemeProvider, useThemeContext } from '@/components/theme-provider';
import '@/i18n';
import { BookListScreen } from '@/screens/BookListScreen';
import { BookReaderScreen } from '@/screens/BookReaderScreen';
import { createStaticNavigation } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import { ReactElement } from 'react';

const RootStack = createNativeStackNavigator({
  initialRouteName: 'BookList',
  screenOptions: { headerShown: false },
  screens: {
    BookList: BookListScreen,
    BookReader: BookReaderScreen,
  },
});

const Navigation = createStaticNavigation(RootStack);

const AppContent = () => {
  const { isDark } = useThemeContext();

  return (
    <>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <Navigation />
    </>
  );
};

export default function App(): ReactElement {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  );
}
