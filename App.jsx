import './global.css';
import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from './src/lib/queryClient';
import { StatusBar } from 'expo-status-bar';
import AppNavigator from './src/navigation/AppNavigator';
import BrandSplash from './src/components/brand/BrandSplash';
import { navigationRef } from './src/navigation/navigationRef';
import useAuthStore from './src/store/authStore';
import { registerPushToken, setupNotificationListeners } from './src/lib/notifications';
import GlobalDialog from './src/components/ui/GlobalDialog';

function PushRegistrar() {
  const token = useAuthStore((s) => s.token);

  useEffect(() => {
    if (!token) return undefined;
    registerPushToken();
    return setupNotificationListeners();
  }, [token]);

  return null;
}

export default function App() {
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setShowSplash(false), 1400);
    return () => clearTimeout(timer);
  }, []);

  if (showSplash) {
    return (
      <>
        <StatusBar style="light" />
        <BrandSplash />
      </>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <SafeAreaProvider>
        <NavigationContainer ref={navigationRef}>
          <StatusBar style="dark" />
          <PushRegistrar />
          <AppNavigator />
          <GlobalDialog />
        </NavigationContainer>
      </SafeAreaProvider>
    </QueryClientProvider>
  );
}
