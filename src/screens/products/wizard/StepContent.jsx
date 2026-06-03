import React, { useState } from 'react';
import {
  View, Text, TextInput, Pressable, ScrollView, ActivityIndicator, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { generateContent } from '../../../lib/api';

export default function StepContent({ wizardData, update }) {
  const [isGenerating, setIsGenerating] = useState(false);
  const { title, description } = wizardData.content;

  const handleGenerate = async () => {
    if (!wizardData.type) {
      Alert.alert('Missing info', 'Please select a product type & category first.');
      return;
    }
    setIsGenerating(true);
    try {
      const colors = [...new Set(wizardData.images.map((i) => i.label))];
      const result = await generateContent({
        productType: wizardData.type,
        category: wizardData.categoryName,
        colors,
        sizes: [],
      });
      update({ content: { title: result.title, description: result.description } });
    } catch (err) {
      Alert.alert('AI Error', err.message);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <ScrollView className="flex-1" contentContainerStyle={{ padding: 16 }} keyboardShouldPersistTaps="handled">
      <View className="flex-row items-center justify-between mb-4">
        <View className="flex-1">
          <Text className="text-base font-semibold text-gray-800">Product Content</Text>
          <Text className="text-xs text-gray-500 mt-0.5">Title and description for the storefront</Text>
        </View>
        <Pressable
          onPress={handleGenerate}
          disabled={isGenerating}
          className="flex-row items-center bg-indigo-50 border border-indigo-200 px-3 py-2 rounded-xl active:bg-indigo-100"
        >
          {isGenerating ? (
            <ActivityIndicator size="small" color="#6366f1" />
          ) : (
            <>
              <Ionicons name="sparkles" size={14} color="#6366f1" />
              <Text className="text-xs text-indigo-700 font-semibold ml-1">AI Generate</Text>
            </>
          )}
        </Pressable>
      </View>

      <View className="mb-5">
        <View className="flex-row items-center justify-between mb-1.5">
          <Text className="text-sm font-medium text-gray-700">Product Title *</Text>
          <Text className="text-xs text-gray-400">{title.length}/80</Text>
        </View>
        <TextInput
          className={`border rounded-xl px-4 py-3.5 text-base text-gray-900 bg-white ${
            title.length > 0 && title.length < 3 ? 'border-red-300' : 'border-gray-200'
          }`}
          placeholder="e.g. Pure Silk Banarasi Saree in Royal Blue"
          placeholderTextColor="#9ca3af"
          value={title}
          onChangeText={(t) => update({ content: { ...wizardData.content, title: t } })}
          maxLength={80}
          multiline={false}
        />
        {title.length > 0 && title.length < 3 && (
          <Text className="text-xs text-red-500 mt-1">Title must be at least 3 characters</Text>
        )}
      </View>

      <View>
        <View className="flex-row items-center justify-between mb-1.5">
          <Text className="text-sm font-medium text-gray-700">Description</Text>
          <Text className="text-xs text-gray-400">{description.length} chars</Text>
        </View>
        <TextInput
          className="border border-gray-200 rounded-xl px-4 py-3.5 text-base text-gray-900 bg-white"
          placeholder="Describe the product — material, occasion, care instructions…"
          placeholderTextColor="#9ca3af"
          value={description}
          onChangeText={(t) => update({ content: { ...wizardData.content, description: t } })}
          multiline
          numberOfLines={5}
          textAlignVertical="top"
          style={{ minHeight: 120 }}
        />
      </View>

      {title.length > 0 && (
        <View className="mt-4 bg-gray-50 rounded-xl p-4 border border-gray-100">
          <Text className="text-xs text-gray-500 mb-1 font-medium">PREVIEW</Text>
          <Text className="text-sm font-semibold text-gray-900">{title}</Text>
          {description ? (
            <Text className="text-xs text-gray-500 mt-1 leading-4" numberOfLines={3}>
              {description}
            </Text>
          ) : null}
        </View>
      )}
    </ScrollView>
  );
}
