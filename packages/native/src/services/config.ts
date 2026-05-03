import { Platform } from 'react-native';

const DEV_IP = '192.168.1.109';
const PORT = 3000;

// Android Emulator vs. iOS/Physical Device
export const BASE_URL = Platform.select({
  android: `http://10.0.2.2:${PORT}`, // Special loopback for Android Emulators
  default: `http://${DEV_IP}:${PORT}`, // iOS and Physical Android devices
});

console.log('🔗 Native API connecting to:', BASE_URL);
