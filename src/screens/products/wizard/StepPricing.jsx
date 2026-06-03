import React from 'react';
import { View, Text, TextInput, ScrollView, Switch, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { formatPrice, discountedPrice } from '../../../lib/utils';

export default function StepPricing({ wizardData, update }) {
  const { basePrice, discountPct, couponCode, couponDiscount, tags } = wizardData.pricing;
  const [hasCoupon, setHasCoupon] = React.useState(!!couponCode);
  const [tagInput, setTagInput] = React.useState(tags || '');

  const updatePricing = (partial) =>
    update({ pricing: { ...wizardData.pricing, ...partial } });

  const finalPrice = discountedPrice(Number(basePrice) || 0, Number(discountPct) || 0);
  const savings = (Number(basePrice) || 0) - finalPrice;

  const parsedTags = tagInput
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean);

  const removeTag = (tagToRemove) => {
    const updated = parsedTags.filter((t) => t !== tagToRemove).join(', ');
    setTagInput(updated);
    updatePricing({ tags: updated });
  };

  const handleTagChange = (text) => {
    setTagInput(text);
    updatePricing({ tags: text });
  };

  return (
    <ScrollView className="flex-1" contentContainerStyle={{ padding: 16 }} keyboardShouldPersistTaps="handled">
      <Text className="text-base font-semibold text-gray-800 mb-5">Pricing</Text>

      <View className="mb-4">
        <Text className="text-sm font-medium text-gray-700 mb-1.5">Base Price (INR) *</Text>
        <View className="flex-row items-center border border-gray-200 rounded-xl bg-white overflow-hidden">
          <View className="bg-gray-100 px-4 py-3.5">
            <Text className="text-base font-semibold text-gray-500">₹</Text>
          </View>
          <TextInput
            className="flex-1 px-4 py-3.5 text-base text-gray-900 font-semibold"
            placeholder="0"
            placeholderTextColor="#9ca3af"
            keyboardType="number-pad"
            value={basePrice ? basePrice.toString() : ''}
            onChangeText={(t) => updatePricing({ basePrice: parseInt(t) || 0 })}
          />
        </View>
      </View>

      <View className="mb-6">
        <Text className="text-sm font-medium text-gray-700 mb-1.5">Discount (%)</Text>
        <View className="flex-row items-center border border-gray-200 rounded-xl bg-white overflow-hidden">
          <TextInput
            className="flex-1 px-4 py-3.5 text-base text-gray-900"
            placeholder="0"
            placeholderTextColor="#9ca3af"
            keyboardType="number-pad"
            value={discountPct ? discountPct.toString() : ''}
            onChangeText={(t) => {
              const v = Math.min(90, Math.max(0, parseInt(t) || 0));
              updatePricing({ discountPct: v });
            }}
          />
          <View className="bg-gray-100 px-4 py-3.5">
            <Text className="text-base font-semibold text-gray-500">%</Text>
          </View>
        </View>
      </View>

      {Number(basePrice) > 0 && (
        <View className="bg-amber-50 rounded-2xl p-4 mb-6 border border-amber-100">
          <Text className="text-xs text-amber-700 font-semibold mb-3 uppercase tracking-wide">Pricing Preview</Text>
          <View className="flex-row items-center justify-between mb-2">
            <Text className="text-sm text-gray-600">Base price</Text>
            <Text className="text-sm font-semibold text-gray-800">{formatPrice(Number(basePrice))}</Text>
          </View>
          {Number(discountPct) > 0 && (
            <View className="flex-row items-center justify-between mb-2">
              <Text className="text-sm text-gray-600">Discount ({discountPct}%)</Text>
              <Text className="text-sm font-semibold text-red-600">−{formatPrice(savings)}</Text>
            </View>
          )}
          <View className="border-t border-amber-200 mt-2 pt-2 flex-row items-center justify-between">
            <Text className="text-sm font-bold text-gray-900">Customer pays</Text>
            <Text className="text-lg font-bold text-amber-700">{formatPrice(finalPrice)}</Text>
          </View>
        </View>
      )}

      <View className="bg-white rounded-2xl p-4 shadow-sm mb-6">
        <View className="flex-row items-center justify-between mb-3">
          <View className="flex-1">
            <Text className="text-sm font-semibold text-gray-800">Add coupon code</Text>
            <Text className="text-xs text-gray-500 mt-0.5">Optional extra discount via coupon</Text>
          </View>
          <Switch
            value={hasCoupon}
            onValueChange={(v) => {
              setHasCoupon(v);
              if (!v) updatePricing({ couponCode: '', couponDiscount: 0 });
            }}
            trackColor={{ false: '#e5e7eb', true: '#fcd34d' }}
            thumbColor={hasCoupon ? '#f59e0b' : '#9ca3af'}
          />
        </View>
        {hasCoupon && (
          <View className="flex-row gap-3">
            <View className="flex-1">
              <Text className="text-xs text-gray-500 mb-1.5 font-medium">Code</Text>
              <TextInput
                className="border border-gray-200 rounded-xl px-3 py-2.5 text-base text-gray-900 bg-gray-50 uppercase font-mono"
                placeholder="SUMMER20"
                placeholderTextColor="#9ca3af"
                value={couponCode}
                onChangeText={(t) => updatePricing({ couponCode: t.toUpperCase() })}
                autoCapitalize="characters"
              />
            </View>
            <View style={{ width: 80 }}>
              <Text className="text-xs text-gray-500 mb-1.5 font-medium">Disc %</Text>
              <TextInput
                className="border border-gray-200 rounded-xl px-3 py-2.5 text-base text-gray-900 bg-gray-50 text-center"
                placeholder="5"
                placeholderTextColor="#9ca3af"
                keyboardType="number-pad"
                value={couponDiscount ? couponDiscount.toString() : ''}
                onChangeText={(t) => updatePricing({ couponDiscount: parseInt(t) || 0 })}
              />
            </View>
          </View>
        )}
      </View>

      <View className="bg-white rounded-2xl p-4 shadow-sm">
        <View className="mb-2">
          <Text className="text-sm font-semibold text-gray-800">Tags</Text>
          <Text className="text-xs text-gray-500 mt-0.5">Comma-separated for better searchability</Text>
        </View>
        <TextInput
          className="border border-gray-200 rounded-xl px-4 py-3 text-base text-gray-900 bg-gray-50"
          placeholder="wedding, festive, silk, party"
          placeholderTextColor="#9ca3af"
          value={tagInput}
          onChangeText={handleTagChange}
          autoCapitalize="none"
        />
        {parsedTags.length > 0 && (
          <View className="flex-row flex-wrap mt-3 gap-2">
            {parsedTags.map((tag) => (
              <View key={tag} className="flex-row items-center bg-indigo-50 border border-indigo-200 rounded-full px-3 py-1.5">
                <Text className="text-xs text-indigo-700 font-medium">{tag}</Text>
                <Pressable onPress={() => removeTag(tag)} hitSlop={8} className="ml-1.5">
                  <Ionicons name="close-circle" size={14} color="#6366f1" />
                </Pressable>
              </View>
            ))}
          </View>
        )}
      </View>
    </ScrollView>
  );
}
