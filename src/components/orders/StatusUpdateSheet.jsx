import React, { useState } from 'react';
import { View, Text, Pressable, Modal, ActivityIndicator,  } from 'react-native';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { updateOrderStatus } from '../../lib/api';
import { VALID_ORDER_TRANSITIONS, ORDER_STATUS_CONFIG } from '../../constants';
import { alertDialog } from '../../lib/dialog';


export default function StatusUpdateSheet({ visible, onClose, orderId, currentStatus }) {
  const qc = useQueryClient();
  const [selected, setSelected] = useState(null);
  const nextStatuses = VALID_ORDER_TRANSITIONS[currentStatus] ?? [];
  const currentCfg = ORDER_STATUS_CONFIG[currentStatus];

  const mutation = useMutation({
    mutationFn: (status) => updateOrderStatus(orderId, status),
    onSuccess: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      qc.invalidateQueries({ queryKey: ['order', orderId] });
      qc.invalidateQueries({ queryKey: ['orders'] });
      onClose();
    },
    onError: (err) => {
      alertDialog('Error', err.message);
    },
  });

  const handleConfirm = () => {
    if (!selected) return;
    mutation.mutate(selected);
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable className="flex-1 bg-black/40" onPress={onClose}>
        <View className="absolute bottom-0 left-0 right-0 bg-white rounded-t-3xl pb-8">
          <View className="flex-row items-center justify-between px-5 pt-5 pb-4 border-b border-gray-100">
            <Text className="text-lg font-bold text-gray-900">Update Order Status</Text>
            <Pressable onPress={onClose} className="w-8 h-8 items-center justify-center rounded-full active:bg-gray-100">
              <Ionicons name="close" size={20} color="#6b7280" />
            </Pressable>
          </View>

          {/* Current status */}
          <View className="px-5 py-4 bg-gray-50 mx-4 mt-4 rounded-xl flex-row items-center">
            <Text className="text-sm text-gray-500 mr-2">Current:</Text>
            <View className="px-2.5 py-1 rounded-full" style={{ backgroundColor: currentCfg?.bg }}>
              <Text className="text-xs font-semibold" style={{ color: currentCfg?.text }}>
                {currentCfg?.label}
              </Text>
            </View>
          </View>

          {nextStatuses.length === 0 ? (
            <View className="px-5 py-6 items-center">
              <Ionicons name="checkmark-circle" size={40} color="#22c55e" />
              <Text className="text-sm text-gray-600 mt-2 text-center">
                This order is in a final state and cannot be updated further.
              </Text>
            </View>
          ) : (
            <>
              <View className="px-5 pt-4 pb-2">
                <Text className="text-sm text-gray-500 mb-3">Move to:</Text>
                {nextStatuses.map((status) => {
                  const cfg = ORDER_STATUS_CONFIG[status];
                  const isSelected = selected === status;
                  return (
                    <Pressable
                      key={status}
                      onPress={() => setSelected(status)}
                      className={`flex-row items-center px-4 py-3.5 rounded-xl mb-2 border-2 ${
                        isSelected ? 'border-amber-500 bg-amber-50' : 'border-gray-100 bg-gray-50'
                      }`}
                    >
                      <View className="w-3 h-3 rounded-full mr-3" style={{ backgroundColor: cfg.dot }} />
                      <Text className={`text-sm font-semibold flex-1 ${isSelected ? 'text-amber-800' : 'text-gray-700'}`}>
                        {cfg.label}
                      </Text>
                      {isSelected && <Ionicons name="checkmark-circle" size={18} color="#f59e0b" />}
                    </Pressable>
                  );
                })}
              </View>

              <View className="px-5 pt-2">
                <Pressable
                  onPress={handleConfirm}
                  disabled={!selected || mutation.isPending}
                  className="bg-amber-500 rounded-xl py-4 items-center active:bg-amber-600"
                  style={{ opacity: !selected || mutation.isPending ? 0.5 : 1 }}
                >
                  {mutation.isPending ? (
                    <ActivityIndicator color="#ffffff" />
                  ) : (
                    <Text className="text-white font-bold text-sm">
                      Confirm Status Update
                    </Text>
                  )}
                </Pressable>
              </View>
            </>
          )}
        </View>
      </Pressable>
    </Modal>
  );
}
