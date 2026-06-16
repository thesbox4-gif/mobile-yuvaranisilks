import React, { useState } from 'react';
import {
  View,
  Text,
  Pressable,
  Modal,
  ActivityIndicator,
  Alert,
  ScrollView,
  TextInput,
  Linking,
} from 'react-native';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import {
  checkShipmentServiceability,
  createShipment,
  getShipmentLabel,
  getShipmentInvoice,
  getShipmentManifest,
  trackShipment,
  cancelShipment,
} from '../../lib/api';
import { formatPrice } from '../../lib/utils';
import { alertDialog } from '../../lib/dialog';


export default function ShipmentSheet({ visible, onClose, order }) {
  const qc = useQueryClient();
  const [weight, setWeight] = useState('');
  const [couriers, setCouriers] = useState([]);
  const [selectedCourierId, setSelectedCourierId] = useState(null);
  const [computedWeight, setComputedWeight] = useState(null);
  const [trackingEvents, setTrackingEvents] = useState([]);

  const orderId = order?.id;
  const hasAwb = Boolean(order?.shiprocket_awb);
  const canShip = order && ['confirmed', 'processing'].includes(order.status);

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['order', orderId] });
    qc.invalidateQueries({ queryKey: ['orders'] });
  };

  const serviceabilityMutation = useMutation({
    mutationFn: () =>
      checkShipmentServiceability(orderId, weight ? { weight: parseFloat(weight) } : {}),
    onSuccess: (res) => {
      setCouriers(res.couriers ?? []);
      setComputedWeight(res.weight);
      if (!res.couriers?.length) {
        alertDialog('No couriers', 'No couriers available for this pincode/weight.');
      }
    },
    onError: (err) => alertDialog('Error', err.message),
  });

  const createMutation = useMutation({
    mutationFn: () =>
      createShipment(orderId, {
        courier_id: selectedCourierId,
        ...(weight ? { weight: parseFloat(weight) } : {}),
      }),
    onSuccess: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      invalidate();
      setCouriers([]);
      setSelectedCourierId(null);
      alertDialog('Success', 'Shipment created — AWB assigned');
      onClose();
    },
    onError: (err) => alertDialog('Error', err.message),
  });

  const openUrlMutation = useMutation({
    mutationFn: async ({ action }) => {
      const fn =
        action === 'label'
          ? getShipmentLabel
          : action === 'invoice'
            ? getShipmentInvoice
            : getShipmentManifest;
      const res = await fn(orderId);
      const url = res.label_url ?? res.invoice_url ?? res.manifest_url;
      if (!url) throw new Error('No document URL returned');
      await Linking.openURL(url);
      return res;
    },
    onSuccess: () => invalidate(),
    onError: (err) => alertDialog('Error', err.message),
  });

  const trackMutation = useMutation({
    mutationFn: () => trackShipment(orderId),
    onSuccess: (res) => {
      const events = res.tracking?.tracking_data?.shipment_track ?? [];
      setTrackingEvents(events);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    },
    onError: (err) => alertDialog('Error', err.message),
  });

  const cancelMutation = useMutation({
    mutationFn: () => cancelShipment(orderId),
    onSuccess: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      invalidate();
      onClose();
    },
    onError: (err) => alertDialog('Error', err.message),
  });

  const busy =
    serviceabilityMutation.isPending ||
    createMutation.isPending ||
    openUrlMutation.isPending ||
    trackMutation.isPending ||
    cancelMutation.isPending;

  if (!order) return null;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable className="flex-1 bg-black/40" onPress={onClose}>
        <Pressable
          className="absolute bottom-0 left-0 right-0 bg-white rounded-t-3xl max-h-[85%]"
          onPress={(e) => e.stopPropagation()}
        >
          <View className="flex-row items-center justify-between px-5 pt-5 pb-3 border-b border-gray-100">
            <Text className="text-lg font-bold text-gray-900">Shiprocket</Text>
            <Pressable onPress={onClose} className="w-8 h-8 items-center justify-center rounded-full">
              <Ionicons name="close" size={20} color="#6b7280" />
            </Pressable>
          </View>

          <ScrollView className="px-5 py-4" keyboardShouldPersistTaps="handled">
            {!canShip && !hasAwb ? (
              <Text className="text-sm text-gray-500">
                Order must be confirmed (payment received) before creating a shipment.
              </Text>
            ) : hasAwb ? (
              <View className="gap-4">
                <View className="bg-amber-50 rounded-xl p-4">
                  <Text className="text-xs text-gray-500 uppercase">AWB</Text>
                  <Text className="font-mono font-bold text-gray-900 mt-0.5">{order.shiprocket_awb}</Text>
                  <Text className="text-xs text-gray-500 uppercase mt-3">Courier</Text>
                  <Text className="font-semibold text-gray-900">{order.shiprocket_courier_name}</Text>
                  {order.expected_delivery_date && (
                    <>
                      <Text className="text-xs text-gray-500 uppercase mt-3">ETA</Text>
                      <Text className="text-sm text-gray-800">{order.expected_delivery_date}</Text>
                    </>
                  )}
                  {order.tracking_url && (
                    <Pressable
                      onPress={() => Linking.openURL(order.tracking_url)}
                      className="mt-3 flex-row items-center"
                    >
                      <Ionicons name="open-outline" size={16} color="#f59e0b" />
                      <Text className="text-amber-600 font-medium text-sm ml-1">Open tracking</Text>
                    </Pressable>
                  )}
                </View>

                <View className="flex-row flex-wrap gap-2">
                  {['label', 'invoice', 'manifest'].map((action) => (
                    <Pressable
                      key={action}
                      disabled={busy}
                      onPress={() => openUrlMutation.mutate({ action })}
                      className="px-4 py-2.5 rounded-xl border border-gray-200 active:bg-gray-50"
                    >
                      <Text className="text-sm font-semibold text-gray-700 capitalize">{action}</Text>
                    </Pressable>
                  ))}
                  <Pressable
                    disabled={busy}
                    onPress={() => trackMutation.mutate()}
                    className="px-4 py-2.5 rounded-xl border border-gray-200 active:bg-gray-50"
                  >
                    <Text className="text-sm font-semibold text-gray-700">Track</Text>
                  </Pressable>
                  {!['shipped', 'delivered'].includes(order.status) && (
                    <Pressable
                      disabled={busy}
                      onPress={() =>
                        alertDialog('Cancel shipment?', 'This cancels the AWB on Shiprocket.', [
                          { text: 'No', style: 'cancel' },
                          { text: 'Yes', style: 'destructive', onPress: () => cancelMutation.mutate() },
                        ])
                      }
                      className="px-4 py-2.5 rounded-xl border border-red-200 active:bg-red-50"
                    >
                      <Text className="text-sm font-semibold text-red-600">Cancel</Text>
                    </Pressable>
                  )}
                </View>

                {trackingEvents.length > 0 && (
                  <View className="border-t border-gray-100 pt-3">
                    <Text className="text-xs font-semibold text-gray-500 uppercase mb-2">Timeline</Text>
                    {trackingEvents.map((ev, i) => (
                      <Text key={i} className="text-xs text-gray-600 mb-2">
                        {ev.activity}
                        {ev.location ? ` · ${ev.location}` : ''}
                        {ev.date ? `\n${ev.date}` : ''}
                      </Text>
                    ))}
                  </View>
                )}
              </View>
            ) : (
              <View className="gap-4">
                <Text className="text-sm text-gray-500">
                  Check rates, pick courier, create shipment.
                  {computedWeight != null && ` Weight: ${computedWeight} kg`}
                </Text>
                <TextInput
                  value={weight}
                  onChangeText={setWeight}
                  placeholder="Weight kg (optional)"
                  keyboardType="decimal-pad"
                  className="border border-gray-200 rounded-xl px-4 py-3 text-sm"
                />
                <Pressable
                  disabled={busy}
                  onPress={() => serviceabilityMutation.mutate()}
                  className="bg-amber-500 rounded-xl py-3.5 items-center active:bg-amber-600"
                >
                  {serviceabilityMutation.isPending ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text className="text-white font-bold">Check Serviceability</Text>
                  )}
                </Pressable>

                {couriers.map((c) => (
                  <Pressable
                    key={c.courier_company_id}
                    onPress={() => setSelectedCourierId(c.courier_company_id)}
                    className={`p-3 rounded-xl border ${
                      selectedCourierId === c.courier_company_id
                        ? 'border-amber-400 bg-amber-50'
                        : 'border-gray-100'
                    }`}
                  >
                    <Text className="font-semibold text-gray-900">{c.courier_name}</Text>
                    <Text className="text-xs text-gray-500 mt-0.5">
                      {formatPrice(c.rate)} · {c.estimated_delivery_days || c.etd} days
                    </Text>
                  </Pressable>
                ))}

                {couriers.length > 0 && (
                  <Pressable
                    disabled={busy || selectedCourierId == null}
                    onPress={() => createMutation.mutate()}
                    className="bg-amber-500 rounded-xl py-3.5 items-center active:bg-amber-600"
                    style={{ opacity: selectedCourierId == null ? 0.5 : 1 }}
                  >
                    {createMutation.isPending ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <Text className="text-white font-bold">Create Shipment</Text>
                    )}
                  </Pressable>
                )}
              </View>
            )}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
