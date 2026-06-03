import React, { useState } from 'react';
import { View, Text, Pressable, ScrollView, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { MOCK_CATEGORIES } from '../../../constants/categories';

const SUBTITLES = {
  saree: 'Select the type of saree',
  jewellery: 'Select the type of jewellery',
};

export default function StepCategory({ wizardData, update }) {
  const [showNewInput, setShowNewInput] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [customCategories, setCustomCategories] = useState([]);

  const type = wizardData.type || 'saree';
  const baseCategories = MOCK_CATEGORIES[type] || [];
  const allCategories = [...baseCategories, ...customCategories];

  const handleSelect = (cat) => {
    update({ categoryId: cat.id, categoryName: cat.name });
  };

  const handleAddNew = () => {
    const name = newCategoryName.trim();
    if (!name) return;

    const newCat = {
      id: `custom-${type}-${Date.now()}`,
      name,
      slug: name.toLowerCase().replace(/\s+/g, '-'),
    };

    setCustomCategories((prev) => [...prev, newCat]);
    handleSelect(newCat);
    setNewCategoryName('');
    setShowNewInput(false);
  };

  return (
    <ScrollView className="flex-1" contentContainerStyle={{ padding: 16 }} keyboardShouldPersistTaps="handled">
      <Text className="text-base font-semibold text-gray-800 mb-1">Choose Category</Text>
      <Text className="text-sm text-gray-500 mb-5">{SUBTITLES[type] || 'Select a category'}</Text>

      <View className="flex-row flex-wrap gap-3">
        {allCategories.map((cat) => {
          const isActive = wizardData.categoryId === cat.id;
          return (
            <Pressable
              key={cat.id}
              onPress={() => handleSelect(cat)}
              className={`px-4 py-2.5 rounded-full border ${
                isActive
                  ? 'bg-amber-500 border-amber-500'
                  : 'bg-white border-gray-200'
              }`}
            >
              <Text
                className={`text-sm font-semibold ${
                  isActive ? 'text-white' : 'text-gray-700'
                }`}
              >
                {cat.name}
              </Text>
            </Pressable>
          );
        })}

        {/* Create New chip */}
        <Pressable
          onPress={() => setShowNewInput(true)}
          className="px-4 py-2.5 rounded-full border border-dashed border-gray-400 flex-row items-center gap-1"
        >
          <Ionicons name="add" size={16} color="#6b7280" />
          <Text className="text-sm font-semibold text-gray-600">Create New</Text>
        </Pressable>
      </View>

      {/* Inline new category input */}
      {showNewInput && (
        <View className="mt-5 bg-gray-50 rounded-2xl p-4 border border-gray-200">
          <Text className="text-sm font-medium text-gray-700 mb-2">New category name</Text>
          <View className="flex-row items-center gap-3">
            <TextInput
              className="flex-1 border border-gray-200 rounded-xl px-4 py-3 text-base text-gray-900 bg-white"
              placeholder="e.g. Patola Silk"
              placeholderTextColor="#9ca3af"
              value={newCategoryName}
              onChangeText={setNewCategoryName}
              autoFocus
              onSubmitEditing={handleAddNew}
              returnKeyType="done"
            />
            <Pressable
              onPress={handleAddNew}
              className="bg-amber-500 rounded-xl px-5 py-3 active:bg-amber-600"
            >
              <Text className="text-white font-semibold text-sm">Add</Text>
            </Pressable>
          </View>
          <Pressable onPress={() => { setShowNewInput(false); setNewCategoryName(''); }} className="mt-2">
            <Text className="text-xs text-gray-500">Cancel</Text>
          </Pressable>
        </View>
      )}
    </ScrollView>
  );
}
