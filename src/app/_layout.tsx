import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useColorScheme } from 'react-native';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { AuthProvider } from '@/context/auth-context';
import { CartProvider } from '@/context/cart-context';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const colorScheme = useColorScheme();
  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <AuthProvider>
        <CartProvider>
          <AnimatedSplashOverlay />
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="shop/[vertical]" options={{ headerShown: true, headerBackButtonDisplayMode: 'minimal' }} />
            <Stack.Screen name="product/[id]" options={{ headerShown: true, headerBackButtonDisplayMode: 'minimal' }} />
            <Stack.Screen name="checkout" options={{ headerShown: true, headerBackButtonDisplayMode: 'minimal' }} />
            <Stack.Screen name="login" options={{ headerShown: true, headerBackButtonDisplayMode: 'minimal' }} />
            <Stack.Screen name="signup" options={{ headerShown: true, headerBackButtonDisplayMode: 'minimal' }} />
          </Stack>
        </CartProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
