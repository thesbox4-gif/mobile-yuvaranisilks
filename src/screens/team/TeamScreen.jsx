import React, { useState, useCallback } from 'react';
import { View, Text, Pressable, FlatList, ActivityIndicator,  } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import ScreenHeader from '../../components/ui/ScreenHeader';
import { getEmployees, getUsers, approveEmployee } from '../../lib/api';
import { initials } from '../../lib/utils';
import { confirmDialog } from '../../lib/dialog';
import { useRefetchOnFocus } from '../../hooks/useRefetchOnFocus';
import { useHardwareBackHandler } from '../../hooks/useHardwareBackHandler';
import { alertDialog } from '../../lib/dialog';


const TABS = [
  { key: 'active', label: 'Active' },
  { key: 'pending', label: 'Pending' },
];

function EmployeeCard({ employee, isPending, onApprove, onReject, onPress }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={isPending}
      className="bg-white rounded-2xl shadow-sm mx-4 mb-3 p-4 flex-row items-center active:opacity-90"
    >
      <View className="w-12 h-12 bg-rose-100 rounded-full items-center justify-center">
        <Text className="text-rose-700 font-bold text-base">{initials(employee.name)}</Text>
      </View>

      <View className="flex-1 ml-3">
        <Text className="text-sm font-semibold text-gray-900">{employee.name}</Text>
        <Text className="text-xs text-gray-500 mt-0.5">{employee.email || employee.username}</Text>
      </View>

      {isPending ? (
        <View className="flex-row gap-2">
          <Pressable
            onPress={() => onApprove(employee)}
            className="w-9 h-9 bg-green-50 rounded-full items-center justify-center active:bg-green-100"
          >
            <Ionicons name="checkmark" size={18} color="#16a34a" />
          </Pressable>
          <Pressable
            onPress={() => onReject(employee)}
            className="w-9 h-9 bg-red-50 rounded-full items-center justify-center active:bg-red-100"
          >
            <Ionicons name="close" size={18} color="#dc2626" />
          </Pressable>
        </View>
      ) : (
        <View className="flex-row items-center">
          <View className={`px-2.5 py-1 rounded-full ${employee.role === 'admin' ? 'bg-violet-100' : 'bg-green-50'}`}>
            <Text className={`text-xs font-semibold ${employee.role === 'admin' ? 'text-violet-700' : 'text-green-700'}`}>
              {employee.role === 'admin' ? 'Admin' : 'Active'}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color="#d1d5db" className="ml-2" />
        </View>
      )}
    </Pressable>
  );
}

export default function TeamScreen({ navigation, route }) {
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('active');

  const { data: employeeList = [], isLoading, refetch } = useQuery({
    queryKey: ['team', activeTab],
    queryFn: async () => {
      // getEmployees / getUsers return { data: [...] } — read .data, not .employees.
      if (activeTab === 'pending') {
        const res = await getEmployees({ status: 'pending' });
        return res?.data ?? [];
      }
      // Active tab = approved employees + every admin.
      const [emp, admins] = await Promise.all([
        getEmployees({ status: 'approved' }),
        getUsers({ role: 'admin' }),
      ]);
      return [...(admins?.data ?? []), ...(emp?.data ?? [])];
    },
    staleTime: 30_000,
  });

  useRefetchOnFocus(['team']);

  const approveMutation = useMutation({
    mutationFn: ({ id, action }) => approveEmployee(id, action),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team'] });
      queryClient.invalidateQueries({ queryKey: ['employees'] });
    },
    onError: (err) => {
      alertDialog('Error', err.message || 'Action failed');
    },
  });

  const handleApprove = (emp) => {
    confirmDialog({
      title: 'Approve Employee',
      message: `Approve ${emp.name}?`,
      confirmText: 'Approve',
      onConfirm: () => approveMutation.mutate({ id: emp._id || emp.id, action: 'approve' }),
    });
  };

  const handleReject = (emp) => {
    confirmDialog({
      title: 'Reject Employee',
      message: `Reject ${emp.name}? This cannot be undone.`,
      confirmText: 'Reject',
      destructive: true,
      onConfirm: () => approveMutation.mutate({ id: emp._id || emp.id, action: 'reject' }),
    });
  };

  const count = employeeList.length;

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
        title="Team"
        subtitle={`${count} ${activeTab}`}
        navigation={navigation}
        onBack={handleBack}
        rightElement={
          <Pressable
            onPress={() => navigation.navigate('Employees')}
            className="w-9 h-9 items-center justify-center rounded-full active:bg-gray-100"
          >
            <Ionicons name="person-add-outline" size={20} color="#1f2937" />
          </Pressable>
        }
      />

      {/* Tabs */}
      <View className="flex-row mx-4 mt-4 mb-4 bg-gray-100 rounded-xl p-1">
        {TABS.map((tab) => (
          <Pressable
            key={tab.key}
            onPress={() => setActiveTab(tab.key)}
            className={`flex-1 py-2.5 rounded-lg items-center ${
              activeTab === tab.key ? 'bg-white shadow-sm' : ''
            }`}
          >
            <Text
              className={`text-sm font-semibold ${
                activeTab === tab.key ? 'text-gray-900' : 'text-gray-500'
              }`}
            >
              {tab.label}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* List */}
      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#be185d" />
        </View>
      ) : employeeList.length === 0 ? (
        <View className="flex-1 items-center justify-center px-8">
          <Ionicons
            name={activeTab === 'pending' ? 'hourglass-outline' : 'people-outline'}
            size={48}
            color="#d1d5db"
          />
          <Text className="text-base text-gray-400 mt-3 text-center">
            {activeTab === 'pending' ? 'No pending requests' : 'No active team members'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={employeeList}
          keyExtractor={(item) => item._id || item.id}
          contentContainerStyle={{ paddingBottom: insets.bottom + 16 }}
          showsVerticalScrollIndicator={false}
          onRefresh={refetch}
          refreshing={false}
          renderItem={({ item }) => (
            <EmployeeCard
              employee={item}
              isPending={activeTab === 'pending'}
              onApprove={handleApprove}
              onReject={handleReject}
              onPress={() =>
                activeTab === 'active' &&
                navigation.navigate('EmployeeDetail', { employee: item })
              }
            />
          )}
        />
      )}
    </View>
  );
}
