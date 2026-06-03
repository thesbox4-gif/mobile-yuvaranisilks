import React, { useState } from 'react';
import {
  View, Text, FlatList, Pressable, TextInput,
  RefreshControl, ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { getCustomers } from '../../lib/api';
import { formatPrice, initials } from '../../lib/utils';
import EmptyState from '../../components/ui/EmptyState';
import { useRefetchOnFocus } from '../../hooks/useRefetchOnFocus';
import { useRootTabBackToDashboard } from '../../hooks/useHardwareBackHandler';

const AVATAR_COLORS = ['#ec4899', '#8b5cf6', '#f59e0b', '#14b8a6', '#881337'];

function avatarColor(name) {
  if (!name) return AVATAR_COLORS[0];
  return AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length];
}

export default function CustomersScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [search, setSearch] = useState('');

  useRootTabBackToDashboard(navigation);

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['customers', search.trim()],
    queryFn: () => getCustomers({ search: search.trim() || undefined, limit: 100 }),
    staleTime: 30_000,
  });

  useRefetchOnFocus(['customers']);

  const customers = data?.data ?? [];

  const renderItem = ({ item }) => (
    <Pressable
      onPress={() => navigation.navigate('CustomerDetail', { customerId: item.id })}
      className="mx-4 mb-2 bg-white rounded-2xl shadow-sm p-4 flex-row items-center active:bg-gray-50"
    >
      <View
        className="w-12 h-12 rounded-full items-center justify-center mr-3"
        style={{ backgroundColor: avatarColor(item.name) }}
      >
        <Text className="text-white font-bold text-lg">
          {initials(item.name).charAt(0)}
        </Text>
      </View>

      <View className="flex-1 mr-3">
        <Text className="text-sm font-bold text-gray-900" numberOfLines={1}>
          {item.name}
        </Text>
        {item.email ? (
          <Text className="text-xs text-gray-500 mt-0.5" numberOfLines={1}>{item.email}</Text>
        ) : null}
        {item.phone ? (
          <Text className="text-xs text-gray-400 mt-0.5">{item.phone}</Text>
        ) : null}
      </View>

      <View className="items-end">
        <Text className="text-sm font-bold text-gray-900">{formatPrice(item.totalSpent ?? 0)}</Text>
        <Text className="text-xs text-gray-400 mt-0.5">
          {item.orderCount ?? 0} order{(item.orderCount ?? 0) === 1 ? '' : 's'}
        </Text>
      </View>
    </Pressable>
  );

  return (
    <View className="flex-1 bg-gray-50">
      {/* Header */}
      <View
        style={{ paddingTop: insets.top }}
        className="bg-amber-50 border-b border-amber-100"
      >
        <View className="flex-row items-center justify-between px-4 pt-3 pb-2">
          <View>
            <Text className="text-2xl font-bold text-gray-900">Customers</Text>
            <Text className="text-xs text-gray-500 mt-0.5">
              {customers.length} account{customers.length === 1 ? '' : 's'}
            </Text>
          </View>
          <Pressable
            onPress={() => navigation.navigate('CreateUser', { role: 'customer', lockRole: true })}
            className="flex-row items-center px-3 h-10 rounded-full bg-amber-500 active:bg-amber-600"
          >
            <Ionicons name="person-add" size={16} color="#fff" />
            <Text className="text-white text-xs font-semibold ml-1.5">New</Text>
          </Pressable>
        </View>

        {/* Search */}
        <View className="mx-4 mb-3 flex-row items-center bg-white rounded-xl px-3 py-2.5 border border-gray-200">
          <Ionicons name="search" size={18} color="#9ca3af" />
          <TextInput
            className="flex-1 ml-2 text-base text-gray-900"
            placeholder="Search by customer name…"
            placeholderTextColor="#9ca3af"
            value={search}
            onChangeText={setSearch}
          />
          {search.length > 0 && (
            <Pressable onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={18} color="#9ca3af" />
            </Pressable>
          )}
        </View>
      </View>

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#f59e0b" />
        </View>
      ) : (
        <FlatList
          data={customers}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={{ paddingBottom: insets.bottom + 16, paddingTop: 8 }}
          ListEmptyComponent={
            <EmptyState
              icon="people-outline"
              title="No customers found"
              message={
                search
                  ? 'Try a different search term'
                  : 'Tap “New” to create a customer account'
              }
            />
          }
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={refetch}
              tintColor="#f59e0b"
              colors={['#f59e0b']}
            />
          }
        />
      )}
    </View>
  );
}
