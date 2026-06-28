import React, { useState, useCallback, useEffect } from 'react';
import { View, Text, Pressable, ScrollView, ActivityIndicator, RefreshControl, Modal, Image } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { ImageUp, Sparkles } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import useAuthStore from '../../store/authStore';
import { getDashboard, getOfflineSales, getCategoryInventory, getProducts, getUsageLimits, getSubscriberStats } from '../../lib/api';
import { formatPrice } from '../../lib/utils';
import { useRefetchOnFocus } from '../../hooks/useRefetchOnFocus';
import { resolveColorHex } from '../../lib/colors';
import * as Notifications from 'expo-notifications';

// Session-level dedup: fire limit alert at most once per app session per type
const _limitNotified = new Set();

async function fireLimitAlert(type) {
  if (_limitNotified.has(type)) return;
  _limitNotified.add(type);
  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: type === 'upload' ? '⚠️ Upload Limit Reached' : '⚠️ Generation Limit Reached',
        body: type === 'upload'
          ? 'All image upload slots are used. Contact support to upgrade your plan.'
          : 'All AI image generation slots are used. Contact support to upgrade your plan.',
        sound: true,
        priority: 'high',
      },
      trigger: null,
    });
  } catch { /* notifications may not be granted */ }
}

function SubCategoryDetailProducts({ subCategoryId }) {
  const { data, isLoading } = useQuery({
    queryKey: ['products-subcategory', subCategoryId],
    queryFn: () => getProducts({ category: subCategoryId, published: 'all', limit: 100 }),
    staleTime: 30_000,
  });

  const products = data?.data ?? [];

  if (isLoading) {
    return (
      <View className="py-12 items-center justify-center">
        <ActivityIndicator size="large" color="#f59e0b" />
        <Text className="text-xs text-gray-500 mt-2">Loading detailed stock...</Text>
      </View>
    );
  }

  if (products.length === 0) {
    return (
      <View className="py-12 items-center justify-center">
        <Ionicons name="alert-circle-outline" size={32} color="#9ca3af" />
        <Text className="text-sm text-gray-500 mt-2">No products in this category.</Text>
      </View>
    );
  }

  return (
    <ScrollView className="flex-1 px-4" showsVerticalScrollIndicator={false}>
      {products.map((p) => {
        const variants = p.variants ?? [];
        const totalQty = variants.reduce((s, v) => s + (v.quantity || 0), 0);
        const primaryImg = (p.images ?? []).find(i => i.is_primary) || (p.images ?? [])[0];
        const totalSold = variants.reduce((s, v) => s + (v.sold_count || 0), 0);

        return (
          <View key={p.id} className="bg-white rounded-2xl p-4 mb-3 border border-gray-100 shadow-sm">
            {primaryImg?.url ? (
              <View className="w-full bg-gray-50 rounded-xl mb-3 overflow-hidden items-center justify-center" style={{ height: 240 }}>
                <Image
                  source={{ uri: primaryImg.url }}
                  className="w-full h-full"
                  resizeMode="contain"
                />
              </View>
            ) : (
              <View className="w-full bg-gray-50 rounded-xl mb-3 items-center justify-center" style={{ height: 120 }}>
                <Ionicons name="image-outline" size={32} color="#d1d5db" />
              </View>
            )}
            <View className="flex-row justify-between items-start mb-2">
              <View className="flex-1 mr-2">
                <Text className="text-sm font-semibold text-gray-900">{p.title}</Text>
                <Text className="text-xs text-gray-500 mt-0.5">{p.category?.name || 'Category'}</Text>
              </View>
              <View className="items-end">
                <Text className="text-xs font-semibold text-amber-600">{formatPrice(p.base_price)}</Text>
                <Text className="text-[10px] text-gray-400 mt-0.5">{totalQty} in stock · {totalSold} sold</Text>
              </View>
            </View>

            {variants.length > 0 ? (
              <View className="bg-gray-50/50 rounded-xl p-3 mt-2 border border-gray-50">
                <Text className="text-[10px] font-semibold text-gray-400 tracking-wider mb-2 uppercase">Stock breakdown</Text>
                {variants.map((v, idx) => (
                  <View key={v.id ?? idx} className="flex-row items-center justify-between py-1 border-b border-gray-100/50 last:border-b-0">
                    <View className="flex-row items-center">
                      <View className="w-2.5 h-2.5 rounded-full mr-2" style={{ backgroundColor: resolveColorHex(v.color) }} />
                      <Text className="text-xs text-gray-700 font-medium">
                        {[v.color, v.size].filter(Boolean).join(' · ')}
                      </Text>
                    </View>
                    <View className="flex-row items-center">
                      <Text className="text-[10px] text-gray-400 mr-2">{v.sold_count || 0} sold</Text>
                      <Text className={`text-xs font-semibold ${v.quantity > 0 ? 'text-gray-800' : 'text-red-500'}`}>
                        {v.quantity > 0 ? `${v.quantity} left` : 'Out of stock'}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            ) : (
              <Text className="text-xs text-red-500 mt-1">No variants configured.</Text>
            )}
          </View>
        );
      })}
    </ScrollView>
  );
}

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const MAIN_CATS = [
  { type: 'saree', label: 'Sarees', icon: 'shirt', color: '#db2777' },
  { type: 'jewellery', label: 'Jewellery', icon: 'diamond', color: '#d97706' },
];

function getFormattedDate() {
  const d = new Date();
  return `${DAYS[d.getDay()]}, ${d.getDate()} ${MONTHS[d.getMonth()]}`;
}

function QuickActionCard({ icon, label, bgColor, iconColor, onPress }) {
  return (
    <Pressable
      onPress={onPress}
      className="flex-1 min-w-[45%] rounded-2xl p-4 m-1.5 active:opacity-80"
      style={{ backgroundColor: bgColor }}
    >
      <View className="w-10 h-10 rounded-full items-center justify-center mb-3" style={{ backgroundColor: `${iconColor}20` }}>
        <Ionicons name={icon} size={20} color={iconColor} />
      </View>
      <Text className="text-sm font-semibold text-white">{label}</Text>
    </Pressable>
  );
}

function MetricCard({ label, value, onPress }) {
  const Wrapper = onPress ? Pressable : View;
  return (
    <Wrapper
      onPress={onPress}
      className={`flex-1 bg-white rounded-xl p-3 mx-1 items-center shadow-sm${onPress ? ' active:opacity-80' : ''}`}
    >
      <Text className="text-lg font-bold text-gray-900">{value ?? '—'}</Text>
      <Text className="text-[10px] text-gray-500 mt-1 text-center">{label}</Text>
    </Wrapper>
  );
}

// KPI card for the dashboard image-usage section. Uses lucide-react-native icons
// and a progress bar whose colour reacts to how much of the limit is consumed.
function UsageKpiCard({ Icon, label, used, limit, color, bg }) {
  const u = Number(used ?? 0);
  const l = Number(limit ?? 0);
  const hasLimit = l > 0;
  const pct = hasLimit ? Math.min(100, Math.round((u / l) * 100)) : 0;
  const barColor = pct >= 90 ? '#ef4444' : pct >= 70 ? '#f59e0b' : '#22c55e';
  return (
    <View className="flex-1 mx-1 bg-white rounded-2xl p-4 shadow-sm">
      <View className="w-10 h-10 rounded-xl items-center justify-center mb-3" style={{ backgroundColor: bg }}>
        <Icon size={20} color={color} strokeWidth={2.2} />
      </View>
      <Text className="text-2xl font-bold text-gray-900" numberOfLines={1} adjustsFontSizeToFit>
        {u}
        <Text className="text-base font-semibold text-gray-400"> / {hasLimit ? l : '—'}</Text>
      </Text>
      <Text className="text-xs text-gray-500 mt-0.5 font-medium">{label}</Text>
      <View className="mt-3 h-1.5 rounded-full bg-gray-100 overflow-hidden">
        <View style={{ width: `${pct}%`, backgroundColor: barColor, height: '100%', borderRadius: 99 }} />
      </View>
      <Text className="text-[10px] text-gray-400 mt-1">{hasLimit ? `${pct}% used` : 'No limit set'}</Text>
    </View>
  );
}

function OverviewCard({ icon, label, value, color, hint }) {
  return (
    <View style={{ width: '50%', padding: 4 }}>
      <View className="bg-white rounded-2xl p-4 shadow-sm">
        <View className="w-8 h-8 rounded-full items-center justify-center mb-3" style={{ backgroundColor: `${color}1A` }}>
          <Ionicons name={icon} size={16} color={color} />
        </View>
        <Text className="text-2xl font-bold text-gray-900">{value ?? '—'}</Text>
        <Text className="text-xs font-medium text-gray-600 mt-0.5">{label}</Text>
        {hint ? <Text className="text-[10px] text-gray-400 mt-0.5">{hint}</Text> : null}
      </View>
    </View>
  );
}

function LimitWarningBanner({ usage }) {
  const uploadUsed = usage?.imagesUploaded ?? usage?.images_uploaded ?? 0;
  const uploadLimit = usage?.imageUploadLimit ?? usage?.image_upload_limit ?? 0;
  const genUsed = usage?.imagesGenerated ?? usage?.images_generated ?? 0;
  const genLimit = usage?.imageGenerateLimit ?? usage?.image_generate_limit ?? 0;
  const uploadFull = uploadLimit > 0 && uploadUsed >= uploadLimit;
  const genFull = genLimit > 0 && genUsed >= genLimit;
  if (!uploadFull && !genFull) return null;
  const msg = uploadFull && genFull
    ? 'Image upload & generation limits reached.'
    : uploadFull ? 'Image upload limit reached.'
    : 'Image generation limit reached.';
  return (
    <View className="bg-red-50 border border-red-200 rounded-xl px-3 py-2.5 mt-2 flex-row items-center">
      <Ionicons name="warning" size={16} color="#dc2626" />
      <Text className="text-xs text-red-700 font-semibold ml-2 flex-1">{msg} Contact support to upgrade.</Text>
    </View>
  );
}

function Pill({ label, warn }) {
  return (
    <View className={`px-2 py-0.5 rounded-full ${warn ? 'bg-red-50' : 'bg-gray-100'}`}>
      <Text className={`text-[10px] font-medium ${warn ? 'text-red-600' : 'text-gray-600'}`}>{label}</Text>
    </View>
  );
}

function SaleRow({ customerName, productName, price }) {
  return (
    <View className="flex-row items-center py-3 border-b border-gray-50 px-4">
      <View className="w-9 h-9 rounded-full bg-amber-100 items-center justify-center mr-3">
        <Ionicons name="person" size={16} color="#f59e0b" />
      </View>
      <View className="flex-1">
        <Text className="text-sm font-medium text-gray-800" numberOfLines={1}>{customerName}</Text>
        <Text className="text-xs text-gray-500 mt-0.5" numberOfLines={1}>{productName}</Text>
      </View>
      <Text className="text-sm font-bold text-gray-900">{formatPrice(price)}</Text>
    </View>
  );
}

export default function DashboardScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const user = useAuthStore((s) => s.user);
  const viewMode = useAuthStore((s) => s.viewMode);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedSubCategory, setSelectedSubCategory] = useState(null);

  const handleCategoryModalBack = useCallback(() => {
    if (selectedSubCategory) {
      setSelectedSubCategory(null);
    } else if (selectedCategory) {
      setSelectedCategory(null);
    }
  }, [selectedCategory, selectedSubCategory]);

  const role = viewMode === 'user' ? 'customer' : (user?.role || 'customer');
  const isAdmin = role === 'admin';
  const isEmployee = role === 'employee';
  const isCustomer = role === 'customer';

  const { data: stats, isLoading: dashLoading, refetch: refetchDash, isRefetching } = useQuery({
    queryKey: ['dashboard'],
    queryFn: getDashboard,
    staleTime: 60_000,
    enabled: isAdmin || isEmployee,
  });

  const { data: salesData, isLoading: salesLoading, refetch: refetchSales } = useQuery({
    queryKey: ['offline-sales'],
    queryFn: () => getOfflineSales({ limit: 200 }),
    staleTime: 60_000,
    enabled: isAdmin || isEmployee,
  });

  const { data: catInv, isLoading: catInvLoading, refetch: refetchCat } = useQuery({
    queryKey: ['category-inventory'],
    queryFn: getCategoryInventory,
    staleTime: 60_000,
    enabled: isAdmin || isEmployee,
  });

  const { data: usage, refetch: refetchUsage } = useQuery({
    queryKey: ['usage-limits'],
    queryFn: getUsageLimits,
    staleTime: 60_000,
    enabled: isAdmin,
  });

  const { data: subscribers, refetch: refetchSubscribers } = useQuery({
    queryKey: ['subscriber-stats'],
    queryFn: getSubscriberStats,
    staleTime: 120_000,
    enabled: isAdmin,
  });

  const recentSales = salesData?.data ?? salesData ?? [];
  const isLoading = (isAdmin || isEmployee) && dashLoading;

  // Employee KPI — the employee's own offline sales (the backend already
  // scopes /sales to sold_by === current user for the employee role).
  const offlineSales = Array.isArray(recentSales) ? recentSales : [];
  const myRevenue = offlineSales.reduce(
    (s, x) => s + Number(x.unit_price || 0) * Number(x.quantity || 0),
    0
  );
  const mySaleCount = offlineSales.length;
  const myItemsSold = offlineSales.reduce((s, x) => s + Number(x.quantity || 0), 0);

  const onRefresh = () => {
    refetchDash();
    refetchSales();
    refetchCat();
    refetchUsage();
    refetchSubscribers();
  };

  useRefetchOnFocus(['dashboard'], ['offline-sales'], ['category-inventory'], ['usage-limits'], ['subscriber-stats']);

  // Fire local notification when image limits are reached (once per session)
  useEffect(() => {
    if (!usage || !isAdmin) return;
    const uploadUsed = usage.imagesUploaded ?? usage.images_uploaded ?? 0;
    const uploadLimit = usage.imageUploadLimit ?? usage.image_upload_limit ?? 0;
    const genUsed = usage.imagesGenerated ?? usage.images_generated ?? 0;
    const genLimit = usage.imageGenerateLimit ?? usage.image_generate_limit ?? 0;
    if (uploadLimit > 0 && uploadUsed >= uploadLimit) fireLimitAlert('upload');
    if (genLimit > 0 && genUsed >= genLimit) fireLimitAlert('generate');
  }, [usage, isAdmin]);

  // Roll the per-category inventory up into the 3 main product types.
  const mainCategories = MAIN_CATS.map((m) => {
    const items = (catInv ?? []).filter((c) => c.type === m.type);
    const inStock = items.filter((c) => Number(c.itemsLeft) > 0);
    return {
      ...m,
      subCount: items.length,
      productCount: inStock.reduce((s, c) => s + (c.productCount || 0), 0),
      variantCount: inStock.reduce((s, c) => s + (c.variantCount || 0), 0),
      itemsLeft: inStock.reduce((s, c) => s + (c.itemsLeft || 0), 0),
      lowStock: inStock.reduce((s, c) => s + (c.lowStock || 0), 0),
      subcategories: inStock,
    };
  });

  const navigateToTab = (tabName, screen, params) => {
    if (screen) {
      navigation.navigate(tabName, {
        screen,
        params: { ...params, referrer: 'DashboardTab' },
      });
    } else {
      navigation.navigate(tabName);
    }
  };

  return (
    <ScrollView
      className="flex-1 bg-amber-50/30"
      contentContainerStyle={{ paddingTop: insets.top, paddingBottom: insets.bottom + 24 }}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={!!isRefetching}
          onRefresh={onRefresh}
          tintColor="#f59e0b"
          colors={['#f59e0b']}
        />
      }
    >
      {/* Gradient Header */}
      <LinearGradient
        colors={['#f59e0b', '#d97706']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ paddingTop: 16, paddingBottom: 32, paddingHorizontal: 20, borderBottomLeftRadius: 28, borderBottomRightRadius: 28 }}
      >
        <Text className="text-amber-100 text-sm font-medium">{getFormattedDate()}</Text>
        <Text className="text-white text-2xl font-bold mt-1">
          Welcome back ✨
        </Text>
        <Text className="text-amber-100 text-base mt-0.5">
          {user?.name?.split(' ')[0] || 'there'}
        </Text>
      </LinearGradient>

      <View className="px-4 -mt-5">
        {/* Revenue Card (Admin) */}
        {isAdmin && (
          <View className="bg-white rounded-2xl p-5 shadow-sm mb-4">
            {dashLoading ? (
              <ActivityIndicator color="#f59e0b" />
            ) : (
              <>
                <Text className="text-xs font-semibold text-gray-400 tracking-widest">TOTAL REVENUE</Text>
                <View className="flex-row items-end mt-2">
                  <Text className="text-3xl font-bold text-gray-900">
                    {formatPrice(stats?.totalRevenue ?? 0)}
                  </Text>
                </View>
                <Text className="text-xs text-gray-500 mt-2">
                  {stats?.totalOrders ?? 0} completed • {stats?.pendingOrders ?? 0} pending
                </Text>
              </>
            )}
          </View>
        )}

        {/* Image Usage (Admin) — sits directly below Total Revenue */}
        {isAdmin && usage && (
          <View className="mb-4">
            <Text className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-3">Image Usage</Text>
            <View className="flex-row">
              <UsageKpiCard
                Icon={ImageUp}
                label="Images Uploaded"
                used={usage.imagesUploaded ?? usage.images_uploaded}
                limit={usage.imageUploadLimit ?? usage.image_upload_limit}
                color="#2563eb"
                bg="#dbeafe"
              />
              <UsageKpiCard
                Icon={Sparkles}
                label="AI Generated"
                used={usage.imagesGenerated ?? usage.images_generated}
                limit={usage.imageGenerateLimit ?? usage.image_generate_limit}
                color="#7c3aed"
                bg="#ede9fe"
              />
            </View>
            <LimitWarningBanner usage={usage} />
          </View>
        )}

        {/* Employee KPI Card */}
        {isEmployee && (
          <View className="bg-white rounded-2xl p-5 shadow-sm mb-4">
            {salesLoading ? (
              <ActivityIndicator color="#f59e0b" />
            ) : (
              <>
                <Text className="text-xs font-semibold text-gray-400 tracking-widest">MY SALES</Text>
                <View className="flex-row items-end mt-2">
                  <Text className="text-3xl font-bold text-gray-900">
                    {formatPrice(myRevenue)}
                  </Text>
                </View>
                <Text className="text-xs text-gray-500 mt-2">
                  {mySaleCount} sales · {myItemsSold} items sold
                </Text>
              </>
            )}
          </View>
        )}

        {/* Customer Welcome Card */}
        {isCustomer && (
          <View className="bg-white rounded-2xl p-5 shadow-sm mb-4">
            <Text className="text-lg font-bold text-gray-900">Namaste! 🙏</Text>
            <Text className="text-sm text-gray-500 mt-1">
              Explore our curated collection of Indian ethnic wear and jewellery.
            </Text>
          </View>
        )}

        {/* Notification Banner (Admin only) */}
        {isAdmin && (stats?.pendingOrders ?? 0) > 0 && (
          <Pressable
            onPress={() => navigateToTab('MoreTab', 'Orders', { initialStatus: 'placed' })}
            className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-4 flex-row items-center active:bg-amber-100"
          >
            <View className="w-8 h-8 rounded-full bg-amber-200 items-center justify-center mr-3">
              <Ionicons name="notifications" size={16} color="#d97706" />
            </View>
            <View className="flex-1">
              <Text className="text-sm font-medium text-amber-900">
                {stats?.pendingOrders ?? 0} online order{(stats?.pendingOrders ?? 0) === 1 ? '' : 's'} to confirm
              </Text>
            </View>
            <Text className="text-sm font-semibold text-amber-600">Review ›</Text>
          </Pressable>
        )}

        {/* Quick Actions */}
        <View className="mb-4">
          <Text className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-3">Quick Actions</Text>
          <View className="flex-row flex-wrap">
            {isAdmin && (
              <>
                <QuickActionCard
                  icon="diamond"
                  label="Collections"
                  bgColor="#9f1239"
                  iconColor="#fecdd3"
                  onPress={() => navigateToTab('CollectionsTab')}
                />
                <QuickActionCard
                  icon="cash"
                  label="Sales History"
                  bgColor="#0e7490"
                  iconColor="#cffafe"
                  onPress={() => navigateToTab('MoreTab', 'SalesHistory')}
                />
                <QuickActionCard
                  icon="checkmark-circle"
                  label="Orders"
                  bgColor="#0d9488"
                  iconColor="#ccfbf1"
                  onPress={() => navigateToTab('MoreTab', 'Orders', { initialStatus: 'placed' })}
                />
                <QuickActionCard
                  icon="bar-chart"
                  label="Analytics"
                  bgColor="#7c3aed"
                  iconColor="#ede9fe"
                  onPress={() => navigateToTab('MoreTab', 'Analytics')}
                />
                <QuickActionCard
                  icon="people"
                  label="Team"
                  bgColor="#b45309"
                  iconColor="#fef3c7"
                  onPress={() => navigateToTab('MoreTab', 'Team')}
                />
              </>
            )}
            {isEmployee && (
              <>
                <QuickActionCard
                  icon="diamond"
                  label="Collections"
                  bgColor="#9f1239"
                  iconColor="#fecdd3"
                  onPress={() => navigateToTab('CollectionsTab')}
                />
                <QuickActionCard
                  icon="cash"
                  label="My Sales"
                  bgColor="#0e7490"
                  iconColor="#cffafe"
                  onPress={() => navigation.navigate('MySales')}
                />
                <QuickActionCard
                  icon="add-circle"
                  label="Add Product"
                  bgColor="#0d9488"
                  iconColor="#ccfbf1"
                  onPress={() => navigateToTab('CreateTab', 'AddProductType', { returnTab: 'DashboardTab' })}
                />
              </>
            )}
            {isCustomer && (
              <QuickActionCard
                icon="diamond"
                label="Collections"
                bgColor="#9f1239"
                iconColor="#fecdd3"
                onPress={() => navigateToTab('CollectionsTab')}
              />
            )}
          </View>
        </View>

        {/* Inventory Summary (Admin) */}
        {isAdmin && !dashLoading && stats && (
          <View className="mb-4">
            <Text className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-3">Inventory</Text>
            <View className="flex-row">
              <MetricCard
                label="Products"
                value={stats.totalProducts ?? 0}
                onPress={() => navigation.navigate('InventoryList', { filter: 'products' })}
              />
              <MetricCard
                label="Low Stock"
                value={stats.lowStockVariants ?? 0}
                onPress={() => navigation.navigate('InventoryList', { filter: 'low_stock' })}
              />
              <MetricCard
                label="Out of Stock"
                value={stats.outOfStockVariants ?? 0}
                onPress={() => navigation.navigate('InventoryList', { filter: 'out_of_stock' })}
              />
              <MetricCard
                label="Team"
                value={stats.totalEmployees ?? 0}
                onPress={() => navigateToTab('MoreTab', 'Team')}
              />
            </View>
          </View>
        )}

        {/* Store Overview (Admin) */}
        {isAdmin && !dashLoading && stats && (
          <View className="mb-4">
            <Text className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-1">Store Overview</Text>
            <View className="flex-row flex-wrap" style={{ marginHorizontal: -4 }}>
              <OverviewCard
                icon="cube-outline"
                label="Total Products"
                value={stats.totalProducts ?? 0}
                color="#7c3aed"
              />
              <OverviewCard
                icon="sparkles"
                label="New Arrivals"
                value={stats.newArrivalsCount ?? stats.new_arrivals_count ?? stats.newArrivals}
                color="#0d9488"
                hint="Last 30 days"
              />
              <OverviewCard
                icon="people"
                label="Customers"
                value={stats.totalCustomers ?? stats.customer_count ?? stats.customerCount}
                color="#2563eb"
                hint="Registered"
              />
              <OverviewCard
                icon="megaphone-outline"
                label="Broadcasts Sent"
                value={stats.broadcastMessagesSent ?? stats.broadcast_count ?? stats.broadcastsSent}
                color="#db2777"
              />
            </View>
          </View>
        )}

        {/* Customer Notification Statistics (Admin) */}
        {isAdmin && subscribers && (
          <View className="mb-4">
            <Text className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-1">Notification Reach</Text>
            <View className="flex-row flex-wrap" style={{ marginHorizontal: -4 }}>
              <OverviewCard
                icon="people-circle-outline"
                label="Total Subscribers"
                value={subscribers.totalSubscribers ?? subscribers.total_subscribers ?? subscribers.total}
                color="#0d9488"
              />
              <OverviewCard
                icon="logo-whatsapp"
                label="WhatsApp"
                value={subscribers.whatsappSubscribers ?? subscribers.whatsapp_subscribers ?? subscribers.whatsapp}
                color="#16a34a"
                hint="Active"
              />
              <OverviewCard
                icon="phone-portrait-outline"
                label="App Push"
                value={subscribers.appSubscribers ?? subscribers.app_subscribers ?? subscribers.push}
                color="#7c3aed"
                hint="Active"
              />
              <OverviewCard
                icon="megaphone-outline"
                label="Last Broadcast"
                value={subscribers.lastBroadcastDate ?? subscribers.last_broadcast_date
                  ? new Date(subscribers.lastBroadcastDate ?? subscribers.last_broadcast_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
                  : '—'}
                color="#db2777"
                hint="Date sent"
              />
            </View>
          </View>
        )}

        {/* Stock by Category — 3 main types; tap to drill into sub-categories */}
        {(isAdmin || isEmployee) && (
          <View className="mb-4">
            <Text className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-3">
              Stock by Category
            </Text>
            {catInvLoading ? (
              <View className="bg-white rounded-2xl p-6 items-center shadow-sm">
                <ActivityIndicator color="#f59e0b" />
              </View>
            ) : (
              <View className="bg-white rounded-2xl shadow-sm overflow-hidden">
                {mainCategories.map((m, idx) => (
                  <Pressable
                    key={m.type}
                    onPress={() => setSelectedCategory(m)}
                    className={`px-4 py-3.5 active:bg-gray-50 ${idx > 0 ? 'border-t border-gray-50' : ''}`}
                  >
                    <View className="flex-row items-center">
                      <View
                        className="w-10 h-10 rounded-full items-center justify-center mr-3"
                        style={{ backgroundColor: `${m.color}1A` }}
                      >
                        <Ionicons name={m.icon} size={18} color={m.color} />
                      </View>
                      <View className="flex-1">
                        <Text className="text-sm font-semibold text-gray-900">{m.label}</Text>
                        <Text className="text-[11px] text-gray-400 mt-0.5">
                          {m.subCount} categories · {m.productCount} products
                        </Text>
                      </View>
                      <View className="items-end mr-2">
                        <Text className="text-base font-bold text-gray-900">{m.itemsLeft}</Text>
                        <Text className="text-[10px] text-gray-400">in stock</Text>
                      </View>
                      <Ionicons name="chevron-forward" size={16} color="#d1d5db" />
                    </View>
                    {m.lowStock > 0 && (
                      <View className="flex-row mt-2">
                        <Pill label={`${m.lowStock} low stock`} warn />
                      </View>
                    )}
                  </Pressable>
                ))}
              </View>
            )}
          </View>
        )}

        {/* Recent Sales (Admin/Employee) */}
        {(isAdmin || isEmployee) && !salesLoading && Array.isArray(recentSales) && recentSales.length > 0 && (
          <View className="bg-white rounded-2xl shadow-sm overflow-hidden mb-4">
            <View className="flex-row items-center justify-between px-4 pt-4 pb-2">
              <Text className="text-sm font-semibold text-gray-900">Recent Sales</Text>
              <Pressable
                onPress={() =>
                  isAdmin
                    ? navigateToTab('MoreTab', 'SalesHistory')
                    : navigation.navigate('MySales')
                }
              >
                <Text className="text-xs font-medium text-amber-600">View all</Text>
              </Pressable>
            </View>
            {recentSales.slice(0, 5).map((sale, idx) => (
              <SaleRow
                key={sale.id ?? idx}
                customerName={sale.customer_name || 'Walk-in customer'}
                productName={sale.product?.title || 'Product'}
                price={Number(sale.unit_price || 0) * Number(sale.quantity || 0)}
              />
            ))}
          </View>
        )}

        {/* Loading state for sales */}
        {(isAdmin || isEmployee) && salesLoading && (
          <View className="bg-white rounded-2xl p-6 items-center shadow-sm mb-4">
            <ActivityIndicator color="#f59e0b" />
            <Text className="text-xs text-gray-400 mt-2">Loading sales…</Text>
          </View>
        )}
      </View>

      {/* Category Detail Modal */}
      <Modal
        visible={!!selectedCategory}
        animationType="slide"
        onRequestClose={handleCategoryModalBack}
      >
        <View className="flex-1 bg-gray-50" style={{ paddingTop: insets.top }}>
          {/* Modal Header */}
          <View className="flex-row items-center justify-between px-4 py-4 bg-white border-b border-gray-100">
            <View className="flex-row items-center">
              <Pressable
                onPress={handleCategoryModalBack}
                className="mr-3 w-9 h-9 items-center justify-center rounded-full bg-gray-100 active:bg-gray-200"
              >
                <Ionicons name="arrow-back" size={20} color="#374151" />
              </Pressable>
              <View>
                <Text className="text-lg font-bold text-gray-900">
                  {selectedSubCategory ? selectedSubCategory.name : (selectedCategory?.label || 'Category Detail')}
                </Text>
                <Text className="text-xs text-gray-500">
                  {selectedSubCategory ? 'Product Stock Detail' : 'Select a subcategory'}
                </Text>
              </View>
            </View>
            <Pressable
              onPress={() => {
                setSelectedSubCategory(null);
                setSelectedCategory(null);
              }}
              className="w-9 h-9 items-center justify-center rounded-full bg-gray-100 active:bg-gray-200"
            >
              <Ionicons name="close" size={20} color="#374151" />
            </Pressable>
          </View>

          {/* Modal Body */}
          {selectedCategory && !selectedSubCategory && (
            <ScrollView className="flex-1 p-4" showsVerticalScrollIndicator={false}>
              {/* Summary Card */}
              <View className="bg-white rounded-2xl p-5 mb-4 border border-gray-100 shadow-sm flex-row items-center justify-between">
                <View>
                  <Text className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Total stock</Text>
                  <Text className="text-3xl font-bold text-gray-900 mt-1">{selectedCategory.itemsLeft}</Text>
                </View>
                <View className="w-12 h-12 rounded-full items-center justify-center" style={{ backgroundColor: `${selectedCategory.color}1A` }}>
                  <Ionicons name={selectedCategory.icon} size={24} color={selectedCategory.color} />
                </View>
              </View>

              <Text className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3 ml-1">Subcategories</Text>

              {selectedCategory.subcategories?.length > 0 ? (
                selectedCategory.subcategories.map((sub) => (
                  <Pressable
                    key={sub.id}
                    onPress={() => setSelectedSubCategory(sub)}
                    className="bg-white rounded-2xl p-4 mb-3 border border-gray-100 shadow-sm active:bg-gray-50/50"
                  >
                    <View className="flex-row items-center justify-between">
                      <View className="flex-1 mr-4">
                        <Text className="text-base font-semibold text-gray-900">{sub.name}</Text>
                        <Text className="text-xs text-gray-500 mt-1">
                          {sub.productCount} products · {sub.variantCount} variants
                        </Text>
                      </View>
                      <View className="flex-row items-center">
                        <View className="items-end mr-3">
                          <Text className="text-base font-bold text-gray-900">{sub.itemsLeft}</Text>
                          <Text className="text-[10px] text-gray-400">in stock</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={16} color="#9ca3af" />
                      </View>
                    </View>

                    {/* Stock per Color */}
                    {sub.colors?.length > 0 && (
                      <View className="mt-3 pt-3 border-t border-gray-100 flex-row flex-wrap">
                        {sub.colors.map(({ color, qty }) => (
                          <View key={color} className="flex-row items-center mr-3 mb-1.5 bg-gray-50 px-2 py-1 rounded-lg border border-gray-100">
                            <View className="w-2.5 h-2.5 rounded-full mr-1.5" style={{ backgroundColor: resolveColorHex(color) }} />
                            <Text className="text-[10px] font-semibold text-gray-600">{color}: {qty}</Text>
                          </View>
                        ))}
                      </View>
                    )}
                  </Pressable>
                ))
              ) : (
                <View className="bg-white rounded-2xl p-6 items-center border border-gray-100 shadow-sm">
                  <Text className="text-sm text-gray-500">No subcategories with stock found.</Text>
                </View>
              )}
            </ScrollView>
          )}

          {selectedCategory && selectedSubCategory && (
            <View className="flex-1 py-2">
              <SubCategoryDetailProducts subCategoryId={selectedSubCategory.id} />
            </View>
          )}
        </View>
      </Modal>
    </ScrollView>
  );
}
