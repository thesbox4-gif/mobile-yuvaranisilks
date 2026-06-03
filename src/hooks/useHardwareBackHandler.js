import { useCallback } from 'react';
import { BackHandler } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';

/**
 * Android hardware back. Handler return true = consumed, false = default nav.
 */
export function useHardwareBackHandler(handler) {
  useFocusEffect(
    useCallback(() => {
      const sub = BackHandler.addEventListener('hardwareBackPress', () => {
        const consumed = handler();
        return consumed === true;
      });
      return () => sub.remove();
    }, [handler])
  );
}

export function navigateToDashboard(navigation) {
  navigation.getParent()?.navigate('DashboardTab', { screen: 'Dashboard' });
}

/** At tab root with empty stack: hardware back → Dashboard. Nested screens: normal pop. */
export function useRootTabBackToDashboard(navigation) {
  useHardwareBackHandler(useCallback(() => {
    if (navigation.canGoBack()) return false;
    navigateToDashboard(navigation);
    return true;
  }, [navigation]));
}
