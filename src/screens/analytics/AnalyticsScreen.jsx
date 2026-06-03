import React, { useState, useCallback } from 'react';
import { View, Text, ScrollView, ActivityIndicator, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { BarChart } from 'react-native-gifted-charts';
import ScreenHeader from '../../components/ui/ScreenHeader';
import { getSales, getCategorySales, getEmployeePerformance, getSalesSummary } from '../../lib/api';
import { formatPrice } from '../../lib/utils';
import { useHardwareBackHandler } from '../../hooks/useHardwareBackHandler';

const EMP_FILTERS = [
  { key: null, label: 'All' },
  { key: 'today', label: 'Today' },
  { key: 'week', label: '7 Days' },
  { key: 'month', label: '30 Days' },
];

function SectionCard({ title, subtitle, children, rightElement }) {
  return (
    <View className="mx-4 bg-white rounded-2xl shadow-sm mb-4 overflow-hidden">
      <View className="px-4 pt-4 pb-3 flex-row items-start justify-between">
        <View className="flex-1">
          <Text className="text-base font-semibold text-gray-900">{title}</Text>
          {subtitle && <Text className="text-xs text-gray-500 mt-0.5">{subtitle}</Text>}
        </View>
        {rightElement && <View className="ml-2">{rightElement}</View>}
      </View>
      <View className="px-4 pb-4">{children}</View>
    </View>
  );
}

function RankBadge({ rank }) {
  const colors = ['bg-amber-500', 'bg-gray-400', 'bg-amber-700'];
  const bgClass = rank <= 3 ? colors[rank - 1] : 'bg-gray-200';
  const textClass = rank <= 3 ? 'text-white' : 'text-gray-600';

  return (
    <View className={`w-7 h-7 rounded-full items-center justify-center mr-3 ${bgClass}`}>
      <Text className={`text-xs font-bold ${textClass}`}>{rank}</Text>
    </View>
  );
}

export default function AnalyticsScreen({ navigation, route }) {
  const insets = useSafeAreaInsets();
  const [empPeriod, setEmpPeriod] = useState(null);

  const { data: salesData, isLoading: salesLoading } = useQuery({
    queryKey: ['sales'],
    queryFn: getSales,
    staleTime: 60_000,
  });

  const { data: catSales, isLoading: catLoading } = useQuery({
    queryKey: ['category-sales'],
    queryFn: getCategorySales,
    staleTime: 60_000,
  });

  const { data: empPerf, isLoading: empLoading } = useQuery({
    queryKey: ['employee-performance', empPeriod],
    queryFn: () => getEmployeePerformance(empPeriod ? { period: empPeriod } : {}),
    staleTime: 60_000,
  });

  const { data: salesSummary, isLoading: summaryLoading } = useQuery({
    queryKey: ['sales-summary'],
    queryFn: getSalesSummary,
    staleTime: 60_000,
  });

  const isLoading = salesLoading || catLoading || empLoading || summaryLoading;

  // The daily_sales RPC returns date as a "DD/MM" string and revenue as a
  // numeric string — parse both so the chart shows real values, not NaN.
  const barData = (salesData ?? []).map((day) => ({
    value: Number(day.revenue) || 0,
    label: typeof day.date === 'string' ? day.date.split('/')[0] : '',
    frontColor: '#be185d',
  }));

  const periodLabel = empPeriod === 'today' ? 'Today' : empPeriod === 'week' ? 'Last 7 days' : empPeriod === 'month' ? 'Last 30 days' : 'All time';

  const referrer = route.params?.referrer;
  const handleBack = () => {
    if (referrer) {
      navigation.navigate(referrer);
    } else {
      navigation.goBack();
    }
  };

  useHardwareBackHandler(useCallback(() => {
    handleBack();
    return true;
  }, [referrer, navigation]));

  return (
    <View className="flex-1 bg-gray-50">
      <ScreenHeader
        title="Analytics"
        subtitle="Sales & performance"
        navigation={navigation}
        onBack={handleBack}
      />

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#be185d" />
          <Text className="text-sm text-gray-500 mt-3">Loading analytics…</Text>
        </View>
      ) : (
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ paddingTop: 16, paddingBottom: insets.bottom + 24 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Revenue Overview — Online + Offline at Top */}
          {salesSummary && (
            <SectionCard title="Revenue Overview" subtitle="Online vs Offline">
              <View className="mt-2 gap-3">
                {/* Total Revenue */}
                <View className="bg-green-50 rounded-xl p-4 flex-row items-center">
                  <View className="w-10 h-10 bg-green-100 rounded-full items-center justify-center mr-3">
                    <Ionicons name="wallet-outline" size={20} color="#16a34a" />
                  </View>
                  <View className="flex-1">
                    <Text className="text-xs text-green-600 font-medium">Total Revenue</Text>
                    <Text className="text-xl font-bold text-gray-900">{formatPrice(salesSummary.totalRevenue)}</Text>
                  </View>
                </View>

                <View className="flex-row gap-3">
                  {/* Online */}
                  <View className="flex-1 bg-blue-50 rounded-xl p-4">
                    <View className="flex-row items-center mb-2">
                      <View className="w-8 h-8 bg-blue-100 rounded-full items-center justify-center mr-2">
                        <Ionicons name="globe-outline" size={16} color="#2563eb" />
                      </View>
                      <Text className="text-xs text-blue-600 font-medium">Online</Text>
                    </View>
                    <Text className="text-lg font-bold text-gray-900">{formatPrice(salesSummary.onlineRevenue)}</Text>
                    <Text className="text-[10px] text-gray-500 mt-0.5">{salesSummary.onlineCount} orders</Text>
                  </View>

                  {/* Offline */}
                  <View className="flex-1 bg-amber-50 rounded-xl p-4">
                    <View className="flex-row items-center mb-2">
                      <View className="w-8 h-8 bg-amber-100 rounded-full items-center justify-center mr-2">
                        <Ionicons name="storefront-outline" size={16} color="#d97706" />
                      </View>
                      <Text className="text-xs text-amber-600 font-medium">Offline</Text>
                    </View>
                    <Text className="text-lg font-bold text-gray-900">{formatPrice(salesSummary.offlineRevenue)}</Text>
                    <Text className="text-[10px] text-gray-500 mt-0.5">{salesSummary.offlineCount} sales</Text>
                  </View>
                </View>
              </View>
            </SectionCard>
          )}

          {/* Sales Trend */}
          <SectionCard title="Daily revenue (30 days)" subtitle="Sales trend">
            {barData.length > 0 ? (
              <View className="mt-2">
                <BarChart
                  data={barData}
                  barWidth={20}
                  spacing={8}
                  height={160}
                  hideRules
                  noOfSections={4}
                  barBorderRadius={4}
                  yAxisThickness={0}
                  xAxisThickness={1}
                  xAxisColor="#e5e7eb"
                  xAxisLabelTextStyle={{ color: '#9ca3af', fontSize: 9 }}
                  yAxisTextStyle={{ color: '#9ca3af', fontSize: 10 }}
                  isAnimated
                  animationDuration={600}
                />
              </View>
            ) : (
              <Text className="text-sm text-gray-400 text-center py-8">No sales data available</Text>
            )}
          </SectionCard>

          {/* Top Products */}
          {(catSales?.length ?? 0) > 0 && (
            <SectionCard title="Top Sarees" subtitle="By revenue">
              {catSales.map((item, i) => (
                <View
                  key={item.type ?? i}
                  className="flex-row items-center py-3 border-b border-gray-50"
                >
                  <RankBadge rank={i + 1} />
                  <View className="flex-1">
                    <Text className="text-sm font-medium text-gray-900 capitalize">{item.type}</Text>
                    <Text className="text-xs text-gray-500">{item.count ?? item.saleCount ?? 0} sales</Text>
                  </View>
                  <Text className="text-sm font-bold text-gray-900">{formatPrice(item.revenue)}</Text>
                </View>
              ))}
            </SectionCard>
          )}

          {/* Employee Performance with Date Filters */}
          <SectionCard title="Revenue by employee" subtitle={periodLabel}>
            {/* Date Filter Chips */}
            <View className="flex-row bg-gray-100 rounded-xl p-1 mb-3">
              {EMP_FILTERS.map((f) => (
                <Pressable
                  key={f.label}
                  onPress={() => setEmpPeriod(f.key)}
                  className={`flex-1 py-2 rounded-lg items-center ${empPeriod === f.key ? 'bg-white' : ''}`}
                  style={empPeriod === f.key ? { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2, elevation: 2 } : null}
                >
                  <Text
                    className={`text-xs font-semibold ${empPeriod === f.key ? 'text-amber-600' : 'text-gray-500'}`}
                  >
                    {f.label}
                  </Text>
                </Pressable>
              ))}
            </View>

            {empLoading ? (
              <View className="py-8 items-center">
                <ActivityIndicator color="#f59e0b" />
              </View>
            ) : (empPerf?.employees?.length ?? 0) > 0 ? (
              empPerf.employees.map((emp, i) => (
                <View
                  key={emp.id}
                  className="flex-row items-center py-3 border-b border-gray-50"
                >
                  <RankBadge rank={i + 1} />
                  <View className="flex-1">
                    <Text className="text-sm font-medium text-gray-900">{emp.name}</Text>
                    <Text className="text-xs text-gray-500">{emp.saleCount} sales · {emp.itemsSold} items</Text>
                  </View>
                  <Text className="text-sm font-bold text-gray-900">{formatPrice(emp.revenue)}</Text>
                </View>
              ))
            ) : (
              <View className="py-8 items-center">
                <Ionicons name="people-outline" size={28} color="#d1d5db" />
                <Text className="text-xs text-gray-400 mt-2">No employee sales for this period</Text>
              </View>
            )}
          </SectionCard>
        </ScrollView>
      )}
    </View>
  );
}
