import React, { useState } from 'react';
import { View, Text, ScrollView, Pressable, Image, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { getOrder } from '../../lib/api';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import StatusUpdateSheet from '../../components/orders/StatusUpdateSheet';
import ShipmentSheet from '../../components/orders/ShipmentSheet';
import { formatPrice, formatDateTime, shortId } from '../../lib/utils';
import { ORDER_STATUS_CONFIG, VALID_ORDER_TRANSITIONS } from '../../constants';

const ORDER_TIMELINE = ['placed', 'confirmed', 'processing', 'shipped', 'delivered'];

export default function OrderDetailScreen({ route, navigation }) {
  const { orderId } = route.params;
  const insets = useSafeAreaInsets();
  const [showSheet, setShowSheet] = useState(false);
  const [showShipment, setShowShipment] = useState(false);

  const { data: order, isLoading } = useQuery({
    queryKey: ['order', orderId],
    queryFn: () => getOrder(orderId),
    staleTime: 60_000,
  });

  if (isLoading && !order) return <LoadingSpinner message="Loading order…" />;
  if (!order) return null;

  const cfg = ORDER_STATUS_CONFIG[order.status] || ORDER_STATUS_CONFIG.placed;
  const hasTransitions = (VALID_ORDER_TRANSITIONS[order.status] ?? []).length > 0;
  const isCancelled = order.status === 'cancelled';

  const currentTimelineStep = ORDER_TIMELINE.indexOf(order.status);

  return (
    <View className="flex-1 bg-gray-50">
      <ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View
          style={{ paddingTop: insets.top + 8 }}
          className="bg-white px-4 pb-4 border-b border-gray-100"
        >
          <View className="flex-row items-center mb-4">
            <Pressable onPress={() => navigation.goBack()} className="w-9 h-9 items-center justify-center rounded-full mr-2 active:bg-gray-100">
              <Ionicons name="arrow-back" size={22} color="#1f2937" />
            </Pressable>
            <View className="flex-1">
              <Text className="text-lg font-bold text-gray-900">Order #{shortId(order.id)}</Text>
              <Text className="text-xs text-gray-500">{formatDateTime(order.created_at)}</Text>
            </View>
            <View className="px-3 py-1.5 rounded-full" style={{ backgroundColor: cfg.bg }}>
              <Text className="text-xs font-bold" style={{ color: cfg.text }}>{cfg.label}</Text>
            </View>
          </View>

          {/* Timeline */}
          {!isCancelled && (
            <View className="flex-row items-center mt-2">
              {ORDER_TIMELINE.map((s, i) => {
                const past = i <= currentTimelineStep;
                const current = i === currentTimelineStep;
                const sCfg = ORDER_STATUS_CONFIG[s];
                return (
                  <React.Fragment key={s}>
                    <View className="items-center" style={{ flex: i < ORDER_TIMELINE.length - 1 ? 0 : 1 }}>
                      <View
                        className="w-7 h-7 rounded-full items-center justify-center border-2"
                        style={{
                          backgroundColor: past ? sCfg.dot : '#f3f4f6',
                          borderColor: current ? sCfg.dot : past ? sCfg.dot : '#e5e7eb',
                        }}
                      >
                        {past && !current ? (
                          <Ionicons name="checkmark" size={12} color="#fff" />
                        ) : current ? (
                          <View className="w-2 h-2 rounded-full bg-white" />
                        ) : null}
                      </View>
                      <Text className="text-xs mt-1" style={{ color: past ? sCfg.dot : '#9ca3af', fontSize: 9 }}>
                        {sCfg.label.split(' ')[0]}
                      </Text>
                    </View>
                    {i < ORDER_TIMELINE.length - 1 && (
                      <View
                        className="flex-1 h-0.5 mb-4"
                        style={{ backgroundColor: i < currentTimelineStep ? '#f59e0b' : '#e5e7eb' }}
                      />
                    )}
                  </React.Fragment>
                );
              })}
            </View>
          )}
        </View>

        <View className="px-4 pt-4 gap-4">
          {/* Order items */}
          <View className="bg-white rounded-2xl shadow-sm overflow-hidden">
            <Text className="text-sm font-semibold text-gray-700 px-4 pt-4 mb-3">
              Items ({order.order_items?.length ?? 0})
            </Text>
            {(order.order_items ?? []).map((item) => (
              <View key={item.id} className="flex-row items-center px-4 py-3 border-t border-gray-50">
                <View className="w-14 h-14 bg-gray-100 rounded-xl overflow-hidden mr-3">
                  {item.product?.images?.[0]?.url ? (
                    <Image source={{ uri: item.product.images[0].url }} className="w-full h-full" resizeMode="cover" />
                  ) : (
                    <View className="flex-1 items-center justify-center">
                      <Ionicons name="image-outline" size={20} color="#d1d5db" />
                    </View>
                  )}
                </View>
                <View className="flex-1">
                  <Text className="text-sm font-semibold text-gray-900" numberOfLines={2}>{item.product?.title}</Text>
                  {item.variant && (
                    <Text className="text-xs text-gray-500 mt-0.5">
                      {[item.variant.color, item.variant.size].filter(Boolean).join(' · ')}
                    </Text>
                  )}
                  <Text className="text-xs text-gray-500 mt-0.5">Qty: {item.quantity}</Text>
                </View>
                <Text className="text-sm font-bold text-gray-900">{formatPrice(item.unit_price * item.quantity)}</Text>
              </View>
            ))}

            {/* Total */}
            <View className="flex-row items-center justify-between px-4 py-3 bg-gray-50 border-t border-gray-100">
              <Text className="text-sm font-semibold text-gray-700">Total</Text>
              <Text className="text-base font-bold text-gray-900">{formatPrice(order.total_amount)}</Text>
            </View>
          </View>

          {/* Delivery address */}
          {order.address && (
            <View className="bg-white rounded-2xl shadow-sm p-4">
              <View className="flex-row items-center mb-3">
                <Ionicons name="location" size={16} color="#f59e0b" />
                <Text className="text-sm font-semibold text-gray-700 ml-2">Delivery Address</Text>
              </View>
              <Text className="text-sm text-gray-700">{order.address.line1}</Text>
              {order.address.line2 && <Text className="text-sm text-gray-600">{order.address.line2}</Text>}
              <Text className="text-sm text-gray-600">
                {order.address.city}, {order.address.state} {order.address.pincode}
              </Text>
            </View>
          )}

          {/* Coupon */}
          {order.coupon_applied && (
            <View className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex-row items-center">
              <Ionicons name="pricetag" size={16} color="#f59e0b" />
              <Text className="text-sm text-amber-800 font-medium ml-2">
                Coupon applied: {order.coupon_applied}
                {order.discount_amount > 0 && ` (−${formatPrice(order.discount_amount)})`}
              </Text>
            </View>
          )}

          {/* Refund request */}
          {order.refund_status === 'requested' && (
            <View className="bg-rose-50 border border-rose-200 rounded-2xl p-4">
              <View className="flex-row items-center mb-1">
                <Ionicons name="cash-outline" size={16} color="#e11d48" />
                <Text className="text-sm font-bold text-rose-700 ml-2">Refund requested by customer</Text>
              </View>
              {order.refund_reason && (
                <Text className="text-xs text-rose-600 mt-0.5">Reason: {order.refund_reason}</Text>
              )}
              <Text className="text-[11px] text-rose-500 mt-1.5">
                Update status to "Refunded" to issue the refund to the customer.
              </Text>
            </View>
          )}
          {order.refund_status === 'completed' && (
            <View className="bg-green-50 border border-green-200 rounded-2xl p-4 flex-row items-center">
              <Ionicons name="checkmark-circle" size={16} color="#16a34a" />
              <Text className="text-sm text-green-700 font-medium ml-2">Refund completed</Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Status update button */}
      <View
        style={{ paddingBottom: insets.bottom + 8 }}
        className="absolute bottom-0 left-0 right-0 bg-white border-t border-gray-100 px-4 pt-3 gap-2"
      >
        {(['confirmed', 'processing'].includes(order.status) || order.shiprocket_awb) && (
          <Pressable
            onPress={() => setShowShipment(true)}
            className="bg-white border border-amber-300 rounded-xl py-3.5 items-center active:bg-amber-50"
          >
            <Text className="text-amber-700 font-bold text-sm">
              {order.shiprocket_awb ? 'View Shipment' : 'Create Shipment'}
            </Text>
          </Pressable>
        )}
        <Pressable
          onPress={() => setShowSheet(true)}
          disabled={!hasTransitions}
          className="bg-amber-500 rounded-xl py-4 items-center active:bg-amber-600"
          style={{ opacity: hasTransitions ? 1 : 0.4 }}
        >
          <Text className="text-white font-bold text-sm">
            {hasTransitions ? 'Update Status' : 'Final Status'}
          </Text>
        </Pressable>
      </View>

      <StatusUpdateSheet
        visible={showSheet}
        onClose={() => setShowSheet(false)}
        orderId={orderId}
        currentStatus={order.status}
      />

      <ShipmentSheet
        visible={showShipment}
        onClose={() => setShowShipment(false)}
        order={order}
      />
    </View>
  );
}
