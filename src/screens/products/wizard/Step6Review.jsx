import React from 'react';
import { View, Text, ScrollView, Pressable, Image, ActivityIndicator } from 'react-native';
import { formatPrice, discountedPrice } from '../../../lib/utils';
import { PRODUCT_TYPES } from '../../../constants';
import TypeBadge from '../../../components/products/TypeBadge';

function ReviewRow({ label, value }) {
  return (
    <View className="flex-row items-start py-2.5 border-b border-gray-50">
      <Text className="text-sm text-gray-500 w-28 shrink-0">{label}</Text>
      <Text className="text-sm font-medium text-gray-900 flex-1" numberOfLines={3}>{value || '—'}</Text>
    </View>
  );
}

export default function Step6Review({ wizardData, onSaveDraft, onPublish, isSaving }) {
  const { type, categoryId, images, variants, content, pricing } = wizardData;
  const typeConfig = PRODUCT_TYPES.find((t) => t.value === type);
  const finalPrice = discountedPrice(Number(pricing.basePrice), Number(pricing.discountPct));
  const totalStock = variants.reduce((sum, v) => sum + (Number(v.quantity) || 0), 0);
  const primaryImg = images.find((i) => i.isPrimary) || images[0];

  return (
    <ScrollView className="flex-1" contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 120 }}>
      <Text className="text-base font-semibold text-gray-800 mb-4">Review before saving</Text>

      {/* Preview card */}
      <View className="bg-white rounded-2xl shadow-sm overflow-hidden mb-6">
        {primaryImg && (
          <Image source={{ uri: primaryImg.uri || primaryImg.uploadedUrl }} className="w-full h-44" resizeMode="cover" />
        )}
        <View className="p-4">
          <View className="flex-row items-center mb-2 gap-2">
            <View className="bg-amber-50 px-2.5 py-1 rounded-full">
              <TypeBadge type={type} />
            </View>
          </View>
          <Text className="text-base font-bold text-gray-900 mb-1">{content.title || 'Untitled product'}</Text>
          <View className="flex-row items-center">
            <Text className="text-lg font-bold text-gray-900">{formatPrice(finalPrice)}</Text>
            {pricing.discountPct > 0 && (
              <Text className="text-sm text-gray-400 line-through ml-2">{formatPrice(Number(pricing.basePrice))}</Text>
            )}
          </View>
        </View>
      </View>

      {/* Details */}
      <View className="bg-white rounded-2xl p-4 shadow-sm mb-4">
        <Text className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Details</Text>
        <ReviewRow label="Type" value={typeConfig?.label ?? type} />
        <ReviewRow label="Images" value={`${images.length} color(s)`} />
        <ReviewRow label="Variants" value={`${variants.filter((v) => v.quantity > 0).length} active, ${totalStock} total units`} />
        <ReviewRow label="Price" value={formatPrice(finalPrice)} />
        {pricing.discountPct > 0 && <ReviewRow label="Discount" value={`${pricing.discountPct}%`} />}
        {pricing.couponCode && <ReviewRow label="Coupon" value={`${pricing.couponCode} (${pricing.couponDiscount}% off)`} />}
      </View>

      {content.description ? (
        <View className="bg-white rounded-2xl p-4 shadow-sm mb-6">
          <Text className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Description</Text>
          <Text className="text-sm text-gray-700 leading-5">{content.description}</Text>
        </View>
      ) : null}

      {/* Image grid */}
      {images.length > 0 && (
        <View className="mb-6">
          <Text className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Images</Text>
          <View className="flex-row flex-wrap gap-2">
            {images.map((img, i) => (
              <View key={i} className="relative">
                <Image source={{ uri: img.uri || img.uploadedUrl }} className="w-20 h-20 rounded-xl" resizeMode="cover" />
                {img.isPrimary && (
                  <View className="absolute bottom-1 left-1 bg-amber-500 px-1.5 rounded-full">
                    <Text className="text-white text-xs font-bold">★</Text>
                  </View>
                )}
                <Text className="text-xs text-gray-500 text-center mt-1">{img.color}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Action buttons */}
      <View className="gap-3">
        <Pressable
          onPress={onPublish}
          disabled={isSaving}
          className="bg-amber-500 rounded-xl py-4 items-center active:bg-amber-600"
          style={{ opacity: isSaving ? 0.7 : 1 }}
        >
          {isSaving ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <Text className="text-white font-bold text-base">🚀 Publish to Store</Text>
          )}
        </Pressable>
        <Pressable
          onPress={onSaveDraft}
          disabled={isSaving}
          className="border-2 border-gray-300 rounded-xl py-4 items-center active:bg-gray-50"
          style={{ opacity: isSaving ? 0.7 : 1 }}
        >
          <Text className="text-gray-700 font-semibold text-base">Save as Draft</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}
