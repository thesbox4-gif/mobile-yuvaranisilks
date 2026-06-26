import React, { useState } from 'react';
import { View, Text, Switch, ActivityIndicator, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useMutation } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import { updateNotificationPreferences } from '../../lib/api';
import useAuthStore from '../../store/authStore';
import ScreenHeader from '../../components/ui/ScreenHeader';
import { alertDialog } from '../../lib/dialog';

export default function NotificationSettingsScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { user, setAuth, token } = useAuthStore();

  const [whatsappAlerts, setWhatsappAlerts] = useState(
    user?.notification_preferences?.whatsapp_new_product ?? false
  );

  const mutation = useMutation({
    mutationFn: (prefs) => updateNotificationPreferences(prefs),
    onSuccess: (data) => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setAuth(token, { ...user, notification_preferences: data?.notification_preferences ?? data });
    },
    onError: (err) => {
      alertDialog('Error', err.message);
      // Revert toggle on failure
      setWhatsappAlerts((prev) => !prev);
    },
  });

  const handleWhatsappToggle = (value) => {
    setWhatsappAlerts(value);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    mutation.mutate({ whatsapp_new_product: value });
  };

  return (
    <View className="flex-1 bg-gray-50">
      <ScreenHeader title="Notification Settings" navigation={navigation} />

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 16 }}>
        <View className="bg-white rounded-2xl shadow-sm p-4 mb-4">
          <Text className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-4">
            WhatsApp Alerts
          </Text>

          <View className="flex-row items-center justify-between py-2">
            <View className="flex-1 mr-4">
              <View className="flex-row items-center mb-1">
                <Text className="text-sm font-semibold text-gray-900">New Product Alerts</Text>
                {mutation.isPending && (
                  <ActivityIndicator size="small" color="#f59e0b" style={{ marginLeft: 8 }} />
                )}
              </View>
              <Text className="text-xs text-gray-500 leading-4">
                Get notified on WhatsApp when new products are added to the collection.
              </Text>
            </View>
            <Switch
              value={whatsappAlerts}
              onValueChange={handleWhatsappToggle}
              disabled={mutation.isPending}
              trackColor={{ false: '#e5e7eb', true: '#fcd34d' }}
              thumbColor={whatsappAlerts ? '#f59e0b' : '#9ca3af'}
            />
          </View>
        </View>

        <View className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
          <Text className="text-xs text-amber-800 leading-5">
            WhatsApp notifications are sent to the phone number registered on your account.
            Make sure your phone number is up to date in your Profile.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}
