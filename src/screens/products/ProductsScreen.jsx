import React, { useState, useCallback, useEffect, useMemo } from 'react';
import {
  View, Text, Pressable, FlatList, ActivityIndicator, RefreshControl, ScrollView, TextInput, Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useInfiniteQuery, useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import useAuthStore from '../../store/authStore';
import { getProducts, getCategories, getInventory, updateCategory } from '../../lib/api';
import ProductCard from '../../components/products/ProductCard';
import CollectionCategoryCard from '../../components/categories/CollectionCategoryCard';
import { pickImageFromGallery, appendImageFile } from '../../lib/pickImage';
import { useRefetchOnFocus } from '../../hooks/useRefetchOnFocus';
import { prefetchProduct } from '../../lib/queryClient';
import { PRODUCT_TYPE_CARDS } from '../../constants/productTypes';
import { useHardwareBackHandler, navigateToDashboard } from '../../hooks/useHardwareBackHandler';
import { alertDialog } from '../../lib/dialog';


const WARM_BG = '#fffaf5';
const CARD_BG = '#ffffff';
const SECTION_BORDER = '#fde8d0';
const AMBER_500 = '#f59e0b';

const TYPE_CARDS = PRODUCT_TYPE_CARDS.map((t) => ({
  ...t,
  iconColor: t.accentColor,
}));

function Divider() {
  return (
    <View className="flex-row items-center my-4 mx-6">
      <View className="flex-1 h-px" style={{ backgroundColor: '#f9d7b0' }} />
      <Text className="mx-3" style={{ color: '#d4a017', fontSize: 8 }}>✦</Text>
      <View className="flex-1 h-px" style={{ backgroundColor: '#f9d7b0' }} />
    </View>
  );
}

export default function ProductsScreen({ navigation, route }) {
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const viewMode = useAuthStore((s) => s.viewMode);

  const role = viewMode === 'user' ? 'customer' : (user?.role || 'customer');
  const canAdd = role === 'admin' || role === 'employee';

  const [selectedType, setSelectedType] = useState(route?.params?.initialType ?? null);
  const [selectedCategory, setSelectedCategory] = useState(null);

  // Dashboard "Stock by Category" deep-links here with a pre-selected type.
  useEffect(() => {
    const t = route?.params?.initialType;
    if (t) {
      setSelectedType(t);
      setSelectedCategory(null);
    }
  }, [route?.params?.initialType]);

  // Collections tab press → back to type cards (Sarees / Gold, etc.)
  useEffect(() => {
    if (route.params?.resetRoot == null) return;
    setSelectedType(route.params?.initialType ?? null);
    setSelectedCategory(null);
    setSearchOpen(false);
    setSearchText('');
    navigation.setParams({ resetRoot: undefined });
  }, [route.params?.resetRoot, route.params?.initialType, navigation]);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [uploadingCategoryId, setUploadingCategoryId] = useState(null);

  const uploadCategoryImageMutation = useMutation({
    mutationFn: async ({ categoryId, uri }) => {
      const fd = new FormData();
      await appendImageFile(fd, uri);
      return updateCategory(categoryId, fd);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['categories'] }),
  });

  const handleCategoryPhoto = async (category) => {
    if (!category?.id || !canAdd) return;
    const uri = await pickImageFromGallery();
    if (!uri) return;
    setUploadingCategoryId(category.id);
    try {
      await uploadCategoryImageMutation.mutateAsync({ categoryId: category.id, uri });
    } catch (err) {
      alertDialog('Upload failed', err?.message ?? 'Could not save photo');
    } finally {
      setUploadingCategoryId(null);
    }
  };

  // All categories — type roots + their sub-categories — fetched live.
  const { data: categories = [], isLoading: catLoading } = useQuery({
    queryKey: ['categories'],
    queryFn: getCategories,
    staleTime: 120_000,
  });

  const { data: inventoryData = [], isLoading: invLoading } = useQuery({
    queryKey: ['inventory', selectedType],
    queryFn: () => getInventory({ type: selectedType }),
    enabled: !!selectedType && canAdd,
    staleTime: 60_000,
  });

  const roots = categories.filter((c) => !c.parent_id);
  const rootFor = (type) => roots.find((r) => r.slug === type);
  const childrenOf = (type) => {
    const root = rootFor(type);
    return root ? categories.filter((c) => c.parent_id === root.id) : [];
  };
  const subCats = selectedType ? childrenOf(selectedType) : [];

  const categoryStats = useMemo(() => {
    if (!Array.isArray(inventoryData)) return {};
    const map = {};
    for (const row of inventoryData) {
      const qty = Number(row?.quantity ?? 0);
      if (qty <= 0) continue;
      const product = row?.product ?? {};
      const cat = product?.category ?? {};
      if (!cat.id) continue;
      if (!map[cat.id]) {
        map[cat.id] = {
          id: cat.id,
          name: cat.name ?? 'Category',
          totalStock: 0,
          productIds: new Set(),
          colorTotals: {},
        };
      }
      const bucket = map[cat.id];
      bucket.totalStock += qty;
      if (product.id) bucket.productIds.add(product.id);
      const color = row?.color?.toString().trim();
      if (color) {
        bucket.colorTotals[color] = (bucket.colorTotals[color] ?? 0) + qty;
      }
    }
    const normalized = {};
    Object.values(map).forEach((b) => {
      normalized[b.id] = {
        id: b.id,
        name: b.name,
        totalStock: b.totalStock,
        productCount: b.productIds.size,
        colors: Object.entries(b.colorTotals).sort((a, d) => d[1] - a[1]),
      };
    });
    return normalized;
  }, [inventoryData]);

  const categoryStockReady = canAdd && !invLoading;
  const visibleSubCats = categoryStockReady
    ? subCats.filter((cat) => (categoryStats[cat.id]?.totalStock ?? 0) > 0)
    : subCats;

  const query = searchText.trim();
  const isSearching = searchOpen && query.length > 0;

  const closeSearch = () => {
    setSearchOpen(false);
    setSearchText('');
  };

  const handleBack = () => {
    if (selectedCategory) setSelectedCategory(null);
    else if (selectedType) setSelectedType(null);
  };

  useHardwareBackHandler(useCallback(() => {
    if (searchOpen) {
      closeSearch();
      return true;
    }
    if (selectedCategory) {
      setSelectedCategory(null);
      return true;
    }
    if (selectedType) {
      setSelectedType(null);
      return true;
    }
    navigateToDashboard(navigation);
    return true;
  }, [searchOpen, selectedCategory, selectedType, navigation]));

  // ─── Level 3 product list ────────────────────────────────────────
  const {
    data, fetchNextPage, hasNextPage, isFetchingNextPage,
    isLoading, refetch, isRefetching, isError, error,
  } = useInfiniteQuery({
    queryKey: ['products', selectedType, selectedCategory],
    queryFn: ({ pageParam = 1 }) =>
      getProducts({
        page: pageParam, limit: 20,
        type: selectedType,
        ...(selectedCategory ? { category: selectedCategory } : {}),
      }),
    getNextPageParam: (lastPage) =>
      lastPage.page < lastPage.totalPages ? lastPage.page + 1 : undefined,
    staleTime: 30_000,
    enabled: !!selectedType && !!selectedCategory && !isSearching,
  });

  // ─── Search results ──────────────────────────────────────────────
  const { data: searchData, isLoading: searchLoading } = useQuery({
    queryKey: ['product-search', query],
    queryFn: () => getProducts({ search: query, limit: 50 }),
    enabled: isSearching,
    staleTime: 30_000,
  });

  useRefetchOnFocus(['products'], ['categories'], ['inventory']);

  const products = data?.pages.flatMap((p) => p.data) ?? [];
  const searchResults = searchData?.data ?? [];

  const renderProductItem = useCallback(({ item }) => (
    <View className="flex-1 p-1.5 max-w-[50%]">
      <ProductCard
        product={item}
        onPress={() => {
          prefetchProduct(item.id);
          navigation.navigate('ProductDetail', { productId: item.id });
        }}
        showStock={canAdd}
      />
    </View>
  ), [navigation, canAdd]);

  const currentTypeCard = TYPE_CARDS.find((t) => t.key === selectedType);
  const categoryName = subCats.find((c) => c.id === selectedCategory)?.name || '';

  // ─── Search results view ─────────────────────────────────────────
  const renderSearchResults = () => (
    <FlatList
      data={searchLoading ? [] : searchResults}
      renderItem={renderProductItem}
      keyExtractor={(item) => item.id}
      numColumns={2}
      contentContainerStyle={{ padding: 6, paddingBottom: insets.bottom + 16, flexGrow: 1 }}
      columnWrapperStyle={searchResults.length > 0 ? { justifyContent: 'space-between' } : undefined}
      ListHeaderComponent={searchLoading ? (
        <View className="py-12 items-center">
          <ActivityIndicator size="large" color={AMBER_500} />
        </View>
      ) : null}
      ListEmptyComponent={!searchLoading ? (
        <View className="flex-1 items-center justify-center py-16 px-8">
          <Ionicons name="search-outline" size={32} color={AMBER_500} />
          <Text className="text-base font-semibold mt-3 text-center" style={{ color: '#78350f' }}>
            No products match “{query}”
          </Text>
        </View>
      ) : null}
      showsVerticalScrollIndicator={false}
    />
  );

  // ─── Level 1: type selection ─────────────────────────────────────
  const renderTypeSelection = () => (
    <View
      className="flex-1 px-4"
      style={{ paddingBottom: insets.bottom + 12 }}
    >
      <Text className="text-center text-xs py-2" style={{ color: '#a16207' }}>
        Browse our handpicked collections
      </Text>
      <View className="flex-1 justify-center" style={{ gap: 10, paddingBottom: 8 }}>
        {TYPE_CARDS.map((tc) => {
          const count = childrenOf(tc.key).length;
          return (
            <CollectionCategoryCard
              key={tc.key}
              compact
              useFixedImage
              title={tc.label}
              fallbackSource={tc.image}
              fallbackIcon={tc.icon}
              fallbackIconColor={tc.iconColor}
              stats={{ subtitle: `${count} categories` }}
              onPress={() => setSelectedType(tc.key)}
            />
          );
        })}
      </View>
      <Text className="text-center text-[10px] pb-1" style={{ color: '#b45309' }}>
        Finest Indian textiles & jewellery
      </Text>
    </View>
  );

  // ─── Level 2: category selection ─────────────────────────────────
  const renderCategorySelection = () => (
    <ScrollView className="flex-1" contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 80 }} showsVerticalScrollIndicator={false}>
      <Text className="text-center text-sm mb-1" style={{ color: '#a16207' }}>Choose a category</Text>
      <Divider />

      {catLoading ? (
        <View className="py-12 items-center">
          <ActivityIndicator size="large" color={AMBER_500} />
        </View>
      ) : (
        <View className="flex-row flex-wrap justify-between px-1">
          {visibleSubCats.map((cat) => {
            const stats = categoryStats[cat.id];
            return (
              <CollectionCategoryCard
                key={cat.id}
                title={cat.name}
                imageUrl={cat.image_url}
                fallbackIcon={currentTypeCard?.icon || 'layers'}
                fallbackIconColor={currentTypeCard?.iconColor || '#d97706'}
                stats={stats}
                typeLabel={typeLabel}
                stockReady={categoryStockReady}
                onPress={() => setSelectedCategory(cat.id)}
                canAddImage={canAdd}
                onAddImage={() => handleCategoryPhoto(cat)}
                uploading={uploadingCategoryId === cat.id}
              />
            );
          })}
        </View>
      )}

      {!catLoading && subCats.length === 0 && (
        <View className="items-center py-12">
          <View className="w-14 h-14 rounded-full items-center justify-center mb-3" style={{ backgroundColor: '#fef3c7' }}>
            <Ionicons name="folder-open-outline" size={28} color="#d97706" />
          </View>
          <Text className="text-sm font-semibold" style={{ color: '#78350f' }}>No categories yet</Text>
          <Text className="text-xs mt-1 text-center px-8" style={{ color: '#a16207' }}>
            {canAdd ? 'Add categories from the Categories screen.' : 'Categories will appear soon.'}
          </Text>
        </View>
      )}

      {categoryStockReady && subCats.length > 0 && visibleSubCats.length === 0 && (
        <View className="items-center py-12">
          <View className="w-14 h-14 rounded-full items-center justify-center mb-3" style={{ backgroundColor: '#fef3c7' }}>
            <Ionicons name="cube-outline" size={28} color="#d97706" />
          </View>
          <Text className="text-sm font-semibold" style={{ color: '#78350f' }}>No stock available</Text>
          <Text className="text-xs mt-1 text-center px-8" style={{ color: '#a16207' }}>
            All categories are currently out of stock.
          </Text>
        </View>
      )}
    </ScrollView>
  );

  // ─── Level 3: product grid ───────────────────────────────────────
  const renderProductGrid = () => (
    <>
      {isError && !isLoading && (
        <View className="px-4 py-3 mx-4 mt-3 rounded-xl" style={{ backgroundColor: '#fef2f2' }}>
          <Text className="text-sm" style={{ color: '#b91c1c' }}>{error?.message ?? 'Failed to load'}</Text>
          <Pressable onPress={() => refetch()} className="mt-2">
            <Text className="text-sm font-semibold" style={{ color: '#dc2626' }}>Tap to retry</Text>
          </Pressable>
        </View>
      )}
      <FlatList
        data={isLoading ? [] : products}
        renderItem={renderProductItem}
        keyExtractor={(item) => item.id}
        numColumns={2}
        contentContainerStyle={{ padding: 6, paddingBottom: insets.bottom + 16, flexGrow: 1 }}
        columnWrapperStyle={products.length > 0 ? { justifyContent: 'space-between' } : undefined}
        onEndReached={() => hasNextPage && fetchNextPage()}
        onEndReachedThreshold={0.4}
        ListHeaderComponent={isLoading ? (
          <View className="py-12 items-center">
            <ActivityIndicator size="large" color={AMBER_500} />
            <Text className="text-sm mt-3" style={{ color: '#a16207' }}>Loading products...</Text>
          </View>
        ) : null}
        ListFooterComponent={isFetchingNextPage ? (
          <View className="py-4 items-center"><ActivityIndicator color={AMBER_500} /></View>
        ) : null}
        ListEmptyComponent={!isLoading ? (
          <View className="flex-1 items-center justify-center py-16 px-8">
            <View className="w-16 h-16 rounded-full items-center justify-center mb-4" style={{ backgroundColor: '#fef3c7' }}>
              <Ionicons name="cube-outline" size={32} color={AMBER_500} />
            </View>
            <Text className="text-base font-semibold text-center" style={{ color: '#78350f' }}>No {categoryName} yet</Text>
            <Text className="text-xs mt-2 text-center" style={{ color: '#a16207' }}>
              {canAdd ? 'Tap + to add a product here.' : 'Check back soon for new arrivals.'}
            </Text>
          </View>
        ) : null}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={AMBER_500} colors={[AMBER_500]} />
        }
        showsVerticalScrollIndicator={false}
      />
    </>
  );

  const level = selectedCategory ? 3 : selectedType ? 2 : 1;
  const headerTitle = level === 1 ? 'Collections' : level === 2 ? (currentTypeCard?.label || 'Category') : categoryName;
  const categoryCount = categoryStockReady ? visibleSubCats.length : subCats.length;
  const typeLabel =
    selectedType === 'saree'
      ? 'sarees'
      : selectedType === 'jewellery'
        ? 'jewellery items'
        : 'items';

  return (
    <View className="flex-1" style={{ backgroundColor: WARM_BG, paddingTop: insets.top }}>
      {/* Header */}
      <View className="px-4 pt-3 pb-3" style={{ backgroundColor: CARD_BG, borderBottomWidth: 1, borderBottomColor: SECTION_BORDER }}>
        {searchOpen ? (
          <View className="flex-row items-center">
            <View className="flex-1 flex-row items-center rounded-xl px-3 py-2" style={{ backgroundColor: '#fef7f0', borderWidth: 1, borderColor: SECTION_BORDER }}>
              <Ionicons name="search" size={18} color="#92400e" />
              <TextInput
                className="flex-1 ml-2 text-base"
                style={{ color: '#1f2937' }}
                placeholder="Search all products…"
                placeholderTextColor="#a16207"
                value={searchText}
                onChangeText={setSearchText}
                autoFocus
              />
              {searchText.length > 0 && (
                <Pressable onPress={() => setSearchText('')}>
                  <Ionicons name="close-circle" size={18} color="#a16207" />
                </Pressable>
              )}
            </View>
            <Pressable onPress={closeSearch} className="ml-2 px-2 py-1">
              <Text className="text-sm font-semibold" style={{ color: '#b91c1c' }}>Cancel</Text>
            </Pressable>
          </View>
        ) : (
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center flex-1">
              {level > 1 && (
                <Pressable onPress={handleBack} className="w-9 h-9 rounded-full items-center justify-center mr-2" style={{ backgroundColor: '#fef2f2' }}>
                  <Ionicons name="arrow-back" size={20} color="#b91c1c" />
                </Pressable>
              )}
              <View className="flex-1">
                <Text className="text-xl font-bold" style={{ color: '#78350f' }}>{headerTitle}</Text>
        {level > 1 && (
          <Text className="text-xs" style={{ color: '#a16207' }}>
            {level === 2 ? `${categoryCount} categories` : `${products.length} products`}
          </Text>
        )}
              </View>
            </View>
            <View className="flex-row items-center">
              <Pressable
                onPress={() => setSearchOpen(true)}
                className="w-9 h-9 rounded-full items-center justify-center"
                style={{ backgroundColor: '#fef7f0' }}
              >
                <Ionicons name="search" size={18} color="#92400e" />
              </Pressable>
              {canAdd && level === 3 && (
                <Pressable
                  onPress={() => navigation.navigate('ProductWizard', { mode: 'create', type: selectedType })}
                  className="w-9 h-9 rounded-full items-center justify-center ml-2"
                  style={{ backgroundColor: AMBER_500 }}
                >
                  <Ionicons name="add" size={20} color="#ffffff" />
                </Pressable>
              )}
            </View>
          </View>
        )}
      </View>

      {/* Content */}
      {searchOpen && query.length === 0 ? (
        <View className="flex-1 items-center justify-center px-8">
          <Ionicons name="search-outline" size={36} color="#d4a017" />
          <Text className="text-sm mt-3 text-center" style={{ color: '#a16207' }}>
            Type a product name to search the whole catalogue.
          </Text>
        </View>
      ) : isSearching ? (
        renderSearchResults()
      ) : (
        <>
          {level === 1 && renderTypeSelection()}
          {level === 2 && renderCategorySelection()}
          {level === 3 && renderProductGrid()}
        </>
      )}
    </View>
  );
}
