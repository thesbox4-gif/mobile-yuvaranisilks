import React, { useState } from 'react';
import {
  View, Text, TextInput, Pressable, ScrollView,
  KeyboardAvoidingView, Platform, ActivityIndicator, Image,
} from 'react-native';
import { BRAND } from '../../constants/brand';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Ionicons } from '@expo/vector-icons';
import { login } from '../../lib/api';
import useAuthStore from '../../store/authStore';
import { registerPushToken } from '../../lib/notifications';
import { notifyDialog } from '../../lib/dialog';

const schema = z.object({
  email: z.string().email('Enter a valid email'),
  password: z.string().min(1, 'Password is required'),
});

// Turn raw Supabase / network errors into a clear, friendly sentence.
function friendlyLoginError(raw) {
  const msg = (raw || '').toLowerCase();
  if (msg.includes('invalid login credentials') || msg.includes('invalid email or password')) {
    return 'Incorrect email or password. Please check and try again.';
  }
  if (msg.includes('email not confirmed')) {
    return 'Please confirm your email address before signing in.';
  }
  if (msg.includes('network') || msg.includes('failed to fetch') || msg.includes('fetch')) {
    return 'Could not reach the server. Check your internet connection and try again.';
  }
  if (msg.includes('too many') || msg.includes('rate limit')) {
    return 'Too many attempts. Please wait a minute and try again.';
  }
  return raw || 'Something went wrong. Please try again.';
}

export default function LoginScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const setAuth = useAuthStore((s) => s.setAuth);
  const [showPassword, setShowPassword] = useState(false);

  const { control, handleSubmit, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = async ({ email, password }) => {
    try {
      const data = await login(email, password);
      const u = data.user ?? {};

      if (u.role === 'superadmin') {
        notifyDialog({
          title: 'Access denied',
          message: 'This account cannot sign in here. Use the platform console instead.',
        });
        return;
      }

      // Employees must be approved before they can enter the app.
      if (u.role === 'employee' && u.employee_status !== 'approved') {
        notifyDialog({
          title: u.employee_status === 'rejected' ? 'Account rejected' : 'Approval pending',
          message: u.employee_status === 'rejected'
            ? 'Your employee application was rejected. Please contact an admin for help.'
            : 'Your account is waiting for admin approval. You can sign in once an admin approves it.',
        });
        return;
      }

      setAuth(data.token, data.user, data.refreshToken);
      await registerPushToken();
    } catch (err) {
      notifyDialog({ title: 'Could not sign in', message: friendlyLoginError(err.message) });
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      className="flex-1 bg-[#1C1C1C]"
    >
      <ScrollView
        contentContainerStyle={{ flexGrow: 1, paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 }}
        keyboardShouldPersistTaps="handled"
      >
        <View className="flex-1 px-6">
          {/* Logo area */}
          <View className="items-center mb-10">
            <Image
              source={BRAND.logo}
              style={{ width: 280, height: 72 }}
              resizeMode="contain"
            />
            <Text className="text-sm text-[#C9A227]/80 mt-3 tracking-widest uppercase">
              {BRAND.tagline}
            </Text>
          </View>

          <View className="bg-white rounded-3xl p-6 shadow-lg">
          <Text className="text-2xl font-bold text-gray-900 mb-1">Welcome back</Text>
          <Text className="text-gray-500 mb-8">Sign in to your account</Text>

          {/* Email */}
          <View className="mb-4">
            <Text className="text-sm font-medium text-gray-700 mb-1.5">Email</Text>
            <Controller
              control={control}
              name="email"
              render={({ field: { onChange, onBlur, value } }) => (
                <TextInput
                  className={`border rounded-xl px-4 py-3.5 text-base text-gray-900 bg-gray-50 ${
                    errors.email ? 'border-red-400' : 'border-gray-200'
                  }`}
                  placeholder="you@example.com"
                  placeholderTextColor="#9ca3af"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoComplete="email"
                  onBlur={onBlur}
                  onChangeText={onChange}
                  value={value}
                />
              )}
            />
            {errors.email && (
              <Text className="text-xs text-red-500 mt-1">{errors.email.message}</Text>
            )}
          </View>

          {/* Password */}
          <View className="mb-6">
            <Text className="text-sm font-medium text-gray-700 mb-1.5">Password</Text>
            <Controller
              control={control}
              name="password"
              render={({ field: { onChange, onBlur, value } }) => (
                <View className={`flex-row items-center border rounded-xl bg-gray-50 ${
                  errors.password ? 'border-red-400' : 'border-gray-200'
                }`}>
                  <TextInput
                    className="flex-1 px-4 py-3.5 text-base text-gray-900"
                    placeholder="••••••••"
                    placeholderTextColor="#9ca3af"
                    secureTextEntry={!showPassword}
                    onBlur={onBlur}
                    onChangeText={onChange}
                    value={value}
                  />
                  <Pressable
                    onPress={() => setShowPassword(!showPassword)}
                    className="px-4"
                  >
                    <Ionicons
                      name={showPassword ? 'eye-off' : 'eye'}
                      size={20}
                      color="#9ca3af"
                    />
                  </Pressable>
                </View>
              )}
            />
            {errors.password && (
              <Text className="text-xs text-red-500 mt-1">{errors.password.message}</Text>
            )}
          </View>

          {/* Submit */}
          <Pressable
            onPress={handleSubmit(onSubmit)}
            disabled={isSubmitting}
            className="bg-[#6B1A1A] rounded-xl py-4 items-center active:opacity-90"
            style={{ opacity: isSubmitting ? 0.7 : 1 }}
          >
            {isSubmitting ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text className="text-white font-semibold text-base">Sign In</Text>
            )}
          </Pressable>

          {/* Register link */}
          <View className="flex-row justify-center mt-6">
            <Text className="text-gray-500">New employee? </Text>
            <Pressable onPress={() => navigation.navigate('Register')}>
              <Text className="text-[#6B1A1A] font-semibold">Register here</Text>
            </Pressable>
          </View>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
