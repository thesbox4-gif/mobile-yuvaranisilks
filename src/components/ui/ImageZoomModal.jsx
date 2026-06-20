import React, { useRef, useState, useEffect, useMemo } from 'react';
import {
  View, Text, Pressable, Modal, Dimensions, PanResponder, Animated, Easing,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const MIN_ZOOM = 1;
const MAX_ZOOM = 4;

function clampScale(value) {
  return Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, value));
}

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
  const panStartRef = useRef(null);
  const isPinchingRef = useRef(false);
  const movedDuringGestureRef = useRef(false);
  const imageUrlRef = useRef(null);

  const scaleAnim = useRef(new Animated.Value(1)).current;
  const translateXAnim = useRef(new Animated.Value(0)).current;
  const translateYAnim = useRef(new Animated.Value(0)).current;

  const scaleRef = useRef(1);
  const offsetRef = useRef({ x: 0, y: 0 });

  const [displayScale, setDisplayScale] = useState(100);

  imageUrlRef.current = imageUrl;

  const applyTransform = (nextScale, nextOffset, { animate = false } = {}) => {
    const scale = clampScale(nextScale);
    const offset = scale <= 1 ? { x: 0, y: 0 } : clampZoomOffset(nextOffset, scale);

    scaleRef.current = scale;
    offsetRef.current = offset;

    if (animate) {
      Animated.parallel([
        Animated.timing(scaleAnim, {
          toValue: scale,
          duration: 180,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(translateXAnim, {
          toValue: offset.x,
          duration: 180,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(translateYAnim, {
          toValue: offset.y,
          duration: 180,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      scaleAnim.setValue(scale);
      translateXAnim.setValue(offset.x);
      translateYAnim.setValue(offset.y);
    }
  };

  const syncDisplayScale = () => {
    setDisplayScale(Math.round(scaleRef.current * 100));
  };

  const resetTransform = () => {
    scaleRef.current = 1;
    offsetRef.current = { x: 0, y: 0 };
    scaleAnim.setValue(1);
    translateXAnim.setValue(0);
    translateYAnim.setValue(0);
    setDisplayScale(100);
  };

  useEffect(() => {
    if (imageUrl) resetTransform();
  }, [imageUrl]);

  const handleClose = () => {
    resetTransform();
    onClose();
  };

  const setZoomScaleClamped = (nextScale, { animate = true } = {}) => {
    applyTransform(nextScale, offsetRef.current, { animate });
    if (scaleRef.current < 1) {
  applyTransform(1, { x: 0, y: 0 }, { animate: true });
}

syncDisplayScale();
  };

  const handleZoomTap = () => {
    const now = Date.now();
    if (now - lastTapRef.current < 300) {
      if (scaleRef.current > 1) {
        applyTransform(1, { x: 0, y: 0 }, { animate: true });
      } else {
        applyTransform(2.5, { x: 0, y: 0 }, { animate: true });
      }
      setTimeout(syncDisplayScale, 190);
    }
    lastTapRef.current = now;
  };

  const zoomPanResponder = useMemo(
    () => PanResponder.create({
onStartShouldSetPanResponder: (evt) => {
  return !!imageUrlRef.current;
},

onStartShouldSetPanResponderCapture: () => true,
onMoveShouldSetPanResponderCapture: () => true,
      onMoveShouldSetPanResponder: (_, gesture) => (
        !!imageUrlRef.current
        && (gesture.numberActiveTouches === 2
          || Math.abs(gesture.dx) > 2
          || Math.abs(gesture.dy) > 2)
      ),
      onPanResponderGrant: (evt) => {
        movedDuringGestureRef.current = false;
        const touches = evt.nativeEvent.touches;
        if (touches.length === 2) {
          isPinchingRef.current = true;
          const distance = pinchDistance(touches);
          if (!distance) return;
          pinchStartDistanceRef.current = distance;
          pinchStartScaleRef.current = scaleRef.current;
          panStartRef.current = null;
          return;
        }
        if (touches.length === 1) {
          isPinchingRef.current = false;
          pinchStartDistanceRef.current = null;
          if (scaleRef.current > 1) {
            panStartRef.current = {
              x: touches[0].pageX,
              y: touches[0].pageY,
              ox: offsetRef.current.x,
              oy: offsetRef.current.y,
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
            pinchStartScaleRef.current = scaleRef.current;
            panStartRef.current = null;
            return;
          }

          const distance = pinchDistance(touches);
          const startDistance = pinchStartDistanceRef.current;
          if (!distance || !startDistance) return;

          movedDuringGestureRef.current = true;
          const newScale = clampScale(pinchStartScaleRef.current * (distance / startDistance));
          applyTransform(newScale, offsetRef.current, { animate: false });
          return;
        }
        if (touches.length === 1) {
          if (isPinchingRef.current) {
            isPinchingRef.current = false;
            pinchStartDistanceRef.current = null;
            panStartRef.current = null;
          }
          if (scaleRef.current > 1) {
            if (!panStartRef.current) {
              panStartRef.current = {
                x: touches[0].pageX,
                y: touches[0].pageY,
                ox: offsetRef.current.x,
                oy: offsetRef.current.y,
              };
              return;
            }
            const dx = touches[0].pageX - panStartRef.current.x;
            const dy = touches[0].pageY - panStartRef.current.y;
            if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
              movedDuringGestureRef.current = true;
            }
            applyTransform(scaleRef.current, {
              x: panStartRef.current.ox + dx,
              y: panStartRef.current.oy + dy,
            });
          }
        }
      },
      onPanResponderRelease: () => {
        pinchStartDistanceRef.current = null;
        panStartRef.current = null;
        isPinchingRef.current = false;
        if (scaleRef.current < 1) {
  applyTransform(1, { x: 0, y: 0 }, { animate: true });
}

syncDisplayScale();
        if (!movedDuringGestureRef.current) {
          handleZoomTap();
        }
      },
      onPanResponderTerminate: () => {
        pinchStartDistanceRef.current = null;
        panStartRef.current = null;
        isPinchingRef.current = false;
        if (scaleRef.current < 1) {
  applyTransform(1, { x: 0, y: 0 }, { animate: true });
}

syncDisplayScale();

      },
    }),
    [scaleAnim, translateXAnim, translateYAnim],
  );

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
            <Animated.Image
              source={{ uri: imageUrl }}
              style={{
                width: SCREEN_WIDTH,
                height: SCREEN_HEIGHT,
                transform: [
                  { translateX: translateXAnim },
                  { translateY: translateYAnim },
                  { scale: scaleAnim },
                ],
              }}
              resizeMode="contain"
              fadeDuration={0}
            />
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
              onPress={() => setZoomScaleClamped(scaleRef.current - 0.5)}
              className="w-12 h-12 bg-white/20 rounded-full items-center justify-center"
            >
              <Ionicons name="remove" size={24} color="#fff" />
            </Pressable>
            <View className="bg-white/20 rounded-full px-4 py-2 mx-3">
              <Text className="text-white text-sm font-semibold">{displayScale}%</Text>
            </View>
            <Pressable
              onPress={() => setZoomScaleClamped(scaleRef.current + 0.5)}
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
