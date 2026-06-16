import {  Platform } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { alertDialog } from '../lib/dialog';
import { FAST_PICKER_OPTIONS, prepareImageForUpload } from './prepareImageForUpload';

/** Pick one photo from gallery; returns local `uri` or null if cancelled. */
export async function pickImageFromGallery() {
  try {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      alertDialog('Permission needed', 'Allow photo library access to add images.');
      return null;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      ...FAST_PICKER_OPTIONS,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.72,
    });

    if (result.canceled || !result.assets?.[0]?.uri) return null;
    const prepared = await prepareImageForUpload(result.assets[0]);
    return prepared.uri;
  } catch (err) {
    alertDialog('Error', err?.message ?? 'Could not open photo library.');
    return null;
  }
}

/** Append picked image to multipart body (native + Expo web). */
export async function appendImageFile(formData, uri, fieldName = 'image') {
  const filename = uri.split('/').pop()?.split('?')[0] || `category-${Date.now()}.jpg`;
  const ext = filename.split('.').pop()?.toLowerCase() ?? 'jpg';
  const type = ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg' : `image/${ext}`;

  if (Platform.OS === 'web') {
    const res = await fetch(uri);
    const blob = await res.blob();
    formData.append(fieldName, blob, filename);
    return;
  }

  formData.append(fieldName, { uri, name: filename, type });
}
