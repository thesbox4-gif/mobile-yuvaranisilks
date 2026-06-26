import React, { useState } from 'react';
import { View, Text, FlatList, ActivityIndicator, RefreshControl } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { getReengagementLogs } from '../../lib/api';
import ScreenHeader from '../../components/ui/ScreenHeader';
import { formatDate } from '../../lib/utils';

const STATUS_CONFIG = {
  delivered: { color: '#16a34a', bg: '#f0fdf4', icon: 'checkmark-circle' },
  sent:      { color: '#2563eb', bg: '#eff6ff', icon: 'paper-plane' },
  failed:    { color: '#dc2626', bg: '#fef2f2', icon: 'close-circle' },
  pending:   { color: '#d97706', bg: '#fffbeb', icon: 'time-outline' },
  read:      { color: '#0d9488', bg: '#f0fdfa', icon: 'eye-outline' },
};

function DeliveryChip({ status }) {
  const s = STATUS_CONFIG[status?.toLowerCase()] ?? STATUS_CONFIG.pending;
  return (
    <View style={{ backgroundColor: s.bg }} className="flex-row items-center gap-1 px-2.5 py-1 rounded-full">
      <Ionicons name={s.icon} size={12} color={s.color} />
      <Text style={{ color: s.color }} className="text-[10px] font-bold capitalize">{status ?? 'Unknown'}</Text>
    </View>
  );
}

function LogRow({ item }) {
  const name = item.customerName ?? item.customer_name ?? item.name ?? 'Customer';
  const phone = item.phone ?? item.customerPhone ?? item.customer_phone ?? '';
  const date = item.sentAt ?? item.sent_at ?? item.date ?? item.createdAt ?? item.created_at;
  const status = item.deliveryStatus ?? item.delivery_status ?? item.status ?? 'sent';
  const channel = item.channel ?? item.type ?? 'whatsapp';
  const month = item.month ?? '';

  return (
    <View className="bg-white mx-4 mb-3 rounded-2xl p-4 shadow-sm">
      <View className="flex-row items-start justify-between">
        <View className="flex-1 mr-3">
          <Text className="text-sm font-semibold text-gray-900" numberOfLines={1}>{name}</Text>
          {phone ? (
            <View className="flex-row items-center gap-1 mt-0.5">
              <Ionicons name="call-outline" size={12} color="#9ca3af" />
              <Text className="text-xs text-gray-500">{phone}</Text>
            </View>
          ) : null}
        </View>
        <DeliveryChip status={status} />
      </View>

      <View className="flex-row items-center gap-3 mt-2 pt-2 border-t border-gray-50">
        {date && (
          <View className="flex-row items-center gap-1">
            <Ionicons name="calendar-outline" size={12} color="#9ca3af" />
            <Text className="text-[11px] text-gray-500">{formatDate(date)}</Text>
          </View>
        )}
        {month && (
          <View className="flex-row items-center gap-1">
            <Ionicons name="time-outline" size={12} color="#9ca3af" />
            <Text className="text-[11px] text-gray-500">{month}</Text>
          </View>
        )}
        <View className="flex-row items-center gap-1">
          <Ionicons
            name={channel === 'whatsapp' ? 'logo-whatsapp' : 'phone-portrait-outline'}
            size={12}
            color="#9ca3af"
          />
          <Text className="text-[11px] text-gray-500 capitalize">{channel}</Text>
        </View>
      </View>
    </View>
  );
}

function EmptyState() {
  return (
    <View className="flex-1 items-center justify-center py-20">
      <View className="w-16 h-16 rounded-full bg-gray-100 items-center justify-center mb-4">
        <Ionicons name="people-outline" size={28} color="#9ca3af" />
      </View>
      <Text className="text-base font-semibold text-gray-700">No Re-engagement Logs</Text>
      <Text className="text-sm text-gray-400 mt-1 text-center px-8">
        Monthly customer reminders will appear here once sent.
      </Text>
    </View>
  );
}

// Group logs by month for better readability
function groupByMonth(logs) {
  const groups = {};
  for (const log of logs) {
    const date = log.sentAt ?? log.sent_at ?? log.date ?? log.createdAt ?? log.created_at;
    const key = log.month ?? (date ? new Date(date).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' }) : 'Unknown');
    if (!groups[key]) groups[key] = [];
    groups[key].push(log);
  }
  return Object.entries(groups).map(([month, items]) => ({ month, items }));
}

export default function ReengagementLogsScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [refreshing, setRefreshing] = useState(false);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['reengagement-logs'],
    queryFn: () => getReengagementLogs({ limit: 200 }),
    staleTime: 120_000,
  });

  const logs = data?.data ?? data?.logs ?? (Array.isArray(data) ? data : []);
  const groups = groupByMonth(logs);

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  // Flat list items: month headers + log rows
  const flatItems = [];
  for (const { month, items } of groups) {
    flatItems.push({ _type: 'header', month, count: items.length });
    for (const item of items) flatItems.push({ _type: 'row', ...item });
  }

  const renderItem = ({ item }) => {
    if (item._type === 'header') {
      return (
        <View className="flex-row items-center justify-between px-4 pt-4 pb-2">
          <Text className="text-xs font-bold text-gray-500 uppercase tracking-widest">{item.month}</Text>
          <Text className="text-xs text-gray-400">{item.count} reminder{item.count !== 1 ? 's' : ''}</Text>
        </View>
      );
    }
    return <LogRow item={item} />;
  };

  return (
    <View className="flex-1 bg-gray-50">
      <ScreenHeader title="Re-engagement Logs" navigation={navigation} />

      {/* Summary */}
      {logs.length > 0 && (
        <View className="flex-row mx-4 mt-4 mb-2 gap-3">
          {[
            { label: 'Total', value: logs.length, color: '#2563eb', bg: '#eff6ff' },
            { label: 'Delivered', value: logs.filter((x) => (x.deliveryStatus ?? x.delivery_status ?? x.status) === 'delivered').length, color: '#16a34a', bg: '#f0fdf4' },
            { label: 'Failed', value: logs.filter((x) => (x.deliveryStatus ?? x.delivery_status ?? x.status) === 'failed').length, color: '#dc2626', bg: '#fef2f2' },
          ].map((s) => (
            <View key={s.label} style={{ backgroundColor: s.bg }} className="flex-1 rounded-2xl p-3 items-center">
              <Text style={{ color: s.color }} className="text-xl font-bold">{s.value}</Text>
              <Text style={{ color: s.color }} className="text-[10px] font-medium mt-0.5">{s.label}</Text>
            </View>
          ))}
        </View>
      )}

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#f59e0b" />
        </View>
      ) : (
        <FlatList
          data={flatItems}
          keyExtractor={(item, i) => `${item._type}-${item.month ?? ''}-${item.id ?? i}`}
          renderItem={renderItem}
          ListEmptyComponent={EmptyState}
          contentContainerStyle={{ paddingBottom: insets.bottom + 24, flexGrow: 1 }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#f59e0b" colors={['#f59e0b']} />
          }
        />
      )}
    </View>
  );
}
