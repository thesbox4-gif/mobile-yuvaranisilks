import React from 'react';
import { View, Text, Pressable, FlatList, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import ScreenHeader from '../../components/ui/ScreenHeader';
import UserAdminActions from '../../components/users/UserAdminActions';
import { getUser, getOrders } from '../../lib/api';
import { formatPrice, formatDate, initials, shortId } from '../../lib/utils';
import { ORDER_STATUS_CONFIG } from '../../constants';

const AVATAR_COLORS = ['#ec4899', '#8b5cf6', '#f59e0b', '#14b8a6', '#881337'];

function avatarColor(name) {
  if (!name) return AVATAR_COLORS[0];
  return AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length];
}

function InfoRow({ icon, children }) {
  if (!children) return null;
  return (
    <View className="flex-row items-center py-2 border-t border-gray-100">
      <Ionicons name={icon} size={16} color="#6b7280" />
      <Text className="text-sm text-gray-700 ml-2">{children}</Text>
    </View>
  );
}

export default function CustomerDetailScreen({ route, navigation }) {
  const { customerId } = route.params;
  const insets = useSafeAreaInsets();

  const { data: customer, isLoading: custLoading } = useQuery({
    queryKey: ['customer', customerId],
    queryFn: () => getUser(customerId),
    staleTime: 30_000,
  });

  const { data: ordersData, isLoading: ordersLoading } = useQuery({
    queryKey: ['customer-orders', customerId],
    queryFn: () => getOrders({ userId: customerId, limit: 100 }),
    staleTime: 30_000,
  });

  const orders = ordersData?.data ?? [];
  const totalSpent = orders
    .filter((o) => o.status !== 'cancelled')
    .reduce((s, o) => s + Number(o.total_amount), 0);

  const renderOrder = ({ item }) => {
    const cfg = ORDER_STATUS_CONFIG[item.status] ?? ORDER_STATUS_CONFIG.placed;
    const productName =
      item.order_items?.[0]?.product?.title ??
      `${item.order_items?.length ?? 0} item(s)`;
    return (
      <Pressable
        onPress={() => navigation.navigate('OrderDetail', { orderId: item.id })}
        className="mx-4 mb-2 bg-white rounded-2xl shadow-sm p-4 flex-row items-center active:bg-gray-50"
      >
        <View className="w-10 h-10 rounded-xl bg-amber-50 items-center justify-center mr-3">
          <Ionicons name="receipt-outline" size={18} color="#f59e0b" />
        </View>
        <View className="flex-1 mr-2">
          <Text className="text-sm font-semibold text-gray-900">#{shortId(item.id)}</Text>
          <Text className="text-xs text-gray-500 mt-0.5" numberOfLines={1}>{productName}</Text>
          <Text className="text-xs text-gray-400 mt-0.5">{formatDate(item.created_at)}</Text>
        </View>
        <View className="items-end">
          <Text className="text-sm font-bold text-gray-900 mb-1">
            {formatPrice(item.total_amount)}
          </Text>
          <View className="px-2.5 py-1 rounded-full" style={{ backgroundColor: cfg.bg }}>
            <Text className="text-xs font-semibold" style={{ color: cfg.text }}>{cfg.label}</Text>
          </View>
        </View>
      </Pressable>
    );
  };

  if (custLoading) {
    return (
      <View className="flex-1 bg-gray-50">
        <ScreenHeader title="Customer" navigation={navigation} />
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#f59e0b" />
        </View>
      </View>
    );
  }

  const name = customer?.name ?? 'Customer';

  return (
    <View className="flex-1 bg-gray-50">
      <ScreenHeader title="Customer" navigation={navigation} />

      <FlatList
        data={orders}
        keyExtractor={(item) => item.id}
        renderItem={renderOrder}
        contentContainerStyle={{ paddingBottom: insets.bottom + 16 }}
        ListHeaderComponent={
          <View className="p-4">
            {/* Profile card */}
            <View className="bg-white rounded-2xl shadow-sm p-4">
              <View className="flex-row items-center">
                <View
                  className="w-14 h-14 rounded-full items-center justify-center mr-3"
                  style={{ backgroundColor: avatarColor(name) }}
                >
                  <Text className="text-white font-bold text-xl">{initials(name).charAt(0)}</Text>
                </View>
                <View className="flex-1">
                  <Text className="text-lg font-bold text-gray-900">{name}</Text>
                  <View className="self-start bg-amber-100 px-2 py-0.5 rounded-full mt-1">
                    <Text className="text-xs font-semibold text-amber-800 capitalize">
                      {customer?.role ?? 'customer'}
                    </Text>
                  </View>
                </View>
              </View>
              <InfoRow icon="mail-outline">{customer?.email}</InfoRow>
              <InfoRow icon="call-outline">{customer?.phone}</InfoRow>
              <InfoRow icon="calendar-outline">
                {customer?.created_at ? `Joined ${formatDate(customer.created_at)}` : null}
              </InfoRow>
            </View>

            {/* Stats */}
            <View className="flex-row mt-3 gap-3">
              <View className="flex-1 bg-white rounded-2xl shadow-sm p-4 items-center">
                <Text className="text-xl font-bold text-gray-900">{orders.length}</Text>
                <Text className="text-xs text-gray-500 mt-1">Total Orders</Text>
              </View>
              <View className="flex-1 bg-white rounded-2xl shadow-sm p-4 items-center">
                <Text className="text-xl font-bold text-gray-900">{formatPrice(totalSpent)}</Text>
                <Text className="text-xs text-gray-500 mt-1">Total Spent</Text>
              </View>
            </View>

            <Text className="text-xs font-semibold text-gray-500 uppercase tracking-widest mt-5 mb-2">
              Order History
            </Text>
            {ordersLoading && (
              <View className="py-6 items-center">
                <ActivityIndicator color="#f59e0b" />
              </View>
            )}
          </View>
        }
        ListEmptyComponent={
          !ordersLoading ? (
            <View className="items-center py-8 px-8">
              <Ionicons name="receipt-outline" size={32} color="#d1d5db" />
              <Text className="text-sm text-gray-400 mt-2 text-center">
                This customer has not placed any orders yet.
              </Text>
            </View>
          ) : null
        }
        ListFooterComponent={
          <UserAdminActions
            userId={customerId}
            userName={name}
            active={customer?.active}
            onDeleted={() => navigation.goBack()}
          />
        }
      />
    </View>
  );
}
