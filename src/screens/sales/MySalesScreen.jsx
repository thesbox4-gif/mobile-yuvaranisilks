import React, { useState } from 'react';
import { View, Text, Pressable, FlatList, ActivityIndicator, RefreshControl } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import ScreenHeader from '../../components/ui/ScreenHeader';
import { navigationRef } from '../../navigation/navigationRef';
import { getOfflineSales, getOrders } from '../../lib/api';
import { formatPrice, formatDate, shortId } from '../../lib/utils';
import useAuthStore from '../../store/authStore';
import { ORDER_STATUS_CONFIG } from '../../constants';

const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'today', label: 'Today' },
  { key: 'week', label: '7 Days' },
  { key: 'month', label: '30 Days' },
];

const CHANNELS = [
  { key: 'offline', label: 'Offline' },
  { key: 'online', label: 'Online' },
];

const shadowStyle = {
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 1 },
  shadowOpacity: 0.1,
  shadowRadius: 2,
  elevation: 2,
};

function filterStart(key) {
  const now = new Date();
  if (key === 'today') return new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  if (key === 'week') return now.getTime() - 7 * 86400000;
  if (key === 'month') return now.getTime() - 30 * 86400000;
  return 0;
}

function OfflineSaleRow({ sale, showSeller }) {
  const amount = Number(sale.unit_price) * Number(sale.quantity);
  const variantLabel = [sale.variant?.color, sale.variant?.size].filter(Boolean).join(' · ');
  return (
    <View className="mx-4 mb-2 bg-white rounded-2xl p-4" style={shadowStyle}>
      <View className="flex-row items-start">
        <View className="w-10 h-10 rounded-xl bg-amber-50 items-center justify-center mr-3">
          <Ionicons name="bag-check-outline" size={18} color="#f59e0b" />
        </View>
        <View className="flex-1 mr-2">
          <Text className="text-sm font-semibold text-gray-900" numberOfLines={1}>
            {sale.product?.title || 'Product'}
          </Text>
          {variantLabel ? (
            <Text className="text-xs text-gray-500 mt-0.5">{variantLabel}</Text>
          ) : null}
          <Text className="text-xs text-gray-400 mt-0.5">
            Qty {sale.quantity} · {formatDate(sale.created_at)}
          </Text>
        </View>
        <Text className="text-sm font-bold text-gray-900">{formatPrice(amount)}</Text>
      </View>
      <View className="flex-row items-center mt-2 pt-2 border-t border-gray-50">
        <Ionicons name="person-outline" size={13} color="#9ca3af" />
        <Text className="text-xs text-gray-600 ml-1.5" numberOfLines={1}>
          {sale.customer_name || 'Walk-in customer'}
          {sale.customer_phone ? ` · ${sale.customer_phone}` : ''}
          {showSeller && sale.seller?.name ? ` · Sold by: ${sale.seller.name}` : ''}
        </Text>
      </View>
    </View>
  );
}

function OnlineOrderRow({ order, onPress }) {
  const cfg = ORDER_STATUS_CONFIG[order.status] || ORDER_STATUS_CONFIG.placed;
  const itemCount = order.order_items?.length ?? 0;
  return (
    <Pressable onPress={onPress} className="mx-4 mb-2 bg-white rounded-2xl p-4 active:opacity-90" style={shadowStyle}>
      <View className="flex-row items-start">
        <View className="w-10 h-10 rounded-xl bg-indigo-50 items-center justify-center mr-3">
          <Ionicons name="globe-outline" size={18} color="#6366f1" />
        </View>
        <View className="flex-1 mr-2">
          <Text className="text-sm font-semibold text-gray-900" numberOfLines={1}>
            {order.user?.name || 'Online customer'}
          </Text>
          {order.user?.phone ? (
            <Text className="text-xs text-gray-500 mt-0.5">{order.user.phone}</Text>
          ) : null}
          <Text className="text-xs text-gray-400 mt-0.5">
            Order #{shortId(order.id)} · {formatDate(order.created_at)}
            {itemCount > 0 ? ` · ${itemCount} item${itemCount !== 1 ? 's' : ''}` : ''}
          </Text>
        </View>
        <Text className="text-sm font-bold text-gray-900">{formatPrice(order.total_amount)}</Text>
      </View>
      <View className="flex-row items-center justify-between mt-2 pt-2 border-t border-gray-50">
        <Text className="text-xs text-gray-500">Tap for full order details</Text>
        <View className="px-2 py-0.5 rounded-full" style={{ backgroundColor: cfg.bg }}>
          <Text className="text-[10px] font-semibold" style={{ color: cfg.text }}>{cfg.label}</Text>
        </View>
      </View>
    </Pressable>
  );
}

