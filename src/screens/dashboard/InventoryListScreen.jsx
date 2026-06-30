import React, { useCallback, useMemo } from 'react';
import { View, Text, Pressable, FlatList, ActivityIndicator, RefreshControl } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import ScreenHeader from '../../components/ui/ScreenHeader';
import ProductCard from '../../components/products/ProductCard';
import { getProducts, getInventory } from '../../lib/api';
import { resolveColorHex } from '../../lib/colors';
import { useRefetchOnFocus } from '../../hooks/useRefetchOnFocus';
import { prefetchProduct } from '../../lib/queryClient';
import { useHardwareBackHandler } from '../../hooks/useHardwareBackHandler';

const FILTER_META = {
  products: { title: 'All Products', subtitle: 'Published catalogue' },
  low_stock: { title: 'Low Stock', subtitle: '1–4 units left per variant' },
  out_of_stock: { title: 'Out of Stock', subtitle: 'Variants with zero stock' },
};

function VariantRow({ row, onPress, warn }) {
  const product = row.product ?? {};
  return (
    <Pressable
      onPress={onPress}
      className="bg-white rounded-2xl p-4 mb-3 mx-4 border border-gray-100 shadow-sm active:bg-gray-50"
    >
      <Text className="text-sm font-semibold text-gray-900">{product.title || 'Product'}</Text>
      <Text className="text-xs text-gray-500 mt-0.5">{product.category?.name || 'Category'}</Text>
      <View className="flex-row items-center justify-between mt-3 pt-3 border-t border-gray-100">
        <View className="flex-row items-center flex-1 mr-2">
          {row.color ? (
            <View
              className="w-3 h-3 rounded-full mr-2"
              style={{ backgroundColor: resolveColorHex(row.color) }}
            />
          ) : null}
          <Text className="text-xs text-gray-700 font-medium">
            {[row.color, row.size].filter(Boolean).join(' · ') || 'Default'}
          </Text>
        </View>
        <Text className={`text-xs font-bold ${warn ? 'text-amber-600' : 'text-red-600'}`}>
          {row.quantity} left
        </Text>
      </View>
    </Pressable>
  );
}

export default function InventoryListScreen({ navigation, route }) {
  const insets = useSafeAreaInsets();
  const filter = route.params?.filter ?? 'products';
  const meta = FILTER_META[filter] ?? FILTER_META.products;

  useHardwareBackHandler(useCallback(() => {
    navigation.goBack();
    return true;
  }, [navigation]));

  const openProduct = useCallback((productId) => {
    if (!productId) return;
    prefetchProduct(productId);
    navigation.getParent()?.navigate('CollectionsTab', {
      screen: 'ProductDetail',
      params: { productId },
    });
  }, [navigation]);

  const {
    data: productPages,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading: productsLoading,
    refetch: refetchProducts,
    isRefetching: productsRefetching,
  } = useInfiniteQuery({
    queryKey: ['inventory-products'],
    queryFn: ({ pageParam = 1 }) => getProducts({ page: pageParam, limit: 20 }),
    getNextPageParam: (lastPage) =>
      lastPage.page < lastPage.totalPages ? lastPage.page + 1 : undefined,
    enabled: filter === 'products',
    staleTime: 30_000,
  });

  const {
    data: inventory = [],
    isLoading: invLoading,
    refetch: refetchInv,
    isRefetching: invRefetching,
  } = useQuery({
    queryKey: ['inventory-all'],
    queryFn: () => getInventory(),
    enabled: filter !== 'products',
    staleTime: 30_000,
  });

  useRefetchOnFocus(
    filter === 'products' ? ['inventory-products'] : ['inventory-all'],
  );

  const variantRows = useMemo(() => {
    if (filter === 'products' || !Array.isArray(inventory)) return [];
    return inventory.filter((v) => {
      const qty = Number(v.quantity ?? 0);
      if (filter === 'low_stock') return qty > 0 && qty < 5;
      if (filter === 'out_of_stock') return qty <= 0;
      return false;
    });
  }, [inventory, filter]);

  const products = productPages?.pages.flatMap((p) => p.data) ?? [];
  const isLoading = filter === 'products' ? productsLoading : invLoading;
  const isRefetching = filter === 'products' ? productsRefetching : invRefetching;
  const onRefresh = filter === 'products' ? refetchProducts : refetchInv;

  const renderProductItem = useCallback(({ item }) => (
    <View className="flex-1 p-1.5 max-w-[50%]">
      <ProductCard
        product={item}
        onPress={() => openProduct(item.id)}
        showStock
      />
    </View>
  ), [openProduct]);

  const listData = filter === 'products' ? products : variantRows;
  const emptyIcon = filter === 'out_of_stock' ? 'checkmark-circle-outline' : 'cube-outline';
  const emptyText =
    filter === 'products'
      ? 'No published products yet.'
      : filter === 'low_stock'
        ? 'No low-stock variants right now.'
        : 'No out-of-stock variants.';

  return (
    <View className="flex-1 bg-amber-50/30">
      <ScreenHeader title={meta.title} subtitle={meta.subtitle} navigation={navigation} />

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#f59e0b" />
        </View>
      ) : (
        <FlatList
          data={listData}
          keyExtractor={(item, idx) =>
            filter === 'products' ? item.id : `${item.id ?? idx}-${item.color}-${item.size}`
          }
          renderItem={filter === 'products'
            ? renderProductItem
            : ({ item }) => (
              <VariantRow
                row={item}
                warn={filter === 'low_stock'}
                onPress={() => openProduct(item.product?.id)}
              />
            )}
          numColumns={filter === 'products' ? 2 : 1}
          columnWrapperStyle={filter === 'products' ? { justifyContent: 'space-between' } : undefined}
          contentContainerStyle={{
            paddingTop: 12,
            paddingBottom: insets.bottom + 24,
            flexGrow: 1,
          }}
          refreshControl={
            <RefreshControl refreshing={isRefetching} onRefresh={onRefresh} tintColor="#f59e0b" />
          }
          onEndReached={() => {
            if (filter === 'products' && hasNextPage && !isFetchingNextPage) fetchNextPage();
          }}
          onEndReachedThreshold={0.3}
          ListFooterComponent={
            filter === 'products' && isFetchingNextPage ? (
              <ActivityIndicator color="#f59e0b" style={{ marginVertical: 16 }} />
            ) : null
          }
          ListEmptyComponent={
            <View className="flex-1 items-center justify-center py-20 px-8">
              <Ionicons name={emptyIcon} size={40} color="#d1d5db" />
              <Text className="text-sm text-gray-500 mt-3 text-center">{emptyText}</Text>
            </View>
          }
          showsVerticalScrollIndicator={false}
        />
      )}

      {filter !== 'products' && variantRows.length > 0 && (
        <View className="px-4 py-2 bg-white border-t border-gray-100">
          <Text className="text-[11px] text-gray-500 text-center">
            {variantRows.length} variant{variantRows.length === 1 ? '' : 's'}
            {' · '}
            Tap row for product detail
          </Text>
        </View>
      )}
    </View>
  );
}
