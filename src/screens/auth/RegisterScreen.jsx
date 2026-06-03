import React, { useState } from 'react';
import {
  View, Text, TextInput, Pressable, ScrollView,
  KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Ionicons } from '@expo/vector-icons';
import { register as apiRegister } from '../../lib/api';
import { notifyDialog } from '../../lib/dialog';

// Turn raw Supabase errors into a clear, friendly sentence.
function friendlyRegisterError(raw) {
  const msg = (raw || '').toLowerCase();
  if (msg.includes('already registered') || msg.includes('already exists') || msg.includes('user already')) {
    return 'An account with this email already exists. Try signing in instead.';
  }
  if (msg.includes('password')) {
    return 'Password must be at least 8 characters.';
  }
  if (msg.includes('network') || msg.includes('failed to fetch') || msg.includes('fetch')) {
    return 'Could not reach the server. Check your internet connection and try again.';
  }
  return raw || 'Could not create your account. Please try again.';
}

const schema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Enter a valid email'),
  phone: z.string().optional(),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string(),
}).refine((d) => d.password === d.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
});

function Field({ label, children, error }) {
  return (
    <View className="mb-4">
      <Text className="text-sm font-medium text-gray-700 mb-1.5">{label}</Text>
      {children}
      {error && <Text className="text-xs text-red-500 mt-1">{error}</Text>}
    </View>
  );
}

export default function RegisterScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [showPassword, setShowPassword] = useState(false);

  const { control, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { name: '', email: '', phone: '', password: '', confirmPassword: '' },
  });

  const onSubmit = async ({ name, email, phone, password }) => {
    try {
      await apiRegister({ name, email, password, phone: phone || undefined, role: 'employee' });
      reset();
      notifyDialog({
        title: 'Account created',
        message: 'Your employee account needs admin approval before you can sign in. You will be taken to the login page — sign in once an admin approves you.',
        onClose: () => navigation.navigate('Login'),
      });
    } catch (err) {
      notifyDialog({ title: 'Registration failed', message: friendlyRegisterError(err.message) });
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      className="flex-1 bg-white"
    >
      <ScrollView
        contentContainerStyle={{ flexGrow: 1, paddingTop: insets.top + 16, paddingBottom: insets.bottom + 24 }}
        keyboardShouldPersistTaps="handled"
      >
        <View className="px-6">
          {/* Back */}
          <Pressable onPress={() => navigation.goBack()} className="mb-6 w-9 h-9 items-center justify-center rounded-full active:bg-gray-100">
            <Ionicons name="arrow-back" size={22} color="#1f2937" />
          </Pressable>

          <Text className="text-2xl font-bold text-gray-900 mb-1">Create account</Text>
          <Text className="text-gray-500 mb-8">Register as an employee — admin approval required</Text>

          <Field label="Full Name" error={errors.name?.message}>
            <Controller
              control={control}
              name="name"
              render={({ field: { onChange, onBlur, value } }) => (
                <TextInput
                  className={`border rounded-xl px-4 py-3.5 text-base text-gray-900 bg-gray-50 ${errors.name ? 'border-red-400' : 'border-gray-200'}`}
                  placeholder="Priya Sharma"
                  placeholderTextColor="#9ca3af"
                  autoCapitalize="words"
                  onBlur={onBlur}
                  onChangeText={onChange}
                  value={value}
                />
              )}
            />
          </Field>

          <Field label="Email" error={errors.email?.message}>
            <Controller
              control={control}
              name="email"
              render={({ field: { onChange, onBlur, value } }) => (
                <TextInput
                  className={`border rounded-xl px-4 py-3.5 text-base text-gray-900 bg-gray-50 ${errors.email ? 'border-red-400' : 'border-gray-200'}`}
                  placeholder="you@example.com"
                  placeholderTextColor="#9ca3af"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  onBlur={onBlur}
                  onChangeText={onChange}
                  value={value}
                />
              )}
            />
          </Field>

          <Field label="Phone (optional)" error={errors.phone?.message}>
            <Controller
              control={control}
              name="phone"
              render={({ field: { onChange, onBlur, value } }) => (
                <TextInput
                  className="border border-gray-200 rounded-xl px-4 py-3.5 text-base text-gray-900 bg-gray-50"
                  placeholder="+91 98765 43210"
                  placeholderTextColor="#9ca3af"
                  keyboardType="phone-pad"
                  onBlur={onBlur}
                  onChangeText={onChange}
                  value={value}
                />
              )}
            />
          </Field>

          <Field label="Password" error={errors.password?.message}>
            <Controller
              control={control}
              name="password"
              render={({ field: { onChange, onBlur, value } }) => (
                <View className={`flex-row items-center border rounded-xl bg-gray-50 ${errors.password ? 'border-red-400' : 'border-gray-200'}`}>
                  <TextInput
                    className="flex-1 px-4 py-3.5 text-base text-gray-900"
                    placeholder="Min. 8 characters"
                    placeholderTextColor="#9ca3af"
                    secureTextEntry={!showPassword}
                    onBlur={onBlur}
                    onChangeText={onChange}
                    value={value}
                  />
                  <Pressable onPress={() => setShowPassword(!showPassword)} className="px-4">
                    <Ionicons name={showPassword ? 'eye-off' : 'eye'} size={20} color="#9ca3af" />
                  </Pressable>
                </View>
              )}
            />
          </Field>

          <Field label="Confirm Password" error={errors.confirmPassword?.message}>
            <Controller
              control={control}
              name="confirmPassword"
              render={({ field: { onChange, onBlur, value } }) => (
                <TextInput
                  className={`border rounded-xl px-4 py-3.5 text-base text-gray-900 bg-gray-50 ${errors.confirmPassword ? 'border-red-400' : 'border-gray-200'}`}
                  placeholder="Repeat password"
                  placeholderTextColor="#9ca3af"
                  secureTextEntry={!showPassword}
                  onBlur={onBlur}
                  onChangeText={onChange}
                  value={value}
                />
              )}
            />
          </Field>

          <Pressable
            onPress={handleSubmit(onSubmit)}
            disabled={isSubmitting}
            className="bg-[#6B1A1A] rounded-xl py-4 items-center mt-2 active:opacity-90"
            style={{ opacity: isSubmitting ? 0.7 : 1 }}
          >
            {isSubmitting ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text className="text-white font-semibold text-base">Create Account</Text>
            )}
          </Pressable>

          <View className="flex-row justify-center mt-6">
            <Text className="text-gray-500">Already have an account? </Text>
            <Pressable onPress={() => navigation.navigate('Login')}>
              <Text className="text-[#6B1A1A] font-semibold">Sign in</Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
