import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { updatePushToken } from './api';

let handlerConfigured = false;

function isExpoGo() {
  return (
    Constants.appOwnership === 'expo'
    || Constants.executionEnvironment === 'storeClient'
  );
}

async function getNotificationsModule() {
  return import('expo-notifications');
}

export async function configureNotificationHandler() {
  if (handlerConfigured || isExpoGo()) return;

  const Notifications = await getNotificationsModule();
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
      shouldShowBanner: true,
      shouldShowList: true,
      }),
    });
    handlerConfigured = true;
  }

export async function registerPushToken() {
  if (isExpoGo()) return;
  if (!Device.isDevice) return;

  const Notifications = await getNotificationsModule();
  await configureNotificationHandler();

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#f59e0b',
      sound: 'default',
    });
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') return;

  try {
    const devicePushToken = await Notifications.getDevicePushTokenAsync();
    const fcmToken = devicePushToken?.data;
    if (fcmToken) {
      await updatePushToken(fcmToken);
    }
  } catch (err) {
    console.warn('[push] FCM token registration failed:', err?.message || err);
  }
}

export async function setupNotificationListeners({ onNotificationReceived, onNotificationResponse } = {}) {
  if (isExpoGo()) {
    return () => {};
  }

  await configureNotificationHandler();
  const Notifications = await getNotificationsModule();

  const receivedSub = Notifications.addNotificationReceivedListener((notification) => {
    onNotificationReceived?.(notification);
  });

  const responseSub = Notifications.addNotificationResponseReceivedListener((response) => {
    onNotificationResponse?.(response);
  });

  return () => {
    receivedSub.remove();
    responseSub.remove();
  };
}
