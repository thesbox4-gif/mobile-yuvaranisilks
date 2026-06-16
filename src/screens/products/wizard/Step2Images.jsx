import React, { useState } from 'react';
import {
  View, Text, Pressable, ScrollView, Image, ActivityIndicator, Modal, TextInput,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { uploadImage, generateProductImage } from '../../../lib/api';
import { COLORS } from '../../../constants';
import { alertDialog } from '../../../lib/dialog';
import { FAST_PICKER_OPTIONS, prepareImageForUpload } from '../../../lib/prepareImageForUpload';

export default function Step2Images({ wizardData, update }) {
  const [uploading, setUploading] = useState(null);
  const [enhancing, setEnhancing] = useState(null);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [newColor, setNewColor] = useState('');

  const pickAndUpload = async (color) => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      alertDialog('Permission needed', 'Please allow photo library access.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      ...FAST_PICKER_OPTIONS,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.72,
    });

    if (result.canceled) return;
    const prepared = await prepareImageForUpload(result.assets[0]);
    const uri = prepared.uri;

    // Show local preview INSTANTLY
    const newImages = [
      ...wizardData.images,
      { color, uri, uploadedUrl: null, isPrimary: wizardData.images.length === 0, aiGenerated: false },
    ];
    update({ images: newImages });

    // Upload in background
    setUploading(color);
    try {
      const { url } = await uploadImage(uri);
      update({
        images: [
          ...wizardData.images,
          { color, uri, uploadedUrl: url, isPrimary: wizardData.images.length === 0, aiGenerated: false },
        ],
      });
    } catch (err) {
      alertDialog('Upload failed', err.message);
    } finally {
      setUploading(null);
    }
  };

  const aiEnhance = async (idx) => {
    const img = wizardData.images[idx];
    setEnhancing(img.color);
    try {
      const { url } = await generateProductImage({
        uri: img.uri || undefined,
        imageUrl: img.uri ? undefined : img.uploadedUrl,
        productType: wizardData.type,
        color: img.color,
      });
      const imgs = wizardData.images.map((it, i) =>
        i === idx ? { ...it, uri: null, uploadedUrl: url, aiGenerated: true } : it
      );
      update({ images: imgs });
    } catch (err) {
      alertDialog('AI generation failed', err.message);
    } finally {
      setEnhancing(null);
    }
  };

  const removeImage = (idx) => {
    const imgs = [...wizardData.images];
    imgs.splice(idx, 1);
    if (imgs.length > 0 && !imgs.some((i) => i.isPrimary)) {
      imgs[0].isPrimary = true;
    }
    update({ images: imgs });
  };

  const setPrimary = (idx) => {
    const imgs = wizardData.images.map((img, i) => ({ ...img, isPrimary: i === idx }));
    update({ images: imgs });
  };

  const addColor = () => {
    if (!newColor.trim()) return;
    pickAndUpload(newColor.trim());
    setShowColorPicker(false);
    setNewColor('');
  };

  return (
    <ScrollView className="flex-1" contentContainerStyle={{ padding: 16 }}>
      <Text className="text-base font-semibold text-gray-800 mb-1">Product Images</Text>
      <Text className="text-sm text-gray-500 mb-5">
        Add one image per color. Tap ✨ AI to turn a photo into a clean studio image.
      </Text>

      {/* Existing images */}
      {wizardData.images.map((img, idx) => (
        <View key={idx} className="bg-white rounded-2xl overflow-hidden shadow-sm mb-3 flex-row items-center">
          <Image source={{ uri: img.uri || img.uploadedUrl }} className="w-20 h-20" resizeMode="cover" />
          <View className="flex-1 px-4 py-2">
            <View className="flex-row items-center mb-1 flex-wrap">
              <Text className="text-sm font-semibold text-gray-800">{img.color}</Text>
              {img.isPrimary && (
                <View className="bg-amber-100 px-2 py-0.5 rounded-full ml-2">
                  <Text className="text-xs text-amber-700 font-medium">Primary</Text>
                </View>
              )}
              {img.aiGenerated && (
                <View className="bg-indigo-100 px-2 py-0.5 rounded-full ml-2">
                  <Text className="text-xs text-indigo-700 font-medium">✨ AI</Text>
                </View>
              )}
            </View>
            <View className="flex-row gap-3 mt-1 items-center">
              {enhancing === img.color ? (
                <View className="flex-row items-center">
                  <ActivityIndicator size="small" color="#6366f1" />
                  <Text className="text-xs text-indigo-600 font-medium ml-1.5">Generating…</Text>
                </View>
              ) : (
                <Pressable onPress={() => aiEnhance(idx)}>
                  <Text className="text-xs text-indigo-600 font-semibold">✨ AI Image</Text>
                </Pressable>
              )}
              {!img.isPrimary && (
                <Pressable onPress={() => setPrimary(idx)}>
                  <Text className="text-xs text-amber-600 font-medium">Set Primary</Text>
                </Pressable>
              )}
              <Pressable onPress={() => removeImage(idx)}>
                <Text className="text-xs text-red-500 font-medium">Remove</Text>
              </Pressable>
            </View>
          </View>
          {uploading === img.color && <ActivityIndicator color="#f59e0b" className="mr-4" />}
        </View>
      ))}

      {/* Add color button */}
      <Pressable
        onPress={() => setShowColorPicker(true)}
        className="border-2 border-dashed border-amber-300 rounded-2xl py-5 items-center bg-amber-50 active:bg-amber-100"
      >
        <Ionicons name="add-circle-outline" size={28} color="#f59e0b" />
        <Text className="text-sm text-amber-700 font-medium mt-2">Add color image</Text>
      </Pressable>

      {/* Quick color chips */}
      <View className="mt-4">
        <Text className="text-xs text-gray-500 mb-2 font-medium">Quick add:</Text>
        <View className="flex-row flex-wrap gap-2">
          {COLORS.slice(0, 8).filter((c) => !wizardData.images.some((i) => i.color === c)).map((c) => (
            <Pressable
              key={c}
              onPress={() => pickAndUpload(c)}
              disabled={!!uploading}
              className="px-3 py-1.5 bg-white border border-gray-200 rounded-full active:bg-gray-50"
            >
              {uploading === c ? (
                <ActivityIndicator size="small" color="#f59e0b" />
              ) : (
                <Text className="text-xs text-gray-700">{c}</Text>
              )}
            </Pressable>
          ))}
        </View>
      </View>

      {/* Color picker modal */}
      <Modal visible={showColorPicker} transparent animationType="fade">
        <Pressable className="flex-1 bg-black/40 items-center justify-center px-6" onPress={() => setShowColorPicker(false)}>
          <View className="bg-white rounded-2xl p-5 w-full">
            <Text className="text-base font-semibold text-gray-800 mb-3">Enter color name</Text>
            <TextInput
              className="border border-gray-200 rounded-xl px-4 py-3 text-base text-gray-900 bg-gray-50 mb-4"
              placeholder="e.g. Royal Blue"
              placeholderTextColor="#9ca3af"
              value={newColor}
              onChangeText={setNewColor}
              autoFocus
            />
            <View className="flex-row gap-3">
              <Pressable onPress={() => setShowColorPicker(false)} className="flex-1 border border-gray-200 rounded-xl py-3 items-center">
                <Text className="text-gray-600 font-medium">Cancel</Text>
              </Pressable>
              <Pressable onPress={addColor} className="flex-1 bg-amber-500 rounded-xl py-3 items-center active:bg-amber-600">
                <Text className="text-white font-semibold">Continue</Text>
              </Pressable>
            </View>
          </View>
        </Pressable>
      </Modal>
    </ScrollView>
  );
}
