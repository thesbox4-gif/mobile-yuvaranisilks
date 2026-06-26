import React, { useState, useRef } from 'react';
import { View, Text, Pressable, ActivityIndicator, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { getProductByBarcode } from '../../lib/api';
import useScanStore from '../../store/scanStore';
import { alertDialog } from '../../lib/dialog';

export default function BarcodeScannerScreen({ route, navigation }) {
  // mode='assign' → store barcode in scanStore and goBack (used from ProductWizard)
  // mode='lookup' → search product by barcode and navigate to ProductDetail
  const { mode = 'lookup' } = route.params ?? {};

  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [looking, setLooking] = useState(false);
  const [lastCode, setLastCode] = useState(null);
  const cooldownRef = useRef(false);

  const setPendingBarcode = useScanStore((s) => s.setPendingBarcode);
  const insets = useSafeAreaInsets();

  const handleBarcode = async ({ data }) => {
    if (cooldownRef.current || scanned) return;
    cooldownRef.current = true;
    setScanned(true);
    setLastCode(data);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    if (mode === 'assign') {
      setPendingBarcode(data);
      navigation.goBack();
      return;
    }

    // lookup mode — find product and navigate
    setLooking(true);
    try {
      const result = await getProductByBarcode(data);
      const products = result?.data ?? (Array.isArray(result) ? result : [result]);
      const product = products[0];
      if (product?.id) {
        navigation.replace('ProductDetail', { productId: product.id });
      } else {
        alertDialog('Not found', `No product found with barcode "${data}"`);
        setScanned(false);
        setLastCode(null);
        cooldownRef.current = false;
      }
    } catch (err) {
      alertDialog('Error', err.message);
      setScanned(false);
      setLastCode(null);
      cooldownRef.current = false;
    } finally {
      setLooking(false);
    }
  };

  const resetScan = () => {
    setScanned(false);
    setLastCode(null);
    cooldownRef.current = false;
  };

  // Permission not yet determined
  if (!permission) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#f59e0b" />
      </View>
    );
  }

  // Permission denied
  if (!permission.granted) {
    return (
      <View style={[styles.center, { paddingTop: insets.top }]}>
        <Ionicons name="camera-off-outline" size={56} color="#9ca3af" />
        <Text style={styles.permTitle}>Camera Access Needed</Text>
        <Text style={styles.permSub}>Allow camera access to scan barcodes.</Text>
        <Pressable style={styles.permBtn} onPress={requestPermission}>
          <Text style={styles.permBtnText}>Allow Camera</Text>
        </Pressable>
        <Pressable style={styles.cancelBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.cancelBtnText}>Cancel</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={StyleSheet.absoluteFill}>
      <CameraView
        style={StyleSheet.absoluteFill}
        facing="back"
        onBarcodeScanned={scanned ? undefined : handleBarcode}
        barcodeScannerSettings={{
          barcodeTypes: ['qr', 'ean13', 'ean8', 'code128', 'code39', 'upc_a', 'upc_e'],
        }}
      />

      {/* Dark overlay with cutout hint */}
      <View style={styles.overlay} pointerEvents="none">
        {/* Top dark band */}
        <View style={styles.overlayTop} />
        {/* Middle row: dark | clear window | dark */}
        <View style={styles.overlayMiddle}>
          <View style={styles.overlaySide} />
          <View style={styles.scanWindow}>
            {/* Corner marks */}
            <View style={[styles.corner, styles.cornerTL]} />
            <View style={[styles.corner, styles.cornerTR]} />
            <View style={[styles.corner, styles.cornerBL]} />
            <View style={[styles.corner, styles.cornerBR]} />
          </View>
          <View style={styles.overlaySide} />
        </View>
        {/* Bottom dark band */}
        <View style={styles.overlayBottom} />
      </View>

      {/* Top bar */}
      <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
        <Pressable onPress={() => navigation.goBack()} style={styles.closeBtn}>
          <Ionicons name="close" size={22} color="#fff" />
        </Pressable>
        <Text style={styles.topTitle}>
          {mode === 'assign' ? 'Scan Product Barcode' : 'Scan to Find Product'}
        </Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Hint label */}
      <View style={styles.hintWrap} pointerEvents="none">
        <Text style={styles.hintText}>
          {looking
            ? 'Looking up product…'
            : scanned
            ? `Scanned: ${lastCode}`
            : 'Point at a barcode or QR code'}
        </Text>
      </View>

      {/* Loading overlay when looking up product */}
      {looking && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#f59e0b" />
          <Text style={styles.loadingText}>Finding product…</Text>
        </View>
      )}

      {/* Retry button (assign mode only — lookup auto-retries on alert dismiss) */}
      {scanned && !looking && mode === 'assign' && (
        <View style={[styles.retryWrap, { paddingBottom: insets.bottom + 16 }]}>
          <Pressable style={styles.retryBtn} onPress={resetScan}>
            <Ionicons name="refresh" size={18} color="#fff" />
            <Text style={styles.retryText}>Scan Again</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

const WINDOW_SIZE = 240;
const CORNER_SIZE = 24;
const CORNER_THICKNESS = 3;
const CORNER_COLOR = '#f59e0b';

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#111827', padding: 24 },
  permTitle: { color: '#f9fafb', fontSize: 18, fontWeight: '700', marginTop: 16, textAlign: 'center' },
  permSub: { color: '#9ca3af', fontSize: 14, marginTop: 8, textAlign: 'center', lineHeight: 20 },
  permBtn: { marginTop: 24, backgroundColor: '#f59e0b', paddingHorizontal: 28, paddingVertical: 14, borderRadius: 14 },
  permBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  cancelBtn: { marginTop: 12, paddingVertical: 10 },
  cancelBtnText: { color: '#9ca3af', fontSize: 14 },
  overlay: { ...StyleSheet.absoluteFillObject, flexDirection: 'column' },
  overlayTop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.62)' },
  overlayMiddle: { flexDirection: 'row', height: WINDOW_SIZE },
  overlaySide: { flex: 1, backgroundColor: 'rgba(0,0,0,0.62)' },
  scanWindow: { width: WINDOW_SIZE, height: WINDOW_SIZE, borderRadius: 4 },
  overlayBottom: { flex: 1.4, backgroundColor: 'rgba(0,0,0,0.62)' },
  corner: {
    position: 'absolute',
    width: CORNER_SIZE,
    height: CORNER_SIZE,
  },
  cornerTL: {
    top: 0, left: 0,
    borderTopWidth: CORNER_THICKNESS, borderLeftWidth: CORNER_THICKNESS,
    borderColor: CORNER_COLOR, borderTopLeftRadius: 4,
  },
  cornerTR: {
    top: 0, right: 0,
    borderTopWidth: CORNER_THICKNESS, borderRightWidth: CORNER_THICKNESS,
    borderColor: CORNER_COLOR, borderTopRightRadius: 4,
  },
  cornerBL: {
    bottom: 0, left: 0,
    borderBottomWidth: CORNER_THICKNESS, borderLeftWidth: CORNER_THICKNESS,
    borderColor: CORNER_COLOR, borderBottomLeftRadius: 4,
  },
  cornerBR: {
    bottom: 0, right: 0,
    borderBottomWidth: CORNER_THICKNESS, borderRightWidth: CORNER_THICKNESS,
    borderColor: CORNER_COLOR, borderBottomRightRadius: 4,
  },
  topBar: {
    position: 'absolute', top: 0, left: 0, right: 0,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingBottom: 12,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  closeBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  topTitle: { color: '#fff', fontSize: 16, fontWeight: '700' },
  hintWrap: {
    position: 'absolute', left: 0, right: 0,
    alignItems: 'center',
    top: '60%',
    marginTop: 12,
  },
  hintText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    overflow: 'hidden',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: { color: '#fff', fontSize: 14, fontWeight: '600', marginTop: 12 },
  retryWrap: { position: 'absolute', bottom: 0, left: 0, right: 0, alignItems: 'center' },
  retryBtn: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#f59e0b',
    paddingHorizontal: 24, paddingVertical: 14, borderRadius: 14, gap: 8,
  },
  retryText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
