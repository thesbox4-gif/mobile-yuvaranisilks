import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, Pressable, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { getUsageLimits, updateUsageLimits } from '../../lib/api';
import ScreenHeader from '../../components/ui/ScreenHeader';
import * as Haptics from 'expo-haptics';

function LimitField({ label, icon, color, used, value, onChange }) {
  const pct = Number(value) > 0 ? Math.min(100, Math.round((used / Number(value)) * 100)) : 0;
  const barColor = pct >= 90 ? '#ef4444' : pct >= 70 ? '#f59e0b' : '#22c55e';
  return (
    <View className="bg-white rounded-2xl p-5 mb-4 shadow-sm">
      <View className="flex-row items-center mb-4">
        <View className="w-10 h-10 rounded-full items-center justify-center mr-3" style={{ backgroundColor: `${color}1A` }}>
          <Ionicons name={icon} size={20} color={color} />
        </View>
        <View className="flex-1">
          <Text className="text-sm font-semibold text-gray-900">{label}</Text>
          <Text className="text-xs text-gray-500">{used ?? 0} used of {value || '—'} total</Text>
        </View>
      </View>

      {/* Progress bar */}
      <View className="h-2 rounded-full bg-gray-100 mb-1">
        <View style={{ width: `${pct}%`, backgroundColor: barColor, height: '100%', borderRadius: 99 }} />
      </View>
      <Text className="text-[10px] text-gray-400 mb-4">{pct}% used</Text>

      {/* Edit limit */}
      <Text className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Set New Limit</Text>
      <TextInput
        className="border border-gray-200 rounded-xl px-4 py-3 text-base text-gray-900 bg-gray-50"
        value={String(value ?? '')}
        onChangeText={onChange}
        keyboardType="numeric"
        placeholder="Enter limit"
        placeholderTextColor="#9ca3af"
      />
    </View>
  );
}

export default function UsageLimitsScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();

  const { data: usage, isLoading } = useQuery({
    queryKey: ['usage-limits'],
    queryFn: getUsageLimits,
    staleTime: 60_000,
  });

  const [uploadLimit, setUploadLimit] = useState('');
  const [generateLimit, setGenerateLimit] = useState('');

  useEffect(() => {
    if (!usage) return;
    setUploadLimit(String(usage.imageUploadLimit ?? usage.image_upload_limit ?? ''));
    setGenerateLimit(String(usage.imageGenerateLimit ?? usage.image_generate_limit ?? ''));
  }, [usage]);

  const mutation = useMutation({
    mutationFn: () =>
      updateUsageLimits({
        image_upload_limit: Number(uploadLimit),
        image_generate_limit: Number(generateLimit),
      }),
    onSuccess: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      qc.invalidateQueries({ queryKey: ['usage-limits'] });
      Alert.alert('Saved', 'Usage limits updated successfully.');
    },
    onError: (err) => Alert.alert('Error', err.message || 'Could not update limits.'),
  });

  const uploadUsed = usage?.imagesUploaded ?? usage?.images_uploaded ?? 0;
  const generateUsed = usage?.imagesGenerated ?? usage?.images_generated ?? 0;

  return (
    <View className="flex-1 bg-gray-50">
      <ScreenHeader title="Usage Limits" navigation={navigation} />

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#f59e0b" />
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 24 }}>
          <Text className="text-xs text-gray-500 mb-4">
            Set the maximum number of images allowed for upload and AI generation per billing period.
          </Text>

          <LimitField
            label="Image Upload Limit"
            icon="cloud-upload-outline"
            color="#2563eb"
            used={uploadUsed}
            value={uploadLimit}
            onChange={setUploadLimit}
          />

          <LimitField
            label="AI Generation Limit"
            icon="sparkles-outline"
            color="#7c3aed"
            used={generateUsed}
            value={generateLimit}
            onChange={setGenerateLimit}
          />

          {/* Summary */}
          <View className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-6">
            <Text className="text-xs font-semibold text-amber-900 mb-1">Preview</Text>
            <Text className="text-sm text-amber-800">
              Upload: {uploadUsed} / {uploadLimit || '—'}{'  '}·{'  '}Generate: {generateUsed} / {generateLimit || '—'}
            </Text>
          </View>

          <Pressable
            onPress={() => mutation.mutate()}
            disabled={mutation.isPending}
            className="bg-amber-500 rounded-2xl py-4 items-center active:bg-amber-600"
          >
            {mutation.isPending
              ? <ActivityIndicator color="#ffffff" />
              : (
                <View className="flex-row items-center gap-2">
                  <Ionicons name="save-outline" size={18} color="#ffffff" />
                  <Text className="text-white font-bold text-base">Save Limits</Text>
                </View>
              )}
          </Pressable>
        </ScrollView>
      )}
    </View>
  );
}
