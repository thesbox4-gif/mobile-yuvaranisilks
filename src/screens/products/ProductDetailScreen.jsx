import React, { useState, useRef, useCallback } from 'react';
import {
  View, Text, ScrollView, Image, Pressable, Alert, ActivityIndicator, Modal,
  FlatList, Dimensions, Platform, TextInput, PanResponder,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import {
  getProduct, publishProduct, unpublishProduct, deleteProduct, recordSale,
} from '../../lib/api';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import { formatPrice, discountedPrice, formatDate } from '../../lib/utils';
import TypeBadge from '../../components/products/TypeBadge';
import useAuthStore from '../../store/authStore';
import * as Haptics from 'expo-haptics';
import { resolveColorHex } from '../../lib/colors';
import { alertDialog } from '../../lib/dialog';


const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
// Myntra-style portrait frame — 3:4 width:height across app + web
const IMAGE_HEIGHT = Math.round(SCREEN_WIDTH * (4 / 3));
const MIN_ZOOM = 1;
const MAX_ZOOM = 4;

function clampZoomOffset(offset, scale) {
  if (scale <= 1) return { x: 0, y: 0 };
  const maxX = Math.max(0, (SCREEN_WIDTH * scale - SCREEN_WIDTH) / 2);
  const maxY = Math.max(0, (SCREEN_HEIGHT * scale - SCREEN_HEIGHT) / 2);
  return {
    x: Math.max(-maxX, Math.min(maxX, offset.x)),
    y: Math.max(-maxY, Math.min(maxY, offset.y)),
  };
}

export default function ProductDetailScreen({ route, navigation }) {
  const { productId } = route.params;
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const viewMode = useAuthStore((s) => s.viewMode);
  const galleryRef = useRef(null);
  const lastTapRef = useRef(0);
  const pinchStartDistanceRef = useRef(null);
  const pinchStartScaleRef = useRef(1);
  const zoomScaleRef = useRef(1);
  const zoomOffsetRef = useRef({ x: 0, y: 0 });
  const panStartRef = useRef(null);
  const isPinchingRef = useRef(false);
  const [activeImageIdx, setActiveImageIdx] = useState(0);
  const [sellVariant, setSellVariant] = useState(null);
  const [sellQty, setSellQty] = useState(1);
  const [sellCustomer, setSellCustomer] = useState({ name: '', phone: '' });
  const [sellAmount, setSellAmount] = useState('');
  const [selectedColor, setSelectedColor] = useState(null);
  const [zoomUrl, setZoomUrl] = useState(null);
  const [zoomScale, setZoomScale] = useState(1);
  const [zoomOffset, setZoomOffset] = useState({ x: 0, y: 0 });
  const zoomUrlRef = useRef(null);
  zoomScaleRef.current = zoomScale;
  zoomOffsetRef.current = zoomOffset;
  zoomUrlRef.current = zoomUrl;
  const [confirmDialog, setConfirmDialog] = useState(null); // { title, message, actions, dismissible }

  const isAdmin = user?.role === 'admin';
  const isStaff = user?.role === 'admin' || user?.role === 'employee';
  const isCustomerView = viewMode === 'user';

  const { data: product, isLoading } = useQuery({
    queryKey: ['product', productId],
    queryFn: () => getProduct(productId),
    staleTime: 60_000,
  });

  const openConfirm = (title, message, actions, dismissible = true) => {
    if (Platform.OS !== 'web') {
      alertDialog(
        title,
        message,
        actions.map((item) => ({
          text: item.label,
          style: item.style,
          onPress: item.onPress,
        }))
      );
      return;
    }
    setConfirmDialog({ title, message, actions, dismissible });
  };

  const publishMutation = useMutation({
    mutationFn: () => publishProduct(productId),
    onSuccess: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      qc.invalidateQueries({ queryKey: ['product', productId] });
      qc.invalidateQueries({ queryKey: ['products'] });
    },
    onError: (err) => openConfirm('Error', err.message, [{ label: 'OK' }]),
  });

  const unpublishMutation = useMutation({
    mutationFn: () => unpublishProduct(productId),
    onSuccess: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      qc.invalidateQueries({ queryKey: ['product', productId] });
      qc.invalidateQueries({ queryKey: ['products'] });
    },
    onError: (err) => openConfirm('Error', err.message, [{ label: 'OK' }]),
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteProduct(productId),
    onSuccess: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      qc.invalidateQueries({ queryKey: ['products'] });
      navigation.goBack();
    },
    onError: (err) => openConfirm('Error', err.message, [{ label: 'OK' }]),
  });

  const sellMutation = useMutation({
    mutationFn: ({ variantId, quantity, customerName, customerPhone, amount }) =>
      recordSale({
        variant_id: variantId,
        quantity,
        customer_name: customerName,
        customer_phone: customerPhone,
        amount,
      }),
    onSuccess: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      qc.invalidateQueries({ queryKey: ['product', productId] });
      qc.invalidateQueries({ queryKey: ['products'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
      setSellVariant(null);
      openConfirm('Sale recorded', 'Stock has been updated.', [{ label: 'OK' }]);
    },
    onError: (err) => openConfirm('Error', err.message, [{ label: 'OK' }]),
  });

  const openSell = (variant) => {
    setSellVariant(variant);
    setSellQty(1);
    setSellCustomer({ name: '', phone: '' });
    setSellAmount('');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const confirmDelete = () => {
    openConfirm(
      'Delete Product',
      `Are you sure you want to delete "${product?.title}"? This cannot be undone.`,
      [
        { label: 'Cancel', style: 'cancel' },
        { label: 'Delete', style: 'destructive', onPress: () => deleteMutation.mutate() },
      ]
    );
  };

  const onViewableItemsChanged = useRef(({ viewableItems }) => {
    if (viewableItems.length > 0) {
      setActiveImageIdx(viewableItems[0].index ?? 0);
    }
  }).current;

  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 50 }).current;

  const productTitle = product?.title ?? '';
  const renderGalleryItem = useCallback(({ item }) => {
    if (!item.url) {
      return (
        <View
          style={{ width: SCREEN_WIDTH, height: IMAGE_HEIGHT }}
          className="items-center justify-center bg-amber-50"
        >
          <Ionicons name="image-outline" size={48} color="#fbbf24" />
          <Text className="text-amber-600 font-medium mt-2 text-sm">
            {productTitle}
          </Text>
        </View>
      );
    }
    return (
      <Pressable
        onPress={() => openZoom(item.url)}
        style={{ width: SCREEN_WIDTH, height: IMAGE_HEIGHT, backgroundColor: '#ffffff' }}
        className="items-center justify-center"
      >
        <Image
          source={{ uri: item.url }}
          style={{ width: SCREEN_WIDTH, height: IMAGE_HEIGHT }}
          resizeMode="cover"
        />
      </Pressable>
    );
  }, [productTitle]);

  const openZoom = (url) => {
    setZoomScale(1);
    setZoomOffset({ x: 0, y: 0 });
    setZoomUrl(url);
  };
  const closeZoom = () => {
    setZoomUrl(null);
    setZoomScale(1);
    setZoomOffset({ x: 0, y: 0 });
  };
  const setZoomScaleClamped = (nextScale) => {
    const scale = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, Number(nextScale.toFixed(3))));
    setZoomScale(scale);
    if (scale <= 1) {
      setZoomOffset({ x: 0, y: 0 });
    } else {
      setZoomOffset((o) => clampZoomOffset(o, scale));
    }
  };
  // Double-tap toggles between fit (1x) and 2.5x.
  const handleZoomTap = () => {
    const now = Date.now();
    if (now - lastTapRef.current < 300) {
      if (zoomScaleRef.current > 1) {
        setZoomScale(1);
        setZoomOffset({ x: 0, y: 0 });
      } else {
        setZoomScaleClamped(2.5);
      }
    }
    lastTapRef.current = now;
  };

  const pinchDistance = (touches) => {
    if (!touches || touches.length < 2) return null;
    const [first, second] = touches;
    const dx = first.pageX - second.pageX;
    const dy = first.pageY - second.pageY;
    return Math.sqrt((dx * dx) + (dy * dy));
  };

  const zoomPanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => !!zoomUrlRef.current,
      onStartShouldSetPanResponderCapture: () => true,
      onMoveShouldSetPanResponderCapture: () => true,
      onMoveShouldSetPanResponder: () => !!zoomUrlRef.current,
      onPanResponderGrant: (evt) => {
        const touches = evt.nativeEvent.touches;
        if (touches.length === 2) {
          isPinchingRef.current = true;
          const distance = pinchDistance(touches);
          if (!distance) return;
          pinchStartDistanceRef.current = distance;
          pinchStartScaleRef.current = zoomScaleRef.current;
          panStartRef.current = null;
          return;
        }
        if (touches.length === 1) {
          isPinchingRef.current = false;
          pinchStartDistanceRef.current = null;
          if (zoomScaleRef.current > 1) {
            panStartRef.current = {
              x: touches[0].pageX,
              y: touches[0].pageY,
              ox: zoomOffsetRef.current.x,
              oy: zoomOffsetRef.current.y,
            };
          }
        }
      },
      onPanResponderMove: (evt) => {
        const touches = evt.nativeEvent.touches;
        if (touches.length === 2) {
          if (!isPinchingRef.current || !pinchStartDistanceRef.current) {
            isPinchingRef.current = true;
            pinchStartDistanceRef.current = pinchDistance(touches);
            pinchStartScaleRef.current = zoomScaleRef.current;
            panStartRef.current = null;
            return;
          }

          const distance = pinchDistance(touches);
          const startDistance = pinchStartDistanceRef.current;
          if (!distance || !startDistance) return;

          setZoomScaleClamped(
            pinchStartScaleRef.current * (distance / startDistance)
          );
          return;
        }
        if (touches.length === 1) {
          if (isPinchingRef.current) {
            isPinchingRef.current = false;
            pinchStartDistanceRef.current = null;
            panStartRef.current = null;
          }
          if (zoomScaleRef.current > 1) {
            if (!panStartRef.current) {
              panStartRef.current = {
                x: touches[0].pageX,
                y: touches[0].pageY,
                ox: zoomOffsetRef.current.x,
                oy: zoomOffsetRef.current.y,
              };
              return;
            }
            const dx = touches[0].pageX - panStartRef.current.x;
            const dy = touches[0].pageY - panStartRef.current.y;
            setZoomOffset(clampZoomOffset({
              x: panStartRef.current.ox + dx,
              y: panStartRef.current.oy + dy,
            }, zoomScaleRef.current));
          }
        }
      },
      onPanResponderRelease: () => {
        pinchStartDistanceRef.current = null;
        panStartRef.current = null;
        isPinchingRef.current = false;
      },
      onPanResponderTerminate: () => {
        pinchStartDistanceRef.current = null;
        panStartRef.current = null;
        isPinchingRef.current = false;
      },
    })
  ).current;

  if (isLoading && !product) return <LoadingSpinner message="Loading product…" />;
  if (!product) return null;

  const finalPrice = discountedPrice(product.base_price, product.discount_pct);
  const images = product.images ?? [];
  const variants = product.variants ?? [];

  const uniqueColors = [...new Set(variants.map((v) => v.color).filter(Boolean))];
  const uniqueSizes = [...new Set(variants.map((v) => v.size).filter(Boolean))];

  // Per-colour image groups — the colour selector swaps the gallery.
  // display_order: AI-generated images use 0-9, originals 10-19 → generated show first.
  const sortByOrder = (a, b) => (Number(a.display_order) || 0) - (Number(b.display_order) || 0);
  const imageColors = [...new Set(images.map((i) => i.color).filter(Boolean))];
  const activeColor = selectedColor && imageColors.includes(selectedColor)
    ? selectedColor
    : imageColors[0] ?? null;
  const colorImages = (activeColor ? images.filter((i) => i.color === activeColor) : images)
    .slice()
    .sort(sortByOrder);

  const selectColor = (color) => {
    setSelectedColor(color);
    setActiveImageIdx(0);
    galleryRef.current?.scrollToOffset({ offset: 0, animated: false });
  };

  const galleryData = colorImages.length > 0 ? colorImages : [{ id: 'placeholder', url: null }];
  const confirmTitle = confirmDialog?.title || '';
  const confirmMessage = confirmDialog?.message || '';
  const confirmActions = confirmDialog?.actions || [];
  const runConfirmAction = (action) => {
    setConfirmDialog(null);
    if (action) action();
  };

  return (
    <View className="flex-1 bg-gray-50" style={{ paddingTop: insets.top }}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Image Gallery */}
        <View className="relative" style={{ height: IMAGE_HEIGHT }}>
          <FlatList
            ref={galleryRef}
            data={galleryData}
            renderItem={renderGalleryItem}
            keyExtractor={(item, idx) => item.id?.toString() || `img-${idx}`}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onViewableItemsChanged={onViewableItemsChanged}
            viewabilityConfig={viewabilityConfig}
            getItemLayout={(_, index) => ({
              length: SCREEN_WIDTH,
              offset: SCREEN_WIDTH * index,
              index,
            })}
          />

          {/* Back button */}
          <Pressable
            onPress={() => navigation.goBack()}
            style={{ top: 8 }}
            className="absolute left-4 w-10 h-10 bg-white/90 rounded-full items-center justify-center shadow-sm"
          >
            <Ionicons name="arrow-back" size={20} color="#1f2937" />
          </Pressable>

          {/* Edit button (admin only, not in customer view) */}
          {isAdmin && !isCustomerView && (
            <Pressable
              onPress={() => navigation.navigate('ProductWizard', {
                mode: 'edit',
                type: product.type,
                productId,
              })}
              style={{ top: 8 }}
              className="absolute right-4 w-10 h-10 bg-white/90 rounded-full items-center justify-center shadow-sm"
            >
              <Ionicons name="pencil" size={18} color="#1f2937" />
            </Pressable>
          )}

          {/* Dot indicators */}
          {galleryData.length > 1 && (
            <View className="absolute bottom-3 left-0 right-0 flex-row justify-center items-center">
              {galleryData.map((_, idx) => (
                <View
                  key={idx}
                  className="mx-1 rounded-full"
                  style={{
                    width: idx === activeImageIdx ? 8 : 6,
                    height: idx === activeImageIdx ? 8 : 6,
                    backgroundColor: idx === activeImageIdx ? '#f59e0b' : 'rgba(255,255,255,0.6)',
                  }}
                />
              ))}
            </View>
          )}
        </View>

        <View className="px-4 pt-4">
          {/* Status & type badges */}
          <View className="flex-row items-center mb-3 flex-wrap gap-2">
            {!isCustomerView && (
              <View className={`px-2.5 py-1 rounded-full ${product.published ? 'bg-green-100' : 'bg-gray-100'}`}>
                <Text className={`text-xs font-semibold ${product.published ? 'text-green-700' : 'text-gray-600'}`}>
                  {product.published ? 'Published' : 'Draft'}
                </Text>
              </View>
            )}
            <View className="bg-amber-50 px-2.5 py-1 rounded-full">
              <TypeBadge type={product.type} />
            </View>
            {product.category && (
              <View className="bg-indigo-50 px-2.5 py-1 rounded-full">
                <Text className="text-xs font-semibold text-indigo-700">{product.category.name}</Text>
              </View>
            )}
          </View>

          {/* Title */}
          <Text className="text-xl font-bold text-gray-900 mb-2">{product.title}</Text>

          {/* Price */}
          <View className="flex-row items-center mb-4">
            <Text className="text-2xl font-bold text-gray-900">{formatPrice(finalPrice)}</Text>
            {product.discount_pct > 0 && (
              <>
                <Text className="text-base text-gray-400 line-through ml-2">
                  {formatPrice(product.base_price)}
                </Text>
                <View className="bg-red-50 px-2 py-0.5 rounded ml-2">
                  <Text className="text-xs text-red-600 font-bold">{product.discount_pct}% off</Text>
                </View>
              </>
            )}
          </View>

          {/* Description */}
          {product.description && (
            <View className="bg-white rounded-2xl p-4 mb-4 shadow-sm">
              <Text className="text-sm font-semibold text-gray-700 mb-2">Description</Text>
              <Text className="text-sm text-gray-600 leading-5">{product.description}</Text>
            </View>
          )}

          {/* Available Colors — tap to switch the gallery */}
          {(imageColors.length > 0 ? imageColors : uniqueColors).length > 0 && (
            <View className="bg-white rounded-2xl p-4 mb-4 shadow-sm">
              <Text className="text-sm font-semibold text-gray-700 mb-3">
                {imageColors.length > 0 ? 'Colors — tap to view' : 'Available Colors'}
              </Text>
              <View className="flex-row flex-wrap gap-3">
                {(imageColors.length > 0 ? imageColors : uniqueColors).map((color) => {
                  const selectable = imageColors.includes(color);
                  const isActive = color === activeColor;
                  return (
                    <Pressable
                      key={color}
                      disabled={!selectable}
                      onPress={() => selectColor(color)}
                      className="items-center"
                    >
                      <View
                        className="w-9 h-9 rounded-full border-2"
                        style={{
                          backgroundColor: resolveColorHex(color),
                          borderColor: isActive ? '#f59e0b' : '#e5e7eb',
                        }}
                      />
                      <Text
                        className={`text-xs mt-1 capitalize ${isActive ? 'text-amber-700 font-semibold' : 'text-gray-500'}`}
                      >
                        {color}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          )}

          {/* Available Sizes */}
          {uniqueSizes.length > 0 && (
            <View className="bg-white rounded-2xl p-4 mb-4 shadow-sm">
              <Text className="text-sm font-semibold text-gray-700 mb-3">Available Sizes</Text>
              <View className="flex-row flex-wrap gap-2">
                {uniqueSizes.map((size) => (
                  <View key={size} className="bg-gray-100 px-3.5 py-2 rounded-lg">
                    <Text className="text-sm font-medium text-gray-700">{size}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Stock & Variants — staff only, not customer view */}
          {isStaff && !isCustomerView && variants.length > 0 && (
            <View className="bg-white rounded-2xl p-4 mb-4 shadow-sm">
              <Text className="text-sm font-semibold text-gray-700 mb-3">
                Stock & Variants ({variants.length})
              </Text>
              {variants.map((v) => {
                const stockColor =
                  v.quantity === 0 ? 'red' : v.quantity < 5 ? 'amber' : 'green';
                const stockBg =
                  v.quantity === 0 ? 'bg-red-100' : v.quantity < 5 ? 'bg-amber-100' : 'bg-green-100';
                const stockText =
                  v.quantity === 0 ? 'text-red-700' : v.quantity < 5 ? 'text-amber-700' : 'text-green-700';

                return (
                  <View key={v.id} className="flex-row items-center py-2.5 border-b border-gray-50">
                    {v.color && (
                      <View
                        className="w-5 h-5 rounded-full mr-2 border border-gray-200"
                        style={{ backgroundColor: resolveColorHex(v.color) }}
                      />
                    )}
                    <View className="flex-1">
                      <Text className="text-sm text-gray-800">
                        {[v.color, v.size].filter(Boolean).join(' · ') || 'Default'}
                      </Text>
                      {v.sku ? (
                        <Text className="text-xs text-gray-400 mt-0.5">SKU: {v.sku}</Text>
                      ) : null}
                    </View>
                    <View className={`px-2.5 py-1 rounded-full mr-2 ${stockBg}`}>
                      <Text className={`text-xs font-semibold ${stockText}`}>
                        {v.quantity} in stock
                      </Text>
                    </View>
                    <Pressable
                      onPress={() => openSell(v)}
                      disabled={v.quantity === 0}
                      className={`px-3 py-1.5 rounded-lg ${v.quantity === 0 ? 'bg-gray-100' : 'bg-amber-500 active:bg-amber-600'
                        }`}
                    >
                      <Text
                        className={`text-xs font-bold ${v.quantity === 0 ? 'text-gray-400' : 'text-white'
                          }`}
                      >
                        Sell
                      </Text>
                    </Pressable>
                  </View>
                );
              })}
            </View>
          )}

          {/* Coupon */}
          {product.coupon_code && !isCustomerView && (
            <View className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-4 flex-row items-center">
              <Ionicons name="pricetag" size={18} color="#f59e0b" />
              <View className="ml-3">
                <Text className="text-sm font-bold text-gray-900">{product.coupon_code}</Text>
                <Text className="text-xs text-gray-500">
                  {product.coupon_disc}% extra off with this code
                </Text>
              </View>
            </View>
          )}

          {!isCustomerView && (
            <Text className="text-xs text-gray-400 mb-4">
              Last updated: {formatDate(product.updated_at)}
            </Text>
          )}
        </View>
      </ScrollView>

      {/* Action bar */}
      <View
        style={{ paddingBottom: insets.bottom + 8 }}
        className="absolute bottom-0 left-0 right-0 bg-white border-t border-gray-100 px-4 pt-3"
      >
        {isCustomerView ? (
          <Pressable
            disabled
            className="flex-1 bg-amber-500 rounded-xl py-3.5 items-center opacity-60"
          >
            <Text className="text-white font-semibold text-sm">Add to Cart</Text>
            <Text className="text-white/70 text-xs mt-0.5">Coming Soon</Text>
          </Pressable>
        ) : (
          <View className="flex-row gap-3">
            {isAdmin && (
              <>
                {product.published ? (
                  <Pressable
                    onPress={() => unpublishMutation.mutate()}
                    disabled={unpublishMutation.isPending}
                    className="flex-1 border border-gray-300 rounded-xl py-3.5 items-center active:bg-gray-50"
                  >
                    {unpublishMutation.isPending ? (
                      <ActivityIndicator size="small" color="#6b7280" />
                    ) : (
                      <Text className="text-gray-700 font-semibold text-sm">Unpublish</Text>
                    )}
                  </Pressable>
                ) : (
                  <Pressable
                    onPress={() => publishMutation.mutate()}
                    disabled={publishMutation.isPending}
                    className="flex-1 bg-amber-500 rounded-xl py-3.5 items-center active:bg-amber-600"
                  >
                    {publishMutation.isPending ? (
                      <ActivityIndicator size="small" color="#ffffff" />
                    ) : (
                      <Text className="text-white font-semibold text-sm">Publish</Text>
                    )}
                  </Pressable>
                )}

                <Pressable
                  onPress={confirmDelete}
                  disabled={deleteMutation.isPending}
                  className="w-12 h-12 border border-red-200 rounded-xl items-center justify-center active:bg-red-50"
                >
                  {deleteMutation.isPending ? (
                    <ActivityIndicator size="small" color="#ef4444" />
                  ) : (
                    <Ionicons name="trash-outline" size={20} color="#ef4444" />
                  )}
                </Pressable>
              </>
            )}

            {!isAdmin && isStaff && (
              <View className="flex-1 bg-gray-100 rounded-xl py-3.5 items-center">
                <Text className="text-gray-500 font-medium text-sm">View Only</Text>
              </View>
            )}
          </View>
        )}
      </View>

      <Modal
        visible={!!confirmDialog}
        transparent
        animationType="fade"
        onRequestClose={() => {
          if (confirmDialog?.dismissible) setConfirmDialog(null);
        }}
      >
        <Pressable
          className="flex-1 items-center justify-center px-6"
          onPress={() => {
            if (confirmDialog?.dismissible) setConfirmDialog(null);
          }}
          style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}
        >
          <Pressable className="w-full rounded-2xl p-4" style={{ backgroundColor: '#ffffff' }} onPress={() => { }}>
            <Text className="text-base font-bold mb-1" style={{ color: '#111827' }}>{confirmTitle}</Text>
            <Text className="text-sm mb-3" style={{ color: '#6b7280' }}>{confirmMessage}</Text>
            {confirmActions.map((item) => (
              <Pressable
                key={item.label}
                onPress={() => runConfirmAction(item.onPress)}
                className="py-2.5"
              >
                <Text className="text-sm font-semibold" style={{ color: item.style === 'destructive' ? '#dc2626' : '#111827' }}>
                  {item.label}
                </Text>
              </Pressable>
            ))}
          </Pressable>
        </Pressable>
      </Modal>

      {/* Sell modal */}
      <Modal
        visible={!!sellVariant}
        transparent
        animationType="fade"
        onRequestClose={() => setSellVariant(null)}
      >
        <Pressable
          className="flex-1 bg-black/40 items-center justify-center px-6"
          onPress={() => setSellVariant(null)}
        >
          <Pressable className="bg-white rounded-2xl p-5 w-full" onPress={(e) => e.stopPropagation()}>
            <Text className="text-lg font-bold text-gray-900 mb-1">Mark as Sold</Text>
            <Text className="text-sm text-gray-500 mb-4">
              {product.title}
              {sellVariant
                ? ` — ${[sellVariant.color, sellVariant.size].filter(Boolean).join(' · ') || 'Default'}`
                : ''}
            </Text>

            {sellVariant?.color && (
              <View className="flex-row items-center mb-4">
                <View
                  className="w-5 h-5 rounded-full mr-2 border border-gray-200"
                  style={{ backgroundColor: resolveColorHex(sellVariant.color) }}
                />
                <Text className="text-sm text-gray-700 capitalize">{sellVariant.color}</Text>
                {sellVariant.size && (
                  <Text className="text-sm text-gray-400 ml-2">Size: {sellVariant.size}</Text>
                )}
              </View>
            )}

            {/* Walk-in customer */}
            <Text className="text-sm font-medium text-gray-700 mb-2">Customer name</Text>
            <TextInput
              className="rounded-xl px-3 py-3 text-sm mb-3"
              style={{ backgroundColor: '#f9fafb', borderWidth: 1, borderColor: '#e5e7eb', color: '#1f2937' }}
              placeholder="e.g. Priya Sharma"
              placeholderTextColor="#9ca3af"
              value={sellCustomer.name}
              onChangeText={(v) => setSellCustomer((c) => ({ ...c, name: v }))}
            />
            <Text className="text-sm font-medium text-gray-700 mb-2">Customer phone</Text>
            <TextInput
              className="rounded-xl px-3 py-3 text-sm mb-4"
              style={{ backgroundColor: '#f9fafb', borderWidth: 1, borderColor: '#e5e7eb', color: '#1f2937' }}
              placeholder="10-digit mobile number"
              placeholderTextColor="#9ca3af"
              keyboardType="phone-pad"
              value={sellCustomer.phone}
              onChangeText={(v) => setSellCustomer((c) => ({ ...c, phone: v }))}
            />

            <Text className="text-sm font-medium text-gray-700 mb-2">Amount sold (₹)</Text>
            <TextInput
              className="rounded-xl px-3 py-3 text-sm mb-4"
              style={{ backgroundColor: '#f9fafb', borderWidth: 1, borderColor: '#e5e7eb', color: '#1f2937' }}
              placeholder="Enter sale amount"
              placeholderTextColor="#9ca3af"
              keyboardType="decimal-pad"
              value={sellAmount}
              onChangeText={setSellAmount}
            />

            <Text className="text-sm font-medium text-gray-700 mb-2">Quantity sold</Text>
            <View className="flex-row items-center justify-center mb-5">
              <Pressable
                onPress={() => setSellQty((q) => Math.max(1, q - 1))}
                className="w-11 h-11 rounded-xl bg-gray-100 items-center justify-center active:bg-gray-200"
              >
                <Ionicons name="remove" size={20} color="#1f2937" />
              </Pressable>
              <Text className="text-2xl font-bold text-gray-900 mx-8 w-12 text-center">
                {sellQty}
              </Text>
              <Pressable
                onPress={() => setSellQty((q) => Math.min(sellVariant?.quantity ?? 1, q + 1))}
                className="w-11 h-11 rounded-xl bg-gray-100 items-center justify-center active:bg-gray-200"
              >
                <Ionicons name="add" size={20} color="#1f2937" />
              </Pressable>
            </View>
            <Text className="text-xs text-gray-400 text-center mb-5">
              {sellVariant?.quantity ?? 0} available
            </Text>

            <View className="flex-row gap-3">
              <Pressable
                onPress={() => setSellVariant(null)}
                className="flex-1 border border-gray-200 rounded-xl py-3.5 items-center active:bg-gray-50"
              >
                <Text className="text-gray-600 font-medium">Cancel</Text>
              </Pressable>
              <Pressable
                onPress={() => {
                  const amount = Number.parseFloat(sellAmount);
                  if (!sellAmount.trim() || Number.isNaN(amount) || amount <= 0) {
                    openConfirm('Invalid amount', 'Please enter a valid sale amount.', [{ label: 'OK' }]);
                    return;
                  }
                  sellMutation.mutate({
                    variantId: sellVariant.id,
                    quantity: sellQty,
                    customerName: sellCustomer.name,
                    customerPhone: sellCustomer.phone,
                    amount,
                  });
                }}
                disabled={sellMutation.isPending}
                className="flex-1 bg-amber-500 rounded-xl py-3.5 items-center active:bg-amber-600"
              >
                {sellMutation.isPending ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <Text className="text-white font-semibold">Record Sale</Text>
                )}
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Full-screen image zoom — works on iOS, Android and web */}
      <Modal
        visible={!!zoomUrl}
        transparent={false}
        animationType="fade"
        onRequestClose={closeZoom}
        statusBarTranslucent
      >
        <View style={{ flex: 1, backgroundColor: '#000' }}>
          <View
            style={{
              flex: 1,
              justifyContent: 'center',
              alignItems: 'center',
            }}
            {...zoomPanResponder.panHandlers}
          >
            {zoomUrl ? (
              <Pressable onPress={handleZoomTap} accessibilityRole="imagebutton">
                <Image
                  source={{ uri: zoomUrl }}
                  style={{
                    width: SCREEN_WIDTH,
                    height: SCREEN_HEIGHT,
                    transform: [
                      { translateX: zoomOffset.x },
                      { translateY: zoomOffset.y },
                      { scale: zoomScale },
                    ],
                  }}
                  resizeMode="contain"
                />
              </Pressable>
            ) : null}
          </View>

          <Pressable
            onPress={closeZoom}
            style={{ position: 'absolute', top: insets.top + 8, right: 16 }}
            className="w-10 h-10 bg-white/20 rounded-full items-center justify-center"
          >
            <Ionicons name="close" size={22} color="#fff" />
          </Pressable>

          {/* Zoom controls */}
          <View
            style={{ position: 'absolute', bottom: insets.bottom + 20, left: 0, right: 0 }}
            className="items-center"
            pointerEvents="box-none"
          >
            <Text className="text-white/50 text-xs mb-2">Pinch or − / + to zoom · drag to pan · double-tap to toggle</Text>
            <View className="flex-row justify-center items-center">
              <Pressable
                onPress={() => setZoomScaleClamped(zoomScale - 0.5)}
                className="w-12 h-12 bg-white/20 rounded-full items-center justify-center"
              >
                <Ionicons name="remove" size={24} color="#fff" />
              </Pressable>
              <View className="bg-white/20 rounded-full px-4 py-2 mx-3">
                <Text className="text-white text-sm font-semibold">{Math.round(zoomScale * 100)}%</Text>
              </View>
              <Pressable
                onPress={() => setZoomScaleClamped(zoomScale + 0.5)}
                className="w-12 h-12 bg-white/20 rounded-full items-center justify-center"
              >
                <Ionicons name="add" size={24} color="#fff" />
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
