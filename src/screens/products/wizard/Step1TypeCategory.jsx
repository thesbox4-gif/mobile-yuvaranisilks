import React from 'react';
import { View, Text, Pressable, ScrollView, ActivityIndicator, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { PRODUCT_TYPE_CARDS } from '../../../constants/productTypes';
import { useQuery } from '@tanstack/react-query';
import { getCategories } from '../../../lib/api';
import { PRODUCT_TYPES } from '../../../constants';

export default function Step1TypeCategory({ wizardData, update }) {
  const { data: categories, isLoading } = useQuery({
    queryKey: ['categories'],
    queryFn: getCategories,
    staleTime: 120_000,
  });

  const all = categories ?? [];
  const topLevel = all.filter((c) => !c.parent_id);
  const childrenOf = (id) => all.filter((c) => c.parent_id === id);

  // Derive the selected parent from whatever category is chosen.
  const selected = all.find((c) => c.id === wizardData.categoryId);
  const activeParentId = selected?.parent_id || selected?.id || '';
  const subs = activeParentId ? childrenOf(activeParentId) : [];

  return (
    <ScrollView className="flex-1" contentContainerStyle={{ padding: 16 }} keyboardShouldPersistTaps="handled">
      {/* Product type */}
      <Text className="text-base font-semibold text-gray-800 mb-4">What type of product?</Text>
      <View className="flex-row gap-3 mb-8">
        {PRODUCT_TYPES.map((t) => {
          const card = PRODUCT_TYPE_CARDS.find((c) => c.key === t.value);
          return (
          <Pressable
            key={t.value}
            onPress={() => update({ type: t.value })}
            className={`flex-1 rounded-2xl py-4 items-center border-2 overflow-hidden ${
              wizardData.type === t.value
                ? 'border-amber-500 bg-amber-50'
                : 'border-gray-200 bg-white'
            }`}
          >
            {card?.image ? (
              <Image source={card.image} className="w-16 h-16 rounded-xl mb-2" resizeMode="cover" />
            ) : (
              <Ionicons name={t.icon} size={28} color="#d97706" style={{ marginBottom: 8 }} />
            )}
            <Text className={`text-sm font-semibold ${wizardData.type === t.value ? 'text-amber-700' : 'text-gray-700'}`}>
              {t.label}
            </Text>
          </Pressable>
        );})}
      </View>

      {/* Category */}
      <Text className="text-base font-semibold text-gray-800 mb-1">Select category</Text>
      <Text className="text-xs text-gray-500 mb-3">Pick a category, then a sub-category if available.</Text>

      {isLoading ? (
        <ActivityIndicator color="#f59e0b" />
      ) : topLevel.length === 0 ? (
        <View className="bg-gray-50 rounded-xl p-4">
          <Text className="text-sm text-gray-500">
            No categories yet. Create them from the Categories screen first.
          </Text>
        </View>
      ) : (
        <View className="flex-row flex-wrap gap-2">
          {topLevel.map((cat) => {
            const isActive = activeParentId === cat.id;
            return (
              <Pressable
                key={cat.id}
                onPress={() => update({ categoryId: cat.id })}
                className={`px-4 py-2.5 rounded-xl border ${
                  isActive ? 'bg-amber-500 border-amber-500' : 'bg-white border-gray-200'
                }`}
              >
                <Text className={`text-sm font-semibold ${isActive ? 'text-white' : 'text-gray-700'}`}>
                  {cat.name}
                </Text>
              </Pressable>
            );
          })}
        </View>
      )}

      {/* Sub-categories */}
      {subs.length > 0 && (
        <View className="mt-6">
          <Text className="text-base font-semibold text-gray-800 mb-1">Sub-category</Text>
          <Text className="text-xs text-gray-500 mb-3">Optional — refine within the category.</Text>
          <View className="flex-row flex-wrap gap-2">
            {subs.map((cat) => {
              const isActive = wizardData.categoryId === cat.id;
              return (
                <Pressable
                  key={cat.id}
                  onPress={() => update({ categoryId: cat.id })}
                  className={`px-3.5 py-2 rounded-lg border ${
                    isActive ? 'bg-amber-500 border-amber-500' : 'bg-white border-gray-200'
                  }`}
                >
                  <Text className={`text-xs font-semibold ${isActive ? 'text-white' : 'text-gray-600'}`}>
                    {cat.name}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      )}
    </ScrollView>
  );
}
