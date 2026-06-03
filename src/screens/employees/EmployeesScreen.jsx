import React, { useState } from 'react';
import {
  View, Text, FlatList, Pressable, RefreshControl,
  ActivityIndicator, Alert, ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { getEmployees, approveEmployee } from '../../lib/api';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import EmptyState from '../../components/ui/EmptyState';
import ScreenHeader from '../../components/ui/ScreenHeader';
import { formatDate, initials } from '../../lib/utils';
import { confirmDialog } from '../../lib/dialog';
import { useRefetchOnFocus } from '../../hooks/useRefetchOnFocus';
import * as Haptics from 'expo-haptics';

const TABS = ['Pending', 'Active'];

function EmployeeAvatar({ name }) {
  return (
    <View className="w-12 h-12 bg-amber-500 rounded-full items-center justify-center">
      <Text className="text-white font-bold text-base">{initials(name)}</Text>
    </View>
  );
}

export default function EmployeesScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState(0);
  const status = activeTab === 0 ? 'pending' : 'approved';

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['employees', status],
    queryFn: () => getEmployees({ status }),
    staleTime: 30_000,
  });

  // Reload whenever the admin opens this screen so newly registered
  // employees appear without needing a manual pull-to-refresh.
  useRefetchOnFocus(['employees']);

  const approveMutation = useMutation({
    mutationFn: ({ id, action }) => approveEmployee(id, action),
    onSuccess: (_, { action }) => {
      Haptics.notificationAsync(
        action === 'approve'
          ? Haptics.NotificationFeedbackType.Success
          : Haptics.NotificationFeedbackType.Warning
      );
      // refetchType 'all' forces the inactive tab (Pending/Active) to refresh too,
      // so an approved employee leaves Pending and shows under Active immediately.
      qc.invalidateQueries({ queryKey: ['employees'], refetchType: 'all' });
    },
    onError: (err) => Alert.alert('Error', err.message),
  });

  const handleAction = (emp, action) => {
    const label = action === 'approve' ? 'Approve' : 'Reject';
    confirmDialog({
      title: `${label} Employee`,
      message: `${label} ${emp.name}?`,
      confirmText: label,
      destructive: action === 'reject',
      onConfirm: () => approveMutation.mutate({ id: emp.id, action }),
    });
  };

  const employees = data?.data ?? [];

  if (isLoading) return <LoadingSpinner />;

  return (
    <View className="flex-1 bg-gray-50">
      <ScreenHeader
        title="Employees"
        navigation={navigation}
        rightElement={
          <Pressable
            onPress={() => navigation.navigate('CreateUser', { role: 'employee', lockRole: true })}
            className="flex-row items-center px-3 h-9 rounded-full bg-amber-500 active:bg-amber-600"
          >
            <Ionicons name="person-add" size={15} color="#fff" />
            <Text className="text-white text-xs font-semibold ml-1.5">New</Text>
          </Pressable>
        }
      />

      {/* Tabs */}
      <View className="flex-row bg-white border-b border-gray-100 px-4">
        {TABS.map((tab, i) => (
          <Pressable
            key={tab}
            onPress={() => setActiveTab(i)}
            className="mr-6 py-3.5"
          >
            <Text className={`text-sm font-semibold ${activeTab === i ? 'text-amber-600' : 'text-gray-500'}`}>
              {tab}
            </Text>
            {activeTab === i && (
              <View className="absolute bottom-0 left-0 right-0 h-0.5 bg-amber-500" />
            )}
          </Pressable>
        ))}
      </View>

      <FlatList
        data={employees}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 16 }}
        renderItem={({ item }) => (
          <View className="bg-white rounded-2xl shadow-sm mb-3 p-4">
            <View className="flex-row items-center mb-3">
              <EmployeeAvatar name={item.name} />
              <View className="flex-1 ml-3">
                <Text className="text-base font-semibold text-gray-900">{item.name}</Text>
                <Text className="text-sm text-gray-500">{item.email}</Text>
                {item.phone && <Text className="text-xs text-gray-400 mt-0.5">{item.phone}</Text>}
              </View>
            </View>

            <View className="flex-row items-center justify-between">
              <Text className="text-xs text-gray-400">
                Joined {formatDate(item.created_at)}
              </Text>

              {activeTab === 0 && (
                <View className="flex-row gap-2">
                  <Pressable
                    onPress={() => handleAction(item, 'reject')}
                    disabled={approveMutation.isPending}
                    className="px-4 py-2 border border-red-200 rounded-xl active:bg-red-50"
                  >
                    <Text className="text-xs text-red-600 font-semibold">Reject</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => handleAction(item, 'approve')}
                    disabled={approveMutation.isPending}
                    className="px-4 py-2 bg-green-500 rounded-xl active:bg-green-600"
                  >
                    {approveMutation.isPending && approveMutation.variables?.id === item.id ? (
                      <ActivityIndicator size="small" color="#ffffff" />
                    ) : (
                      <Text className="text-xs text-white font-semibold">Approve</Text>
                    )}
                  </Pressable>
                </View>
              )}

              {activeTab === 1 && (
                <View className="bg-green-100 px-2.5 py-1 rounded-full flex-row items-center">
                  <Ionicons name="checkmark-circle" size={12} color="#15803d" />
                  <Text className="text-xs text-green-700 font-medium ml-1">Active</Text>
                </View>
              )}
            </View>
          </View>
        )}
        ListEmptyComponent={
          <EmptyState
            icon="people-outline"
            title={activeTab === 0 ? 'No pending employees' : 'No active employees'}
            message={activeTab === 0 ? 'New employee registrations will appear here' : 'Approved employees will appear here'}
          />
        }
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor="#f59e0b" colors={['#f59e0b']} />
        }
      />
    </View>
  );
}
