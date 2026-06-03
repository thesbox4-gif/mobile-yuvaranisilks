import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

export default function ScreenHeader({ title, subtitle, onBack, rightElement, navigation }) {
  const insets = useSafeAreaInsets();

  return (
    <View
      style={{ paddingTop: insets.top }}
      className="bg-white border-b border-gray-100"
    >
      <View className="flex-row items-center px-4 py-3 min-h-[56px]">
        {(onBack || navigation) && (
          <Pressable
            onPress={onBack || (() => navigation.goBack())}
            className="mr-3 w-9 h-9 items-center justify-center rounded-full active:bg-gray-100"
          >
            <Ionicons name="arrow-back" size={22} color="#1f2937" />
          </Pressable>
        )}
        <View className="flex-1">
          <Text className="text-xl font-bold text-gray-900">{title}</Text>
          {subtitle && <Text className="text-sm text-gray-500 mt-0.5">{subtitle}</Text>}
        </View>
        {rightElement && <View className="ml-2">{rightElement}</View>}
      </View>
    </View>
  );
}
