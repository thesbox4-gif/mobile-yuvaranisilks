import { Alert, Platform } from 'react-native';

// react-native-web's Alert.alert renders via window.alert and ignores the
// buttons array entirely — so every `onPress` callback (confirm, navigate,
// sign-out) silently never fires on web. These helpers fall back to the
// browser's window.confirm / window.alert there and use the native Alert on
// devices, so confirmation flows behave the same on every platform.

export function confirmDialog({
  title,
  message = '',
  confirmText = 'OK',
  cancelText = 'Cancel',
  destructive = false,
  onConfirm,
  onCancel,
}) {
  if (Platform.OS === 'web') {
    const ok = window.confirm([title, message].filter(Boolean).join('\n\n'));
    if (ok) onConfirm?.();
    else onCancel?.();
    return;
  }
  Alert.alert(title, message, [
    { text: cancelText, style: 'cancel', onPress: onCancel },
    {
      text: confirmText,
      style: destructive ? 'destructive' : 'default',
      onPress: onConfirm,
    },
  ]);
}

// Single-acknowledgement notice. window.alert blocks until dismissed, so an
// `onClose` callback (e.g. navigate away) runs reliably afterwards on web too.
export function notifyDialog({ title, message = '', onClose }) {
  if (Platform.OS === 'web') {
    window.alert([title, message].filter(Boolean).join('\n\n'));
    onClose?.();
    return;
  }
  Alert.alert(title, message, [{ text: 'OK', onPress: onClose }]);
}
