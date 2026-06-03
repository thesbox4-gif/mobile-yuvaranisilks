import React, { useEffect, useRef } from 'react';
import { View, Text, Image, Animated, StyleSheet } from 'react-native';
import { BRAND } from '../../constants/brand';

export default function BrandSplash() {
  const logoScale = useRef(new Animated.Value(0.72)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const textOpacity = useRef(new Animated.Value(0)).current;
  const textTranslate = useRef(new Animated.Value(18)).current;
  const shimmer = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.parallel([
        Animated.spring(logoScale, {
          toValue: 1,
          friction: 7,
          tension: 55,
          useNativeDriver: true,
        }),
        Animated.timing(logoOpacity, {
          toValue: 1,
          duration: 650,
          useNativeDriver: true,
        }),
      ]),
      Animated.parallel([
        Animated.timing(textOpacity, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.spring(textTranslate, {
          toValue: 0,
          friction: 8,
          tension: 50,
          useNativeDriver: true,
        }),
      ]),
      Animated.loop(
        Animated.sequence([
          Animated.timing(shimmer, {
            toValue: 1,
            duration: 900,
            useNativeDriver: true,
          }),
          Animated.timing(shimmer, {
            toValue: 0,
            duration: 900,
            useNativeDriver: true,
          }),
        ]),
        { iterations: 2 }
      ),
    ]).start();
  }, [logoOpacity, logoScale, shimmer, textOpacity, textTranslate]);

  const textGlow = shimmer.interpolate({
    inputRange: [0, 1],
    outputRange: [0.85, 1],
  });

  return (
    <View style={styles.container}>
      <Animated.View
        style={{
          opacity: logoOpacity,
          transform: [{ scale: logoScale }],
        }}
      >
        <Image source={BRAND.logo} style={styles.logo} resizeMode="contain" />
      </Animated.View>

      <Animated.View
        style={{
          opacity: textOpacity,
          transform: [{ translateY: textTranslate }],
          marginTop: 20,
          alignItems: 'center',
        }}
      >
        <Animated.Text style={[styles.title, { opacity: textGlow }]}>
          {BRAND.nameUpper}
        </Animated.Text>
        <Text style={styles.tagline}>{BRAND.tagline}</Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BRAND.colors.charcoal,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
  },
  logo: {
    width: 300,
    height: 88,
  },
  title: {
    color: BRAND.colors.gold,
    fontSize: 13,
    letterSpacing: 4,
    fontWeight: '700',
  },
  tagline: {
    color: 'rgba(201, 162, 39, 0.65)',
    fontSize: 11,
    marginTop: 8,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
});
