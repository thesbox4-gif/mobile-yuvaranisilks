import React from 'react';
import { View, Text, Pressable, Image, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const CARD_BG = '#ffffff';
const SECTION_BORDER = '#fde8d0';

/**
 * Shared Collections overview card (type roots + sub-categories).
 */
export default function CollectionCategoryCard({
  title,
  imageUrl,
  fallbackSource,
  fallbackIcon = 'layers',
  fallbackIconColor = '#d97706',
  stats,
  typeLabel = 'items',
  stockReady = false,
  fullWidth = false,
  onPress,
  canAddImage = false,
  onAddImage,
  uploading = false,
  /** When true, always use bundled fallback image (Sarees / Gold roots). */
  useFixedImage = false,
  /** Shorter banner card for Collections home (both types on one screen). */
  compact = false,
}) {
  const colors = stats?.colors ?? [];
  const widthStyle = fullWidth ? { width: '100%' } : { width: '48%' };
  const showRemoteImage = !useFixedImage && Boolean(imageUrl);
  const imageSource = showRemoteImage
    ? { uri: imageUrl }
    : fallbackSource
      ? fallbackSource
      : null;

  if (compact) {
    return (
      <Pressable
        onPress={onPress}
        className="rounded-2xl overflow-hidden flex-1"
        style={{ backgroundColor: CARD_BG, borderWidth: 1.5, borderColor: SECTION_BORDER, minHeight: 0 }}
      >
        <View className="flex-1 relative" style={{ backgroundColor: '#f3f4f6' }}>
          {imageSource ? (
            <Image source={imageSource} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
          ) : (
            <View className="flex-1 items-center justify-center">
              <Ionicons name={fallbackIcon} size={32} color="#d1d5db" />
            </View>
          )}
          <View
            className="absolute left-0 right-0 bottom-0 flex-row items-end justify-between px-3 py-2.5"
            style={{ backgroundColor: 'rgba(30, 20, 10, 0.55)' }}
          >
            <View className="flex-1 pr-2">
              <Text className="text-base font-bold text-white" numberOfLines={1}>{title}</Text>
              {stats?.subtitle ? (
                <Text className="text-[11px] text-white/85 mt-0.5">{stats.subtitle}</Text>
              ) : null}
            </View>
            <View className="flex-row items-center px-2 py-1 rounded-full" style={{ backgroundColor: 'rgba(255,255,255,0.2)' }}>
              <Text className="text-[10px] font-semibold text-white">View</Text>
              <Ionicons name="arrow-forward" size={10} color="#ffffff" style={{ marginLeft: 2 }} />
            </View>
          </View>
        </View>
      </Pressable>
    );
  }

  return (
    <Pressable
      onPress={onPress}
      className="mb-3 rounded-2xl overflow-hidden"
      style={{ ...widthStyle, backgroundColor: CARD_BG, borderWidth: 1.5, borderColor: SECTION_BORDER }}
    >
      <View className="relative" style={{ aspectRatio: 4 / 3, backgroundColor: '#f9fafb' }}>
        {showRemoteImage ? (
          <Image source={{ uri: imageUrl }} className="w-full h-full" resizeMode="cover" />
        ) : fallbackSource ? (
          <Image source={fallbackSource} className="w-full h-full" resizeMode="cover" />
        ) : (
          <View className="flex-1 items-center justify-center">
            <Ionicons name={fallbackIcon} size={36} color="#d1d5db" />
          </View>
        )}
        {canAddImage && (
          <Pressable
            onPress={onAddImage}
            disabled={uploading}
            className="absolute bottom-2 right-2 flex-row items-center px-2.5 py-1.5 rounded-full"
            style={{ backgroundColor: 'rgba(0,0,0,0.55)' }}
          >
            {uploading ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <>
                <Ionicons name="camera" size={14} color="#ffffff" />
                <Text className="text-[10px] font-semibold text-white ml-1">
                  {imageUrl ? 'Change' : 'Add photo'}
                </Text>
              </>
            )}
          </Pressable>
        )}
      </View>

      <View className="px-3 pt-3 pb-2 items-center">
        <Text className="text-sm font-bold text-center" style={{ color: '#78350f' }} numberOfLines={2}>
          {title}
        </Text>
        {stockReady && stats && (
          <>
            <Text className="text-[10px] mt-1" style={{ color: '#a16207' }}>
              {stats.productCount ?? 0} {typeLabel}
            </Text>
            <Text className="text-[10px]" style={{ color: '#a16207' }}>
              {stats.totalStock ?? 0} in stock
            </Text>
          </>
        )}
        {!stockReady && stats?.subtitle ? (
          <Text className="text-[10px] mt-1" style={{ color: '#a16207' }}>
            {stats.subtitle}
          </Text>
        ) : null}
      </View>

      {stockReady && colors.length > 0 && (
        <View className="px-3 pb-2">
          <View className="flex-row flex-wrap justify-center">
            {colors.map(([color, qty]) => (
              <View key={color} className="px-1.5 py-0.5 rounded-full bg-amber-50 mr-1 mb-1">
                <Text className="text-[9px]" style={{ color: '#b45309' }}>
                  {color} {qty}
                </Text>
              </View>
            ))}
          </View>
        </View>
      )}

      <View className="px-3 py-2 items-center" style={{ backgroundColor: '#fef7f0' }}>
        <Text className="text-[10px] font-semibold" style={{ color: '#b45309' }}>
          View <Ionicons name="arrow-forward" size={8} color="#b45309" />
        </Text>
      </View>
    </Pressable>
  );
}
