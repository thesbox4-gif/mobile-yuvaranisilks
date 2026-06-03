import Constants from 'expo-constants';

export const API_URL =
  process.env.EXPO_PUBLIC_API_URL ??
  Constants.expoConfig?.extra?.apiUrl ??
  'http://192.168.31.166:4000/api';

export const VALID_ORDER_TRANSITIONS = {
  placed: ['confirmed', 'cancelled'],
  confirmed: ['processing', 'cancelled', 'refunded'],
  processing: ['shipped', 'cancelled', 'refunded'],
  shipped: ['delivered', 'refunded'],
  delivered: ['refunded'],
  cancelled: [],
  refunded: [],
};

// Saree has no sizes (colour variants only). Jewellery uses gram weights.
export const PRODUCT_SIZES = {
  saree: [],
  jewellery: ['1g', '2g', '5g', '10g', '20g', '50g'],
};

export const PRODUCT_TYPES = [
  { value: 'saree', label: 'Saree', icon: 'shirt-outline', color: 'bg-pink-100 text-pink-700' },
  { value: 'jewellery', label: 'Jewellery', icon: 'diamond-outline', color: 'bg-amber-100 text-amber-700' },
];

export const ORDER_STATUS_CONFIG = {
  placed: { label: 'Placed', bg: '#dbeafe', text: '#1d4ed8', dot: '#3b82f6' },
  confirmed: { label: 'Confirmed', bg: '#e0e7ff', text: '#4338ca', dot: '#6366f1' },
  processing: { label: 'Processing', bg: '#fef3c7', text: '#b45309', dot: '#f59e0b' },
  shipped: { label: 'Shipped', bg: '#f3e8ff', text: '#6d28d9', dot: '#8b5cf6' },
  delivered: { label: 'Delivered', bg: '#dcfce7', text: '#15803d', dot: '#22c55e' },
  cancelled: { label: 'Cancelled', bg: '#fee2e2', text: '#b91c1c', dot: '#ef4444' },
  refunded: { label: 'Refunded', bg: '#f3f4f6', text: '#374151', dot: '#9ca3af' },
};

export const COLORS = [
  'Red', 'Blue', 'Green', 'Yellow', 'Purple', 'Pink', 'Orange', 'Black', 'White',
  'Navy', 'Maroon', 'Teal', 'Gold', 'Silver', 'Brown', 'Cream', 'Ivory',
];
