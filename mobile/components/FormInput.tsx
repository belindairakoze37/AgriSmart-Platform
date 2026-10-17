import { useState } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type KeyboardTypeOptions,
  type TextInputProps,
} from 'react-native';
import { Eye, EyeOff } from 'lucide-react-native';
import { colors } from '../constants/theme';

interface FormInputProps extends Omit<TextInputProps, 'onChangeText'> {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  error?: string;
  keyboardType?: KeyboardTypeOptions;
  secureToggle?: boolean;
}

export function FormInput({
  label,
  value,
  onChangeText,
  error,
  secureToggle = false,
  secureTextEntry,
  ...inputProps
}: FormInputProps) {
  const [passwordVisible, setPasswordVisible] = useState(false);
  const hideText = secureTextEntry && !passwordVisible;
  return (
    <View style={styles.wrapper}>
      <Text style={styles.label}>{label}</Text>
      <View style={[styles.inputShell, error ? styles.invalid : undefined]}>
        <TextInput
          accessibilityLabel={label}
          autoCorrect={false}
          onChangeText={onChangeText}
          placeholderTextColor="#9CA3AF"
          returnKeyType="done"
          style={styles.input}
          value={value}
          secureTextEntry={Boolean(hideText)}
          {...inputProps}
        />
        {secureToggle ? (
          <Pressable
            accessibilityLabel={passwordVisible ? 'Hide password' : 'Show password'}
            accessibilityRole="button"
            hitSlop={10}
            onPress={() => setPasswordVisible((visible) => !visible)}
            style={styles.toggle}
          >
            {passwordVisible ? (
              <EyeOff color={colors.muted} size={19} />
            ) : (
              <Eye color={colors.muted} size={19} />
            )}
          </Pressable>
        ) : null}
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { gap: 7 },
  label: { color: colors.text, fontSize: 13, fontWeight: '700' },
  inputShell: {
    alignItems: 'center',
    backgroundColor: colors.white,
    borderColor: colors.border,
    borderRadius: 13,
    borderWidth: 1,
    flexDirection: 'row',
    minHeight: 52,
    paddingHorizontal: 14,
  },
  invalid: { borderColor: colors.error },
  input: { color: colors.text, flex: 1, fontSize: 15, paddingVertical: 12 },
  toggle: { alignItems: 'center', justifyContent: 'center', padding: 4 },
  error: { color: colors.error, fontSize: 12 },
});
