import React from 'react';
import { View, ActivityIndicator, Image } from 'react-native';
import useAuthStore from '../store/authStore';
import { BRAND } from '../constants/brand';
import AuthStack from './AuthStack';
import MainTabs from './MainTabs';

export default function AppNavigator() {
  const { token, user, _hasHydrated } = useAuthStore();

  if (!_hasHydrated) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: BRAND.colors.charcoal,
        }}
      >
        <Image source={BRAND.logo} style={{ width: 220, height: 64 }} resizeMode="contain" />
        <ActivityIndicator size="large" color={BRAND.colors.gold} style={{ marginTop: 28 }} />
      </View>
    );
  }

  if (!token) {
    return <AuthStack initialRouteName="Login" />;
  }

  if (user?.employee_status === 'pending') {
    return <AuthStack initialRouteName="Pending" />;
  }

  return <MainTabs />;
}
