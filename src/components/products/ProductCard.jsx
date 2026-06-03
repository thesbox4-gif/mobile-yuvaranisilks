import React from 'react';
import { View, Text, Pressable, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { formatPrice, discountedPrice } from '../../lib/utils';
import TypeBadge from './TypeBadge';

export default function ProductCard({ product, onPress, showStock = false }) {
  const primaryImage = product.images?.find((i) => i.is_primary) || product.images?.[0];
  const finalPrice = discountedPrice(product.base_price, product.discount_pct);
  const hasDiscount = product.discount_pct > 0;
  const variants = Array.isArray(product.variants) ? product.variants : [];
  const inStockVariants = showStock
    ? variants.filter((v) => Number(v.quantity) > 0)
    : [];
  const totalStock = inStockVariants.reduce((sum, v) => sum + Number(v.quantity), 0);
  const colorTotals = inStockVariants.reduce((map, v) => {
    if (!v.color) return map;
    const key = v.color.toString().trim();
    if (!key) return map;
    map[key] = (map[key] ?? 0) + Number(v.quantity);
    return map;
  }, {});
  const colorEntries = Object.entries(colorTotals).sort((a, b) => b[1] - a[1]);

  const hasPhoto = Boolean(primaryImage?.url && !primaryImage?.placeholder);

  return (
    <Pressable
      onPress={onPress}
      className="bg-white rounded-2xl shadow-sm overflow-hidden active:opacity-90"
    >
      {/* Image — 3:4 portrait, full image shown (no crop) */}
      <View className="bg-white" style={{ aspectRatio: 3 / 4 }}>
        {hasPhoto ? (
          <Image
            source={{ uri: primaryImage.url }}
            className="w-full h-full"
            resizeMode="cover"
          />
        ) : (
          <View className="flex-1 items-center justify-center bg-gray-100 px-3">
            <Ionicons name="image-outline" size={32} color="#d1d5db" />
            <Text className="text-center text-xs text-gray-500 mt-2 font-medium" numberOfLines={2}>
              {product.title}
            </Text>
          </View>
        )}
        {/* Published badge */}
        <View className="absolute top-2 right-2">
          <View
            className="px-2 py-0.5 rounded-full"
            style={{ backgroundColor: product.published ? '#dcfce7' : '#f3f4f6' }}
          >
            <Text
              className="text-xs font-semibold"
              style={{ color: product.published ? '#15803d' : '#6b7280' }}
            >
              {product.published ? 'Live' : 'Draft'}
            </Text>
          </View>
        </View>
      </View>

      {/* Info */}
      <View className="p-3">
        {/* Type badge */}
        <View className="flex-row items-center mb-1.5">
          <TypeBadge type={product.type} />
          {product.category && (
            <Text className="text-xs text-gray-400 ml-1">· {product.category.name}</Text>
          )}
        </View>

        <Text className="text-sm font-semibold text-gray-900 leading-5 mb-2" numberOfLines={2}>
          {product.title}
        </Text>

        {/* Price */}
        <View className="flex-row items-center">
          <Text className="text-base font-bold text-gray-900">
            {formatPrice(finalPrice)}
          </Text>
          {hasDiscount && (
            <>
              <Text className="text-xs text-gray-400 line-through ml-1.5">
                {formatPrice(product.base_price)}
              </Text>
              <View className="bg-red-50 px-1.5 py-0.5 rounded ml-1.5">
                <Text className="text-xs text-red-600 font-semibold">{product.discount_pct}% off</Text>
              </View>
            </>
          )}
        </View>

        {showStock && variants.length > 0 && (
          <View className="mt-2">
            {totalStock > 0 ? (
              <>
                <Text className="text-[10px] text-gray-500">In stock: {totalStock}</Text>
                {colorEntries.length > 0 && (
                  <View className="flex-row flex-wrap mt-1">
                    {colorEntries.map(([color, qty]) => (
                      <View key={color} className="px-1.5 py-0.5 rounded-full bg-gray-100 mr-1 mb-1">
                        <Text className="text-[9px] text-gray-600">
                          {color} {qty}
                        </Text>
                      </View>
                    ))}
                  </View>
                )}
              </>
            ) : (
              <Text className="text-[10px] text-red-500">Out of stock</Text>
            )}
          </View>
        )}
      </View>
    </Pressable>
  );
}
