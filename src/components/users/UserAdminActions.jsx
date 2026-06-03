import React, { useState } from 'react';
import { View, Text, Pressable, Modal, TextInput, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { resetUserPassword, deleteUser, setUserActive } from '../../lib/api';
import useAuthStore from '../../store/authStore';

// Admin-only card: reset password / deactivate (reversible) / delete an account.
// Uses Modals (not Alert) so the buttons work when the app runs on web.
export default function UserAdminActions({ userId, userName = 'this account', active = true, onDeleted }) {
  const me = useAuthStore((s) => s.user);
  const qc = useQueryClient();
  const [pwModal, setPwModal] = useState(false);
  const [delModal, setDelModal] = useState(false);
  const [statusModal, setStatusModal] = useState(false);
  const [password, setPassword] = useState('');
  const [banner, setBanner] = useState(null); // { ok: boolean, text: string }
  const [isActive, setIsActive] = useState(active !== false);

  const isAdmin = me?.role === 'admin';
  const isSelf = !!me?.id && me.id === userId;

  const invalidateLists = () => {
    qc.invalidateQueries({ queryKey: ['users'] });
    qc.invalidateQueries({ queryKey: ['team'] });
    qc.invalidateQueries({ queryKey: ['employees'] });
  };

  const resetMutation = useMutation({
    mutationFn: () => resetUserPassword(userId, password),
    onSuccess: () => {
      setPwModal(false);
      setPassword('');
      setBanner({ ok: true, text: 'Password updated.' });
    },
    onError: (e) => setBanner({ ok: false, text: e.message || 'Could not reset password.' }),
  });

  const statusMutation = useMutation({
    mutationFn: () => setUserActive(userId, !isActive),
    onSuccess: () => {
      const next = !isActive;
      setIsActive(next);
      setStatusModal(false);
      invalidateLists();
      setBanner({ ok: true, text: next ? 'Account activated.' : 'Account deactivated — login is now blocked.' });
    },
    onError: (e) => {
      setStatusModal(false);
      setBanner({ ok: false, text: e.message || 'Could not update account status.' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteUser(userId),
    onSuccess: () => {
      setDelModal(false);
      invalidateLists();
      onDeleted?.();
    },
    onError: (e) => {
      setDelModal(false);
      setBanner({ ok: false, text: e.message || 'Could not delete account.' });
    },
  });

  if (!isAdmin || !userId) return null;

  const pwValid = password.trim().length >= 6;

  return (
    <View className="mx-4 mt-4">
      <Text className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-2">
        Admin Actions
      </Text>

      {banner && (
        <View className={`rounded-xl px-3 py-2 mb-2 ${banner.ok ? 'bg-green-50' : 'bg-red-50'}`}>
          <Text className={`text-xs ${banner.ok ? 'text-green-700' : 'text-red-600'}`}>{banner.text}</Text>
        </View>
      )}

      <View className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <Pressable
          onPress={() => { setBanner(null); setPassword(''); setPwModal(true); }}
          className="flex-row items-center px-4 py-3.5 active:bg-gray-50"
        >
          <Ionicons name="key-outline" size={18} color="#2563eb" />
          <Text className="flex-1 text-sm font-medium text-gray-800 ml-3">Reset Password</Text>
          <Ionicons name="chevron-forward" size={16} color="#d1d5db" />
        </Pressable>

        {!isSelf && (
          <Pressable
            onPress={() => { setBanner(null); setStatusModal(true); }}
            className="flex-row items-center px-4 py-3.5 border-t border-gray-50 active:bg-gray-50"
          >
            <Ionicons
              name={isActive ? 'pause-circle-outline' : 'play-circle-outline'}
              size={18}
              color={isActive ? '#d97706' : '#16a34a'}
            />
            <Text
              className="flex-1 text-sm font-medium ml-3"
              style={{ color: isActive ? '#b45309' : '#15803d' }}
            >
              {isActive ? 'Deactivate Account' : 'Activate Account'}
            </Text>
            <Ionicons name="chevron-forward" size={16} color="#d1d5db" />
          </Pressable>
        )}

        {!isSelf && (
          <Pressable
            onPress={() => { setBanner(null); setDelModal(true); }}
            className="flex-row items-center px-4 py-3.5 border-t border-gray-50 active:bg-red-50"
          >
            <Ionicons name="trash-outline" size={18} color="#dc2626" />
            <Text className="flex-1 text-sm font-medium text-red-600 ml-3">Delete Account</Text>
            <Ionicons name="chevron-forward" size={16} color="#fecaca" />
          </Pressable>
        )}
      </View>

      {/* Reset password modal */}
      <Modal visible={pwModal} transparent animationType="fade" onRequestClose={() => setPwModal(false)}>
        <Pressable
          className="flex-1 items-center justify-center px-6"
          style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}
          onPress={() => setPwModal(false)}
        >
          <Pressable className="w-full bg-white rounded-2xl p-5" onPress={() => {}}>
            <Text className="text-base font-bold text-gray-900 mb-1">Reset Password</Text>
            <Text className="text-xs text-gray-500 mb-3">Set a new password for {userName}.</Text>
            <TextInput
              className="rounded-xl px-3 py-3 text-sm"
              style={{ backgroundColor: '#f9fafb', borderWidth: 1, borderColor: '#e5e7eb', color: '#1f2937' }}
              placeholder="New password (min 6 chars)"
              placeholderTextColor="#9ca3af"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoCapitalize="none"
            />
            <View className="flex-row gap-3 mt-4">
              <Pressable
                onPress={() => setPwModal(false)}
                className="flex-1 py-3 rounded-xl items-center border border-gray-200"
              >
                <Text className="text-sm font-medium text-gray-600">Cancel</Text>
              </Pressable>
              <Pressable
                onPress={() => pwValid && resetMutation.mutate()}
                disabled={!pwValid || resetMutation.isPending}
                className="flex-1 py-3 rounded-xl items-center"
                style={{ backgroundColor: pwValid ? '#2563eb' : '#e5e7eb' }}
              >
                {resetMutation.isPending
                  ? <ActivityIndicator size="small" color="#fff" />
                  : <Text className="text-sm font-semibold text-white">Update</Text>}
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Activate / deactivate confirm modal */}
      <Modal visible={statusModal} transparent animationType="fade" onRequestClose={() => setStatusModal(false)}>
        <Pressable
          className="flex-1 items-center justify-center px-6"
          style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}
          onPress={() => setStatusModal(false)}
        >
          <Pressable className="w-full bg-white rounded-2xl p-5" onPress={() => {}}>
            <Text className="text-base font-bold text-gray-900 mb-1">
              {isActive ? 'Deactivate Account' : 'Activate Account'}
            </Text>
            <Text className="text-xs text-gray-500 mb-4">
              {isActive
                ? `${userName} will no longer be able to log in. Their records are kept and this can be reversed any time.`
                : `${userName} will be able to log in again.`}
            </Text>
            <View className="flex-row gap-3">
              <Pressable
                onPress={() => setStatusModal(false)}
                className="flex-1 py-3 rounded-xl items-center border border-gray-200"
              >
                <Text className="text-sm font-medium text-gray-600">Cancel</Text>
              </Pressable>
              <Pressable
                onPress={() => statusMutation.mutate()}
                disabled={statusMutation.isPending}
                className="flex-1 py-3 rounded-xl items-center"
                style={{ backgroundColor: isActive ? '#d97706' : '#16a34a' }}
              >
                {statusMutation.isPending
                  ? <ActivityIndicator size="small" color="#fff" />
                  : <Text className="text-sm font-semibold text-white">{isActive ? 'Deactivate' : 'Activate'}</Text>}
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Delete confirm modal */}
      <Modal visible={delModal} transparent animationType="fade" onRequestClose={() => setDelModal(false)}>
        <Pressable
          className="flex-1 items-center justify-center px-6"
          style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}
          onPress={() => setDelModal(false)}
        >
          <Pressable className="w-full bg-white rounded-2xl p-5" onPress={() => {}}>
            <Text className="text-base font-bold text-gray-900 mb-1">Delete Account</Text>
            <Text className="text-xs text-gray-500 mb-4">
              Permanently delete {userName}? This cannot be undone. Accounts with orders or
              sales linked to them cannot be deleted — deactivate instead.
            </Text>
            <View className="flex-row gap-3">
              <Pressable
                onPress={() => setDelModal(false)}
                className="flex-1 py-3 rounded-xl items-center border border-gray-200"
              >
                <Text className="text-sm font-medium text-gray-600">Cancel</Text>
              </Pressable>
              <Pressable
                onPress={() => deleteMutation.mutate()}
                disabled={deleteMutation.isPending}
                className="flex-1 py-3 rounded-xl items-center"
                style={{ backgroundColor: '#dc2626' }}
              >
                {deleteMutation.isPending
                  ? <ActivityIndicator size="small" color="#fff" />
                  : <Text className="text-sm font-semibold text-white">Delete</Text>}
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}
