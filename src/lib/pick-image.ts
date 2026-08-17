import * as ImagePicker from 'expo-image-picker';

/** Opens the system photo library picker. Returns the chosen asset, or null if cancelled/denied. */
export async function pickImage(): Promise<ImagePicker.ImagePickerAsset | null> {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) return null;
  const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8 });
  if (result.canceled || !result.assets?.[0]) return null;
  return result.assets[0];
}
