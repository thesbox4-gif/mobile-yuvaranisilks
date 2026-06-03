import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

const THEMED_MESSAGES = {
  saree: { icon: 'shirt-outline', msg: 'No sarees in this collection yet' },
  jewellery: { icon: 'diamond-outline', msg: 'No jewellery pieces here yet' },
  orders: { icon: 'receipt-outline', msg: 'No orders today \u2014 time for chai!' },
  team: { icon: 'people-outline', msg: 'Your team is growing\u2026' },
  customers: { icon: 'person-outline', msg: 'No customers to show yet' },
  sales: { icon: 'trending-up-outline', msg: 'Sales will appear here once you start selling' },
  default: { icon: 'search-outline', msg: 'Nothing here yet' },
};

export default function EmptyState({ icon, title, message, action, onAction, theme }) {
  const themed = THEMED_MESSAGES[theme] || THEMED_MESSAGES.default;
  const finalIcon = icon || themed.icon;
  const finalMessage = message || themed.msg;

  return (
    <View className="flex-1 items-center justify-center px-8 py-16">
      <LinearGradient
        colors={['#fef3c7', '#fff7ed']}
        style={{ width: 88, height: 88, borderRadius: 44, alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}
      >
        <View className="w-16 h-16 bg-amber-100 rounded-full items-center justify-center">
          <Ionicons name={finalIcon} size={32} color="#d97706" />
        </View>
      </LinearGradient>

      {title && (
        <Text className="text-lg font-bold text-gray-900 text-center mb-2">{title}</Text>
      )}
      <Text className="text-sm text-gray-500 text-center leading-5 mb-6">{finalMessage}</Text>

      <View className="w-16 h-0.5 bg-amber-200 rounded-full mb-6" />

      {action && onAction && (
        <Pressable
          onPress={onAction}
          className="bg-amber-500 px-6 py-3 rounded-xl active:bg-amber-600"
          style={{ shadowColor: '#f59e0b', shadowOpacity: 0.3, shadowRadius: 6, shadowOffset: { width: 0, height: 3 }, elevation: 4 }}
        >
          <Text className="text-white font-semibold text-sm">{action}</Text>
        </Pressable>
      )}
    </View>
  );
}
