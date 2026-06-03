import React from 'react';
import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { PRODUCT_TYPES } from '../../constants';

const TYPE_ICONS = {
  saree: 'shirt-outline',
  jewellery: 'diamond-outline',
};

const TYPE_ICON_COLORS = {
  saree: '#db2777',
  jewellery: '#d97706',
};

export default function TypeBadge({ type, showLabel = true, className = '' }) {
  const config = PRODUCT_TYPES.find((t) => t.value === type);
  const icon = config?.icon ?? TYPE_ICONS[type] ?? 'pricetag-outline';
  const color = TYPE_ICON_COLORS[type] ?? '#6b7280';

  return (
    <View className={`flex-row items-center ${className}`}>
      <Ionicons name={icon} size={12} color={color} style={{ marginRight: 4 }} />
      {showLabel && (
        <Text className="text-xs text-gray-500 font-medium capitalize">
          {config?.label ?? type}
        </Text>
      )}
    </View>
  );
}
