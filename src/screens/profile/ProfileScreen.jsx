import React, { useState } from 'react';
import {
  View, Text, TextInput, Pressable, ScrollView,
  ActivityIndicator, Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { updateMe, getOfflineSales } from '../../lib/api';
import useAuthStore from '../../store/authStore';
import { signOut } from '../../lib/authSession';
import ScreenHeader from '../../components/ui/ScreenHeader';
import { initials, formatPrice } from '../../lib/utils';
import { confirmDialog } from '../../lib/dialog';
import * as Haptics from 'expo-haptics';
import { useRootTabBackToDashboard } from '../../hooks/useHardwareBackHandler';
import { alertDialog } from '../../lib/dialog';


export default function ProfileScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { user, setAuth, token, viewMode, setViewMode } = useAuthStore();

  useRootTabBackToDashboard(navigation);
  const [name, setName] = useState(user?.name ?? '');
  const [phone, setPhone] = useState(user?.phone ?? '');
  const [editing, setEditing] = useState(false);
  const queryClient = useQueryClient();

  const isAdmin = user?.role === 'admin';
  const isEmployee = user?.role === 'employee';
  const isPrivileged = isAdmin || isEmployee;

  const updateMutation = useMutation({
    mutationFn: () => updateMe({ name, phone: phone || undefined }),
    onSuccess: (data) => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setAuth(token, { ...user, ...data });
      setEditing(false);
    },
    onError: (err) => alertDialog('Error', err.message),
  });

  const { data: salesData } = useQuery({
    queryKey: ['my-sales'],
    queryFn: () => getOfflineSales({ limit: 200 }),
    enabled: isPrivileged,
    staleTime: 60_000,
  });

  const salesList = salesData?.data ?? [];
  const totalSalesCount = salesList.length;
  const totalRevenue = salesList.reduce(
    (sum, s) => sum + Number(s.unit_price || 0) * Number(s.quantity || 0),
    0
  );

  const handleSignOut = () => {
    signOut();
  };

  const handleLogout = () => {
    confirmDialog({
      title: 'Sign Out',
      message: 'Are you sure you want to sign out?',
      confirmText: 'Sign Out',
      destructive: true,
      onConfirm: handleSignOut,
    });
  };

  const handleToggleViewMode = () => {
    const next = viewMode === 'admin' ? 'user' : 'admin';
    setViewMode(next);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };

  return (
    <View className="flex-1 bg-gray-50">
      <ScreenHeader
        title="Profile"
        navigation={navigation}
        rightElement={
          <Pressable
            onPress={() => setEditing(!editing)}
            className="w-9 h-9 items-center justify-center rounded-full active:bg-gray-100"
          >
            <Ionicons name={editing ? 'close' : 'pencil'} size={18} color="#6b7280" />
          </Pressable>
        }
      />

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 16 }}>
        {/* Avatar */}
        <View className="items-center mb-8 mt-4">
          <View className="w-24 h-24 bg-amber-500 rounded-full items-center justify-center mb-3">
            <Text className="text-white font-bold text-3xl">{initials(user?.name)}</Text>
          </View>
          <Text className="text-xl font-bold text-gray-900">{user?.name}</Text>
          <Text className="text-sm text-gray-500 mt-0.5">{user?.email}</Text>
          <View className="mt-2 bg-amber-100 px-3 py-1 rounded-full">
            <Text className="text-xs font-semibold text-amber-800 capitalize">{user?.role}</Text>
          </View>
        </View>

        {/* Account Details */}
        <View className="bg-white rounded-2xl shadow-sm p-4 mb-4">
          <Text className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-4">
            Account Details
          </Text>

          <View className="mb-4">
            <Text className="text-sm font-medium text-gray-700 mb-1.5">Full Name</Text>
            <TextInput
              className={`border rounded-xl px-4 py-3.5 text-base text-gray-900 ${editing ? 'bg-white border-amber-300' : 'bg-gray-50 border-gray-200'
                }`}
              value={name}
              onChangeText={setName}
              editable={editing}
              placeholderTextColor="#9ca3af"
            />
          </View>

          <View className="mb-4">
            <Text className="text-sm font-medium text-gray-700 mb-1.5">Email</Text>
            <TextInput
              className="border border-gray-200 rounded-xl px-4 py-3.5 text-base text-gray-400 bg-gray-50"
              value={user?.email}
              editable={false}
            />
          </View>

          <View>
            <Text className="text-sm font-medium text-gray-700 mb-1.5">Phone</Text>
            <TextInput
              className={`border rounded-xl px-4 py-3.5 text-base text-gray-900 ${editing ? 'bg-white border-amber-300' : 'bg-gray-50 border-gray-200'
                }`}
              value={phone}
              onChangeText={setPhone}
              editable={editing}
              keyboardType="phone-pad"
              placeholder="Add phone number"
              placeholderTextColor="#9ca3af"
            />
          </View>

          {editing && (
            <Pressable
              onPress={() => updateMutation.mutate()}
              disabled={updateMutation.isPending}
              className="bg-amber-500 rounded-xl py-3.5 items-center mt-5 active:bg-amber-600"
            >
              {updateMutation.isPending ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text className="text-white font-semibold">Save Changes</Text>
              )}
            </Pressable>
          )}
        </View>

        {/* App Info */}
        <View className="bg-white rounded-2xl shadow-sm p-4 mb-4">
          <Text className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
            App Info
          </Text>
          <View className="flex-row items-center justify-between py-1">
            <Text className="text-sm text-gray-600">Version</Text>
            <Text className="text-sm font-medium text-gray-800">1.0.0</Text>
          </View>
          <View className="flex-row items-center justify-between py-1">
            <Text className="text-sm text-gray-600">Platform</Text>
            <Text className="text-sm font-medium text-gray-800">Yuvarani Silks Mobile</Text>
          </View>
        </View>

        {/* User Mode Toggle (admin/employee only) */}
        {isPrivileged && (
          <View className="bg-white rounded-2xl shadow-sm p-4 mb-4">
            <Text className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
              View Mode
            </Text>
            <Pressable
              onPress={handleToggleViewMode}
              className="flex-row items-center py-2 active:opacity-70"
            >
              <View className="w-10 h-10 rounded-full items-center justify-center bg-indigo-50 mr-3">
                <Ionicons
                  name={viewMode === 'admin' ? 'eye-outline' : 'shield-outline'}
                  size={20}
                  color="#6366f1"
                />
              </View>
              <View className="flex-1">
                <Text className="text-sm font-semibold text-gray-900">
                  {viewMode === 'admin'
                    ? 'Switch to User Mode'
                    : `Switch to ${isAdmin ? 'Admin' : 'Employee'} Mode`}
                </Text>
                <Text className="text-xs text-gray-500 mt-0.5">
                  {viewMode === 'admin'
                    ? 'Browse as a customer'
                    : 'Return to management view'}
                </Text>
              </View>
              <Ionicons name="swap-horizontal" size={20} color="#6366f1" />
            </Pressable>
          </View>
        )}

        {/* My Sales / Sales History (employee & admin only) */}
        {isPrivileged && (
          <View className="bg-white rounded-2xl shadow-sm p-4 mb-4">
            <Text className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
              {isAdmin ? 'Sales History' : 'My Sales'}
            </Text>
            <View className="flex-row">
              <View className="flex-1 items-center py-3 border-r border-gray-100">
                <Text className="text-2xl font-bold text-gray-900">{totalSalesCount}</Text>
                <Text className="text-xs text-gray-500 mt-1">Total Sales</Text>
              </View>
              <View className="flex-1 items-center py-3">
                <Text className="text-2xl font-bold text-amber-600">
                  {formatPrice(totalRevenue)}
                </Text>
                <Text className="text-xs text-gray-500 mt-1">Revenue</Text>
              </View>
            </View>
            <Pressable
              onPress={() =>
                isAdmin
                  ? navigation.navigate('SalesHistory')
                  : navigation.navigate('DashboardTab', { screen: 'MySales' })
              }
              className="mt-3 py-2 rounded-xl items-center active:bg-amber-50"
            >
              <Text className="text-xs font-semibold text-amber-700">View detailed sales →</Text>
            </Pressable>
          </View>
        )}

        {/* Sign Out */}
        <Pressable
          onPress={handleLogout}
          className="bg-red-50 border border-red-200 rounded-2xl py-4 items-center flex-row justify-center gap-2 active:bg-red-100"
        >
          <Ionicons name="log-out-outline" size={18} color="#ef4444" />
          <Text className="text-red-600 font-semibold">Sign Out</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}
