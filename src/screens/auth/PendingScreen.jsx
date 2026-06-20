import React, { useEffect, useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { getMe } from '../../lib/api';
import useAuthStore from '../../store/authStore';
import { signOut } from '../../lib/authSession';
import { notifyDialog } from '../../lib/dialog';

export default function PendingScreen() {
  const insets = useSafeAreaInsets();
  const { user, setAuth } = useAuthStore();
  const [countdown, setCountdown] = useState(30);

  const { data } = useQuery({
    queryKey: ['me-pending'],
    queryFn: getMe,
    refetchInterval: 30_000,
    staleTime: 0,
  });

  useEffect(() => {
    if (data?.employee_status === 'approved') {
      setAuth(useAuthStore.getState().token, data);
    } else if (data?.employee_status === 'rejected') {
      notifyDialog({
        title: 'Application rejected',
        message: 'Your employee application was rejected. Please contact an admin for help.',
        onClose: signOut,
      });
    }
  }, [data]);

  useEffect(() => {
    const interval = setInterval(() => {
      setCountdown((c) => (c <= 1 ? 30 : c - 1));
    }, 1_000);
    return () => clearInterval(interval);
  }, []);

  return (
    <View
      style={{ paddingTop: insets.top, paddingBottom: insets.bottom }}
      className="flex-1 bg-amber-50 items-center justify-center px-8"
    >
      <View className="w-24 h-24 bg-amber-100 rounded-full items-center justify-center mb-6">
        <Ionicons name="time" size={48} color="#f59e0b" />
      </View>

      <Text className="text-2xl font-bold text-gray-900 text-center mb-3">
        Waiting for Approval
      </Text>
      <Text className="text-base text-gray-600 text-center leading-6 mb-6">
        Your account is pending admin approval. You'll be notified once approved.
      </Text>

      <View className="bg-white rounded-2xl p-5 w-full mb-6 shadow-sm">
        <View className="flex-row items-center mb-3">
          <View className="w-10 h-10 bg-amber-500 rounded-full items-center justify-center mr-3">
            <Text className="text-white font-bold text-base">
              {user?.name?.charAt(0).toUpperCase()}
            </Text>
          </View>
          <View>
            <Text className="font-semibold text-gray-900">{user?.name}</Text>
            <Text className="text-sm text-gray-500">{user?.email}</Text>
          </View>
        </View>
        <View className="flex-row items-center bg-amber-50 rounded-xl px-3 py-2">
          <View className="w-2 h-2 rounded-full bg-amber-400 mr-2" />
          <Text className="text-sm text-amber-700 font-medium">Status: Pending Approval</Text>
        </View>
      </View>

      <View className="flex-row items-center">
        <View className="w-2 h-2 rounded-full bg-gray-400 mr-2" />
        <Text className="text-sm text-gray-500">
          Auto-checking in <Text className="font-semibold text-gray-700">{countdown}s</Text>
        </Text>
      </View>

      <Pressable
        onPress={signOut}
        className="mt-10 px-6 py-3 rounded-xl active:bg-red-50"
      >
        <Text className="text-red-500 font-medium text-sm">Sign Out</Text>
      </Pressable>
    </View>
  );
}
