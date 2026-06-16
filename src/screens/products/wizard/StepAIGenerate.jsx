import React, { useState } from 'react';
import { View, Text, Pressable, ScrollView, Image, ActivityIndicator,  } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { generateProductImage } from '../../../lib/api';
import { alertDialog } from '../../../lib/dialog';


export default function StepAIGenerate({ wizardData, update }) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedUrl, setGeneratedUrl] = useState(null);
  const [lastTiming, setLastTiming] = useState(null);

  const etaHint = wizardData.type === 'saree'
    ? 'Usually 15–35 sec (full-body shot)'
    : wizardData.type === 'jewellery'
      ? 'Usually 10–25 sec'
      : 'Usually 15–30 sec';

  const primaryImage = wizardData.images.find((img) => img.uploadedUrl);
  const primaryColor = primaryImage?.label || primaryImage?.color || '';

  const promptHint = (() => {
    switch (wizardData.type) {
      case 'saree':
        return `AI will generate a studio drape shot of your ${wizardData.categoryName} saree`;
      case 'jewellery':
        return `AI will generate a model photo of your ${wizardData.categoryName} jewellery`;
      default:
        return 'AI will create a professional product photo';
    }
  })();

  const handleGenerate = async () => {
    if (!primaryImage?.uploadedUrl) {
      alertDialog('No image', 'Please upload at least one product image first.');
      return;
    }
    setIsGenerating(true);
    setGeneratedUrl(null);
    setLastTiming(null);
    try {
      const result = await generateProductImage({
        imageUrl: primaryImage.uploadedUrl,
        productType: wizardData.type,
        color: primaryColor,
        category: wizardData.categoryName,
      });
      setGeneratedUrl(result.url);
      if (result.timing) setLastTiming(result.timing);
    } catch (err) {
      alertDialog('Generation Failed', err.message);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleUse = () => {
    if (!generatedUrl) return;
    const updatedImages = wizardData.images.map((img, idx) => {
      if (img.uploadedUrl === primaryImage.uploadedUrl) {
        return { ...img, uploadedUrl: generatedUrl, aiGenerated: true };
      }
      return img;
    });
    update({ images: updatedImages });
    alertDialog('Applied', 'AI-generated image set as your primary product photo.');
    setGeneratedUrl(null);
  };

  const handleRetry = () => {
    setGeneratedUrl(null);
    handleGenerate();
  };

  return (
    <ScrollView className="flex-1" contentContainerStyle={{ padding: 16 }} keyboardShouldPersistTaps="handled">
      <View className="mb-4">
        <Text className="text-base font-semibold text-gray-800">Generate Studio Image</Text>
        <Text className="text-xs text-gray-500 mt-0.5">AI will create a professional product photo</Text>
      </View>

      {primaryImage?.uploadedUrl ? (
        <View className="bg-gray-50 rounded-2xl border border-gray-200 overflow-hidden mb-4">
          <Image
            source={{ uri: primaryImage.uploadedUrl }}
            className="w-full aspect-[3/4]"
            resizeMode="contain"
          />
          <View className="px-4 py-3 bg-white border-t border-gray-100">
            <Text className="text-xs text-gray-500 font-medium">SOURCE IMAGE</Text>
            {primaryColor ? (
              <Text className="text-sm text-gray-700 mt-0.5">{primaryColor}</Text>
            ) : null}
          </View>
        </View>
      ) : (
        <View className="bg-gray-50 rounded-2xl border border-dashed border-gray-300 p-8 items-center justify-center mb-4">
          <Ionicons name="image-outline" size={48} color="#9ca3af" />
          <Text className="text-sm text-gray-500 mt-3 text-center">
            No uploaded image found.{'\n'}Upload a product image first.
          </Text>
        </View>
      )}

      <View className="bg-amber-50 rounded-xl p-3 mb-5 border border-amber-100">
        <View className="flex-row items-start">
          <Ionicons name="information-circle" size={16} color="#d97706" style={{ marginTop: 1 }} />
          <Text className="text-xs text-amber-700 ml-2 flex-1 leading-4">{promptHint}</Text>
        </View>
      </View>

      {!generatedUrl && !isGenerating && (
        <Pressable
          onPress={handleGenerate}
          disabled={!primaryImage?.uploadedUrl}
          className={`flex-row items-center justify-center py-4 rounded-2xl ${
            primaryImage?.uploadedUrl
              ? 'bg-amber-500 active:bg-amber-600'
              : 'bg-gray-200'
          }`}
        >
          <Ionicons
            name="sparkles"
            size={18}
            color={primaryImage?.uploadedUrl ? '#ffffff' : '#9ca3af'}
          />
          <Text
            className={`text-base font-semibold ml-2 ${
              primaryImage?.uploadedUrl ? 'text-white' : 'text-gray-400'
            }`}
          >
            Generate
          </Text>
        </Pressable>
      )}

      {isGenerating && (
        <View className="items-center justify-center py-8">
          <ActivityIndicator size="large" color="#f59e0b" />
          <Text className="text-sm text-gray-500 mt-3">Creating your studio shot…</Text>
          <Text className="text-xs text-gray-400 mt-1">{etaHint}</Text>
        </View>
      )}

      {generatedUrl && !isGenerating && (
        <View>
          <View className="bg-green-50 rounded-2xl border border-green-200 overflow-hidden mb-4">
            <Image
              source={{ uri: generatedUrl }}
              className="w-full aspect-[3/4]"
              resizeMode="contain"
            />
            <View className="px-4 py-3 bg-white border-t border-green-100">
              <View className="flex-row items-center flex-wrap">
                <Ionicons name="checkmark-circle" size={14} color="#16a34a" />
                <Text className="text-xs text-green-700 font-medium ml-1">AI GENERATED</Text>
                {lastTiming?.totalMs ? (
                  <Text className="text-xs text-green-600 ml-2">
                    {(lastTiming.totalMs / 1000).toFixed(1)}s total
                    {lastTiming.geminiMs ? ` · AI ${(lastTiming.geminiMs / 1000).toFixed(1)}s` : ''}
                  </Text>
                ) : null}
              </View>
            </View>
          </View>

          <View className="flex-row gap-3">
            <Pressable
              onPress={handleUse}
              className="flex-1 flex-row items-center justify-center py-3.5 bg-green-600 rounded-xl active:bg-green-700"
            >
              <Ionicons name="checkmark" size={18} color="#ffffff" />
              <Text className="text-sm font-semibold text-white ml-1.5">Use This</Text>
            </Pressable>
            <Pressable
              onPress={handleRetry}
              className="flex-1 flex-row items-center justify-center py-3.5 bg-gray-100 border border-gray-200 rounded-xl active:bg-gray-200"
            >
              <Ionicons name="refresh" size={18} color="#374151" />
              <Text className="text-sm font-semibold text-gray-700 ml-1.5">Try Again</Text>
            </Pressable>
          </View>
        </View>
      )}

      <Pressable className="items-center mt-6 py-3">
        <Text className="text-sm text-gray-500 underline">Skip AI generation</Text>
      </Pressable>
    </ScrollView>
  );
}
