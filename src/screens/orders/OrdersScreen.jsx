import React, { useState, useCallback } from 'react';
import {
  View, Text, FlatList, Pressable, RefreshControl,
  ActivityIndicator, TextInput, ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useInfiniteQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { getOrders } from '../../lib/api';
import OrderCard from '../../components/orders/OrderCard';
import EmptyState from '../../components/ui/EmptyState';
import { useRefetchOnFocus } from '../../hooks/useRefetchOnFocus';

const STATUS_TABS = [
  { label: 'All', value: null },
  { label: 'Placed', value: 'placed' },
  { label: 'Confirmed', value: 'confirmed' },
  { label: 'Processing', value: 'processing' },
  { label: 'Shipped', value: 'shipped' },
  { label: 'Delivered', value: 'delivered' },
  { label: 'Cancelled', value: 'cancelled' },
];

export default function OrdersScreen({ navigation, route }) {
  const insets = useSafeAreaInsets();
  const [activeStatus, setActiveStatus] = useState(route?.params?.initialStatus ?? null);
  const [search, setSearch] = useState('');

  const {
    data, fetchNextPage, hasNextPage, isFetchingNextPage,
    isLoading, refetch, isRefetching,
  } = useInfiniteQuery({
    queryKey: ['orders', activeStatus, search],
    queryFn: ({ pageParam = 1 }) =>
      getOrders({ page: pageParam, limit: 20, status: activeStatus || undefined }),
    getNextPageParam: (last) => last.page < last.totalPages ? last.page + 1 : undefined,
    staleTime: 30_000,
  });

  useRefetchOnFocus(['orders']);

  const orders = data?.pages.flatMap((p) => p.data) ?? [];

  const renderItem = useCallback(({ item }) => (
    <OrderCard
      order={item}
      onPress={() => navigation.navigate('OrderDetail', { orderId: item.id })}
    />
  ), [navigation]);

  return (
    <View className="flex-1 bg-gray-50" style={{ paddingTop: insets.top }}>
      {/* Header */}
      <View className="bg-white px-4 pb-3 border-b border-gray-100">
        <Text className="text-2xl font-bold text-gray-900 pt-3 mb-3">Orders</Text>

        {/* Search */}
        <View className="flex-row items-center bg-gray-100 rounded-xl px-3 py-2.5 mb-3">
          <Ionicons name="search" size={18} color="#9ca3af" />
          <TextInput
            className="flex-1 ml-2 text-base text-gray-900"
            placeholder="Search order ID…"
            placeholderTextColor="#9ca3af"
            value={search}
            onChangeText={setSearch}
          />
        </View>

        {/* Status tabs */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View className="flex-row gap-2">
            {STATUS_TABS.map((tab) => (
              <Pressable
                key={tab.label}
                onPress={() => setActiveStatus(tab.value)}
                className={`px-3.5 py-1.5 rounded-full border ${
                  activeStatus === tab.value
                    ? 'bg-amber-500 border-amber-500'
                    : 'bg-white border-gray-200'
                }`}
              >
                <Text className={`text-xs font-semibold ${activeStatus === tab.value ? 'text-white' : 'text-gray-600'}`}>
                  {tab.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </ScrollView>
      </View>

      <FlatList
        data={isLoading ? [] : orders}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingTop: 12, paddingBottom: insets.bottom + 16 }}
        onEndReached={() => hasNextPage && fetchNextPage()}
        onEndReachedThreshold={0.3}
        ListFooterComponent={
          isFetchingNextPage ? (
            <View className="py-4 items-center">
              <ActivityIndicator color="#f59e0b" />
            </View>
          ) : null
        }
        ListEmptyComponent={
          isLoading ? null : (
            <EmptyState
              icon="receipt-outline"
              title="No orders found"
              message={activeStatus ? `No ${activeStatus} orders` : 'Orders will appear here'}
            />
          )
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
    </View>
  );
}
