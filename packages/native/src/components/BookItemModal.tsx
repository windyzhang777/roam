import { Modal, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useThemeContext } from './theme-provider';

interface BookItemModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
}

interface ScrapeBookProps extends BookItemModalProps {
  scrapeUrl: string;
  setScrapeUrl: (text: string) => void;
  onConfirm: () => void;
}

export const ScrapeBookModal = ({ open, onClose, title, scrapeUrl, setScrapeUrl, onConfirm }: ScrapeBookProps) => {
  const { colors } = useThemeContext();

  return (
    <Modal visible={open} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
          <Text style={[styles.modalTitle, { color: colors.foreground }]}>{title}</Text>
          <TextInput
            autoFocus
            placeholder="https://www.xpxs.net/book/<BOOK-ID>"
            placeholderTextColor={colors.mutedForeground}
            value={scrapeUrl}
            onChangeText={setScrapeUrl}
            onSubmitEditing={() => {
              if (!scrapeUrl.trim()) return;
              onConfirm();
              setScrapeUrl('');
              onClose();
            }}
            style={[styles.modalInput, { color: colors.foreground, borderColor: colors.border }]}
          />
          <View style={styles.modalFooter}>
            <TouchableOpacity
              onPress={() => {
                setScrapeUrl('');
                onClose();
              }}
              style={[styles.modalButton, { borderColor: colors.border, borderWidth: 1 }]}
            >
              <Text style={{ color: colors.foreground }}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => {
                if (!scrapeUrl.trim()) return;
                onConfirm();
                setScrapeUrl('');
                onClose();
              }}
              style={[styles.modalButton, { backgroundColor: colors.primary }]}
            >
              <Text style={{ color: colors.background, fontWeight: '600' }}>Ok</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  modalContent: { width: '100%', borderRadius: 12, padding: 24 },
  modalTitle: { fontSize: 16, fontWeight: '600', textAlign: 'center', marginBottom: 16 },
  modalInput: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 15, marginTop: 4, marginBottom: 20 },
  modalFooter: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12 },
  modalButton: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8, alignItems: 'center' },
});
