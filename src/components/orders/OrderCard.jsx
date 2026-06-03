import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { formatPrice, shortId, timeAgo } from '../../lib/utils';
import { ORDER_STATUS_CONFIG } from '../../constants';

export default function OrderCard({ order, onPress }) {
  const cfg = ORDER_STATUS_CONFIG[order.status] || ORDER_STATUS_CONFIG.placed;
  const itemCount = order.order_items?.length ?? 0;

  return (
    <Pressable
      onPress={onPress}
      className="bg-white rounded-2xl shadow-sm mx-4 mb-3 overflow-hidden active:opacity-90"
    >
      <View className="px-4 py-3.5 flex-row items-center">
        {/* Status dot */}
        <View
          className="w-10 h-10 rounded-full items-center justify-center mr-3"
          style={{ backgroundColor: cfg.bg }}
        >
          <View className="w-3 h-3 rounded-full" style={{ backgroundColor: cfg.dot }} />
        </View>

        <View className="flex-1">
          <View className="flex-row items-center justify-between mb-0.5">
            <Text className="text-sm font-bold text-gray-900">#{shortId(order.id)}</Text>
            <Text className="text-sm font-bold text-gray-900">{formatPrice(order.total_amount)}</Text>
          </View>
          <View className="flex-row items-center justify-between">
            <Text className="text-xs text-gray-500">
              {timeAgo(order.created_at)}
              {itemCount > 0 && ` · ${itemCount} item${itemCount !== 1 ? 's' : ''}`}
            </Text>
            <View className="px-2 py-0.5 rounded-full" style={{ backgroundColor: cfg.bg }}>
              <Text className="text-xs font-semibold" style={{ color: cfg.text }}>{cfg.label}</Text>
            </View>
          </View>
        </View>

        <Ionicons name="chevron-forward" size={16} color="#d1d5db" className="ml-2" />
      </View>
    </Pressable>
  );
}
