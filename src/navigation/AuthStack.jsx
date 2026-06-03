import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import LoginScreen from '../screens/auth/LoginScreen';
import RegisterScreen from '../screens/auth/RegisterScreen';
import PendingScreen from '../screens/auth/PendingScreen';

const Stack = createNativeStackNavigator();

export default function AuthStack({ initialRouteName = 'Login' }) {
  return (
    <Stack.Navigator
      initialRouteName={initialRouteName}
      screenOptions={{ headerShown: false }}
    >
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Register" component={RegisterScreen} />
      <Stack.Screen name="Pending" component={PendingScreen} options={{ gestureEnabled: false }} />
    </Stack.Navigator>
  );
}
