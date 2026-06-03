import React, { useCallback } from 'react';
import { View, Text, Pressable, ScrollView, Image } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { PRODUCT_TYPE_CARDS } from '../../constants/productTypes';
import { useHardwareBackHandler, navigateToDashboard } from '../../hooks/useHardwareBackHandler';
import { BRAND } from '../../constants/brand';

const WARM_BG = '#fffaf5';
const MAROON = BRAND.colors.maroon;

function Divider() {
  return (
    <View className="flex-row items-center my-5 mx-6">
      <View className="flex-1 h-px" style={{ backgroundColor: '#f9d7b0' }} />
      <Text className="mx-3" style={{ color: '#d4a017', fontSize: 10 }}>✦</Text>
      <View className="flex-1 h-px" style={{ backgroundColor: '#f9d7b0' }} />
    </View>
  );
}

export default function AddProductTypeScreen({ navigation, route }) {
  const insets = useSafeAreaInsets();
  const returnTab = route.params?.returnTab ?? 'DashboardTab';

  const handleBack = useCallback(() => {
    if (returnTab === 'DashboardTab') {
      navigateToDashboard(navigation);
    } else {
      navigation.getParent()?.navigate(returnTab);
    }
  }, [navigation, returnTab]);

  useHardwareBackHandler(useCallback(() => {
    handleBack();
    return true;
  }, [handleBack]));

  const handleSelect = (type) => {
    navigation.navigate('ProductWizard', { mode: 'create', type });
  };

  return (
    <View className="flex-1" style={{ backgroundColor: WARM_BG, paddingTop: insets.top }}>
      <LinearGradient
        colors={[MAROON, '#8b2222']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ paddingHorizontal: 20, paddingTop: 12, paddingBottom: 24 }}
      >
        <View className="flex-row items-center justify-between mb-4">
          <Pressable
            onPress={handleBack}
            className="w-10 h-10 rounded-full items-center justify-center"
            style={{ backgroundColor: 'rgba(255,255,255,0.15)' }}
          >
            <Ionicons name="arrow-back" size={22} color="#ffffff" />
          </Pressable>
          <View className="w-10 h-10 rounded-full items-center justify-center" style={{ backgroundColor: 'rgba(255,255,255,0.15)' }}>
            <Ionicons name="add-circle-outline" size={22} color="#ffffff" />
          </View>
        </View>
        <Text className="text-2xl font-bold text-white mb-1">Add New Product</Text>
        <Text className="text-sm" style={{ color: 'rgba(255,255,255,0.85)' }}>
          Choose a category to begin listing
        </Text>
      </LinearGradient>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 20, paddingBottom: insets.bottom + 100 }}
        showsVerticalScrollIndicator={false}
      >
        <Text className="text-center text-sm mb-1" style={{ color: '#a16207' }}>
          What would you like to add?
        </Text>
        <Divider />

        {PRODUCT_TYPE_CARDS.map((card) => (
          <Pressable
            key={card.key}
            onPress={() => handleSelect(card.key)}
            className="rounded-3xl overflow-hidden mb-5"
            style={{
              backgroundColor: card.bgColor,
              borderWidth: 1.5,
              borderColor: card.borderColor,
              shadowColor: '#000',
              shadowOpacity: 0.08,
              shadowRadius: 12,
              shadowOffset: { width: 0, height: 4 },
              elevation: 4,
            }}
          >
            <View className="relative">
              <Image
                source={card.image}
                style={{ width: '100%', height: 180 }}
                resizeMode="cover"
              />
              <LinearGradient
                colors={['transparent', 'rgba(0,0,0,0.55)']}
                style={{
                  position: 'absolute',
                  left: 0,
                  right: 0,
                  bottom: 0,
                  height: 90,
                }}
              />
              <View
                className="absolute top-3 right-3 px-3 py-1 rounded-full flex-row items-center"
                style={{ backgroundColor: 'rgba(255,255,255,0.92)' }}
              >
                <Ionicons name={card.icon} size={14} color={card.accentColor} />
                <Text className="text-xs font-bold ml-1" style={{ color: card.textColor }}>
                  Tap to add
                </Text>
              </View>
            </View>

            <View className="px-5 py-4 flex-row items-center justify-between">
              <View className="flex-1 pr-3">
                <Text className="text-xl font-bold" style={{ color: card.textColor }}>
                  {card.label}
                </Text>
                <Text className="text-xs mt-1" style={{ color: card.textColor + 'aa' }}>
                  {card.subtitle}
                </Text>
              </View>
              <View
                className="w-11 h-11 rounded-full items-center justify-center"
                style={{ backgroundColor: card.accentColor + '22' }}
              >
                <Ionicons name="chevron-forward" size={22} color={card.accentColor} />
              </View>
            </View>
          </Pressable>
        ))}

        <Divider />
        <Text className="text-center text-xs px-4" style={{ color: '#92400e' }}>
          You can add photos, pricing, and stock details in the next step
        </Text>
      </ScrollView>
    </View>
  );
}
