import React, { useState } from 'react';
import { View, Text, Pressable, ScrollView, Image, Alert, ActivityIndicator } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { uploadImage } from '../../../lib/api';

const PHOTO_BLOCKS = {
  saree: [
    'Full Saree',
    'Pallu',
    'Border',
    'Blouse Piece',
    'Fabric Closeup',
    'Draping Style',
    'Zari Work',
    'Tag/Label',
  ],
  jewellery: [
    'Full Piece',
    'Front Detail',
    'Back/Clasp',
    'Stone Setting',
    'Weight Tag',
    'Hallmark',
    'Packaging',
    'Scale Reference',
  ],
};

export default function StepPhotos({ wizardData, update }) {
  const [uploading, setUploading] = useState(null);

  const blocks = PHOTO_BLOCKS[wizardData.type] || PHOTO_BLOCKS.saree;
  const images = wizardData.images || [];

  const getImageForBlock = (label) => images.find((img) => img.label === label);

  const requestPermissions = async (type) => {
    if (type === 'camera') {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      return status === 'granted';
    }
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    return status === 'granted';
  };

  const pickImage = async (label, source) => {
    const isCamera = source === 'camera';
    const hasPermission = await requestPermissions(isCamera ? 'camera' : 'library');
    if (!hasPermission) {
      Alert.alert('Permission needed', `Please allow ${isCamera ? 'camera' : 'photo library'} access.`);
      return;
    }

    const options = {
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.85,
      allowsEditing: true,
      aspect: [3, 4],
    };

    const result = isCamera
      ? await ImagePicker.launchCameraAsync(options)
      : await ImagePicker.launchImageLibraryAsync(options);

    if (result.canceled) return;

    const uri = result.assets[0].uri;
    setUploading(label);

    try {
      const { url } = await uploadImage(uri);
      const isPrimary = images.length === 0;
      const newImages = [
        ...images.filter((img) => img.label !== label),
        { label, uri, uploadedUrl: url, isPrimary },
      ];
      update({ images: newImages });
    } catch (err) {
      Alert.alert('Upload failed', err.message);
    } finally {
      setUploading(null);
    }
  };

  const removeImage = (label) => {
    const newImages = images.filter((img) => img.label !== label);
    if (newImages.length > 0 && !newImages.some((i) => i.isPrimary)) {
      newImages[0].isPrimary = true;
    }
    update({ images: newImages });
  };

  const showPicker = (label) => {
    const existing = getImageForBlock(label);
    const options = existing
      ? ['Take Photo', 'Choose from Gallery', 'Remove Photo', 'Cancel']
      : ['Take Photo', 'Choose from Gallery', 'Cancel'];
    const cancelIndex = options.length - 1;
    const destructiveIndex = existing ? 2 : undefined;

    Alert.alert(label, 'Select an option', [
      { text: 'Take Photo', onPress: () => pickImage(label, 'camera') },
      { text: 'Choose from Gallery', onPress: () => pickImage(label, 'gallery') },
      ...(existing ? [{ text: 'Remove Photo', style: 'destructive', onPress: () => removeImage(label) }] : []),
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  return (
    <ScrollView className="flex-1" contentContainerStyle={{ padding: 16 }}>
      <Text className="text-base font-semibold text-gray-800 mb-1">Product Photos</Text>
      <Text className="text-sm text-gray-500 mb-5">
        Capture at least 1 photo. Tap a block to add.
      </Text>

      <View className="flex-row flex-wrap justify-between">
        {blocks.map((label) => {
          const img = getImageForBlock(label);
          const isUploading = uploading === label;

          return (
            <Pressable
              key={label}
              onPress={() => !isUploading && showPicker(label)}
              className="mb-4 rounded-2xl overflow-hidden"
              style={{ width: '48%', aspectRatio: 3 / 4 }}
            >
              {img ? (
                <View className="flex-1 relative">
                  <Image
                    source={{ uri: img.uri || img.uploadedUrl }}
                    className="w-full h-full"
                    resizeMode="cover"
                  />
                  <View className="absolute bottom-0 left-0 right-0 bg-black/60 px-3 py-2">
                    <Text className="text-white text-xs font-medium" numberOfLines={1}>
                      {label}
                    </Text>
                  </View>
                  {img.isPrimary && (
                    <View className="absolute top-2 left-2 bg-amber-500 px-2 py-0.5 rounded-full">
                      <Text className="text-white text-[10px] font-bold">PRIMARY</Text>
                    </View>
                  )}
                </View>
              ) : (
                <View className="flex-1 bg-gray-100 items-center justify-center border-2 border-dashed border-gray-300 rounded-2xl">
                  {isUploading ? (
                    <ActivityIndicator size="large" color="#f59e0b" />
                  ) : (
                    <>
                      <Text className="text-sm text-gray-500 font-medium text-center px-2 mb-2">
                        {label}
                      </Text>
                      <Ionicons name="camera-outline" size={24} color="#9ca3af" />
                    </>
                  )}
                </View>
              )}
            </Pressable>
          );
        })}
      </View>
    </ScrollView>
  );
}
