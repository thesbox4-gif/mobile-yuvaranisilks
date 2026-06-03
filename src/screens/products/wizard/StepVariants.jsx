import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TextInput, Pressable, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, PRODUCT_SIZES } from '../../../constants';
import { GOLD_PURITIES, GOLD_COLORS, STONE_TYPES } from '../../../constants/categories';

function Chip({ label, selected, onPress, colorDot }) {
  return (
    <Pressable
      onPress={onPress}
      className={`flex-row items-center px-3 py-2 rounded-full border mr-2 mb-2 ${
        selected
          ? 'bg-amber-50 border-amber-400'
          : 'bg-white border-gray-200'
      }`}
    >
      {colorDot && (
        <View
          className="w-3 h-3 rounded-full mr-1.5 border border-gray-200"
          style={{ backgroundColor: colorDot }}
        />
      )}
      <Text
        className={`text-xs font-semibold ${
          selected ? 'text-amber-800' : 'text-gray-600'
        }`}
      >
        {label}
      </Text>
      {selected && (
        <Ionicons name="checkmark-circle" size={14} color="#d97706" style={{ marginLeft: 4 }} />
      )}
    </Pressable>
  );
}

function QtyRow({ label, qty, onChange }) {
  return (
    <View className="flex-row items-center justify-between py-2">
      <Text className="text-sm text-gray-700 font-medium">{label}</Text>
      <TextInput
        className={`w-20 text-center border rounded-xl py-2 text-sm font-semibold bg-gray-50 ${
          qty === 0 ? 'border-gray-200 text-gray-400' : qty < 5 ? 'border-amber-300 text-amber-700' : 'border-green-300 text-green-700'
        }`}
        value={qty.toString()}
        onChangeText={onChange}
        keyboardType="number-pad"
        selectTextOnFocus
      />
    </View>
  );
}

const COLOR_MAP = {
  Red: '#ef4444', Blue: '#3b82f6', Green: '#22c55e', Yellow: '#eab308',
  Purple: '#a855f7', Pink: '#ec4899', Orange: '#f97316', Black: '#1f2937',
  White: '#f9fafb', Navy: '#1e3a5f', Maroon: '#7f1d1d', Teal: '#14b8a6',
  Gold: '#d4a017', Silver: '#9ca3af', Brown: '#92400e', Cream: '#fef3c7',
  Ivory: '#fffff0',
};

export default function StepVariants({ wizardData, update }) {
  const type = wizardData.type;

  if (type === 'jewellery') return <GoldMode wizardData={wizardData} update={update} />;
  return <SareeMode wizardData={wizardData} update={update} />;
}

// ─── Saree Mode ─────────────────────────────────────────────────────────────────

function SareeMode({ wizardData, update }) {
  const [selectedColors, setSelectedColors] = useState(() => {
    const existing = wizardData.variants.map((v) => v.color).filter(Boolean);
    return existing.length ? existing : [];
  });

  const buildVariants = useCallback((colors, current) => {
    return colors.map((color) => {
      const found = current.find((v) => v.color === color && v.size === '');
      return found || { color, size: '', quantity: 0, sku: '' };
    });
  }, []);

  useEffect(() => {
    const variants = buildVariants(selectedColors, wizardData.variants);
    update({ variants });
  }, [selectedColors.join(',')]);

  const toggleColor = (color) => {
    setSelectedColors((prev) =>
      prev.includes(color) ? prev.filter((c) => c !== color) : [...prev, color]
    );
  };

  const setQty = (color, val) => {
    const qty = Math.max(0, parseInt(val) || 0);
    const variants = wizardData.variants.map((v) =>
      v.color === color ? { ...v, quantity: qty } : v
    );
    update({ variants });
  };

  return (
    <ScrollView className="flex-1" contentContainerStyle={{ padding: 16 }}>
      <Text className="text-base font-semibold text-gray-800 mb-1">Colors & Pieces</Text>
      <Text className="text-xs text-gray-500 mb-4">Select available colors, then set stock per color.</Text>

      <View className="flex-row flex-wrap mb-4">
        {COLORS.map((color) => (
          <Chip
            key={color}
            label={color}
            selected={selectedColors.includes(color)}
            onPress={() => toggleColor(color)}
            colorDot={COLOR_MAP[color]}
          />
        ))}
      </View>

      {selectedColors.length > 0 && (
        <View className="bg-white rounded-2xl shadow-sm p-4">
          <Text className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
            Quantity per Color
          </Text>
          {selectedColors.map((color) => {
            const variant = wizardData.variants.find((v) => v.color === color);
            const qty = variant?.quantity ?? 0;
            return (
              <QtyRow
                key={color}
                label={color}
                qty={qty}
                onChange={(val) => setQty(color, val)}
              />
            );
          })}
        </View>
      )}
    </ScrollView>
  );
}

