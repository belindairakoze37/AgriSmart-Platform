import { Pressable, StyleSheet, Text, View } from 'react-native';
import { AlertCircle, Inbox, RefreshCw } from 'lucide-react-native';
import { colors } from '../constants/theme';

interface FeedbackStateProps {
  title: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
  kind?: 'error' | 'empty';
}

export function FeedbackState({
  title,
  message,
  actionLabel,
  onAction,
  kind = 'empty',
}: FeedbackStateProps) {
  const Icon = kind === 'error' ? AlertCircle : Inbox;
  return (
    <View style={styles.container}>
      <View style={[styles.iconWrap, kind === 'error' && styles.errorIconWrap]}>
        <Icon color={kind === 'error' ? colors.error : colors.primary} size={24} />
      </View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.message}>{message}</Text>
      {actionLabel && onAction ? (
        <Pressable
          accessibilityRole="button"
          onPress={onAction}
          style={styles.action}
        >
          <RefreshCw color={colors.primary} size={15} />
          <Text style={styles.actionText}>{actionLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: 18,
    paddingHorizontal: 24,
    paddingVertical: 30,
  },
  iconWrap: {
    alignItems: 'center',
    backgroundColor: colors.paleGreen,
    borderRadius: 28,
    height: 54,
    justifyContent: 'center',
    marginBottom: 14,
    width: 54,
  },
  errorIconWrap: { backgroundColor: '#FEF2F2' },
  title: { color: colors.darkGreen, fontSize: 16, fontWeight: '800' },
  message: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 19,
    marginTop: 7,
    textAlign: 'center',
  },
  action: { alignItems: 'center', flexDirection: 'row', gap: 7, marginTop: 17 },
  actionText: { color: colors.primary, fontSize: 13, fontWeight: '700' },
});
