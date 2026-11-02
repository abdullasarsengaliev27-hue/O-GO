import { View, Text, TouchableOpacity, Linking, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const TELEGRAM_WEB = 'https://t.me/ogo_kz';
const TELEGRAM_APP = 'tg://resolve?domain=ogo_kz';
const INSTAGRAM_WEB = 'https://www.instagram.com/official.ogo?obrf=cWJjc3FoNzhwc3Bh';

const openLink = async (appUrl: string | null, webUrl: string) => {
  try {
    if (appUrl && (await Linking.canOpenURL(appUrl))) {
      await Linking.openURL(appUrl);
    } else {
      await Linking.openURL(webUrl);
    }
  } catch {
    Alert.alert('Не удалось открыть ссылку', webUrl);
  }
};

export function SocialLinks() {
  return (
    <View style={{ backgroundColor: '#fff', borderRadius: 20, padding: 16, elevation: 2 }}>
      <Text style={{ fontWeight: '800', color: '#1a1a1a', fontSize: 16, marginBottom: 4 }}>Мы в соцсетях</Text>
      <Text style={{ color: '#999', fontSize: 12, marginBottom: 14 }}>Новости, акции и поддержка O-GO</Text>

      <View style={{ flexDirection: 'row', gap: 10 }}>
        <TouchableOpacity
          onPress={() => openLink(TELEGRAM_APP, TELEGRAM_WEB)}
          activeOpacity={0.85}
          style={{ flex: 1, backgroundColor: '#229ED9', borderRadius: 16, paddingVertical: 14, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8 }}
        >
          <Ionicons name="paper-plane" size={20} color="#fff" />
          <Text style={{ color: '#fff', fontWeight: '800', fontSize: 14 }}>Telegram</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => openLink(null, INSTAGRAM_WEB)}
          activeOpacity={0.85}
          style={{ flex: 1, backgroundColor: '#E1306C', borderRadius: 16, paddingVertical: 14, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8 }}
        >
          <Ionicons name="logo-instagram" size={20} color="#fff" />
          <Text style={{ color: '#fff', fontWeight: '800', fontSize: 14 }}>Instagram</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
