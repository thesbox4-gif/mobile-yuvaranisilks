import React, { useEffect } from 'react';
import { View, Text, TextInput, ScrollView } from 'react-native';
import { PRODUCT_SIZES } from '../../../constants';

function qtyClass(qty) {
  if (qty === 0) return 'border-gray-200 text-gray-400';
  if (qty < 5) return 'border-amber-300 text-amber-700';
  return 'border-green-300 text-green-700';
}

export default function Step3Variants({ wizardData, update }) {
  const colors = wizardData.images.map((i) => i.color).filter(Boolean);
  const sizes = PRODUCT_SIZES[wizardData.type] ?? [];
  const hasSizes = sizes.length > 0;

  // Rebuild the variant grid whenever colors or sizes change.
  useEffect(() => {
    if (!colors.length) return;
    const existing = wizardData.variants;
    const newVariants = [];
    for (const color of colors) {
      if (hasSizes) {
        for (const size of sizes) {
          const found = existing.find((v) => v.color === color && v.size === size);
          newVariants.push(found ?? { color, size, quantity: 0, sku: '' });
        }
      } else {
        const found = existing.find((v) => v.color === color);
        newVariants.push(found ?? { color, size: '', quantity: 0, sku: '' });
      }
    }
    update({ variants: newVariants });
  }, [colors.join(','), sizes.join(',')]);

  const setQty = (color, size, qty) => {
    const variants = wizardData.variants.map((v) =>
      v.color === color && v.size === size
        ? { ...v, quantity: Math.max(0, parseInt(qty) || 0) }
        : v
    );
    update({ variants });
  };

  if (!colors.length) {
    return (
      <View className="flex-1 items-center justify-center p-8">
        <Text className="text-gray-500 text-center text-sm">
          Please add product images in Step 2 first — variants are generated from your image colors.
        </Text>
      </View>
    );
  }

  return (
    <ScrollView className="flex-1" contentContainerStyle={{ padding: 16 }}>
      <Text className="text-base font-semibold text-gray-800 mb-1">Stock Quantities</Text>
      <Text className="text-sm text-gray-500 mb-5">
        {hasSizes
          ? 'Set quantity for each Color × Size combination.'
          : 'Set the stock quantity for each color.'}
      </Text>

      {colors.map((color) => (
        <View key={color} className="bg-white rounded-2xl shadow-sm mb-4 overflow-hidden">
          <View className="bg-amber-50 px-4 py-3 border-b border-amber-100">
            <Text className="text-sm font-bold text-amber-800">{color}</Text>
          </View>
          <View className="p-3">
            {hasSizes ? (
              <View className="flex-row flex-wrap gap-3">
                {sizes.map((size) => {
                  const variant = wizardData.variants.find((v) => v.color === color && v.size === size);
                  const qty = variant?.quantity ?? 0;
                  return (
                    <View key={size} className="items-center" style={{ width: 72 }}>
                      <Text className="text-xs text-gray-500 mb-1.5 font-medium">{size}</Text>
                      <TextInput
                        className={`w-full text-center border rounded-xl py-2.5 text-sm font-semibold ${qtyClass(qty)} bg-gray-50`}
                        value={qty.toString()}
                        onChangeText={(t) => setQty(color, size, t)}
                        keyboardType="number-pad"
                        selectTextOnFocus
                      />
                    </View>
                  );
                })}
              </View>
            ) : (
              (() => {
                const variant = wizardData.variants.find((v) => v.color === color);
                const qty = variant?.quantity ?? 0;
                return (
                  <View className="flex-row items-center">
                    <Text className="text-sm text-gray-600 flex-1">Quantity in stock</Text>
                    <TextInput
                      className={`w-24 text-center border rounded-xl py-2.5 text-sm font-semibold ${qtyClass(qty)} bg-gray-50`}
                      value={qty.toString()}
                      onChangeText={(t) => setQty(color, '', t)}
                      keyboardType="number-pad"
                      selectTextOnFocus
                    />
                  </View>
                );
              })()
            )}
          </View>
        </View>
      ))}

      <View className="bg-blue-50 rounded-2xl p-4 mt-2">
        <Text className="text-xs text-blue-600 font-medium">
          💡 Tip: Enter 0 for variants you don't carry. Items with 0 stock will not be shown to customers.
        </Text>
      </View>
    </ScrollView>
  );
}
