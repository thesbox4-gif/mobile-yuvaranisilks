import React, { useState } from 'react';
import {
  View, Text, TextInput, Pressable, ScrollView, ActivityIndicator, Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import ScreenHeader from '../../components/ui/ScreenHeader';
import { createUser } from '../../lib/api';
import { notifyDialog } from '../../lib/dialog';

const ROLES = [
  { value: 'customer', label: 'Customer', icon: 'person', desc: 'Shops on the store' },
  { value: 'employee', label: 'Employee', icon: 'briefcase', desc: 'Manages products & sales' },
  { value: 'admin', label: 'Admin', icon: 'shield-checkmark', desc: 'Full access' },
];

function Field({ label, ...props }) {
  return (
    <View className="mb-4">
      <Text className="text-sm font-medium text-gray-700 mb-1.5">{label}</Text>
      <TextInput
        className="border border-gray-200 rounded-xl px-4 py-3 text-base text-gray-900 bg-gray-50"
        placeholderTextColor="#9ca3af"
        {...props}
      />
    </View>
  );
}

export default function CreateUserScreen({ route, navigation }) {
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const { role: initialRole = 'customer', lockRole = false } = route.params ?? {};

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState(initialRole);

  const mutation = useMutation({
    mutationFn: () => createUser({ name: name.trim(), email: email.trim(), phone: phone.trim(), password, role }),
    onSuccess: (data) => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      qc.invalidateQueries({ queryKey: ['customers'] });
      qc.invalidateQueries({ queryKey: ['employees'] });
      notifyDialog({
        title: 'User created',
        message: `${data.name} (${role}) can now sign in.`,
        onClose: () => navigation.goBack(),
      });
    },
    onError: (err) => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Could not create user', err.message);
    },
  });

  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  const canSubmit =
    name.trim().length >= 2 && emailValid && password.length >= 6;

  const handleSubmit = () => {
    if (!canSubmit) {
      Alert.alert('Incomplete', 'Enter a name, valid email and a password of at least 6 characters.');
      return;
    }
    mutation.mutate();
  };

  const roleLabel = ROLES.find((r) => r.value === role)?.label ?? 'User';

  return (
    <View className="flex-1 bg-gray-50">
      <ScreenHeader title={`New ${roleLabel}`} navigation={navigation} />

      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 100 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {!lockRole && (
          <View className="mb-5">
            <Text className="text-sm font-medium text-gray-700 mb-2">Account type</Text>
            {ROLES.map((r) => {
              const active = role === r.value;
              return (
                <Pressable
                  key={r.value}
                  onPress={() => setRole(r.value)}
                  className={`flex-row items-center rounded-xl border p-3 mb-2 ${
                    active ? 'border-amber-500 bg-amber-50' : 'border-gray-200 bg-white'
                  }`}
                >
                  <View className={`w-9 h-9 rounded-full items-center justify-center mr-3 ${active ? 'bg-amber-500' : 'bg-gray-100'}`}>
                    <Ionicons name={r.icon} size={18} color={active ? '#fff' : '#9ca3af'} />
                  </View>
                  <View className="flex-1">
                    <Text className={`text-sm font-semibold ${active ? 'text-amber-800' : 'text-gray-800'}`}>{r.label}</Text>
                    <Text className="text-xs text-gray-500">{r.desc}</Text>
                  </View>
                  {active && <Ionicons name="checkmark-circle" size={20} color="#f59e0b" />}
                </Pressable>
              );
            })}
          </View>
        )}

        <View className="bg-white rounded-2xl p-4 shadow-sm">
          <Field
            label="Full name"
            placeholder="e.g. Priya Sharma"
            value={name}
            onChangeText={setName}
          />
          <Field
            label="Email"
            placeholder="name@example.com"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
          />
          <Field
            label="Phone (optional)"
            placeholder="+91 9XXXXXXXXX"
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
          />
          <Field
            label="Password"
            placeholder="At least 6 characters"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoCapitalize="none"
          />
          <Text className="text-xs text-gray-400 -mt-2">
            Share this password with the new {roleLabel.toLowerCase()} so they can sign in.
          </Text>
        </View>

        {role === 'admin' && (
          <View className="flex-row items-start bg-red-50 border border-red-100 rounded-xl p-3 mt-4">
            <Ionicons name="warning-outline" size={16} color="#dc2626" style={{ marginTop: 1 }} />
            <Text className="text-xs text-red-700 ml-2 flex-1">
              Admins have full access — they can manage products, staff, orders and other admins.
            </Text>
          </View>
        )}
        {role === 'employee' && (
          <View className="flex-row items-start bg-amber-50 border border-amber-100 rounded-xl p-3 mt-4">
            <Ionicons name="information-circle-outline" size={16} color="#b45309" style={{ marginTop: 1 }} />
            <Text className="text-xs text-amber-800 ml-2 flex-1">
              Employees created here are approved immediately — no pending step.
            </Text>
          </View>
        )}
      </ScrollView>

      <View
        style={{ paddingBottom: insets.bottom + 8 }}
        className="absolute bottom-0 left-0 right-0 bg-white border-t border-gray-100 px-4 pt-3"
      >
        <Pressable
          onPress={handleSubmit}
          disabled={mutation.isPending || !canSubmit}
          className="rounded-xl py-4 flex-row items-center justify-center"
          style={{ backgroundColor: canSubmit ? '#f59e0b' : '#e5e7eb' }}
        >
          {mutation.isPending ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name="person-add" size={18} color={canSubmit ? '#fff' : '#9ca3af'} />
              <Text className={`font-bold text-sm ml-2 ${canSubmit ? 'text-white' : 'text-gray-400'}`}>
                Create {roleLabel}
              </Text>
            </>
          )}
        </Pressable>
      </View>
    </View>
  );
}
