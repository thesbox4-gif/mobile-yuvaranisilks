import React from 'react';
import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function KpiCard({ label, value, icon, bgColor, iconColor, subtitle }) {
  return (
    <View className="bg-white rounded-2xl p-4 shadow-sm flex-1 min-w-[44%]">
      <View className="flex-row items-start justify-between mb-3">
        <View
          className="w-10 h-10 rounded-xl items-center justify-center"
          style={{ backgroundColor: bgColor || '#fef3c7' }}
        >
          <Ionicons name={icon} size={20} color={iconColor || '#f59e0b'} />
        </View>
      </View>
      <Text className="text-2xl font-bold text-gray-900" numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Text>
      <Text className="text-xs text-gray-500 mt-1 font-medium">{label}</Text>
      {subtitle && (
        <Text className="text-xs text-green-600 mt-0.5 font-medium">{subtitle}</Text>
      )}
    </View>
  );
}
