module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo', 'nativewind/babel'],
    plugins: [
      // MUST be last. Do NOT add react-native-worklets/plugin separately —
      // it is bundled inside react-native-reanimated/plugin in Reanimated v4.
      'react-native-reanimated/plugin',
    ],
  };
};
