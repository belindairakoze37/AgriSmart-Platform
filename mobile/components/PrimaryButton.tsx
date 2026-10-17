import type { PropsWithChildren } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  type PressableProps,
} from 'react-native';
import { colors } from '../constants/theme';

interface PrimaryButtonProps extends PropsWithChildren {
  onPress: PressableProps['onPress'];
  loading?: boolean;
  disabled?: boolean;
  variant?: 'primary' | 'secondary' | 'outline';
  accessibilityLabel?: string;
}

export function PrimaryButton({
  children,
  onPress,
  loading = false,
  disabled = false,
  variant = 'primary',
  accessibilityLabel,
}: PrimaryButtonProps) {
  const secondary = variant !== 'primary';
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      disabled={disabled || loading}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        secondary ? styles.secondary : styles.primary,
        variant === 'outline' && styles.outline,
        (disabled || loading) && styles.disabled,
        pressed && !disabled && !loading && styles.pressed,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={secondary ? colors.primary : colors.white} />
      ) : (
        <Text style={[styles.label, secondary && styles.secondaryLabel]}>
          {children}
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    borderRadius: 14,
    justifyContent: 'center',
    minHeight: 52,
    paddingHorizontal: 18,
  },
  primary: { backgroundColor: colors.primary },
  secondary: { backgroundColor: colors.paleGreen },
  outline: { backgroundColor: colors.white, borderColor: colors.border, borderWidth: 1 },
  label: { color: colors.white, fontSize: 15, fontWeight: '700' },
  secondaryLabel: { color: colors.primary },
  disabled: { opacity: 0.55 },
  pressed: { opacity: 0.82, transform: [{ scale: 0.99 }] },
});
