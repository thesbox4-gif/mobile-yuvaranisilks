import React from 'react';
import { View, Text, ScrollView, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import ScreenHeader from '../../components/ui/ScreenHeader';
import UserAdminActions from '../../components/users/UserAdminActions';
import { getEmployeePerformance, getOfflineSales } from '../../lib/api';
import { formatPrice, formatDate, initials } from '../../lib/utils';

function KpiCard({ icon, label, value, color }) {
  return (
    <View className="flex-1 bg-white rounded-2xl shadow-sm p-4 items-center">
      <View
        className="w-10 h-10 rounded-full items-center justify-center mb-2"
        style={{ backgroundColor: `${color}20` }}
      >
        <Ionicons name={icon} size={18} color={color} />
      </View>
      <Text className="text-lg font-bold text-gray-900">{value}</Text>
      <Text className="text-xs text-gray-500 mt-0.5 text-center">{label}</Text>
    </View>
  );
}

function SaleRow({ sale }) {
  const amount = Number(sale.unit_price || 0) * Number(sale.quantity || 0);
  const variantLabel = [sale.variant?.color, sale.variant?.size].filter(Boolean).join(' · ');
  return (
    <View className="flex-row items-start py-3 border-b border-gray-50">
      <View className="w-9 h-9 bg-rose-50 rounded-lg items-center justify-center mr-3">
        <Ionicons name="receipt-outline" size={16} color="#be185d" />
      </View>
      <View className="flex-1 mr-2">
        <Text className="text-sm font-medium text-gray-900" numberOfLines={1}>
          {sale.product?.title || 'Sale'}
        </Text>
        {variantLabel ? (
          <Text className="text-xs text-gray-500 mt-0.5">{variantLabel}</Text>
        ) : null}
        <Text className="text-xs text-gray-400 mt-0.5">
          Qty {sale.quantity ?? 1} · {formatDate(sale.created_at)}
        </Text>
        <View className="flex-row items-center mt-1">
          <Ionicons name="person-outline" size={12} color="#9ca3af" />
          <Text className="text-xs text-gray-600 ml-1" numberOfLines={1}>
            Sold to: {sale.customer_name || 'Walk-in customer'}
            {sale.customer_phone ? ` · ${sale.customer_phone}` : ''}
          </Text>
        </View>
      </View>
      <Text className="text-sm font-bold text-gray-900">{formatPrice(amount)}</Text>
    </View>
  );
}

export default function EmployeeDetailScreen({ route, navigation }) {
  const insets = useSafeAreaInsets();
  const employee = route.params?.employee;

  const { data: empPerf, isLoading: perfLoading } = useQuery({
    queryKey: ['employee-performance'],
    queryFn: getEmployeePerformance,
    staleTime: 60_000,
  });

  const employeeId = employee?._id || employee?.id;

  const { data: salesData, isLoading: salesLoading } = useQuery({
    queryKey: ['offline-sales', employeeId],
    // Backend filters offline sales by the `soldBy` query param.
    queryFn: () => getOfflineSales({ soldBy: employeeId }),
    staleTime: 60_000,
    enabled: !!employeeId,
  });

  const empStats = empPerf?.employees?.find(
    (e) => e.id === employeeId || e.name === employee?.name
  );

  const sales = salesData?.data ?? [];
  const isLoading = perfLoading && salesLoading;

  return (
    <View className="flex-1 bg-gray-50">
      <ScreenHeader
        title={employee?.name || 'Employee'}
        navigation={navigation}
      />

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#be185d" />
        </View>
      ) : (
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ paddingTop: 16, paddingBottom: insets.bottom + 24 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Profile Card */}
          <View className="mx-4 bg-white rounded-2xl shadow-sm p-6 items-center mb-4">
            <View className="w-20 h-20 bg-rose-100 rounded-full items-center justify-center mb-3">
              <Text className="text-rose-700 font-bold text-2xl">{initials(employee?.name)}</Text>
            </View>
            <Text className="text-lg font-bold text-gray-900">{employee?.name}</Text>
            <Text className="text-sm text-gray-500 mt-0.5">{employee?.email}</Text>
            <View className="flex-row items-center mt-3 gap-2">
              <View className="bg-amber-100 px-3 py-1 rounded-full">
                <Text className="text-xs font-semibold text-amber-800 capitalize">
                  {employee?.role || 'Employee'}
                </Text>
              </View>
              {employee?.createdAt && (
                <View className="bg-gray-100 px-3 py-1 rounded-full">
                  <Text className="text-xs font-medium text-gray-600">
                    Joined {formatDate(employee.createdAt)}
                  </Text>
                </View>
              )}
            </View>
          </View>

          {/* KPI Cards */}
          <View className="flex-row mx-4 gap-3 mb-4">
            <KpiCard
              icon="cart-outline"
              label="Total Sales"
              value={empStats?.saleCount ?? sales.length ?? 0}
              color="#be185d"
            />
            <KpiCard
              icon="cash-outline"
              label="Revenue"
              value={formatPrice(empStats?.revenue ?? 0)}
              color="#16a34a"
            />
            <KpiCard
              icon="cube-outline"
              label="Items Sold"
              value={empStats?.itemsSold ?? 0}
              color="#2563eb"
            />
          </View>

          {/* Recent Sales */}
          {sales.length > 0 && (
            <View className="mx-4 bg-white rounded-2xl shadow-sm overflow-hidden">
              <View className="px-4 pt-4 pb-3 border-b border-gray-100">
                <Text className="text-base font-semibold text-gray-900">Recent Sales</Text>
                <Text className="text-xs text-gray-500 mt-0.5">{sales.length} total transactions</Text>
              </View>
              <View className="px-4">
                {sales.slice(0, 20).map((sale, i) => (
                  <SaleRow key={sale._id || sale.id || i} sale={sale} />
                ))}
              </View>
            </View>
          )}

          {sales.length === 0 && !salesLoading && (
            <View className="mx-4 bg-white rounded-2xl shadow-sm p-8 items-center">
              <Ionicons name="receipt-outline" size={40} color="#d1d5db" />
              <Text className="text-sm text-gray-400 mt-3">No sales recorded yet</Text>
            </View>
          )}

          <UserAdminActions
            userId={employee?._id || employee?.id}
            userName={employee?.name || 'this employee'}
            active={employee?.active}
            onDeleted={() => navigation.goBack()}
          />
        </ScrollView>
      )}
    </View>
  );
}
