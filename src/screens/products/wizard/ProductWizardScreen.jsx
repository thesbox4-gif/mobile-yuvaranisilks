import React, { useState, useCallback, useEffect } from 'react';
import {
  View, Text, TextInput, Pressable, ScrollView, Image, Alert,
  ActivityIndicator, Switch, Modal, Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';

import {
  createProduct, updateProduct, publishProduct,
  addProductImage, deleteProductImage, bulkUpdateVariants, uploadImage,
  generateContent, generateProductImage,
  getCategories, createCategory, getProduct,
} from '../../../lib/api';
import LoadingSpinner from '../../../components/ui/LoadingSpinner';
import { GOLD_PURITIES } from '../../../constants/categories';
import { PRODUCT_SIZES, PRODUCT_TYPES } from '../../../constants';
import TypeBadge from '../../../components/products/TypeBadge';
import { formatPrice, discountedPrice } from '../../../lib/utils';
import { useHardwareBackHandler } from '../../../hooks/useHardwareBackHandler';
import { resolveColorHex } from '../../../lib/colors';
import HeroPhotoPreviewModal from '../../../components/products/HeroPhotoPreviewModal';

const WARM_BG = '#fffaf5';
const CARD_BG = '#ffffff';
const SECTION_BORDER = '#fde8d0';
const ACCENT = '#b91c1c';
const AMBER_500 = '#f59e0b';

// Photo angles captured for EACH colour of a product.
const PHOTO_BLOCKS = {
  saree: [
    'Saree image',
    'Texture',
    'Border',
    'Pallu',
    'Blouse Piece',
    'Fabric Closeup',
    'Draping Style',
  ],
  jewellery: ['Full Piece', 'Front Detail', 'Stone Setting', 'Hallmark'],
};

const HERO_SLOT_BY_TYPE = {
  saree: 'Saree image',
};

function isHeroSlot(productType, label) {
  return HERO_SLOT_BY_TYPE[productType] === label;
}

// Preset palette — picking a swatch guarantees the colour name maps to the
// right shade (typing a free-text name can fall back to a neutral grey).
const COLOR_PALETTE = [
  { name: 'Red', hex: '#dc2626' },
  { name: 'Maroon', hex: '#7f1d1d' },
  { name: 'Pink', hex: '#ec4899' },
  { name: 'Rose', hex: '#e11d48' },
  { name: 'Orange', hex: '#f97316' },
  { name: 'Rust', hex: '#b45309' },
  { name: 'Mustard', hex: '#d4a017' },
  { name: 'Yellow', hex: '#eab308' },
  { name: 'Gold', hex: '#c79a2e' },
  { name: 'Cream', hex: '#efe2c4' },
  { name: 'Beige', hex: '#d4c5a9' },
  { name: 'Green', hex: '#16a34a' },
  { name: 'Olive', hex: '#65751f' },
  { name: 'Emerald', hex: '#047857' },
  { name: 'Teal', hex: '#0d9488' },
  { name: 'Turquoise', hex: '#06b6d4' },
  { name: 'Sky Blue', hex: '#38bdf8' },
  { name: 'Blue', hex: '#2563eb' },
  { name: 'Navy', hex: '#1e3a5f' },
  { name: 'Purple', hex: '#9333ea' },
  { name: 'Lavender', hex: '#a78bfa' },
  { name: 'Magenta', hex: '#c026d3' },
  { name: 'Peach', hex: '#f9a98a' },
  { name: 'Brown', hex: '#92400e' },
  { name: 'Grey', hex: '#9ca3af' },
  { name: 'Silver', hex: '#cbd5e1' },
  { name: 'Black', hex: '#1f2937' },
  { name: 'White', hex: '#f3f4f6' },
];

function colorHex(name) {
  return resolveColorHex(name);
}

function revokeBlobUri(uri) {
  if (Platform.OS === 'web' && uri?.startsWith('blob:')) {
    URL.revokeObjectURL(uri);
  }
}

function SectionCard({ icon, iconColor, title, subtitle, children }) {
  return (
    <View className="mx-4 mb-5 rounded-2xl overflow-hidden" style={{ backgroundColor: CARD_BG, borderWidth: 1, borderColor: SECTION_BORDER }}>
      <View className="flex-row items-center px-4 pt-4 pb-2">
        <View className="w-8 h-8 rounded-full items-center justify-center mr-3" style={{ backgroundColor: iconColor + '18' }}>
          <Ionicons name={icon} size={16} color={iconColor} />
        </View>
        <View className="flex-1">
          <Text className="text-base font-bold" style={{ color: '#78350f' }}>{title}</Text>
          {subtitle && <Text className="text-xs mt-0.5" style={{ color: '#a16207' }}>{subtitle}</Text>}
        </View>
      </View>
      <View className="px-4 pb-4 pt-2">{children}</View>
    </View>
  );
}

function Chip({ label, selected, onPress }) {
  return (
    <Pressable
      onPress={onPress}
      className="flex-row items-center px-3 py-2 rounded-full border mr-2 mb-2"
      style={{ backgroundColor: selected ? '#fef3c7' : '#ffffff', borderColor: selected ? '#f59e0b' : '#e5e7eb' }}
    >
      <Text className="text-xs font-semibold" style={{ color: selected ? '#92400e' : '#6b7280' }}>{label}</Text>
      {selected && <Ionicons name="checkmark-circle" size={14} color="#d97706" style={{ marginLeft: 4 }} />}
    </Pressable>
  );
}

function Divider() {
  return (
    <View className="flex-row items-center my-3 mx-4">
      <View className="flex-1 h-px" style={{ backgroundColor: '#f9d7b0' }} />
      <Text className="mx-3" style={{ color: '#d4a017', fontSize: 8 }}>✦</Text>
      <View className="flex-1 h-px" style={{ backgroundColor: '#f9d7b0' }} />
    </View>
  );
}

export default function ProductWizardScreen({ route, navigation }) {
  const { mode = 'create', type = 'saree', productId } = route.params ?? {};
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();

  const handleBack = useCallback(() => {
    const referrer = route.params?.referrer;
    if (navigation.canGoBack()) {
      navigation.goBack();
      if (referrer) {
        navigation.getParent()?.navigate(referrer);
      }
      return;
    }
    if (referrer) {
      navigation.getParent()?.navigate(referrer);
    }
  }, [navigation, route.params?.referrer]);

  useHardwareBackHandler(useCallback(() => {
    handleBack();
    return true;
  }, [handleBack]));

  const [wizardData, setWizardData] = useState({
    type,
    categoryId: '',
    categoryName: '',
    colors: [],          // ['Green', 'Blue', ...]
    images: [],          // [{ color, label, uri, uploadedUrl, generatedUrl, existing }]
    stock: {},           // saree: {color:n}  dress/jewellery: {color:{sub:n}}
    content: { title: '', description: '' },
    pricing: { basePrice: 0, discountPct: 0, couponCode: '', couponDiscount: 0, tags: '' },
  });

  const [isSaving, setIsSaving] = useState(false);
  const [uploading, setUploading] = useState(null); // `${color}::${label}`
  const [aiColor, setAiColor] = useState(null);     // colour currently AI-processing
  const [aiSlot, setAiSlot] = useState(null);       // `${color}::${label}` slot AI-processing
  const [pickerSlot, setPickerSlot] = useState(null); // { color, label } for the picker sheet
  const [confirmDialog, setConfirmDialog] = useState(null); // { title, message, actions, dismissible }
  const [isGeneratingContent, setIsGeneratingContent] = useState(false);
  const [showNewCategory, setShowNewCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [creatingCategory, setCreatingCategory] = useState(false);
  const [categorySearch, setCategorySearch] = useState('');
  const [hasCoupon, setHasCoupon] = useState(false);
  const [tagInput, setTagInput] = useState('');
  const [newColorName, setNewColorName] = useState('');
  const [editLoaded, setEditLoaded] = useState(false);
  const [viewerImage, setViewerImage] = useState(null); // fullscreen AI image preview
  const [photoPreview, setPhotoPreview] = useState(null); // hero slot optional crop (web)

  // Product-wide variant options
  const [selectedSizes, setSelectedSizes] = useState([]);
  const [selectedWeights, setSelectedWeights] = useState([]);
  const [newWeightName, setNewWeightName] = useState('');
  const [newPurityName, setNewPurityName] = useState('');
  const [goldPurity, setGoldPurity] = useState('22K');

  const update = useCallback((partial) => setWizardData((prev) => ({ ...prev, ...partial })), []);

  const openConfirm = (title, message, actions, dismissible = true) => {
    if (Platform.OS !== 'web') {
      Alert.alert(
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

  const t = wizardData.type;
  const photoBlocks = PHOTO_BLOCKS[t] || PHOTO_BLOCKS.saree;

  // Jewellery products are colour-less in the storefront — the wizard still
  // needs a grouping key for photo slots, so seed a single pseudo "Jewellery"
  // entry into `colors`. Render code below hides the colour UI for this type.
  const JEWELLERY_PSEUDO_COLOR = 'Jewellery';
  useEffect(() => {
    if (t !== 'jewellery') return;
    if (wizardData.colors.length === 0) {
      update({ colors: [JEWELLERY_PSEUDO_COLOR] });
    }
  }, [t, wizardData.colors.length, update]);

  const { data: editProduct, isLoading: isLoadingEdit } = useQuery({
    queryKey: ['product', productId],
    queryFn: () => getProduct(productId),
    enabled: mode === 'edit' && !!productId,
  });

  useEffect(() => {
    if (mode !== 'edit' || !editProduct || editLoaded) return;

    const editType = editProduct.type || type;
    const imageBlocks = PHOTO_BLOCKS[editType] || PHOTO_BLOCKS.saree;
    const variants = editProduct.variants ?? [];
    const images = editProduct.images ?? [];

    const colorSet = new Set([
      ...variants.map((v) => v.color).filter(Boolean),
      ...images.map((i) => i.color).filter(Boolean),
    ]);
    let colors = [...colorSet];
    // Jewellery products are colour-less but the wizard needs a grouping key
    // for photo slots — fall back to the pseudo "Jewellery" entry.
    if (editType === 'jewellery' && colors.length === 0) {
      colors = ['Jewellery'];
    }

    const stock = {};
    if (editType === 'saree') {
      for (const v of variants) {
        if (!v.color) continue;
        stock[v.color] = (stock[v.color] || 0) + (Number(v.quantity) || 0);
      }
      setSelectedSizes([]);
      setSelectedWeights([]);
    } else if (editType === 'jewellery') {
      // Jewellery — keyed by weight only (no colour dimension).
      for (const v of variants) {
        if (!v.size) continue;
        stock[v.size] = Number(v.quantity) || 0;
      }
      const sizes = [...new Set(variants.map((v) => v.size).filter(Boolean))];
      setSelectedWeights(sizes);
    }

    // display_order scheme: AI-generated images 0-9, uploaded originals 10-19.
    // Regroup both back into one entry per colour+angle slot.
    const hasNewScheme = images.some((i) => (Number(i.display_order) || 0) >= 10);
    const slotMap = {};
    for (const img of images) {
      const order = Number(img.display_order) || 0;
      const labelIdx = order % 10;
      const isGen = hasNewScheme && order < 10;
      const color = img.color || colors[0] || 'Default';
      const label = imageBlocks[labelIdx] || img.alt_text || `Photo ${labelIdx + 1}`;
      const key = `${color}::${label}`;
      if (!slotMap[key]) {
        slotMap[key] = { color, label, uri: null, uploadedUrl: null, generatedUrl: null, existing: true };
      }
      if (isGen) slotMap[key].generatedUrl = img.url;
      else slotMap[key].uploadedUrl = img.url;
    }
    const mappedImages = Object.values(slotMap);

    setWizardData({
      type: editType,
      categoryId: editProduct.category?.id || editProduct.category_id || '',
      categoryName: editProduct.category?.name || '',
      colors: colors.length > 0 ? colors : [...new Set(mappedImages.map((i) => i.color).filter(Boolean))],
      images: mappedImages,
      stock,
      content: { title: editProduct.title || '', description: editProduct.description || '' },
      pricing: {
        basePrice: Number(editProduct.base_price) || 0,
        discountPct: Number(editProduct.discount_pct) || 0,
        couponCode: editProduct.coupon_code || '',
        couponDiscount: Number(editProduct.coupon_disc) || 0,
        tags: '',
      },
    });

    setHasCoupon(!!(editProduct.coupon_code || editProduct.coupon_disc));
    setTagInput('');
    setEditLoaded(true);
  }, [mode, editProduct, editLoaded, type]);

  // Categories — 3 type roots (slug === type); real categories are their children.
  const { data: allCats = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: getCategories,
    staleTime: 120_000,
  });
  const typeRoot = allCats.find((c) => !c.parent_id && c.slug === t);
  const categoryOptions = typeRoot ? allCats.filter((c) => c.parent_id === typeRoot.id) : [];
  const filteredCategories = categoryOptions.filter((c) =>
    c.name.toLowerCase().includes(categorySearch.trim().toLowerCase())
  );

  if (mode === 'edit' && isLoadingEdit && !editLoaded) {
    return <LoadingSpinner message="Loading product…" />;
  }

  // ─── Colours ───────────────────────────────────────────────────────────────

  // Add a colour by name. Sarees track one piece-count per colour — default to
  // 1 piece so a new colour is never created with 0 stock.
  const addColorNamed = (rawName) => {
    const name = (rawName || '').trim();
    if (!name) return;
    if (wizardData.colors.some((c) => c.toLowerCase() === name.toLowerCase())) return;
    update({
      colors: [...wizardData.colors, name],
      stock: t === 'saree'
        ? { ...wizardData.stock, [name]: 1 }
        : wizardData.stock,
    });
  };

  const addColor = () => {
    const name = newColorName.trim();
    if (!name) return;
    if (wizardData.colors.some((c) => c.toLowerCase() === name.toLowerCase())) {
      Alert.alert('Already added', `"${name}" is already in the colour list.`);
      return;
    }
    addColorNamed(name);
    setNewColorName('');
  };

  const removeColor = (color) => {
    const { [color]: _drop, ...restStock } = wizardData.stock;
    wizardData.images
      .filter((i) => i.color === color)
      .forEach((img) => revokeBlobUri(img.uri));
    update({
      colors: wizardData.colors.filter((c) => c !== color),
      images: wizardData.images.filter((i) => i.color !== color),
      stock: restStock,
    });
  };

  // ─── Photo Picker (per colour + angle) ─────────────────────────────────────

  const imageFor = (color, label) =>
    wizardData.images.find((i) => i.color === color && i.label === label);

  const finalizePhotoUpload = async (color, label, asset) => {
    const existing = imageFor(color, label);
    if (existing?.uri) revokeBlobUri(existing.uri);

    const previewUri = Platform.OS === 'web' && asset.file
      ? URL.createObjectURL(asset.file)
      : asset.uri;
    const uploadSource = Platform.OS === 'web' && asset.file
      ? { file: asset.file, name: asset.file.name, uri: asset.uri }
      : asset.uri;
    setUploading(`${color}::${label}`);

    try {
      const { url } = await uploadImage(uploadSource);
      const newImages = [
        ...wizardData.images.filter((i) => !(i.color === color && i.label === label)),
        { color, label, uri: previewUri, uploadedUrl: url, generatedUrl: null, existing: false },
      ];
      update({ images: newImages });
      autoGenerateContent(color, url);
    } finally {
      setUploading(null);
    }
  };

  const offerHeroCropChoice = (color, label, asset, source) => {
    const previewUri = Platform.OS === 'web' && asset.file
      ? URL.createObjectURL(asset.file)
      : asset.uri;
    if (Platform.OS === 'web') {
      setPhotoPreview({ color, label, asset, source, previewUri });
      return;
    }
    Alert.alert(
      label,
      'Use full photo or crop with the system editor (fixed 3:4)?',
      [
        { text: 'Use photo', onPress: () => finalizePhotoUpload(color, label, asset) },
        { text: 'Crop 3:4', onPress: () => pickImage(color, label, source, { forceCrop: true }) },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const pickImage = async (color, label, source, { forceCrop = false } = {}) => {
    try {
      if (source === 'camera') {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permission Required', 'Camera access is needed to take photos.');
          return;
        }
      } else {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permission Required', 'Photo library access is needed.');
          return;
        }
      }

      // Detail slots + jewellery: full frame for AI context. Hero saree slot:
      // pick first, then optional 3:4 crop (never forced).
      const baseOptions = { mediaTypes: ['images'], quality: 0.85 };
      const options = forceCrop
        ? { ...baseOptions, allowsEditing: true, aspect: [3, 4] }
        : baseOptions;
      const result = source === 'camera'
        ? await ImagePicker.launchCameraAsync(options)
        : await ImagePicker.launchImageLibraryAsync(options);

      if (result.canceled) return;
      const asset = result.assets[0];

      if (!forceCrop && isHeroSlot(t, label)) {
        offerHeroCropChoice(color, label, asset, source);
        return;
      }

      await finalizePhotoUpload(color, label, asset);
    } catch (err) {
      Alert.alert('Error', err.message || 'Failed to pick image.');
    }
  };

  const generateAiImage = async (color, label) => {
    const img = imageFor(color, label);
    if (!img?.uploadedUrl) {
      Alert.alert('No photo', 'Add a photo to this slot first.');
      return;
    }
    setAiSlot(`${color}::${label}`);
    try {
      const { url } = await generateProductImage({
        imageUrl: img.uploadedUrl,
        productType: t,
        color,
        category: wizardData.categoryName,
      });
      const newImages = wizardData.images.map((i) =>
        i.color === color && i.label === label
          ? { ...i, generatedUrl: url }
          : i
      );
      update({ images: newImages });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (err) {
      Alert.alert('AI generation failed', err.message);
    } finally {
      setAiSlot(null);
    }
  };

  // Generate ONE AI studio image using all uploaded photos for one colour.
  const generateAiForColor = async (color) => {
    const pending = wizardData.images.filter(
      (i) => i.color === color && i.uploadedUrl
    );
    if (pending.length === 0) {
      Alert.alert('Nothing to generate', 'Upload photos for this colour first.');
      return;
    }
    const ordered = [
      ...photoBlocks.map((label) => pending.find((i) => i.label === label)).filter(Boolean),
      ...pending.filter((i) => !photoBlocks.includes(i.label)),
    ];
    const targetLabel = (photoBlocks.find((label) => pending.some((i) => i.label === label)) || pending[0].label);
    setAiColor(color);
    try {
      const { url } = await generateProductImage({
        imageUrls: ordered.map((i) => i.uploadedUrl),
        productType: t,
        color,
        category: wizardData.categoryName,
      });
      setWizardData((prev) => ({
        ...prev,
        images: prev.images.map((i) =>
          i.color === color && i.label === targetLabel
            ? { ...i, generatedUrl: url }
            : i
        ),
      }));
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      // Draft the product name & description from the uploaded photo.
      autoGenerateContent(color, ordered[0]?.uploadedUrl);
    } catch (err) {
      Alert.alert('AI generation failed', err.message);
    } finally {
      setAiColor(null);
    }
  };

  const removePhoto = (color, label) => {
    const existing = imageFor(color, label);
    if (existing?.uri) revokeBlobUri(existing.uri);
    update({
      images: wizardData.images.filter((i) => !(i.color === color && i.label === label)),
    });
  };

  const removeGeneratedImage = (color, label) => {
    update({
      images: wizardData.images.map((i) =>
        i.color === color && i.label === label ? { ...i, generatedUrl: null } : i
      ),
    });
  };

  const buildPickerActions = (color, label) => {
    const existing = imageFor(color, label);
    const actions = [
      { label: 'Take Photo', action: () => pickImage(color, label, 'camera') },
      { label: 'Choose from Gallery', action: () => pickImage(color, label, 'gallery') },
    ];
    if (existing?.uploadedUrl) {
      actions.push({
        label: existing.generatedUrl ? '✨ Regenerate AI Image' : '✨ Generate AI Image',
        action: () => generateAiImage(color, label),
      });
    }
    if (existing?.generatedUrl) {
      actions.push({ label: 'Remove AI Image', destructive: true, action: () => removeGeneratedImage(color, label) });
    }
    if (existing) {
      actions.push({ label: 'Remove Photo', destructive: true, action: () => removePhoto(color, label) });
    }
    return actions;
  };

  const showPhotoPicker = (color, label) => {
    if (Platform.OS === 'web') {
      setPickerSlot({ color, label });
      return;
    }
    const buttons = buildPickerActions(color, label).map((item) => ({
      text: item.label,
      style: item.destructive ? 'destructive' : undefined,
      onPress: item.action,
    }));
    buttons.push({ text: 'Cancel', style: 'cancel' });
    Alert.alert(`${color} — ${label}`, 'Choose an option', buttons);
  };

  // ─── AI Content ────────────────────────────────────────────────────────────

  // Draft the product title + description from the uploaded photo (Gemini).
  // Runs automatically after AI image generation; never overwrites copy the
  // user has already written.
  const autoGenerateContent = async (color, imageUrl) => {
    if (!imageUrl) return;
    if (wizardData.content.title.trim() && wizardData.content.description.trim()) return;
    setIsGeneratingContent(true);
    try {
      const result = await generateContent({
        imageUrl,
        productType: t,
        color,
        category: wizardData.categoryName,
      });
      if (result?.title || result?.description) {
        setWizardData((prev) => ({
          ...prev,
          content: {
            title: prev.content.title.trim() ? prev.content.title : (result.title || ''),
            description: prev.content.description.trim()
              ? prev.content.description
              : (result.description || ''),
          },
        }));
      }
    } catch {
      // Non-fatal — the user can still type the details manually.
    } finally {
      setIsGeneratingContent(false);
    }
  };

  // ─── Category creation ─────────────────────────────────────────────────────

  const handleCreateCategory = async () => {
    const name = newCategoryName.trim();
    if (!name) return;
    if (!typeRoot) {
      Alert.alert('Setup needed', `No "${t}" root category exists. Run the schema seed in Supabase, then retry.`);
      return;
    }
    setCreatingCategory(true);
    try {
      const fd = new FormData();
      fd.append('name', name);
      fd.append('parent_id', typeRoot.id);
      const cat = await createCategory(fd);
      await qc.invalidateQueries({ queryKey: ['categories'] });
      update({ categoryId: cat.id, categoryName: cat.name });
      setNewCategoryName('');
      setShowNewCategory(false);
      setCategorySearch('');
    } catch (err) {
      Alert.alert('Error', err.message);
    } finally {
      setCreatingCategory(false);
    }
  };

  // ─── Stock helpers ─────────────────────────────────────────────────────────

  const setSareeQty = (color, val) => {
    // Minimum 1 piece — a saree colour in the catalogue always has at least one.
    update({ stock: { ...wizardData.stock, [color]: Math.max(1, parseInt(val) || 1) } });
  };
  // Jewellery stock is keyed by weight directly (no colour dimension).
  const setJewelleryQty = (weight, val) => {
    update({ stock: { ...wizardData.stock, [weight]: Math.max(0, parseInt(val) || 0) } });
  };

  const addWeight = (raw) => {
    const name = (raw || '').trim();
    if (!name) return;
    if (selectedWeights.some((w) => w.toLowerCase() === name.toLowerCase())) {
      Alert.alert('Already added', `"${name}" is already in the weight list.`);
      return;
    }
    setSelectedWeights((prev) => [...prev, name]);
    setNewWeightName('');
  };

  const addPurity = (raw) => {
    const name = (raw || '').trim();
    if (!name) return;
    setGoldPurity(name);
    setNewPurityName('');
  };

  const buildVariants = () => {
    if (t === 'saree') {
      return wizardData.colors.map((c) => ({
        color: c, size: '', quantity: Number(wizardData.stock[c]) || 1, sku: '',
      }));
    }
    // Jewellery: single variant per weight, no colour.
    return selectedWeights.map((w) => ({
      color: '', size: w, quantity: Number(wizardData.stock[w]) || 0, sku: '',
    }));
  };

  // ─── Save ──────────────────────────────────────────────────────────────────

  const canSave =
    wizardData.content.title.trim().length >= 3 &&
    wizardData.pricing.basePrice > 0;

  const saveProduct = async (publish = false) => {
    if (!canSave) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Incomplete', 'Please fill in at least a product name and price.');
      return;
    }
    setIsSaving(true);
    try {
      const payload = {
        title: wizardData.content.title,
        description: wizardData.content.description,
        type: t,
        category_id: wizardData.categoryId || undefined,
        base_price: Number(wizardData.pricing.basePrice),
        discount_pct: Number(wizardData.pricing.discountPct) || 0,
        coupon_code: wizardData.pricing.couponCode || undefined,
        coupon_disc: wizardData.pricing.couponDiscount || undefined,
      };

      const product = mode === 'edit' && productId
        ? await updateProduct(productId, payload)
        : await createProduct(payload);

      // Images — AI-generated first (display_order 0-9), uploaded originals
      // next (10-19), so the product gallery leads with the generated shot.
      if (mode === 'edit' && productId && Array.isArray(editProduct?.images)) {
        await Promise.all(
          editProduct.images
            .filter((old) => old?.id)
            .map((old) => deleteProductImage(product.id, old.id).catch(() => {}))
        );
      }

      const imageUploads = [];
      let primarySet = false;
      for (const color of wizardData.colors) {
        // Jewellery uses the "Jewellery" pseudo colour internally; persist
        // images without a colour so the storefront doesn't render a colour pill.
        const persistedColor = t === 'jewellery' ? '' : color;
        for (let idx = 0; idx < photoBlocks.length; idx++) {
          const img = imageFor(color, photoBlocks[idx]);
          if (!img?.generatedUrl) continue;
          imageUploads.push({
            url: img.generatedUrl,
            color: persistedColor,
            alt_text: photoBlocks[idx],
            is_primary: !primarySet,
            display_order: idx,
          });
          primarySet = true;
        }
        for (let idx = 0; idx < photoBlocks.length; idx++) {
          const img = imageFor(color, photoBlocks[idx]);
          if (!img?.uploadedUrl) continue;
          imageUploads.push({
            url: img.uploadedUrl,
            color: persistedColor,
            alt_text: photoBlocks[idx],
            is_primary: !primarySet,
            display_order: 10 + idx,
          });
          primarySet = true;
        }
      }
      if (imageUploads.length > 0) {
        await Promise.all(
          imageUploads.map((payload) => addProductImage(product.id, payload))
        );
      }

      const variants = buildVariants();
      if (variants.length > 0) {
        await bulkUpdateVariants(product.id, variants);
      }

      if (publish) await publishProduct(product.id);

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      qc.invalidateQueries({ queryKey: ['products'] });
      qc.invalidateQueries({ queryKey: ['product', product.id] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
      openConfirm(
        publish ? 'Published!' : 'Saved!',
        publish ? 'Product is now live on the store.' : 'Product saved as draft.',
        [{ label: 'OK', onPress: handleBack }],
        false
      );
    } catch (err) {
      Alert.alert('Error', err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const finalPrice = discountedPrice(Number(wizardData.pricing.basePrice) || 0, Number(wizardData.pricing.discountPct) || 0);
  const savings = (Number(wizardData.pricing.basePrice) || 0) - finalPrice;
  const parsedTags = tagInput.split(',').map((x) => x.trim()).filter(Boolean);
  const totalPhotos = wizardData.images.filter((i) => i.uploadedUrl).length;
  const pickerActions = pickerSlot ? buildPickerActions(pickerSlot.color, pickerSlot.label) : [];
  const pickerTitle = pickerSlot ? `${pickerSlot.color} — ${pickerSlot.label}` : '';
  const runPickerAction = (action) => {
    setPickerSlot(null);
    action();
  };
  const confirmTitle = confirmDialog?.title || '';
  const confirmMessage = confirmDialog?.message || '';
  const confirmActions = confirmDialog?.actions || [];
  const runConfirmAction = (action) => {
    setConfirmDialog(null);
    if (action) action();
  };

  // ─── Per-colour photo grid ─────────────────────────────────────────────────

  const renderColorPhotos = (color) => {
    const generated = wizardData.images.filter((i) => i.color === color && i.generatedUrl);
    const isGenerating = aiColor === color || (aiSlot && aiSlot.startsWith(`${color}::`));
    return (
      <View>
        {/* Upload slots — optional; fill any or all */}
        <View className="flex-row flex-wrap justify-between">
          {photoBlocks.map((label) => {
            const img = imageFor(color, label);
            const isUp = uploading === `${color}::${label}`;
            const uploadedUri = img
              ? (Platform.OS === 'web' ? (img.uploadedUrl || img.uri) : (img.uri || img.uploadedUrl))
              : null;
            return (
              <View key={label} style={{ width: '48%' }} className="mb-2">
                <Pressable
                  onPress={() => !isUp && showPhotoPicker(color, label)}
                  className="rounded-xl overflow-hidden"
                  style={{ aspectRatio: 3 / 4, borderWidth: 1, borderColor: img ? '#f59e0b' : '#e5e7eb' }}
                >
                  {uploadedUri ? (
                    <View className="flex-1 relative">
                      <Image source={{ uri: uploadedUri }} className="w-full h-full" resizeMode="cover" />
                      <View className="absolute bottom-0 left-0 right-0 px-2 py-1" style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}>
                        <Text className="text-white text-[10px] font-medium" numberOfLines={1}>{label}</Text>
                      </View>
                      {isUp && (
                        <View
                          className="items-center justify-center"
                          style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.4)' }}
                        >
                          <ActivityIndicator size="small" color="#fff" />
                        </View>
                      )}
                    </View>
                  ) : (
                    <View className="flex-1 items-center justify-center" style={{ backgroundColor: '#fef7f0' }}>
                      {isUp ? (
                        <ActivityIndicator size="small" color={AMBER_500} />
                      ) : (
                        <>
                          <Text className="text-[11px] font-medium text-center px-2 mb-1" style={{ color: '#92400e' }}>{label}</Text>
                          <Ionicons name="camera" size={16} color="#d97706" />
                        </>
                      )}
                    </View>
                  )}
                </Pressable>
              </View>
            );
          })}
        </View>

        {/* AI result — full width below slots, no crop, tap to view */}
        {isGenerating && (
          <View
            className="rounded-xl items-center justify-center mt-1"
            style={{ aspectRatio: 3 / 4, backgroundColor: '#f5f3ff', borderWidth: 1.5, borderColor: '#ddd6fe' }}
          >
            <ActivityIndicator size="large" color="#7c3aed" />
            <Text className="text-xs font-semibold mt-2" style={{ color: '#6d28d9' }}>Generating AI image…</Text>
          </View>
        )}
        {!isGenerating && generated.map((img) => (
          <Pressable
            key={img.label}
            onPress={() => setViewerImage(img.generatedUrl)}
            className="rounded-xl overflow-hidden mt-1 mb-1"
            style={{ borderWidth: 1.5, borderColor: '#7c3aed', backgroundColor: '#faf8ff' }}
          >
            <Image
              source={{ uri: img.generatedUrl }}
              style={{ width: '100%', aspectRatio: 3 / 4 }}
              resizeMode="contain"
            />
            <View className="absolute top-2 right-2 px-2 py-0.5 rounded-full" style={{ backgroundColor: '#7c3aed' }}>
              <Text className="text-white text-[10px] font-bold">✨ AI</Text>
            </View>
            <Pressable
              onPress={() => removeGeneratedImage(color, img.label)}
              hitSlop={8}
              className="absolute top-2 left-2 w-6 h-6 rounded-full items-center justify-center"
              style={{ backgroundColor: 'rgba(0,0,0,0.55)' }}
            >
              <Ionicons name="close" size={13} color="#fff" />
            </Pressable>
            <View className="flex-row items-center justify-center py-1.5" style={{ backgroundColor: '#7c3aed' }}>
              <Ionicons name="expand" size={12} color="#fff" />
              <Text className="text-white text-[10px] font-semibold ml-1">Tap to view full image</Text>
            </View>
          </Pressable>
        ))}
      </View>
    );
  };

  // ─── Per-colour stock ──────────────────────────────────────────────────────

  const renderColorStock = (color) => {
    if (t === 'saree') {
      return (
        <View className="flex-row items-center justify-between mt-2">
          <Text className="text-xs font-medium" style={{ color: '#78350f' }}>Pieces in stock</Text>
          <TextInput
            className="w-20 text-center rounded-lg py-1.5 text-sm font-semibold"
            style={{ backgroundColor: '#fff', borderWidth: 1, borderColor: '#e5e7eb', color: '#1f2937' }}
            value={(wizardData.stock[color] ?? 1).toString()}
            onChangeText={(v) => setSareeQty(color, v)}
            keyboardType="number-pad"
            selectTextOnFocus
          />
        </View>
      );
    }
    // Jewellery — show one row per weight, keyed at the top level (no colour).
    if (selectedWeights.length === 0) {
      return (
        <Text className="text-[11px] mt-2" style={{ color: '#a16207' }}>
          Add weights above to set stock.
        </Text>
      );
    }
    return (
      <View className="flex-row flex-wrap gap-2 mt-2">
        {selectedWeights.map((w) => (
          <View key={w} className="items-center" style={{ width: 64 }}>
            <Text className="text-[10px] mb-1" style={{ color: '#78350f' }}>{w}</Text>
            <TextInput
              className="w-full text-center rounded-lg py-1.5 text-xs font-semibold"
              style={{ backgroundColor: '#fff', borderWidth: 1, borderColor: '#e5e7eb', color: '#1f2937' }}
              value={(wizardData.stock[w] ?? 0).toString()}
              onChangeText={(v) => setJewelleryQty(w, v)}
              keyboardType="number-pad"
              selectTextOnFocus
            />
          </View>
        ))}
      </View>
    );
  };

  return (
    <View className="flex-1" style={{ backgroundColor: WARM_BG, paddingTop: insets.top }}>
      {/* Header */}
      <View className="px-4 py-3 flex-row items-center" style={{ backgroundColor: CARD_BG, borderBottomWidth: 1, borderBottomColor: SECTION_BORDER }}>
        <Pressable onPress={handleBack} className="w-9 h-9 items-center justify-center rounded-full mr-3" style={{ backgroundColor: '#fef2f2' }}>
          <Ionicons name="arrow-back" size={20} color={ACCENT} />
        </Pressable>
        <View className="flex-1">
          <Text className="text-lg font-bold" style={{ color: '#78350f' }}>
            {mode === 'edit' ? 'Edit Product' : 'New Product'}
          </Text>
          <View className="mt-0.5">
            <TypeBadge type={t} />
          </View>
        </View>
        <Pressable
          onPress={() => openConfirm('Discard?', 'You will lose unsaved changes.', [
            { label: 'Cancel', style: 'cancel' },
            { label: 'Discard', style: 'destructive', onPress: handleBack },
          ])}
          className="px-3 py-1.5 rounded-lg"
        >
          <Text className="text-xs" style={{ color: '#92400e' }}>Cancel</Text>
        </Pressable>
      </View>

      <ScrollView className="flex-1" contentContainerStyle={{ paddingTop: 16, paddingBottom: insets.bottom + 100 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

        {/* ─── Weights (product-wide) ───────────────────────────────────── */}
        {t === 'jewellery' && (
          <SectionCard icon="diamond" iconColor="#d97706" title="Weight & Purity" subtitle="Product-wide jewellery options">
            <Text className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: '#78350f' }}>Weight</Text>

            {/* Custom weight entry — admin/employee can type any gram value */}
            <View className="flex-row items-center gap-2 mb-2">
              <TextInput
                className="flex-1 rounded-xl px-3 py-2.5 text-sm"
                style={{ backgroundColor: '#fef7f0', borderWidth: 1, borderColor: SECTION_BORDER, color: '#1f2937' }}
                placeholder="Custom weight (e.g. 7.5g)"
                placeholderTextColor="#a16207"
                value={newWeightName}
                onChangeText={setNewWeightName}
                onSubmitEditing={() => addWeight(newWeightName)}
                returnKeyType="done"
              />
              <Pressable
                onPress={() => addWeight(newWeightName)}
                className="px-4 py-2.5 rounded-xl flex-row items-center"
                style={{ backgroundColor: AMBER_500 }}
              >
                <Ionicons name="add" size={16} color="#fff" />
                <Text className="text-white text-sm font-semibold ml-1">Weight</Text>
              </Pressable>
            </View>

            {/* Preset weight chips — tap to toggle quickly */}
            <Text className="text-[11px] font-medium mb-1.5" style={{ color: '#a16207' }}>
              Or tap a preset:
            </Text>
            <View className="flex-row flex-wrap mb-2">
              {PRODUCT_SIZES.jewellery.map((w) => (
                <Chip
                  key={w} label={w}
                  selected={selectedWeights.includes(w)}
                  onPress={() => setSelectedWeights((prev) => prev.includes(w) ? prev.filter((x) => x !== w) : [...prev, w])}
                />
              ))}
            </View>

            {/* Custom weights already added — show as removable chips */}
            {selectedWeights.filter((w) => !PRODUCT_SIZES.jewellery.includes(w)).length > 0 && (
              <>
                <Text className="text-[11px] font-medium mb-1.5 mt-1" style={{ color: '#a16207' }}>
                  Custom weights:
                </Text>
                <View className="flex-row flex-wrap mb-3">
                  {selectedWeights
                    .filter((w) => !PRODUCT_SIZES.jewellery.includes(w))
                    .map((w) => (
                      <Pressable
                        key={w}
                        onPress={() => setSelectedWeights((prev) => prev.filter((x) => x !== w))}
                        className="flex-row items-center px-3 py-2 rounded-full mr-2 mb-2"
                        style={{ backgroundColor: '#fef3c7', borderWidth: 1, borderColor: '#f59e0b' }}
                      >
                        <Text className="text-xs font-semibold" style={{ color: '#92400e' }}>{w}</Text>
                        <Ionicons name="close-circle" size={14} color="#d97706" style={{ marginLeft: 4 }} />
                      </Pressable>
                    ))}
                </View>
              </>
            )}

            <Text className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: '#78350f' }}>Purity</Text>

            {/* Custom purity entry — admin/employee can type any karat / fineness value */}
            <View className="flex-row items-center gap-2 mb-2">
              <TextInput
                className="flex-1 rounded-xl px-3 py-2.5 text-sm"
                style={{ backgroundColor: '#fef7f0', borderWidth: 1, borderColor: SECTION_BORDER, color: '#1f2937' }}
                placeholder="Custom purity (e.g. 916 or 21K)"
                placeholderTextColor="#a16207"
                value={newPurityName}
                onChangeText={setNewPurityName}
                onSubmitEditing={() => addPurity(newPurityName)}
                returnKeyType="done"
              />
              <Pressable
                onPress={() => addPurity(newPurityName)}
                className="px-4 py-2.5 rounded-xl flex-row items-center"
                style={{ backgroundColor: AMBER_500 }}
              >
                <Ionicons name="add" size={16} color="#fff" />
                <Text className="text-white text-sm font-semibold ml-1">Purity</Text>
              </Pressable>
            </View>

            {/* Preset purity chips — tap to select quickly */}
            <Text className="text-[11px] font-medium mb-1.5" style={{ color: '#a16207' }}>
              Or tap a preset:
            </Text>
            <View className="flex-row flex-wrap mb-2">
              {GOLD_PURITIES.map((p) => (
                <Chip key={p} label={p} selected={goldPurity === p} onPress={() => setGoldPurity(p)} />
              ))}
            </View>

            {/* Custom purity already set — show as removable chip */}
            {goldPurity && !GOLD_PURITIES.includes(goldPurity) && (
              <>
                <Text className="text-[11px] font-medium mb-1.5 mt-1" style={{ color: '#a16207' }}>
                  Custom purity:
                </Text>
                <View className="flex-row flex-wrap">
                  <Pressable
                    onPress={() => setGoldPurity('22K')}
                    className="flex-row items-center px-3 py-2 rounded-full mr-2 mb-2"
                    style={{ backgroundColor: '#fef3c7', borderWidth: 1, borderColor: '#f59e0b' }}
                  >
                    <Text className="text-xs font-semibold" style={{ color: '#92400e' }}>{goldPurity}</Text>
                    <Ionicons name="close-circle" size={14} color="#d97706" style={{ marginLeft: 4 }} />
                  </Pressable>
                </View>
              </>
            )}
          </SectionCard>
        )}

        {/* ─── Colours & Photos ─────────────────────────────────────────── */}
        <SectionCard
          icon={t === 'jewellery' ? 'images' : 'color-palette'}
          iconColor="#db2777"
          title={t === 'jewellery' ? 'Photos' : 'Colours & Photos'}
          subtitle={t === 'jewellery'
            ? `${totalPhotos} photos`
            : `${wizardData.colors.length} colours · ${totalPhotos} photos`}
        >
          <Text className="text-xs mb-3" style={{ color: '#a16207' }}>
            {t === 'jewellery'
              ? 'Upload the photos for this piece, then tap a photo → ✨ Generate AI Image for a clean studio shot.'
              : 'Add every colour this design comes in. Up to 7 photo slots per colour — fill only the ones you have. Tap a photo → ✨ Generate AI Image for a clean studio shot.'}
          </Text>

          {/* Add colour — sarees only (jewellery is colour-less) */}
          {t !== 'jewellery' && (
            <>
              <View className="flex-row items-center gap-2 mb-3">
                <TextInput
                  className="flex-1 rounded-xl px-3 py-2.5 text-sm"
                  style={{ backgroundColor: '#fef7f0', borderWidth: 1, borderColor: SECTION_BORDER, color: '#1f2937' }}
                  placeholder="Colour name (e.g. Green)"
                  placeholderTextColor="#a16207"
                  value={newColorName}
                  onChangeText={setNewColorName}
                  onSubmitEditing={addColor}
                  returnKeyType="done"
                />
                <Pressable onPress={addColor} className="px-4 py-2.5 rounded-xl flex-row items-center" style={{ backgroundColor: AMBER_500 }}>
                  <Ionicons name="add" size={16} color="#fff" />
                  <Text className="text-white text-sm font-semibold ml-1">Colour</Text>
                </Pressable>
              </View>

              <Text className="text-[11px] font-medium mb-1.5" style={{ color: '#a16207' }}>
                Or tap a colour:
              </Text>
              <View className="flex-row flex-wrap mb-3">
                {COLOR_PALETTE.map((c) => {
                  const picked = wizardData.colors.some((x) => x.toLowerCase() === c.name.toLowerCase());
                  return (
                    <Pressable
                      key={c.name}
                      onPress={() => addColorNamed(c.name)}
                      disabled={picked}
                      className="items-center mr-2.5 mb-2.5"
                      style={{ width: 46, opacity: picked ? 0.4 : 1 }}
                    >
                      <View
                        className="rounded-full items-center justify-center"
                        style={{ width: 32, height: 32, backgroundColor: c.hex, borderWidth: 1, borderColor: '#d1d5db' }}
                      >
                        {picked && <Ionicons name="checkmark" size={16} color="#ffffff" />}
                      </View>
                      <Text className="text-[8px] mt-0.5 text-center" style={{ color: '#78350f' }} numberOfLines={1}>
                        {c.name}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              {wizardData.colors.length === 0 && (
                <View className="rounded-xl p-5 items-center" style={{ backgroundColor: '#fef7f0', borderWidth: 1, borderStyle: 'dashed', borderColor: '#fde8d0' }}>
                  <Ionicons name="color-palette-outline" size={28} color="#d4a017" />
                  <Text className="text-xs mt-2 text-center" style={{ color: '#92400e' }}>
                    No colours yet. Add one above to start uploading photos.
                  </Text>
                </View>
              )}
            </>
          )}

          {wizardData.colors.map((color) => (
            <View key={color} className="rounded-xl mb-3 p-3" style={{ backgroundColor: '#fffdf9', borderWidth: 1, borderColor: SECTION_BORDER }}>
              {t !== 'jewellery' && (
                <View className="flex-row items-center mb-2">
                  <View className="w-5 h-5 rounded-full mr-2" style={{ backgroundColor: colorHex(color), borderWidth: 1, borderColor: '#e5e7eb' }} />
                  <Text className="flex-1 text-sm font-bold" style={{ color: '#78350f' }}>{color}</Text>
                  <Pressable onPress={() => removeColor(color)} hitSlop={8} className="px-2 py-1">
                    <Ionicons name="trash-outline" size={16} color="#dc2626" />
                  </Pressable>
                </View>
              )}
              {renderColorPhotos(color)}

              {/* Per-colour AI generation */}
              <Pressable
                onPress={() => generateAiForColor(color)}
                disabled={aiColor === color}
                className="flex-row items-center justify-center py-2.5 rounded-xl mt-2"
                style={{ backgroundColor: '#f5f3ff', borderWidth: 1, borderColor: '#ddd6fe', opacity: aiColor === color ? 0.7 : 1 }}
              >
                {aiColor === color ? (
                  <>
                    <ActivityIndicator size="small" color="#7c3aed" />
                    <Text className="text-xs font-semibold ml-2" style={{ color: '#6d28d9' }}>
                      Generating {t === 'jewellery' ? 'images' : `${color} images`}…
                    </Text>
                  </>
                ) : (
                  <>
                    <Ionicons name="sparkles" size={14} color="#7c3aed" />
                    <Text className="text-xs font-semibold ml-2" style={{ color: '#6d28d9' }}>
                      {t === 'jewellery' ? '✨ Generate AI Image' : `✨ Generate AI Image — ${color}`}
                    </Text>
                  </>
                )}
              </Pressable>

              {renderColorStock(color)}
            </View>
          ))}
        </SectionCard>

        <Divider />

        {/* ─── Details ──────────────────────────────────────────────────── */}
        <SectionCard icon="gift" iconColor="#b91c1c" title="Details" subtitle="Product information">
          <View className="mb-4">
            <View className="flex-row items-center justify-between mb-1.5">
              <Text className="text-sm font-medium" style={{ color: '#78350f' }}>Name *</Text>
              <Text className="text-xs" style={{ color: '#a16207' }}>{wizardData.content.title.length}/80</Text>
            </View>
            <TextInput
              className="rounded-xl px-4 py-3 text-base"
              style={{ backgroundColor: '#fef7f0', borderWidth: 1, borderColor: SECTION_BORDER, color: '#1f2937' }}
              placeholder="Product name"
              placeholderTextColor="#a16207"
              value={wizardData.content.title}
              onChangeText={(v) => update({ content: { ...wizardData.content, title: v } })}
              maxLength={80}
            />
          </View>

          <View className="mb-4">
            <Text className="text-sm font-medium mb-1.5" style={{ color: '#78350f' }}>Description</Text>
            <TextInput
              className="rounded-xl px-4 py-3 text-base"
              style={{ backgroundColor: '#fef7f0', borderWidth: 1, borderColor: SECTION_BORDER, color: '#1f2937', minHeight: 100 }}
              placeholder="Describe the item"
              placeholderTextColor="#a16207"
              value={wizardData.content.description}
              onChangeText={(v) => update({ content: { ...wizardData.content, description: v } })}
              multiline
              textAlignVertical="top"
            />
          </View>

          {isGeneratingContent ? (
            <View
              className="flex-row items-center justify-center py-2.5 rounded-xl mb-4"
              style={{ backgroundColor: '#f5f3ff', borderWidth: 1, borderColor: '#ddd6fe' }}
            >
              <ActivityIndicator size="small" color="#7c3aed" />
              <Text className="text-xs font-semibold ml-2" style={{ color: '#6d28d9' }}>
                ✨ Writing details from your photo…
              </Text>
            </View>
          ) : (
            <Text className="text-[11px] mb-4" style={{ color: '#a16207' }}>
              ✨ Name & description are written automatically when you generate an AI image — you can edit them anytime.
            </Text>
          )}

          {/* Category */}
          <Text className="text-sm font-medium mb-2" style={{ color: '#78350f' }}>Category</Text>
          {categoryOptions.length > 6 && (
            <View className="flex-row items-center rounded-xl px-3 py-2 mb-2" style={{ backgroundColor: '#fef7f0', borderWidth: 1, borderColor: SECTION_BORDER }}>
              <Ionicons name="search" size={14} color="#a16207" />
              <TextInput
                className="flex-1 ml-2 text-sm"
                style={{ color: '#1f2937' }}
                placeholder="Search categories"
                placeholderTextColor="#a16207"
                value={categorySearch}
                onChangeText={setCategorySearch}
              />
              {categorySearch.length > 0 && (
                <Pressable onPress={() => setCategorySearch('')}>
                  <Ionicons name="close-circle" size={14} color="#a16207" />
                </Pressable>
              )}
            </View>
          )}
          <View className="flex-row flex-wrap">
            {filteredCategories.map((cat) => {
              const active = wizardData.categoryId === cat.id;
              return (
                <Pressable
                  key={cat.id}
                  onPress={() => update({ categoryId: cat.id, categoryName: cat.name })}
                  className="px-3.5 py-2 rounded-full border mr-2 mb-2"
                  style={{ backgroundColor: active ? '#fef3c7' : '#fff', borderColor: active ? '#f59e0b' : '#e5e7eb' }}
                >
                  <Text className="text-xs font-semibold" style={{ color: active ? '#92400e' : '#6b7280' }}>{cat.name}</Text>
                </Pressable>
              );
            })}
            <Pressable
              onPress={() => setShowNewCategory(true)}
              className="px-3.5 py-2 rounded-full mr-2 mb-2 flex-row items-center"
              style={{ borderWidth: 1, borderStyle: 'dashed', borderColor: '#a16207' }}
            >
              <Ionicons name="add" size={14} color="#a16207" />
              <Text className="text-xs font-semibold ml-1" style={{ color: '#a16207' }}>New</Text>
            </Pressable>
          </View>
          {categoryOptions.length === 0 && (
            <Text className="text-xs mb-1" style={{ color: '#a16207' }}>
              No {t} categories yet — tap “New” to create the first one.
            </Text>
          )}
          {showNewCategory && (
            <View className="flex-row items-center gap-2 mt-2">
              <TextInput
                className="flex-1 rounded-xl px-3 py-2.5 text-sm"
                style={{ backgroundColor: '#fef7f0', borderWidth: 1, borderColor: SECTION_BORDER, color: '#1f2937' }}
                placeholder="New category name"
                placeholderTextColor="#a16207"
                value={newCategoryName}
                onChangeText={setNewCategoryName}
                autoFocus
              />
              <Pressable
                onPress={handleCreateCategory}
                disabled={creatingCategory}
                className="px-4 py-2.5 rounded-xl"
                style={{ backgroundColor: AMBER_500, opacity: creatingCategory ? 0.6 : 1 }}
              >
                {creatingCategory ? <ActivityIndicator size="small" color="#fff" /> : <Text className="text-white text-sm font-semibold">Add</Text>}
              </Pressable>
            </View>
          )}
        </SectionCard>

        {/* ─── Pricing ──────────────────────────────────────────────────── */}
        <SectionCard icon="pricetag" iconColor="#d97706" title="Pricing" subtitle="Set price and discount">
          <View className="flex-row gap-3 mb-4">
            <View className="flex-1">
              <Text className="text-xs font-medium mb-1.5" style={{ color: '#78350f' }}>Price (Rs) *</Text>
              <View className="flex-row items-center rounded-xl overflow-hidden" style={{ backgroundColor: '#fef7f0', borderWidth: 1, borderColor: SECTION_BORDER }}>
                <View className="px-3 py-3" style={{ backgroundColor: '#fde8d0' }}>
                  <Text className="text-sm font-bold" style={{ color: '#92400e' }}>₹</Text>
                </View>
                <TextInput
                  className="flex-1 px-3 py-3 text-base font-semibold"
                  style={{ color: '#1f2937' }}
                  placeholder="0"
                  placeholderTextColor="#a16207"
                  keyboardType="number-pad"
                  value={wizardData.pricing.basePrice ? wizardData.pricing.basePrice.toString() : ''}
                  onChangeText={(v) => update({ pricing: { ...wizardData.pricing, basePrice: parseInt(v) || 0 } })}
                />
              </View>
            </View>
            <View style={{ width: 100 }}>
              <Text className="text-xs font-medium mb-1.5" style={{ color: '#78350f' }}>Discount (%)</Text>
              <TextInput
                className="rounded-xl px-3 py-3 text-base text-center"
                style={{ backgroundColor: '#fef7f0', borderWidth: 1, borderColor: SECTION_BORDER, color: '#1f2937' }}
                placeholder="0"
                placeholderTextColor="#a16207"
                keyboardType="number-pad"
                value={wizardData.pricing.discountPct ? wizardData.pricing.discountPct.toString() : ''}
                onChangeText={(v) => update({ pricing: { ...wizardData.pricing, discountPct: Math.min(90, parseInt(v) || 0) } })}
              />
            </View>
          </View>

          {Number(wizardData.pricing.basePrice) > 0 && (
            <View className="rounded-xl p-3 mb-4" style={{ backgroundColor: '#fef3c7', borderWidth: 1, borderColor: '#fde68a' }}>
              <View className="flex-row justify-between mb-1">
                <Text className="text-xs" style={{ color: '#78350f' }}>Base price</Text>
                <Text className="text-xs font-semibold" style={{ color: '#78350f' }}>{formatPrice(wizardData.pricing.basePrice)}</Text>
              </View>
              {Number(wizardData.pricing.discountPct) > 0 && (
                <View className="flex-row justify-between mb-1">
                  <Text className="text-xs" style={{ color: '#78350f' }}>Discount ({wizardData.pricing.discountPct}%)</Text>
                  <Text className="text-xs font-semibold" style={{ color: '#dc2626' }}>-{formatPrice(savings)}</Text>
                </View>
              )}
              <View className="flex-row justify-between pt-1" style={{ borderTopWidth: 1, borderTopColor: '#fde68a' }}>
                <Text className="text-sm font-bold" style={{ color: '#78350f' }}>Customer pays</Text>
                <Text className="text-sm font-bold" style={{ color: '#b45309' }}>{formatPrice(finalPrice)}</Text>
              </View>
            </View>
          )}

          <View className="flex-row items-center justify-between mb-3">
            <Text className="text-xs font-semibold" style={{ color: '#78350f' }}>Coupon code</Text>
            <Switch
              value={hasCoupon}
              onValueChange={(v) => {
                setHasCoupon(v);
                if (!v) update({ pricing: { ...wizardData.pricing, couponCode: '', couponDiscount: 0 } });
              }}
              trackColor={{ false: '#e5e7eb', true: '#fcd34d' }}
              thumbColor={hasCoupon ? AMBER_500 : '#9ca3af'}
            />
          </View>
          {hasCoupon && (
            <View className="flex-row gap-2 mb-4">
              <TextInput
                className="flex-1 rounded-xl px-3 py-2.5 text-sm"
                style={{ backgroundColor: '#fef7f0', borderWidth: 1, borderColor: SECTION_BORDER, color: '#1f2937' }}
                placeholder="SUMMER20"
                placeholderTextColor="#a16207"
                value={wizardData.pricing.couponCode}
                onChangeText={(v) => update({ pricing: { ...wizardData.pricing, couponCode: v.toUpperCase() } })}
                autoCapitalize="characters"
              />
              <TextInput
                className="rounded-xl px-3 py-2.5 text-sm text-center"
                style={{ width: 70, backgroundColor: '#fef7f0', borderWidth: 1, borderColor: SECTION_BORDER, color: '#1f2937' }}
                placeholder="%"
                placeholderTextColor="#a16207"
                keyboardType="number-pad"
                value={wizardData.pricing.couponDiscount ? wizardData.pricing.couponDiscount.toString() : ''}
                onChangeText={(v) => update({ pricing: { ...wizardData.pricing, couponDiscount: parseInt(v) || 0 } })}
              />
            </View>
          )}

          <Text className="text-xs font-medium mb-1.5" style={{ color: '#78350f' }}>Tags</Text>
          <TextInput
            className="rounded-xl px-3 py-2.5 text-sm mb-2"
            style={{ backgroundColor: '#fef7f0', borderWidth: 1, borderColor: SECTION_BORDER, color: '#1f2937' }}
            placeholder="wedding, festive, silk"
            placeholderTextColor="#a16207"
            value={tagInput}
            onChangeText={(v) => { setTagInput(v); update({ pricing: { ...wizardData.pricing, tags: v } }); }}
          />
          {parsedTags.length > 0 && (
            <View className="flex-row flex-wrap gap-1.5">
              {parsedTags.map((tag) => (
                <View key={tag} className="px-2.5 py-1 rounded-full" style={{ backgroundColor: '#eef2ff', borderWidth: 1, borderColor: '#c7d2fe' }}>
                  <Text className="text-[10px] font-medium" style={{ color: '#4338ca' }}>{tag}</Text>
                </View>
              ))}
            </View>
          )}
        </SectionCard>
      </ScrollView>

      <Modal
        visible={!!pickerSlot}
        transparent
        animationType="fade"
        onRequestClose={() => setPickerSlot(null)}
      >
        <Pressable
          className="flex-1 justify-end"
          onPress={() => setPickerSlot(null)}
          style={{ backgroundColor: 'rgba(0,0,0,0.35)' }}
        >
          <Pressable className="mx-4 mb-6 rounded-2xl p-4" style={{ backgroundColor: '#ffffff' }} onPress={() => {}}>
            <Text className="text-sm font-semibold mb-2" style={{ color: '#78350f' }}>{pickerTitle}</Text>
            {pickerActions.map((item) => (
              <Pressable
                key={item.label}
                onPress={() => runPickerAction(item.action)}
                className="py-3"
              >
                <Text className="text-sm font-semibold" style={{ color: item.destructive ? '#dc2626' : '#1f2937' }}>
                  {item.label}
                </Text>
              </Pressable>
            ))}
            <Pressable onPress={() => setPickerSlot(null)} className="pt-2 pb-1">
              <Text className="text-sm font-semibold" style={{ color: '#6b7280' }}>Cancel</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

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
          <Pressable className="w-full rounded-2xl p-4" style={{ backgroundColor: '#ffffff' }} onPress={() => {}}>
            <Text className="text-base font-bold mb-1" style={{ color: '#78350f' }}>{confirmTitle}</Text>
            <Text className="text-sm mb-3" style={{ color: '#6b7280' }}>{confirmMessage}</Text>
            {confirmActions.map((item) => (
              <Pressable
                key={item.label}
                onPress={() => runConfirmAction(item.onPress)}
                className="py-2.5"
              >
                <Text className="text-sm font-semibold" style={{ color: item.style === 'destructive' ? '#dc2626' : '#1f2937' }}>
                  {item.label}
                </Text>
              </Pressable>
            ))}
          </Pressable>
        </Pressable>
      </Modal>

      {/* Hero slot — free crop + auto 3:4 (web) */}
      <HeroPhotoPreviewModal
        photoPreview={photoPreview}
        onClose={() => {
          if (photoPreview?.previewUri?.startsWith('blob:')) {
            revokeBlobUri(photoPreview.previewUri);
          }
          setPhotoPreview(null);
        }}
        onUseOriginal={() => {
          const { color, label, asset, previewUri } = photoPreview;
          if (Platform.OS === 'web' && previewUri?.startsWith('blob:')) {
            revokeBlobUri(previewUri);
          }
          setPhotoPreview(null);
          finalizePhotoUpload(color, label, asset);
        }}
        onCroppedReady={({ color, label, asset, previewUri }) => {
          if (photoPreview?.previewUri?.startsWith('blob:')) {
            revokeBlobUri(photoPreview.previewUri);
          }
          setPhotoPreview(null);
          finalizePhotoUpload(color, label, asset);
        }}
      />

      {/* Fullscreen AI image viewer */}
      <Modal
        visible={!!viewerImage}
        transparent
        animationType="fade"
        onRequestClose={() => setViewerImage(null)}
      >
        <Pressable
          className="flex-1 items-center justify-center"
          style={{ backgroundColor: 'rgba(0,0,0,0.92)' }}
          onPress={() => setViewerImage(null)}
        >
          {viewerImage && (
            <Image
              source={{ uri: viewerImage }}
              style={{ width: '92%', height: '80%' }}
              resizeMode="contain"
            />
          )}
          <Pressable
            onPress={() => setViewerImage(null)}
            className="absolute items-center justify-center"
            style={{ top: insets.top + 12, right: 16, width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.18)' }}
          >
            <Ionicons name="close" size={22} color="#ffffff" />
          </Pressable>
        </Pressable>
      </Modal>

      {/* Sticky Footer */}
      <View
        style={{ paddingBottom: insets.bottom + 8, backgroundColor: CARD_BG, borderTopWidth: 1, borderTopColor: SECTION_BORDER }}
        className="px-4 pt-3"
      >
        <View className="flex-row gap-3">
          <Pressable
            onPress={() => saveProduct(false)}
            disabled={isSaving}
            className="flex-1 py-3.5 rounded-xl items-center"
            style={{ borderWidth: 2, borderColor: '#d4a017', opacity: isSaving ? 0.6 : 1 }}
          >
            {isSaving ? <ActivityIndicator size="small" color="#d4a017" /> : (
              <Text className="font-semibold text-sm" style={{ color: '#92400e' }}>Save Draft</Text>
            )}
          </Pressable>
          <Pressable
            onPress={() => saveProduct(true)}
            disabled={isSaving || !canSave}
            className="flex-1 py-3.5 rounded-xl items-center"
            style={{ backgroundColor: canSave ? AMBER_500 : '#e5e7eb', opacity: isSaving ? 0.6 : 1 }}
          >
            {isSaving ? <ActivityIndicator size="small" color="#ffffff" /> : (
              <Text className="text-white font-bold text-sm">Publish</Text>
            )}
          </Pressable>
        </View>
      </View>
    </View>
  );
}
