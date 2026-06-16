import React, { useRef, useState } from 'react';
import {
  View, Text, Image, Pressable, Modal, Dimensions, PanResponder,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
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

function pinchDistance(touches) {
  if (!touches || touches.length < 2) return null;
  const [first, second] = touches;
  const dx = first.pageX - second.pageX;
  const dy = first.pageY - second.pageY;
  return Math.sqrt((dx * dx) + (dy * dy));
}

export default function ImageZoomModal({ imageUrl, onClose }) {
  const insets = useSafeAreaInsets();
  const lastTapRef = useRef(0);
  const pinchStartDistanceRef = useRef(null);
  const pinchStartScaleRef = useRef(1);
  const zoomScaleRef = useRef(1);
  const zoomOffsetRef = useRef({ x: 0, y: 0 });
  const panStartRef = useRef(null);
  const isPinchingRef = useRef(false);
  const imageUrlRef = useRef(null);

  const [zoomScale, setZoomScale] = useState(1);
  const [zoomOffset, setZoomOffset] = useState({ x: 0, y: 0 });

  zoomScaleRef.current = zoomScale;
  zoomOffsetRef.current = zoomOffset;
  imageUrlRef.current = imageUrl;

  const setZoomScaleClamped = (nextScale) => {
    const scale = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, Number(nextScale.toFixed(3))));
    setZoomScale(scale);
    if (scale <= 1) {
      setZoomOffset({ x: 0, y: 0 });
    } else {
      setZoomOffset((o) => clampZoomOffset(o, scale));
    }
  };

  const handleClose = () => {
    setZoomScale(1);
    setZoomOffset({ x: 0, y: 0 });
    onClose();
  };

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

  const zoomPanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => !!imageUrlRef.current,
      onMoveShouldSetPanResponder: () => !!imageUrlRef.current,
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
        if (touches.length === 1 && zoomScaleRef.current > 1) {
          isPinchingRef.current = false;
          panStartRef.current = {
            x: touches[0].pageX,
            y: touches[0].pageY,
            ox: zoomOffsetRef.current.x,
            oy: zoomOffsetRef.current.y,
          };
        }
      },
      onPanResponderMove: (evt) => {
        const touches = evt.nativeEvent.touches;
        if (touches.length === 2) {
          isPinchingRef.current = true;
          const distance = pinchDistance(touches);
          const startDistance = pinchStartDistanceRef.current;
          if (!distance || !startDistance) return;
          setZoomScaleClamped(pinchStartScaleRef.current * (distance / startDistance));
          return;
        }
        if (
          touches.length === 1
          && panStartRef.current
          && zoomScaleRef.current > 1
          && !isPinchingRef.current
        ) {
          const dx = touches[0].pageX - panStartRef.current.x;
          const dy = touches[0].pageY - panStartRef.current.y;
          setZoomOffset(clampZoomOffset({
            x: panStartRef.current.ox + dx,
            y: panStartRef.current.oy + dy,
          }, zoomScaleRef.current));
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

  return (
    <Modal
      visible={!!imageUrl}
      transparent={false}
      animationType="fade"
      onRequestClose={handleClose}
      statusBarTranslucent
    >
      <View style={{ flex: 1, backgroundColor: '#000' }}>
        <View
          style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}
          {...zoomPanResponder.panHandlers}
        >
          {imageUrl ? (
            <Pressable onPress={handleZoomTap} accessibilityRole="imagebutton">
              <Image
                source={{ uri: imageUrl }}
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
          onPress={handleClose}
          style={{ position: 'absolute', top: insets.top + 8, right: 16 }}
          className="w-10 h-10 bg-white/20 rounded-full items-center justify-center"
        >
          <Ionicons name="close" size={22} color="#fff" />
        </Pressable>

        <View
          style={{ position: 'absolute', bottom: insets.bottom + 20, left: 0, right: 0 }}
          className="items-center"
          pointerEvents="box-none"
        >
          <Text className="text-white/50 text-xs mb-2">
            Pinch or − / + to zoom · drag to pan · double-tap to toggle
          </Text>
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
  );
}
