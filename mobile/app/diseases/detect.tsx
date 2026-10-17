import { useMutation } from '@tanstack/react-query';
import { router } from 'expo-router';
import { Camera, RotateCcw } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';
import {
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { FeedbackState } from '../../components/FeedbackState';
import { PrimaryButton } from '../../components/PrimaryButton';
import { ScreenHeader } from '../../components/ScreenHeader';
import { colors } from '../../constants/theme';
import { diseasesApi, getApiErrorMessage } from '../../services/api';

export default function DiseaseDetectionScreen() {
  const [photo, setPhoto] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [cropType, setCropType] = useState('');
  const detectionMutation = useMutation({
    mutationFn: () => {
      if (!photo) throw new Error('Take or choose a crop photo first.');
      return diseasesApi.detect(photo.uri, cropType.trim());
    },
  });

  async function selectPhoto(source: 'camera' | 'library') {
    if (source === 'camera') {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        Alert.alert(
          'Camera permission needed',
          'Allow camera access to photograph a crop for assessment.',
        );
        return;
      }
    } else {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert(
          'Photo permission needed',
          'Allow photo access to select a crop image for assessment.',
        );
        return;
      }
    }

    const options: ImagePicker.ImagePickerOptions = {
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.85,
    };
    const result =
      source === 'camera'
        ? await ImagePicker.launchCameraAsync(options)
        : await ImagePicker.launchImageLibraryAsync(options);
    if (!result.canceled) {
      setPhoto(result.assets[0] ?? null);
      detectionMutation.reset();
    }
  }

  const result = detectionMutation.data;
  const immediateActions = result?.detection.recommendations.immediate_actions ?? [];
  const preventiveMeasures = result?.detection.recommendations.preventive_measures ?? [];

  return (
    <ScrollView
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
      style={styles.screen}
    >
      <Pressable
        accessibilityRole="button"
        onPress={() => router.back()}
        style={styles.backLink}
      >
        <Text style={styles.backText}>‹  Back to your farm</Text>
      </Pressable>
      <ScreenHeader
        eyebrow="CROP HEALTH"
        subtitle="Photograph a clear leaf or affected area. Good daylight helps."
        title="Disease detection"
      />

      <View style={styles.card}>
        {photo ? (
          <Image accessibilityLabel="Selected crop photo" source={{ uri: photo.uri }} style={styles.preview} />
        ) : (
          <View style={styles.photoPlaceholder}>
            <Camera color={colors.primary} size={34} />
            <Text style={styles.placeholderTitle}>Add a crop photo</Text>
            <Text style={styles.placeholderCopy}>Frame one leaf or plant clearly.</Text>
          </View>
        )}
        <View style={styles.photoActions}>
          <PrimaryButton onPress={() => void selectPhoto('camera')} variant="outline">
            Take a photo
          </PrimaryButton>
          <PrimaryButton onPress={() => void selectPhoto('library')} variant="outline">
            Choose from library
          </PrimaryButton>
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Crop (optional)</Text>
          <TextInput
            accessibilityLabel="Crop type"
            autoCapitalize="words"
            maxLength={50}
            onChangeText={setCropType}
            placeholder="e.g. tomato, maize, beans"
            placeholderTextColor="#9CA3AF"
            style={styles.input}
            value={cropType}
          />
        </View>
        {detectionMutation.isError ? (
          <FeedbackState
            kind="error"
            message={getApiErrorMessage(detectionMutation.error)}
            title="Could not assess this crop"
          />
        ) : null}
        {result ? (
          <View style={styles.result}>
            <Text style={styles.resultEyebrow}>ASSESSMENT</Text>
            <Text style={styles.resultTitle}>
              {result.detection.detected_disease.replaceAll('_', ' ')}
            </Text>
            <Text style={styles.confidence}>
              {result.detection.confidence === null
                ? 'Confidence not provided'
                : `${Math.round(result.detection.confidence * 100)}% confidence`}
            </Text>
            <RecommendationList title="Immediate actions" items={immediateActions} />
            <RecommendationList title="Prevention" items={preventiveMeasures} />
            <Text style={styles.disclaimer}>{result.disclaimer}</Text>
          </View>
        ) : null}
        <PrimaryButton
          disabled={!photo}
          loading={detectionMutation.isPending}
          onPress={() => detectionMutation.mutate()}
        >
          {detectionMutation.isPending ? 'Assessing crop…' : 'Check crop'}
        </PrimaryButton>
        {photo ? (
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              setPhoto(null);
              detectionMutation.reset();
            }}
            style={styles.changePhoto}
          >
            <RotateCcw color={colors.muted} size={15} />
            <Text style={styles.changePhotoText}>Choose another photo</Text>
          </Pressable>
        ) : null}
      </View>

      <Text style={styles.safetyNote}>
        Any result is advisory only. Confirm suspected disease and treatment with
        a local extension officer before applying crop chemicals.
      </Text>
    </ScrollView>
  );
}