function ChannelToggle({ channel, onChange, showOnline }) {
  if (!showOnline) return null;
  return (
    <View className="flex-row bg-gray-100 rounded-xl p-1 mb-3">
      {CHANNELS.map((c) => (
        <Pressable
          key={c.key}
          onPress={() => onChange(c.key)}
          className={`flex-1 py-2.5 rounded-lg items-center ${channel === c.key ? 'bg-white' : ''}`}
          style={channel === c.key ? shadowStyle : null}
        >
          <Text className={`text-xs font-semibold ${channel === c.key ? 'text-amber-600' : 'text-gray-500'}`}>
            {c.label}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

function DateFilters({ filter, onChange }) {
  return (
    <View className="flex-row bg-gray-100 rounded-xl p-1">
      {FILTERS.map((f) => (
        <Pressable
          key={f.key}
          onPress={() => onChange(f.key)}
          className={`flex-1 py-2 rounded-lg items-center ${filter === f.key ? 'bg-white' : ''}`}
          style={filter === f.key ? shadowStyle : null}
        >
          <Text className={`text-xs font-semibold ${filter === f.key ? 'text-amber-600' : 'text-gray-500'}`}>
            {f.label}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

export default function MySalesScreen({ navigation, route }) {
  const insets = useSafeAreaInsets();
  const [filter, setFilter] = useState('all');
  const user = useAuthStore((s) => s.user);
  const isAdmin = user?.role === 'admin';
  const initialChannel = route?.params?.channel === 'online' && isAdmin ? 'online' : 'offline';
  const [channel, setChannel] = useState(initialChannel);

  const handleBack = () => {
    if (navigation?.canGoBack?.()) {
      navigation.goBack();
    } else if (navigationRef.isReady()) {
      navigationRef.goBack();
    }
  };

  const {
    data: offlineData,
    isLoading: offlineLoading,
    refetch: refetchOffline,
    isRefetching: offlineRefetching,
  } = useQuery({
    queryKey: ['offline-sales', isAdmin ? 'all' : 'mine'],
    queryFn: () => getOfflineSales({ limit: 200 }),
    staleTime: 30_000,
    enabled: channel === 'offline',
  });

  const {
    data: onlineData,
    isLoading: onlineLoading,
    refetch: refetchOnline,
    isRefetching: onlineRefetching,
  } = useQuery({
    queryKey: ['orders', 'sales-history'],
    queryFn: () => getOrders({ page: 1, limit: 100 }),
    staleTime: 30_000,
    enabled: isAdmin && channel === 'online',
  });

  const allOffline = offlineData?.data ?? [];
  const allOnline = onlineData?.data ?? [];
  const cutoff = filterStart(filter);

  const offlineSales = allOffline.filter((s) => new Date(s.created_at).getTime() >= cutoff);
  const onlineOrders = allOnline.filter((o) => new Date(o.created_at).getTime() >= cutoff);

  const offlineRevenue = offlineSales.reduce(
    (sum, s) => sum + Number(s.unit_price) * Number(s.quantity),
    0
  );
  const offlineItems = offlineSales.reduce((sum, s) => sum + Number(s.quantity), 0);
  const onlineRevenue = onlineOrders.reduce((sum, o) => sum + Number(o.total_amount || 0), 0);

  const isOffline = channel === 'offline';
  const isLoading = isOffline ? offlineLoading : onlineLoading;
  const isRefetching = isOffline ? offlineRefetching : onlineRefetching;
  const onRefresh = isOffline ? refetchOffline : refetchOnline;

  const listData = isOffline ? offlineSales : onlineOrders;
  const summaryLabel = isOffline
    ? (isAdmin ? 'OFFLINE REVENUE' : 'MY EARNINGS')
    : 'ONLINE REVENUE';
  const summaryAmount = isOffline ? offlineRevenue : onlineRevenue;
  const summaryMeta = isOffline
    ? `${offlineSales.length} sales · ${offlineItems} items sold`
    : `${onlineOrders.length} orders`;

  return (
    <View className="flex-1 bg-gray-50">
      <ScreenHeader title={isAdmin ? 'Sales History' : 'My Sales'} onBack={handleBack} />

      <FlatList
        data={isLoading ? [] : listData}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) =>
          isOffline ? (
            <OfflineSaleRow sale={item} showSeller={isAdmin} />
          ) : (
            <OnlineOrderRow
              order={item}
              onPress={() => navigation.navigate('OrderDetail', { orderId: item.id })}
            />
          )
        }
        contentContainerStyle={{ paddingBottom: insets.bottom + 16, paddingTop: 12 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={onRefresh} tintColor="#f59e0b" colors={['#f59e0b']} />
        }
        ListHeaderComponent={
          <View className="px-4 pb-2">
            <View className="bg-white rounded-2xl p-5 mb-3" style={shadowStyle}>
              <Text className="text-xs font-semibold text-gray-400 tracking-widest">{summaryLabel}</Text>
              <Text className="text-3xl font-bold text-gray-900 mt-1">{formatPrice(summaryAmount)}</Text>
              <Text className="text-xs text-gray-500 mt-1">{summaryMeta}</Text>
            </View>

            <ChannelToggle channel={channel} onChange={setChannel} showOnline={isAdmin} />
            <DateFilters filter={filter} onChange={setFilter} />
          </View>
        }
        ListEmptyComponent={
          isLoading ? (
            <View className="py-16 items-center">
              <ActivityIndicator size="large" color="#f59e0b" />
            </View>
          ) : (
            <View className="items-center py-16 px-8">
              <Ionicons name="receipt-outline" size={36} color="#d1d5db" />
              <Text className="text-sm text-gray-400 mt-3 text-center">
                {isOffline
                  ? 'No offline sales in this period. Mark an item as sold from a product page.'
                  : 'No online orders in this period.'}
              </Text>
            </View>
          )
        }
      />
    </View>
  );
}