// ─── Dress Mode ─────────────────────────────────────────────────────────────────

function DressMode({ wizardData, update }) {
  const sizes = PRODUCT_SIZES.dress;

  const [selectedSizes, setSelectedSizes] = useState(() => {
    const existing = [...new Set(wizardData.variants.map((v) => v.size).filter(Boolean))];
    return existing.length ? existing : [];
  });

  const [selectedColors, setSelectedColors] = useState(() => {
    const existing = [...new Set(wizardData.variants.map((v) => v.color).filter(Boolean))];
    return existing.length ? existing : [];
  });

  const buildVariants = useCallback((colors, szs, current) => {
    const variants = [];
    for (const color of colors) {
      for (const size of szs) {
        const found = current.find((v) => v.color === color && v.size === size);
        variants.push(found || { color, size, quantity: 0, sku: '' });
      }
    }
    return variants;
  }, []);

  useEffect(() => {
    if (!selectedColors.length || !selectedSizes.length) {
      update({ variants: [] });
      return;
    }
    const variants = buildVariants(selectedColors, selectedSizes, wizardData.variants);
    update({ variants });
  }, [selectedColors.join(','), selectedSizes.join(',')]);

  const toggleSize = (size) => {
    setSelectedSizes((prev) =>
      prev.includes(size) ? prev.filter((s) => s !== size) : [...prev, size]
    );
  };

  const toggleColor = (color) => {
    setSelectedColors((prev) =>
      prev.includes(color) ? prev.filter((c) => c !== color) : [...prev, color]
    );
  };

  const setQty = (color, size, val) => {
    const qty = Math.max(0, parseInt(val) || 0);
    const variants = wizardData.variants.map((v) =>
      v.color === color && v.size === size ? { ...v, quantity: qty } : v
    );
    update({ variants });
  };

  return (
    <ScrollView className="flex-1" contentContainerStyle={{ padding: 16 }}>
      <Text className="text-base font-semibold text-gray-800 mb-1">Sizes, Colors & Pieces</Text>
      <Text className="text-xs text-gray-500 mb-4">Select sizes and colors, then set stock for each combo.</Text>

      <Text className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Sizes</Text>
      <View className="flex-row flex-wrap mb-4">
        {sizes.map((size) => (
          <Chip
            key={size}
            label={size}
            selected={selectedSizes.includes(size)}
            onPress={() => toggleSize(size)}
          />
        ))}
      </View>

      <Text className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Colors</Text>
      <View className="flex-row flex-wrap mb-4">
        {COLORS.map((color) => (
          <Chip
            key={color}
            label={color}
            selected={selectedColors.includes(color)}
            onPress={() => toggleColor(color)}
            colorDot={COLOR_MAP[color]}
          />
        ))}
      </View>

      {selectedColors.length > 0 && selectedSizes.length > 0 && (
        <View>
          {selectedColors.map((color) => (
            <View key={color} className="bg-white rounded-2xl shadow-sm mb-4 overflow-hidden">
              <View className="bg-amber-50 px-4 py-3 border-b border-amber-100">
                <Text className="text-sm font-bold text-amber-800">{color}</Text>
              </View>
              <View className="p-3">
                <View className="flex-row flex-wrap gap-3">
                  {selectedSizes.map((size) => {
                    const variant = wizardData.variants.find(
                      (v) => v.color === color && v.size === size
                    );
                    const qty = variant?.quantity ?? 0;
                    return (
                      <View key={size} className="items-center" style={{ width: 72 }}>
                        <Text className="text-xs text-gray-500 mb-1.5 font-medium">{size}</Text>
                        <TextInput
                          className={`w-full text-center border rounded-xl py-2.5 text-sm font-semibold bg-gray-50 ${
                            qty === 0
                              ? 'border-gray-200 text-gray-400'
                              : qty < 5
                              ? 'border-amber-300 text-amber-700'
                              : 'border-green-300 text-green-700'
                          }`}
                          value={qty.toString()}
                          onChangeText={(t) => setQty(color, size, t)}
                          keyboardType="number-pad"
                          selectTextOnFocus
                        />
                      </View>
                    );
                  })}
                </View>
              </View>
            </View>
          ))}
        </View>
      )}

      {(!selectedColors.length || !selectedSizes.length) && (
        <View className="bg-blue-50 rounded-2xl p-4 mt-2">
          <Text className="text-xs text-blue-600 font-medium">
            Select at least one size and one color to configure stock quantities.
          </Text>
        </View>
      )}
    </ScrollView>
  );
}