function RecommendationList({ title, items }: { title: string; items: string[] }) {
  if (!items.length) return null;
  return (
    <View style={styles.recommendationBlock}>
      <Text style={styles.recommendationTitle}>{title}</Text>
      {items.map((item) => (
        <Text key={item} style={styles.recommendationItem}>•  {item}</Text>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: colors.background, flex: 1 },
  content: { padding: 20, paddingBottom: 36 },
  backLink: { alignSelf: 'flex-start', marginBottom: 16, paddingVertical: 5 },
  backText: { color: colors.primary, fontSize: 13, fontWeight: '700' },
  card: { backgroundColor: colors.white, borderRadius: 19, gap: 16, padding: 17 },
  preview: { aspectRatio: 4 / 3, backgroundColor: '#F3F4F6', borderRadius: 14, width: '100%' },
  photoPlaceholder: {
    alignItems: 'center',
    aspectRatio: 4 / 3,
    backgroundColor: '#F3F8F3',
    borderColor: colors.border,
    borderRadius: 14,
    borderStyle: 'dashed',
    borderWidth: 1,
    justifyContent: 'center',
    width: '100%',
  },
  placeholderTitle: { color: colors.darkGreen, fontSize: 15, fontWeight: '800', marginTop: 11 },
  placeholderCopy: { color: colors.muted, fontSize: 12, marginTop: 4 },
  photoActions: { flexDirection: 'row', gap: 9 },
  field: { gap: 7 },
  label: { color: colors.text, fontSize: 13, fontWeight: '700' },
  input: {
    backgroundColor: colors.white,
    borderColor: colors.border,
    borderRadius: 13,
    borderWidth: 1,
    color: colors.text,
    fontSize: 14,
    minHeight: 50,
    paddingHorizontal: 14,
  },
  result: { backgroundColor: '#F5F9F4', borderRadius: 14, gap: 8, padding: 14 },
  resultEyebrow: { color: colors.primary, fontSize: 10, fontWeight: '800', letterSpacing: 1 },
  resultTitle: { color: colors.darkGreen, fontSize: 18, fontWeight: '900', textTransform: 'capitalize' },
  confidence: { color: colors.muted, fontSize: 12 },
  recommendationBlock: { gap: 5, marginTop: 8 },
  recommendationTitle: { color: colors.text, fontSize: 13, fontWeight: '800' },
  recommendationItem: { color: colors.text, fontSize: 12, lineHeight: 18 },
  disclaimer: { color: colors.muted, fontSize: 11, lineHeight: 16, marginTop: 9 },
  changePhoto: { alignItems: 'center', flexDirection: 'row', gap: 7, justifyContent: 'center', paddingVertical: 4 },
  changePhotoText: { color: colors.muted, fontSize: 12, fontWeight: '700' },
  safetyNote: { color: colors.muted, fontSize: 11, lineHeight: 17, marginTop: 16, textAlign: 'center' },
});
