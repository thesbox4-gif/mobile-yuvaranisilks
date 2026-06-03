import React from 'react';
import { View, ActivityIndicator, Text } from 'react-native';

export default function LoadingSpinner({ message, fullScreen = true }) {
  return (
    <View className={`items-center justify-center${fullScreen ? ' flex-1' : ' py-8'}`}>
      <ActivityIndicator size="large" color="#f59e0b" />
      {message && <Text className="mt-3 text-sm text-gray-500">{message}</Text>}
    </View>
  );
}
