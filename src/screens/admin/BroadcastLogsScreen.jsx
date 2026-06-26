import React, { useState } from 'react';
import { View, Text, FlatList, Pressable, ActivityIndicator, RefreshControl } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { getBroadcastLogs } from '../../lib/api';
import ScreenHeader from '../../components/ui/ScreenHeader';
import { formatDate } from '../../lib/utils';

function StatusChip({ sent, failed }) {
  const total = (sent ?? 0) + (failed ?? 0);
  const successRate = total > 0 ? Math.round(((sent ?? 0) / total) * 100) : 0;
  const color = successRate >= 90 ? '#16a34a' : successRate >= 60 ? '#d97706' : '#dc2626';
  const bg = successRate >= 90 ? '#f0fdf4' : successRate >= 60 ? '#fffbeb' : '#fef2f2';
  return (
    <View style={{ backgroundColor: bg }} className="px-2 py-0.5 rounded-full">
      <Text style={{ color }} className="text-[10px] font-bold">{successRate}% delivered</Text>
    </View>
  );
}

function BroadcastRow({ item }) {
  const sent = item.sentCount ?? item.sent_count ?? item.sent ?? 0;
  const failed = item.failedCount ?? item.failed_count ?? item.failed ?? 0;
  const date = item.sentAt ?? item.sent_at ?? item.createdAt ?? item.created_at;
  return (
    <View className="bg-white mx-4 mb-3 rounded-2xl p-4 shadow-sm">
      <View className="flex-row items-start justify-between mb-2">
        <View className="flex-1 mr-3">
          <Text className="text-sm font-semibold text-gray-900" numberOfLines={2}>
            {item.productName ?? item.product_name ?? item.product?.title ?? 'Broadcast'}
          </Text>
          {date && (
            <Text className="text-xs text-gray-400 mt-0.5">{formatDate(date)}</Text>
          )}
        </View>
        <StatusChip sent={sent} failed={failed} />
      </View>

      <View className="flex-row gap-4 mt-1">
        <View className="flex-row items-center gap-1">
          <Ionicons name="checkmark-circle" size={14} color="#16a34a" />
          <Text className="text-xs font-medium text-gray-700">{sent} sent</Text>
        </View>
        <View className="flex-row items-center gap-1">
          <Ionicons name="close-circle" size={14} color="#dc2626" />
          <Text className="text-xs font-medium text-gray-700">{failed} failed</Text>
        </View>
        {(item.type || item.channel) && (
          <View className="flex-row items-center gap-1">
            <Ionicons name="megaphone-outline" size={13} color="#6b7280" />
            <Text className="text-xs text-gray-500 capitalize">{item.type ?? item.channel}</Text>
          </View>
        )}
      </View>
    </View>
  );
}

function EmptyState() {
  return (
    <View className="flex-1 items-center justify-center py-20">
      <View className="w-16 h-16 rounded-full bg-gray-100 items-center justify-center mb-4">
        <Ionicons name="megaphone-outline" size={28} color="#9ca3af" />
      </View>
      <Text className="text-base font-semibold text-gray-700">No Broadcasts Yet</Text>
      <Text className="text-sm text-gray-400 mt-1 text-center px-8">
        Broadcast logs will appear here after sending product announcements.
      </Text>
    </View>
  );
}

export default function BroadcastLogsScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [refreshing, setRefreshing] = useState(false);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['broadcast-logs'],
    queryFn: () => getBroadcastLogs({ limit: 100 }),
    staleTime: 60_000,
  });

  const logs = data?.data ?? data?.logs ?? (Array.isArray(data) ? data : []);

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  // Aggregate stats
  const totalSent = logs.reduce((s, x) => s + (x.sentCount ?? x.sent_count ?? x.sent ?? 0), 0);
  const totalFailed = logs.reduce((s, x) => s + (x.failedCount ?? x.failed_count ?? x.failed ?? 0), 0);

  return (
    <View className="flex-1 bg-gray-50">
      <ScreenHeader title="Broadcast Logs" navigation={navigation} />

      {/* Summary banner */}
      {logs.length > 0 && (
        <View className="flex-row mx-4 mt-4 mb-2 gap-3">
          <View className="flex-1 bg-green-50 rounded-2xl p-3 items-center">
            <Text className="text-xl font-bold text-green-700">{totalSent.toLocaleString()}</Text>
            <Text className="text-[10px] text-green-600 font-medium mt-0.5">Total Sent</Text>
          </View>
          <View className="flex-1 bg-red-50 rounded-2xl p-3 items-center">
            <Text className="text-xl font-bold text-red-600">{totalFailed.toLocaleString()}</Text>
            <Text className="text-[10px] text-red-500 font-medium mt-0.5">Total Failed</Text>
          </View>
          <View className="flex-1 bg-blue-50 rounded-2xl p-3 items-center">
            <Text className="text-xl font-bold text-blue-700">{logs.length}</Text>
            <Text className="text-[10px] text-blue-600 font-medium mt-0.5">Broadcasts</Text>
          </View>
        </View>
      )}

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#f59e0b" />
        </View>
      ) : (
        <FlatList
          data={logs}
          keyExtractor={(item, i) => String(item.id ?? i)}
          renderItem={({ item }) => <BroadcastRow item={item} />}
          ListEmptyComponent={EmptyState}
          contentContainerStyle={{ paddingTop: 8, paddingBottom: insets.bottom + 24, flexGrow: 1 }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#f59e0b" colors={['#f59e0b']} />
          }
        />
      )}
    </View>
  );
}
