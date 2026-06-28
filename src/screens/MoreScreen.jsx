import React from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import useAuthStore from '../store/authStore';
import { initials } from '../lib/utils';
import { useRootTabBackToDashboard } from '../hooks/useHardwareBackHandler';

function MenuSection({ title, children }) {
  return (
    <View className="mb-4">
      {title && <Text className="text-xs font-semibold text-gray-500 uppercase tracking-wide px-4 mb-2">{title}</Text>}
      <View className="bg-white rounded-2xl shadow-sm overflow-hidden">{children}</View>
    </View>
  );
}

function MenuItem({ icon, label, onPress, destructive = false, badge }) {
  return (
    <Pressable
      onPress={onPress}
      className="flex-row items-center px-4 py-4 border-b border-gray-50 active:bg-gray-50"
    >
      <View className={`w-9 h-9 rounded-xl items-center justify-center mr-3 ${destructive ? 'bg-red-50' : 'bg-amber-50'}`}>
        <Ionicons name={icon} size={18} color={destructive ? '#ef4444' : '#f59e0b'} />
      </View>
      <Text className={`flex-1 text-base font-medium ${destructive ? 'text-red-600' : 'text-gray-800'}`}>{label}</Text>
      {badge && (
        <View className="bg-amber-500 rounded-full w-5 h-5 items-center justify-center mr-2">
          <Text className="text-white text-xs font-bold">{badge}</Text>
        </View>
      )}
      {!destructive && <Ionicons name="chevron-forward" size={16} color="#d1d5db" />}
    </Pressable>
  );
}

export default function MoreScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const user = useAuthStore((s) => s.user);
  const viewMode = useAuthStore((s) => s.viewMode);
  const isAdmin = user?.role === 'admin';

  useRootTabBackToDashboard(navigation);

  return (
    <ScrollView
      className="flex-1 bg-gray-50"
      contentContainerStyle={{ paddingTop: insets.top + 8, paddingBottom: insets.bottom + 16 }}
    >
      <Text className="text-2xl font-bold text-gray-900 px-4 mb-5">More</Text>

      {/* Profile card */}
      <Pressable
        onPress={() => navigation.navigate('Profile')}
        className="bg-white rounded-2xl shadow-sm mx-4 mb-6 p-4 flex-row items-center active:opacity-90"
      >
        <View className="w-14 h-14 bg-amber-500 rounded-full items-center justify-center">
          <Text className="text-white font-bold text-xl">{initials(user?.name)}</Text>
        </View>
        <View className="flex-1 ml-4">
          <Text className="text-base font-bold text-gray-900">{user?.name}</Text>
          <Text className="text-sm text-gray-500">{user?.email}</Text>
          <View className="flex-row items-center mt-1 gap-2">
            <View className="self-start bg-amber-100 px-2.5 py-0.5 rounded-full">
              <Text className="text-xs font-semibold text-amber-800 capitalize">{user?.role}</Text>
            </View>
            {viewMode === 'user' && (
              <View className="self-start bg-blue-100 px-2.5 py-0.5 rounded-full">
                <Text className="text-xs font-semibold text-blue-700">User Mode</Text>
              </View>
            )}
          </View>
        </View>
        <Ionicons name="chevron-forward" size={18} color="#d1d5db" />
      </Pressable>

      {/* Catalog */}
      <MenuSection title="Catalog">
        <MenuItem
          icon="folder"
          label="Categories"
          onPress={() => navigation.navigate('Categories')}
        />
        <MenuItem
          icon="barcode-outline"
          label="Scan Barcode"
          onPress={() => navigation.navigate('BarcodeScanner', { mode: 'lookup' })}
        />
      </MenuSection>

      {/* Admin only */}
      {isAdmin && (
        <MenuSection title="Admin">
          <MenuItem
            icon="cash"
            label="Sales History"
            onPress={() => navigation.navigate('SalesHistory')}
          />
          <MenuItem
            icon="receipt"
            label="Orders"
            onPress={() => navigation.navigate('Orders', { initialStatus: 'placed' })}
          />
          <MenuItem
            icon="bar-chart"
            label="Analytics"
            onPress={() => navigation.navigate('Analytics')}
          />
          <MenuItem
            icon="people-outline"
            label="Team"
            onPress={() => navigation.navigate('Team')}
          />
          <MenuItem
            icon="person-add"
            label="Employee Approvals"
            onPress={() => navigation.navigate('Employees')}
          />
          <MenuItem
            icon="person-circle"
            label="Add User"
            onPress={() => navigation.navigate('CreateUser', { role: 'admin', lockRole: false })}
          />
          <MenuItem
            icon="pricetag"
            label="Coupons"
            onPress={() => navigation.navigate('Coupons')}
          />
          <MenuItem
            icon="megaphone-outline"
            label="Broadcast Logs"
            onPress={() => navigation.navigate('BroadcastLogs')}
          />
          <MenuItem
            icon="people-circle-outline"
            label="Re-engagement Logs"
            onPress={() => navigation.navigate('ReengagementLogs')}
          />
        </MenuSection>
      )}
    </ScrollView>
  );
}
