import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { ChevronDown, X } from 'lucide-react-native';
import { Controller, useForm } from 'react-hook-form';
import {
  Alert,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useState } from 'react';
import { z } from 'zod';
import { FeedbackState } from '../../components/FeedbackState';
import { FormInput } from '../../components/FormInput';
import { LoadingState } from '../../components/LoadingState';
import { PrimaryButton } from '../../components/PrimaryButton';
import { ScreenHeader } from '../../components/ScreenHeader';
import { colors } from '../../constants/theme';
import {
  getApiErrorMessage,
  marketsApi,
  marketplaceApi,
  type CreateListingData,
} from '../../services/api';

const schema = z.object({
  title: z.string().trim().min(3, 'Enter at least 3 characters.').max(200),
  description: z.string().max(4000),
  quantity_kg: z.string().refine((value) => Number(value) > 0, 'Enter a quantity greater than zero.'),
  expected_price_per_kg: z.string().refine((value) => Number(value) > 0, 'Enter a price greater than zero.'),
  available_from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD.'),
  pickup_location: z.string().max(200),
});

type FormValues = z.infer<typeof schema>;
type Choice = { id: string; name: string };

export default function CreateListingScreen() {
  const queryClient = useQueryClient();
  const [photos, setPhotos] = useState<ImagePicker.ImagePickerAsset[]>([]);
  const [commodity, setCommodity] = useState<Choice | null>(null);
  const [district, setDistrict] = useState<Choice | null>(null);
  const [quality, setQuality] = useState<'A' | 'B' | 'C'>('B');
  const [picker, setPicker] = useState<'commodity' | 'district' | null>(null);
  const [pickerSearch, setPickerSearch] = useState('');
  const [submitError, setSubmitError] = useState('');
  const commoditiesQuery = useQuery({
    queryKey: ['markets', 'commodities'],
    queryFn: async () => (await marketsApi.getCommodities()).data,
  });
  const districtsQuery = useQuery({
    queryKey: ['markets', 'districts'],
    queryFn: async () => (await marketsApi.getDistricts()).data,
  });
  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: '',
      description: '',
      quantity_kg: '',
      expected_price_per_kg: '',
      available_from: new Date().toISOString().slice(0, 10),
      pickup_location: '',
    },
  });
  const createMutation = useMutation({
    mutationFn: ({ payload, imageUris }: { payload: CreateListingData; imageUris: string[] }) =>
      marketplaceApi.createListing(payload, imageUris),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['marketplace', 'listings'] });
      router.replace('/(tabs)/marketplace?view=mine');
    },
    onError: (error) => setSubmitError(getApiErrorMessage(error)),
  });

  if (commoditiesQuery.isPending || districtsQuery.isPending) {
    return <LoadingState label="Loading produce and district options..." />;
  }
  if (commoditiesQuery.isError || districtsQuery.isError) {
    const error = commoditiesQuery.error ?? districtsQuery.error;
    return (
      <View style={styles.center}>
        <FeedbackState
          actionLabel="Retry"
          kind="error"
          message={getApiErrorMessage(error)}
          onAction={() => {
            void commoditiesQuery.refetch();
            void districtsQuery.refetch();
          }}
          title="Listing options unavailable"
        />
      </View>
    );
  }

  const options =
    picker === 'commodity'
      ? commoditiesQuery.data?.map(({ id, name }) => ({ id, name })) ?? []
      : districtsQuery.data?.map(({ id, name }) => ({ id, name })) ?? [];
  const visibleOptions = options.filter((item) =>
    item.name.toLocaleLowerCase().includes(pickerSearch.trim().toLocaleLowerCase()),
  );

  async function addPhotos(source: 'camera' | 'library') {
    if (photos.length >= 5) {
      setSubmitError('A listing can include up to five photos.');
      return;
    }
    if (source === 'camera') {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        Alert.alert(
          'Camera permission needed',
          'Allow camera access to photograph the produce for your listing.',
        );
        return;
      }
    } else {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert(
          'Photo permission needed',
          'Allow photo access to select produce photos for your listing.',
        );
        return;
      }
    }

    const options: ImagePicker.ImagePickerOptions = {
      mediaTypes: ['images'],
      allowsEditing: source === 'camera',
      quality: 0.8,
      ...(source === 'library'
        ? { allowsMultipleSelection: true, selectionLimit: 5 - photos.length }
        : {}),
    };
    const result =
      source === 'camera'
        ? await ImagePicker.launchCameraAsync(options)
        : await ImagePicker.launchImageLibraryAsync(options);
    if (!result.canceled) {
      setPhotos((current) => [...current, ...result.assets].slice(0, 5));
      setSubmitError('');
    }
  }

  const submit = handleSubmit((values) => {
    if (!commodity || !district) {
      setSubmitError('Choose a commodity and a district before publishing.');
      return;
    }
    setSubmitError('');
    createMutation.mutate({
      payload: {
        commodity: commodity.id,
        district: district.id,
        title: values.title.trim(),
        description: values.description.trim(),
        quantity_kg: Number(values.quantity_kg),
        expected_price_per_kg: Number(values.expected_price_per_kg),
        available_from: values.available_from,
        quality_grade: quality,
        ...(values.pickup_location.trim()
          ? { pickup_location: values.pickup_location.trim() }
          : {}),
      },
      imageUris: photos.map(({ uri }) => uri),
    });
  });

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.screen}
    >
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <ScreenHeader
          eyebrow="SELL YOUR PRODUCE"
          subtitle="Add the details buyers need to make an informed offer."
          title="Create a listing"
        />
        <View style={styles.form}>
          <Controller
            control={control}
            name="title"
            render={({ field: { onChange, value } }) => (
              <FormInput
                error={errors.title?.message}
                label="Listing title"
                onChangeText={onChange}
                placeholder="e.g. Fresh dried maize"
                value={value}
              />
            )}
          />

          <ChoiceField
            error={!commodity && submitError ? 'Choose a commodity.' : undefined}
            label="Commodity"
            onPress={() => {
              setPickerSearch('');
              setPicker('commodity');
            }}
            value={commodity?.name}
          />
          <ChoiceField
            error={!district && submitError ? 'Choose a district.' : undefined}
            label="District"
            onPress={() => {
              setPickerSearch('');
              setPicker('district');
            }}
            value={district?.name}
          />
          <View style={styles.row}>
            <View style={styles.half}>
              <Controller
                control={control}
                name="quantity_kg"
                render={({ field: { onChange, value } }) => (
                  <FormInput
                    error={errors.quantity_kg?.message}
                    keyboardType="decimal-pad"
                    label="Quantity (kg)"
                    onChangeText={onChange}
                    placeholder="e.g. 250"
                    value={value}
                  />
                )}
              />
            </View>
            <View style={styles.half}>
              <Controller
                control={control}
                name="expected_price_per_kg"
                render={({ field: { onChange, value } }) => (
                  <FormInput
                    error={errors.expected_price_per_kg?.message}
                    keyboardType="decimal-pad"
                    label="Price per kg (UGX)"
                    onChangeText={onChange}
                    placeholder="e.g. 2500"
                    value={value}
                  />
                )}
              />
            </View>
          </View>

          <View>
            <Text style={styles.label}>Quality grade</Text>
            <View style={styles.qualityRow}>
              {(['A', 'B', 'C'] as const).map((grade) => (
                <Pressable
                  accessibilityRole="radio"
                  accessibilityState={{ selected: quality === grade }}
                  key={grade}
                  onPress={() => setQuality(grade)}
                  style={[
                    styles.qualityOption,
                    quality === grade && styles.qualitySelected,
                  ]}
                >
                  <Text
                    style={[
                      styles.qualityText,
                      quality === grade && styles.qualityTextSelected,
                    ]}
                  >
                    {grade}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          <View style={styles.photoSection}>
            <View style={styles.photoHeading}>
              <View>
                <Text style={styles.label}>Produce photos</Text>
                <Text style={styles.photoHint}>Up to 5 clear photos help buyers.</Text>
              </View>
              <Text style={styles.photoCount}>{photos.length}/5</Text>
            </View>
            <View style={styles.photoButtons}>
              <PrimaryButton onPress={() => void addPhotos('camera')} variant="outline">
                Take photo
              </PrimaryButton>
              <PrimaryButton onPress={() => void addPhotos('library')} variant="outline">
                Choose photos
              </PrimaryButton>
            </View>
            {photos.length ? (
              <ScrollView horizontal contentContainerStyle={styles.photoList} showsHorizontalScrollIndicator={false}>
                {photos.map((photo, index) => (
                  <View key={`${photo.uri}-${index}`} style={styles.photoPreviewWrap}>
                    <Image source={{ uri: photo.uri }} style={styles.photoPreview} />
                    <Pressable
                      accessibilityLabel={`Remove photo ${index + 1}`}
                      accessibilityRole="button"
                      onPress={() => setPhotos((current) => current.filter((_, photoIndex) => photoIndex !== index))}
                      style={styles.removePhoto}
                    >
                      <X color={colors.white} size={14} />
                    </Pressable>
                  </View>
                ))}
              </ScrollView>
            ) : null}
          </View>

          <Controller
            control={control}
            name="available_from"
            render={({ field: { onChange, value } }) => (
              <FormInput
                error={errors.available_from?.message}
                label="Available from (YYYY-MM-DD)"
                onChangeText={onChange}
                placeholder="2026-10-17"
                value={value}
              />
            )}
          />
          <Controller
            control={control}
            name="pickup_location"
            render={({ field: { onChange, value } }) => (
              <FormInput
                label="Pickup location (optional)"
                onChangeText={onChange}
                placeholder="Village, collection point..."
                value={value}
              />
            )}
          />
          <Controller
            control={control}
            name="description"
            render={({ field: { onChange, value } }) => (
              <FormInput
                label="Description (optional)"
                multiline
                onChangeText={onChange}
                placeholder="Describe freshness, drying, packaging, or other details"
                textAlignVertical="top"
                value={value}
              />
            )}
          />

          {submitError ? (
            <Text accessibilityRole="alert" style={styles.error}>{submitError}</Text>
          ) : null}
          <PrimaryButton
            loading={createMutation.isPending}
            onPress={() => void submit()}
          >
            Publish listing
          </PrimaryButton>
          <Text style={styles.note}>
            Your listing is visible to buyers. Agree on any sale details directly; this app does not process payments.
          </Text>
        </View>
      </ScrollView>
      <Modal
        animationType="slide"
        onRequestClose={() => setPicker(null)}
        transparent
        visible={Boolean(picker)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                Choose {picker === 'commodity' ? 'commodity' : 'district'}
              </Text>
              <Pressable
                accessibilityLabel="Close selection"
                onPress={() => setPicker(null)}
                style={styles.close}
              >
                <X color={colors.muted} size={20} />
              </Pressable>
            </View>
            <TextInput
              accessibilityLabel="Search options"
              onChangeText={setPickerSearch}
              placeholder="Search"
              placeholderTextColor="#9CA3AF"
              style={styles.search}
              value={pickerSearch}
            />
            <FlatList
              data={visibleOptions}
              keyExtractor={(item) => item.id}
              ListEmptyComponent={
                <Text style={styles.noOptions}>No matching options.</Text>
              }
              renderItem={({ item }) => (
                <Pressable
                  onPress={() => {
                    if (picker === 'commodity') setCommodity(item);
                    if (picker === 'district') setDistrict(item);
                    setPicker(null);
                  }}
                  style={styles.option}
                >
                  <Text style={styles.optionText}>{item.name}</Text>
                </Pressable>
              )}
            />
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

function ChoiceField({
  label,
  value,
  error,
  onPress,
}: {
  label: string;
  value?: string;
  error?: string;
  onPress: () => void;
}) {
  return (
    <View style={styles.choiceWrap}>
      <Text style={styles.label}>{label}</Text>
      <Pressable
        accessibilityRole="button"
        onPress={onPress}
        style={[styles.choice, error ? styles.choiceError : undefined]}
      >
        <Text style={[styles.choiceText, !value && styles.placeholder]}>
          {value ?? `Select ${label.toLocaleLowerCase()}`}
        </Text>
        <ChevronDown color={colors.muted} size={17} />
      </Pressable>
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: colors.background, flex: 1 },
  center: { backgroundColor: colors.background, flex: 1, justifyContent: 'center', padding: 20 },
  content: { padding: 20, paddingBottom: 36 },
  form: { backgroundColor: colors.white, borderRadius: 20, gap: 17, padding: 18 },
  row: { flexDirection: 'row', gap: 11 },
  half: { flex: 1 },
  choiceWrap: { gap: 7 },
  label: { color: colors.text, fontSize: 13, fontWeight: '700' },
  choice: { alignItems: 'center', backgroundColor: colors.white, borderColor: colors.border, borderRadius: 13, borderWidth: 1, flexDirection: 'row', justifyContent: 'space-between', minHeight: 52, paddingHorizontal: 14 },
  choiceError: { borderColor: colors.error },
  choiceText: { color: colors.text, flex: 1, fontSize: 14 },
  placeholder: { color: '#9CA3AF' },
  qualityRow: { flexDirection: 'row', gap: 9, marginTop: 8 },
  qualityOption: { alignItems: 'center', backgroundColor: '#F9FAFB', borderColor: colors.border, borderRadius: 12, borderWidth: 1, flex: 1, minHeight: 43, justifyContent: 'center' },
  qualitySelected: { backgroundColor: colors.paleGreen, borderColor: colors.primary },
  qualityText: { color: colors.muted, fontSize: 13, fontWeight: '700' },
  qualityTextSelected: { color: colors.primary },
  error: { color: colors.error, fontSize: 12 },
  note: { color: colors.muted, fontSize: 11, lineHeight: 16, textAlign: 'center' },
  photoSection: { gap: 10 },
  photoHeading: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  photoHint: { color: colors.muted, fontSize: 11, marginTop: 4 },
  photoCount: { color: colors.primary, fontSize: 12, fontWeight: '800' },
  photoButtons: { flexDirection: 'row', gap: 9 },
  photoList: { gap: 9, paddingVertical: 3 },
  photoPreviewWrap: { height: 86, position: 'relative', width: 86 },
  photoPreview: { backgroundColor: '#F3F4F6', borderRadius: 11, height: '100%', width: '100%' },
  removePhoto: { alignItems: 'center', backgroundColor: 'rgba(17,24,39,0.72)', borderRadius: 12, height: 24, justifyContent: 'center', position: 'absolute', right: 4, top: 4, width: 24 },
  modalBackdrop: { backgroundColor: 'rgba(17,24,39,0.42)', flex: 1, justifyContent: 'flex-end' },
  modal: { backgroundColor: colors.white, borderTopLeftRadius: 23, borderTopRightRadius: 23, height: '82%', padding: 18 },
  modalHeader: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  modalTitle: { color: colors.darkGreen, fontSize: 18, fontWeight: '800' },
  close: { alignItems: 'center', height: 38, justifyContent: 'center', width: 38 },
  search: { backgroundColor: '#F3F4F6', borderRadius: 12, color: colors.text, fontSize: 14, marginBottom: 10, minHeight: 46, paddingHorizontal: 14 },
  option: { borderBottomColor: colors.border, borderBottomWidth: StyleSheet.hairlineWidth, justifyContent: 'center', minHeight: 49 },
  optionText: { color: colors.text, fontSize: 14 },
  noOptions: { color: colors.muted, paddingVertical: 20, textAlign: 'center' },
});
