import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View, Text, Pressable, Image, Modal, ActivityIndicator, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  FULL_CROP,
  clampCrop,
  containLayout,
  normToDisplay,
  buildCroppedHeroAsset,
} from '../../lib/heroImageCrop';

const HANDLE = 28;
const MIN_SPAN = 0.08;

function adjustCropFromDrag(start, handle, dx, dy, layout) {
  const dnx = dx / layout.width;
  const dny = dy / layout.height;
  let { left, top, right, bottom } = start;
  switch (handle) {
    case 'tl':
      left += dnx; top += dny; break;
    case 'tr':
      right += dnx; top += dny; break;
    case 'bl':
      left += dnx; bottom += dny; break;
    case 'br':
      right += dnx; bottom += dny; break;
    case 't':
      top += dny; break;
    case 'b':
      bottom += dny; break;
    case 'l':
      left += dnx; break;
    case 'r':
      right += dnx; break;
    case 'move':
      left += dnx; top += dny; right += dnx; bottom += dny; break;
    default:
      break;
  }
  return clampCrop({ left, top, right, bottom }, MIN_SPAN);
}

function pointerXY(e) {
  if (e.touches?.length) {
    return { x: e.touches[0].clientX, y: e.touches[0].clientY };
  }
  if (e.changedTouches?.length) {
    return { x: e.changedTouches[0].clientX, y: e.changedTouches[0].clientY };
  }
  return { x: e.clientX, y: e.clientY };
}

function useWebCropDrag(layout, onCropChange) {
  const dragRef = useRef(null);
  const onCropChangeRef = useRef(onCropChange);
  onCropChangeRef.current = onCropChange;

  useEffect(() => {
    if (Platform.OS !== 'web' || typeof document === 'undefined') return undefined;

    const onMove = (e) => {
      const d = dragRef.current;
      if (!d || !layout) return;
      e.preventDefault?.();
      const { x, y } = pointerXY(e);
      onCropChangeRef.current(
        adjustCropFromDrag(d.startCrop, d.handle, x - d.startX, y - d.startY, layout)
      );
    };

    const onUp = () => {
      dragRef.current = null;
    };

    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
    document.addEventListener('touchmove', onMove, { passive: false });
    document.addEventListener('touchend', onUp);
    document.addEventListener('touchcancel', onUp);
    return () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      document.removeEventListener('touchmove', onMove);
      document.removeEventListener('touchend', onUp);
      document.removeEventListener('touchcancel', onUp);
    };
  }, [layout]);

  return useCallback(
    (handle, startCrop) => (e) => {
      if (!layout) return;
      e.stopPropagation?.();
      e.preventDefault?.();
      const { x, y } = pointerXY(e);
      dragRef.current = { handle, startCrop, startX: x, startY: y };
    },
    [layout]
  );
}

function CropOverlay({ layout, crop, onCropChange }) {
  const beginDrag = useWebCropDrag(layout, onCropChange);
  if (!layout?.width) return null;

  const box = normToDisplay(crop, layout);
  const handles = [
    { id: 'tl', left: box.left - HANDLE / 2, top: box.top - HANDLE / 2 },
    { id: 'tr', left: box.left + box.width - HANDLE / 2, top: box.top - HANDLE / 2 },
    { id: 'bl', left: box.left - HANDLE / 2, top: box.top + box.height - HANDLE / 2 },
    { id: 'br', left: box.left + box.width - HANDLE / 2, top: box.top + box.height - HANDLE / 2 },
    { id: 't', left: box.left + box.width / 2 - HANDLE / 2, top: box.top - HANDLE / 2 },
    { id: 'b', left: box.left + box.width / 2 - HANDLE / 2, top: box.top + box.height - HANDLE / 2 },
    { id: 'l', left: box.left - HANDLE / 2, top: box.top + box.height / 2 - HANDLE / 2 },
    { id: 'r', left: box.left + box.width - HANDLE / 2, top: box.top + box.height / 2 - HANDLE / 2 },
  ];

  const shade = (l, t, w, h, key) => (
    <View
      key={key}
      pointerEvents="none"
      style={{
        position: 'absolute',
        left: l,
        top: t,
        width: Math.max(0, w),
        height: Math.max(0, h),
        backgroundColor: 'rgba(0,0,0,0.45)',
      }}
    />
  );

  const dragProps = (handle) =>
    Platform.OS === 'web'
      ? {
          onMouseDown: beginDrag(handle, crop),
          onTouchStart: beginDrag(handle, crop),
        }
      : {};

  const { x, y, width: cw, height: ch } = layout;

  return (
    <View
      pointerEvents="box-none"
      style={{ position: 'absolute', left: 0, top: 0, right: 0, bottom: 0, zIndex: 10 }}
    >
      {shade(x, y, box.left - x, ch, 'l')}
      {shade(box.left, y, box.width, box.top - y, 't')}
      {shade(box.left, box.top + box.height, box.width, y + ch - (box.top + box.height), 'b')}
      {shade(box.left + box.width, y, x + cw - (box.left + box.width), ch, 'r')}

      <View
        {...dragProps('move')}
        style={{
          position: 'absolute',
          left: box.left,
          top: box.top,
          width: box.width,
          height: box.height,
          borderWidth: 2,
          borderColor: '#ffffff',
          cursor: Platform.OS === 'web' ? 'move' : undefined,
          touchAction: 'none',
          zIndex: 15,
        }}
      />

      {handles.map((h) => (
        <View
          key={h.id}
          {...dragProps(h.id)}
          style={{
            position: 'absolute',
            left: h.left,
            top: h.top,
            width: HANDLE,
            height: HANDLE,
            borderRadius: HANDLE / 2,
            backgroundColor: '#ffffff',
            borderWidth: 2,
            borderColor: '#b91c1c',
            zIndex: 20,
            cursor: Platform.OS === 'web' ? 'pointer' : undefined,
            touchAction: 'none',
          }}
        />
      ))}
    </View>
  );
}