// ─── Gold / Jewellery Mode ──────────────────────────────────────────────────────

function GoldMode({ wizardData, update }) {
  const weights = PRODUCT_SIZES.jewellery;
  const extras = wizardData.extras || {};

  const [purity, setPurity] = useState(extras.purity || '22K');
  const [goldColor, setGoldColor] = useState(extras.goldColor || 'Gold');
  const [stoneType, setStoneType] = useState(extras.stoneType || 'None');
  const [selectedWeights, setSelectedWeights] = useState(() => {
    const existing = wizardData.variants.map((v) => v.size).filter(Boolean);
    return existing.length ? [...new Set(existing)] : [];
  });

  const buildVariants = useCallback((wts, gc, current) => {
    return wts.map((w) => {
      const found = current.find((v) => v.size === w);
      return found || { color: gc, size: w, quantity: 0, sku: '' };
    });
  }, []);

  useEffect(() => {
    const variants = buildVariants(selectedWeights, goldColor, wizardData.variants);
    update({ variants, extras: { purity, goldColor, stoneType } });
  }, [selectedWeights.join(','), purity, goldColor, stoneType]);

  const toggleWeight = (w) => {
    setSelectedWeights((prev) =>
      prev.includes(w) ? prev.filter((x) => x !== w) : [...prev, w]
    );
  };

  const setQty = (weight, val) => {
    const qty = Math.max(0, parseInt(val) || 0);
    const variants = wizardData.variants.map((v) =>
      v.size === weight ? { ...v, quantity: qty } : v
    );
    update({ variants, extras: { purity, goldColor, stoneType } });
  };

  return (
    <ScrollView className="flex-1" contentContainerStyle={{ padding: 16 }}>
      <Text className="text-base font-semibold text-gray-800 mb-1">Weight, Purity & Pieces</Text>
      <Text className="text-xs text-gray-500 mb-4">Configure gold specifications and stock.</Text>

      <Text className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Purity</Text>
      <View className="flex-row flex-wrap mb-4">
        {GOLD_PURITIES.map((p) => (
          <Chip
            key={p}
            label={p}
            selected={purity === p}
            onPress={() => setPurity(p)}
          />
        ))}
      </View>

      <Text className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Gold Color</Text>
      <View className="flex-row flex-wrap mb-4">
        {GOLD_COLORS.map((gc) => (
          <Chip
            key={gc}
            label={gc}
            selected={goldColor === gc}
            onPress={() => setGoldColor(gc)}
          />
        ))}
      </View>

      <Text className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Stone Type</Text>
      <View className="flex-row flex-wrap mb-4">
        {STONE_TYPES.map((st) => (
          <Chip
            key={st}
            label={st}
            selected={stoneType === st}
            onPress={() => setStoneType(st)}
          />
        ))}
      </View>

      <Text className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Weight Options</Text>
      <View className="flex-row flex-wrap mb-4">
        {weights.map((w) => (
          <Chip
            key={w}
            label={w}
            selected={selectedWeights.includes(w)}
            onPress={() => toggleWeight(w)}
          />
        ))}
      </View>

      {selectedWeights.length > 0 && (
        <View className="bg-white rounded-2xl shadow-sm p-4">
          <Text className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
            Quantity per Weight
          </Text>
          {selectedWeights.map((w) => {
            const variant = wizardData.variants.find((v) => v.size === w);
            const qty = variant?.quantity ?? 0;
            return (
              <QtyRow
                key={w}
                label={w}
                qty={qty}
                onChange={(val) => setQty(w, val)}
              />
            );
          })}
        </View>
      )}

      <View className="bg-amber-50 rounded-2xl p-4 mt-4 border border-amber-100">
        <Text className="text-xs text-amber-700 font-medium">
          Selected: {purity} {goldColor}{stoneType !== 'None' ? ` with ${stoneType}` : ''} — {selectedWeights.length} weight option{selectedWeights.length !== 1 ? 's' : ''}
        </Text>
      </View>
    </ScrollView>
  );
}
