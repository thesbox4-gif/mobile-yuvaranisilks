import React, { useState, useEffect } from 'react';
import {
  View, Text, FlatList, Pressable, Modal, TextInput,
  ActivityIndicator, Alert, RefreshControl, Image, ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { getCategories, createCategory, updateCategory, deleteCategory } from '../../lib/api';
import { pickImageFromGallery, appendImageFile } from '../../lib/pickImage';
import { isCollectionRoot, PRODUCT_TYPE_MAP } from '../../constants/productTypes';
import EmptyState from '../../components/ui/EmptyState';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import ScreenHeader from '../../components/ui/ScreenHeader';
import { confirmDialog } from '../../lib/dialog';
import { useRefetchOnFocus } from '../../hooks/useRefetchOnFocus';
import * as Haptics from 'expo-haptics';

function CategoryModal({ visible, onClose, onSave, isSaving, parents, editing }) {
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [parentId, setParentId] = useState('');
  const [imageUri, setImageUri] = useState(null);
  const [existingImageUrl, setExistingImageUrl] = useState(null);

  useEffect(() => {
    if (visible) {
      if (editing) {
        setName(editing.name ?? '');
        setSlug(editing.slug ?? '');
        setParentId(editing.parent_id ?? '');
        setExistingImageUrl(editing.image_url ?? null);
        setImageUri(null);
      } else {
        setName('');
        setSlug('');
        setParentId('');
        setExistingImageUrl(null);
        setImageUri(null);
      }
    }
  }, [visible, editing]);

  const handlePickImage = async () => {
    const uri = await pickImageFromGallery();
    if (uri) setImageUri(uri);
  };

  const showPhotoPicker = editing ? !isCollectionRoot(editing) : Boolean(parentId);

  const handleSave = () => {
    if (!name.trim()) {
      Alert.alert('Required', 'Category name is required.');
      return;
    }
    onSave({
      id: editing?.id,
      name: name.trim(),
      slug: slug.trim() || name.trim().toLowerCase().replace(/\s+/g, '-'),
      parent_id: parentId || undefined,
      imageUri: showPhotoPicker ? imageUri : undefined,
      skipImage: !showPhotoPicker,
    });
  };

  const previewUri = imageUri || existingImageUrl;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable className="flex-1 bg-black/40" onPress={onClose}>
        <Pressable className="absolute bottom-0 left-0 right-0 bg-white rounded-t-3xl px-5 pt-5 pb-8">
          <Text className="text-lg font-bold text-gray-900 mb-5">
            {editing ? 'Edit Category' : 'New Category'}
          </Text>

          {showPhotoPicker ? (
            <Pressable
              onPress={handlePickImage}
              className="mb-5 rounded-2xl overflow-hidden border border-gray-200"
              style={{ aspectRatio: 4 / 3, backgroundColor: '#f9fafb' }}
            >
              {previewUri ? (
                <Image source={{ uri: previewUri }} className="w-full h-full" resizeMode="cover" />
              ) : (
                <View className="flex-1 items-center justify-center">
                  <Ionicons name="camera-outline" size={32} color="#9ca3af" />
                  <Text className="text-sm text-gray-500 mt-2">Add sub-category photo</Text>
                </View>
              )}
              <View className="absolute bottom-2 right-2 flex-row items-center px-2.5 py-1 rounded-full" style={{ backgroundColor: 'rgba(0,0,0,0.55)' }}>
                <Ionicons name="camera" size={14} color="#fff" />
                <Text className="text-[10px] text-white font-semibold ml-1">
                  {previewUri ? 'Change' : 'Add photo'}
                </Text>
              </View>
            </Pressable>
          ) : null}

          <View className="mb-4">
            <Text className="text-sm font-medium text-gray-700 mb-1.5">Name *</Text>
            <TextInput
              className="border border-gray-200 rounded-xl px-4 py-3.5 text-base text-gray-900 bg-gray-50"
              placeholder="e.g. Silk Sarees"
              placeholderTextColor="#9ca3af"
              value={name}
              onChangeText={(t) => {
                setName(t);
                setSlug(t.toLowerCase().replace(/\s+/g, '-'));
              }}
              autoFocus
            />
          </View>

          <View className="mb-4">
            <Text className="text-sm font-medium text-gray-700 mb-1.5">Parent Category</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} className="-mx-1">
              <Pressable
                onPress={() => setParentId('')}
                className={`mx-1 px-3 py-2 rounded-full border ${
                  parentId === '' ? 'bg-amber-500 border-amber-500' : 'bg-white border-gray-200'
                }`}
              >
                <Text className={`text-xs font-semibold ${parentId === '' ? 'text-white' : 'text-gray-600'}`}>
                  Top-level
                </Text>
              </Pressable>
              {parents.map((p) => (
                <Pressable
                  key={p.id}
                  onPress={() => setParentId(p.id)}
                  className={`mx-1 px-3 py-2 rounded-full border ${
                    parentId === p.id ? 'bg-amber-500 border-amber-500' : 'bg-white border-gray-200'
                  }`}
                >
                  <Text className={`text-xs font-semibold ${parentId === p.id ? 'text-white' : 'text-gray-600'}`}>
                    {p.name}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>

          <View className="mb-6">
            <Text className="text-sm font-medium text-gray-700 mb-1.5">Slug</Text>
            <TextInput
              className="border border-gray-200 rounded-xl px-4 py-3.5 text-base text-gray-900 bg-gray-50 font-mono"
              placeholder="silk-sarees"
              placeholderTextColor="#9ca3af"
              value={slug}
              onChangeText={setSlug}
              autoCapitalize="none"
            />
          </View>

          <View className="flex-row gap-3">
            <Pressable onPress={onClose} className="flex-1 border border-gray-200 rounded-xl py-3.5 items-center active:bg-gray-50">
              <Text className="text-gray-600 font-medium">Cancel</Text>
            </Pressable>
            <Pressable
              onPress={handleSave}
              disabled={isSaving}
              className="flex-1 bg-amber-500 rounded-xl py-3.5 items-center active:bg-amber-600"
            >
              {isSaving ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text className="text-white font-semibold">{editing ? 'Save' : 'Create'}</Text>
              )}
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

export default function CategoriesScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [uploadingId, setUploadingId] = useState(null);

  const { data: categories, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['categories'],
    queryFn: getCategories,
    staleTime: 120_000,
  });

  useRefetchOnFocus(['categories']);

  const all = categories ?? [];
  const topLevel = all.filter((c) => !c.parent_id);
  const childrenOf = (id) => all.filter((c) => c.parent_id === id);

  const saveMutation = useMutation({
    mutationFn: async (payload) => {
      const fd = new FormData();
      fd.append('name', payload.name);
      fd.append('slug', payload.slug);
      if (payload.parent_id) fd.append('parent_id', payload.parent_id);
      if (payload.imageUri && !payload.skipImage) await appendImageFile(fd, payload.imageUri);
      if (payload.id) return updateCategory(payload.id, fd);
      return createCategory(fd);
    },
    onSuccess: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      qc.invalidateQueries({ queryKey: ['categories'] });
      setShowModal(false);
      setEditingCategory(null);
    },
    onError: (err) => Alert.alert('Error', err.message),
  });

  const quickPhotoMutation = useMutation({
    mutationFn: async ({ id, uri }) => {
      const fd = new FormData();
      await appendImageFile(fd, uri);
      return updateCategory(id, fd);
    },
    onSuccess: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      qc.invalidateQueries({ queryKey: ['categories'] });
    },
    onError: (err) => Alert.alert('Error', err.message),
  });

  const handleQuickPhoto = async (cat) => {
    if (isCollectionRoot(cat)) return;
    const uri = await pickImageFromGallery();
    if (!uri) return;
    setUploadingId(cat.id);
    try {
      await quickPhotoMutation.mutateAsync({ id: cat.id, uri });
    } finally {
      setUploadingId(null);
    }
  };

  const openEdit = (cat) => {
    setEditingCategory(cat);
    setShowModal(true);
  };

  const openNew = () => {
    setEditingCategory(null);
    setShowModal(true);
  };

  const deleteMutation = useMutation({
    mutationFn: deleteCategory,
    onSuccess: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      qc.invalidateQueries({ queryKey: ['categories'] });
    },
    onError: (err) => Alert.alert('Error', err.message),
  });

  const confirmDelete = (cat) => {
    const kids = childrenOf(cat.id);
    const msg = kids.length
      ? `Delete "${cat.name}" and its ${kids.length} sub-categor${kids.length === 1 ? 'y' : 'ies'}?`
      : `Delete "${cat.name}"? Products in this category will not be deleted.`;
    confirmDialog({
      title: 'Delete Category',
      message: msg,
      confirmText: 'Delete',
      destructive: true,
      onConfirm: () => deleteMutation.mutate(cat.id),
    });
  };

  if (isLoading) return <LoadingSpinner />;

  return (
    <View className="flex-1 bg-gray-50">
      <ScreenHeader
        title="Categories"
        navigation={navigation}
        rightElement={
          <Pressable
            onPress={openNew}
            className="w-9 h-9 bg-amber-500 rounded-full items-center justify-center active:bg-amber-600"
          >
            <Ionicons name="add" size={20} color="#ffffff" />
          </Pressable>
        }
      />

      <FlatList
        data={topLevel}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 16 }}
        renderItem={({ item }) => {
          const kids = childrenOf(item.id);
          const rootTypeCard = PRODUCT_TYPE_MAP[item.slug];
          const fixedRoot = isCollectionRoot(item) && rootTypeCard;
          return (
            <View className="bg-white rounded-2xl shadow-sm mb-3 overflow-hidden">
              {/* Parent */}
              <View className="flex-row items-center">
                {fixedRoot ? (
                  <View className="w-16 h-16 overflow-hidden bg-gray-100">
                    <Image source={rootTypeCard.image} className="w-full h-full" resizeMode="cover" />
                  </View>
                ) : (
                  <Pressable
                    onPress={() => handleQuickPhoto(item)}
                    disabled={uploadingId === item.id}
                    className="w-16 h-16 bg-gray-100"
                  >
                    {item.image_url ? (
                      <Image source={{ uri: item.image_url }} className="w-full h-full" resizeMode="cover" />
                    ) : (
                      <View className="flex-1 items-center justify-center">
                        <Ionicons name="camera-outline" size={22} color="#9ca3af" />
                      </View>
                    )}
                    {uploadingId === item.id && (
                      <View className="absolute inset-0 items-center justify-center bg-black/30">
                        <ActivityIndicator color="#fff" size="small" />
                      </View>
                    )}
                  </Pressable>
                )}
                <Pressable onPress={() => openEdit(item)} className="flex-1 px-4 py-3">
                  <Text className="text-sm font-semibold text-gray-900">{item.name}</Text>
                  <Text className="text-xs text-gray-400 font-mono mt-0.5">/{item.slug}</Text>
                </Pressable>
                <Pressable
                  onPress={() => openEdit(item)}
                  className="w-10 h-16 items-center justify-center active:bg-amber-50"
                >
                  <Ionicons name="create-outline" size={18} color="#f59e0b" />
                </Pressable>
                <Pressable
                  onPress={() => confirmDelete(item)}
                  disabled={deleteMutation.isPending}
                  className="w-12 h-16 items-center justify-center active:bg-red-50"
                >
                  <Ionicons name="trash-outline" size={18} color="#ef4444" />
                </Pressable>
              </View>

              {/* Sub-categories */}
              {kids.length > 0 && (
                <View className="border-t border-gray-50 px-4 py-2">
                  {kids.map((kid) => (
                    <View key={kid.id} className="flex-row items-center py-2">
                      <Pressable
                        onPress={() => handleQuickPhoto(kid)}
                        disabled={uploadingId === kid.id}
                        className="w-10 h-10 rounded-lg overflow-hidden bg-gray-100 mr-2"
                      >
                        {kid.image_url ? (
                          <Image source={{ uri: kid.image_url }} className="w-full h-full" resizeMode="cover" />
                        ) : (
                          <View className="flex-1 items-center justify-center">
                            <Ionicons name="camera-outline" size={16} color="#9ca3af" />
                          </View>
                        )}
                      </Pressable>
                      <Pressable onPress={() => openEdit(kid)} className="flex-1">
                        <Text className="text-sm text-gray-700">{kid.name}</Text>
                      </Pressable>
                      <Pressable
                        onPress={() => openEdit(kid)}
                        className="p-1.5 active:bg-amber-50 rounded"
                      >
                        <Ionicons name="create-outline" size={15} color="#f59e0b" />
                      </Pressable>
                      <Pressable
                        onPress={() => confirmDelete(kid)}
                        disabled={deleteMutation.isPending}
                        className="p-1.5 active:bg-red-50 rounded"
                      >
                        <Ionicons name="trash-outline" size={15} color="#ef4444" />
                      </Pressable>
                    </View>
                  ))}
                </View>
              )}
            </View>
          );
        }}
        ListEmptyComponent={
          <EmptyState
            icon="folder-outline"
            title="No categories yet"
            message="Create categories to organize your products"
            action="Add Category"
            onAction={openNew}
          />
        }
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor="#f59e0b" colors={['#f59e0b']} />
        }
      />

      <CategoryModal
        visible={showModal}
        onClose={() => {
          setShowModal(false);
          setEditingCategory(null);
        }}
        onSave={(payload) => saveMutation.mutate(payload)}
        isSaving={saveMutation.isPending}
        parents={topLevel}
        editing={editingCategory}
      />
    </View>
  );
}