export default function HeroPhotoPreviewModal({
  photoPreview,
  onClose,
  onUseOriginal,
  onCroppedReady,
}) {
  const [cropping, setCropping] = useState(false);
  const [crop, setCrop] = useState(FULL_CROP);
  const [layout, setLayout] = useState(null);
  const [natural, setNatural] = useState({ w: 0, h: 0 });
  const [containerSize, setContainerSize] = useState({ w: 0, h: 0 });
  const [applying, setApplying] = useState(false);

  useEffect(() => {
    if (!photoPreview) {
      setCropping(false);
      setCrop(FULL_CROP);
      setLayout(null);
      return;
    }
    if (photoPreview.previewUri) {
      Image.getSize(
        photoPreview.previewUri,
        (w, h) => setNatural({ w, h }),
        () => {}
      );
    }
  }, [photoPreview]);

  useEffect(() => {
    if (!containerSize.w) return;
    const imgLayout = natural.w
      ? containLayout(containerSize.w, containerSize.h, natural.w, natural.h)
      : { x: 0, y: 0, width: containerSize.w, height: containerSize.h, scale: 1 };
    setLayout(imgLayout);
  }, [natural, containerSize]);

  const startCrop = () => {
    setCrop(FULL_CROP);
    setCropping(true);
  };

  const cancelCrop = () => {
    setCropping(false);
    setCrop(FULL_CROP);
  };

  const applyCrop = async () => {
    if (!photoPreview?.previewUri) return;
    setApplying(true);
    try {
      const { file, name, uri } = await buildCroppedHeroAsset(photoPreview.previewUri, crop);
      onCroppedReady({
        color: photoPreview.color,
        label: photoPreview.label,
        asset: {
          ...photoPreview.asset,
          file,
          uri,
          name,
        },
        previewUri: uri,
      });
    } catch (err) {
      if (Platform.OS === 'web') {
        window.alert(err.message || 'Could not crop image');
      }
    } finally {
      setApplying(false);
    }
  };

  const onContainerLayout = useCallback((e) => {
    const { width, height } = e.nativeEvent.layout;
    setContainerSize({ w: width, h: height });
  }, []);

  if (!photoPreview) return null;

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <Pressable
        className="flex-1 items-center justify-center px-6"
        onPress={onClose}
        style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}
      >
        <View
          className="w-full rounded-2xl p-4"
          style={{ backgroundColor: '#ffffff' }}
          onStartShouldSetResponder={() => true}
          onResponderTerminationRequest={() => false}
        >
          <Text className="text-base font-bold mb-3" style={{ color: '#78350f' }}>
            {photoPreview.label}
          </Text>

          {photoPreview.previewUri && (
            <View
              className="rounded-xl mb-3"
              style={{
                height: 360,
                backgroundColor: '#fef7f0',
                overflow: cropping ? 'visible' : 'hidden',
              }}
              onLayout={onContainerLayout}
            >
              <Image
                source={{ uri: photoPreview.previewUri }}
                style={{ width: '100%', height: '100%' }}
                resizeMode="contain"
                pointerEvents="none"
                onLoad={(e) => {
                  const src = e.nativeEvent?.source;
                  if (src?.width && src?.height) {
                    setNatural({ w: src.width, h: src.height });
                  }
                }}
              />

              {!cropping && (
                <Pressable
                  onPress={startCrop}
                  className="absolute items-center justify-center"
                  style={{
                    top: 10,
                    right: 10,
                    width: 44,
                    height: 44,
                    borderRadius: 22,
                    backgroundColor: 'rgba(255,255,255,0.95)',
                    borderWidth: 1,
                    borderColor: '#fde8d0',
                    zIndex: 5,
                  }}
                  accessibilityLabel="Crop photo"
                >
                  <Ionicons name="crop" size={22} color="#b91c1c" />
                </Pressable>
              )}

              {cropping && layout && (
                <CropOverlay layout={layout} crop={crop} onCropChange={setCrop} />
              )}
            </View>
          )}

          {cropping ? (
            <>
              <Pressable
                onPress={applyCrop}
                disabled={applying}
                className="py-3 rounded-xl items-center mb-2"
                style={{ backgroundColor: '#b91c1c', opacity: applying ? 0.7 : 1 }}
              >
                {applying ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <Text className="text-sm font-bold text-white">Apply</Text>
                )}
              </Pressable>
              <Pressable onPress={cancelCrop} className="py-2.5 items-center">
                <Text className="text-sm font-semibold" style={{ color: '#6b7280' }}>Back</Text>
              </Pressable>
            </>
          ) : (
            <>
              <Pressable onPress={onUseOriginal} className="py-2.5">
                <Text className="text-sm font-semibold" style={{ color: '#1f2937' }}>Use photo</Text>
              </Pressable>
              <Pressable onPress={onClose} className="py-2.5">
                <Text className="text-sm font-semibold" style={{ color: '#6b7280' }}>Cancel</Text>
              </Pressable>
            </>
          )}
        </View>
      </Pressable>
    </Modal>
  );
}
