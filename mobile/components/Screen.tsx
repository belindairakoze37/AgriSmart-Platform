import type { PropsWithChildren, ReactElement } from 'react';
import {
  ScrollView,
  StyleSheet,
  View,
  type RefreshControlProps,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { spacing } from '../constants/theme';

interface ScreenProps extends PropsWithChildren {
  scroll?: boolean;
  refreshControl?: ReactElement<RefreshControlProps>;
  contentContainerStyle?: object;
}

export function Screen({
  children,
  scroll = false,
  refreshControl,
  contentContainerStyle,
}: ScreenProps) {
  return (
    <SafeAreaView className="flex-1 bg-[#F5F9F4]" edges={['top']}>
      {scroll ? (
        <ScrollView
          contentContainerStyle={[styles.content, contentContainerStyle]}
          keyboardShouldPersistTaps="handled"
          refreshControl={refreshControl}
        >
          {children}
        </ScrollView>
      ) : (
        <View style={[styles.content, styles.fill, contentContainerStyle]}>
          {children}
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: spacing.screen,
    paddingTop: 16,
    paddingBottom: 28,
  },
  fill: { flex: 1 },
});
