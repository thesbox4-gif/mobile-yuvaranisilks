import { InteractionManager } from 'react-native';
import useAuthStore from '../store/authStore';
import useDialogStore from '../store/dialogStore';
import { queryClient } from './queryClient';
import { logout } from './api';

/** Clean, non-blocking sign-out used across the app. */
export function signOut() {
  const token = useAuthStore.getState().token;

  useDialogStore.getState().hideDialog();
  queryClient.cancelQueries();
  queryClient.clear();
  useAuthStore.getState().clearAuth();

  if (token) {
    logout(token).catch(() => {});
  }
}

/** Run post-login work after navigation has settled. */
export function runAfterAuthTransition(task) {
  InteractionManager.runAfterInteractions(() => {
    setTimeout(task, 300);
  });
}
