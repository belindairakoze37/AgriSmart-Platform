import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { FeedbackState } from '../../components/FeedbackState';
import { LoadingState } from '../../components/LoadingState';
import { PrimaryButton } from '../../components/PrimaryButton';
import { ScreenHeader } from '../../components/ScreenHeader';
import { colors } from '../../constants/theme';
import { farmApi, getApiErrorMessage, type Crop, type Farm } from '../../services/api';

export default function FarmManagementScreen() {
  const queryClient = useQueryClient();
  const farmsQuery = useQuery({
    queryKey: ['farms'],
    queryFn: async () => (await farmApi.getFarms()).data,
  });
  const cropsQuery = useQuery({
    queryKey: ['crops'],
    queryFn: async () => (await farmApi.getCrops()).data,
  });
  const [farmName, setFarmName] = useState('');
  const [farmAcres, setFarmAcres] = useState('');
  const [editingFarmId, setEditingFarmId] = useState('');
  const [cropType, setCropType] = useState('');
  const [cropVariety, setCropVariety] = useState('');
  const [cropAcres, setCropAcres] = useState('');
  const [farmId, setFarmId] = useState('');
  const [plantingDate, setPlantingDate] = useState('');
  const [expectedHarvestDate, setExpectedHarvestDate] = useState('');
  const [growthStage, setGrowthStage] = useState('planned');
  const [editingCropId, setEditingCropId] = useState('');
  const [formError, setFormError] = useState('');
  const farms = farmsQuery.data?.results ?? [];
  const crops = cropsQuery.data?.results ?? [];

  const createFarmMutation = useMutation({
    mutationFn: () => {
      const data = {
        name: farmName.trim(),
        size_acres: farmAcres.trim(),
        soil_type: '',
        irrigation_type: '',
      };
      return editingFarmId
        ? farmApi.updateFarm(editingFarmId, data)
        : farmApi.createFarm(data);
    },
    onSuccess: async () => {
      setFarmName('');
      setFarmAcres('');
      setEditingFarmId('');
      setFormError('');
      await queryClient.invalidateQueries({ queryKey: ['farms'] });
    },
    onError: (error: unknown) => setFormError(getApiErrorMessage(error)),
  });
  const saveCropMutation = useMutation({
    mutationFn: () => {
      const data = {
        farm: farmId,
        crop_type: cropType.trim(),
        variety: cropVariety.trim(),
        area_acres: cropAcres.trim(),
        planting_date: plantingDate.trim() || null,
        expected_harvest_date: expectedHarvestDate.trim() || null,
        growth_stage: growthStage,
        notes: '',
      };
      return editingCropId
        ? farmApi.updateCrop(editingCropId, data)
        : farmApi.createCrop(data);
    },
    onSuccess: async () => {
      setCropType('');
      setCropVariety('');
      setCropAcres('');
      setPlantingDate('');
      setExpectedHarvestDate('');
      setGrowthStage('planned');
      setEditingCropId('');
      setFormError('');
      await queryClient.invalidateQueries({ queryKey: ['crops'] });
    },
    onError: (error: unknown) => setFormError(getApiErrorMessage(error)),
  });

  if (farmsQuery.isPending || cropsQuery.isPending) {
    return <LoadingState label="Loading farms and crops..." />;
  }
  if (farmsQuery.isError || cropsQuery.isError) {
    const error = farmsQuery.error ?? cropsQuery.error;
    return (
      <View style={styles.center}>
        <FeedbackState
          actionLabel="Retry"
          kind="error"
          message={getApiErrorMessage(error)}
          onAction={() => {
            void farmsQuery.refetch();
            void cropsQuery.refetch();
          }}
          title="Farm information unavailable"
        />
      </View>
    );
  }

  function submitFarm() {
    if (!farmName.trim() || Number(farmAcres) <= 0) {
      setFormError('Enter a farm name and a size greater than zero.');
      return;
    }
    setFormError('');
    createFarmMutation.mutate();
  }

  function submitCrop() {
    if (!farmId || !cropType.trim() || Number(cropAcres) <= 0) {
      setFormError('Choose a farm, crop, and crop area greater than zero.');
      return;
    }
    if (
      (plantingDate && !isDate(plantingDate)) ||
      (expectedHarvestDate && !isDate(expectedHarvestDate))
    ) {
      setFormError('Enter dates in YYYY-MM-DD format.');
      return;
    }
    setFormError('');
    saveCropMutation.mutate();
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Pressable accessibilityRole="button" onPress={() => router.back()} style={styles.backLink}>
        <Text style={styles.backText}>‹  Back to dashboard</Text>
      </Pressable>
      <ScreenHeader
        eyebrow="FARM MANAGEMENT"
        subtitle="Record your plots and track crop stages and harvest dates."
        title="Farms and crops"
      />

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Your farms</Text>
        {farms.length === 0 ? (
          <Text style={styles.emptyCopy}>Add your first farm to start tracking planted area.</Text>
        ) : (
          farms.map((farm) => (
            <FarmRow
              farm={farm}
              key={farm.id}
              cropCount={crops.filter((crop) => crop.farm === farm.id).length}
              onEdit={() => {
                setEditingFarmId(farm.id);
                setFarmName(farm.name);
                setFarmAcres(farm.size_acres);
                setFormError('');
              }}
            />
          ))
        )}
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>{editingFarmId ? 'Edit farm details' : 'Add a farm'}</Text>
        <Field label="Farm or plot name" onChangeText={setFarmName} placeholder="e.g. Plot A" value={farmName} />
        <Field keyboardType="decimal-pad" label="Size (acres)" onChangeText={setFarmAcres} placeholder="e.g. 2.5" value={farmAcres} />
        <PrimaryButton loading={createFarmMutation.isPending} onPress={submitFarm}>
          {editingFarmId ? 'Save farm changes' : 'Save farm'}
        </PrimaryButton>
        {editingFarmId ? (
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              setEditingFarmId('');
              setFarmName('');
              setFarmAcres('');
            }}
            style={styles.cancelEdit}
          >
            <Text style={styles.cancelEditText}>Cancel editing</Text>
          </Pressable>
        ) : null}
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Add a crop</Text>
        {farms.length === 0 ? (
          <Text style={styles.emptyCopy}>Create a farm before adding a crop.</Text>
        ) : (
          <>
            <Text style={styles.label}>Farm plot</Text>
            <View style={styles.farmChoices}>
              {farms.map((farm) => (
                <Pressable
                  accessibilityRole="radio"
                  accessibilityState={{ selected: farmId === farm.id }}
                  key={farm.id}
                  onPress={() => setFarmId(farm.id)}
                  style={[styles.farmChoice, farmId === farm.id && styles.selectedFarmChoice]}
                >
                  <Text style={[styles.farmChoiceText, farmId === farm.id && styles.selectedFarmChoiceText]}>
                    {farm.name}
                  </Text>
                </Pressable>
              ))}
            </View>
            <Field label="Crop name" onChangeText={setCropType} placeholder="e.g. Maize" value={cropType} />
            <Field label="Variety (optional)" onChangeText={setCropVariety} placeholder="e.g. Longe 5" value={cropVariety} />
            <Field keyboardType="decimal-pad" label="Area (acres)" onChangeText={setCropAcres} placeholder="e.g. 1.5" value={cropAcres} />
            <Field label="Planting date (optional)" onChangeText={setPlantingDate} placeholder="YYYY-MM-DD" value={plantingDate} />
            <Field label="Expected harvest (optional)" onChangeText={setExpectedHarvestDate} placeholder="YYYY-MM-DD" value={expectedHarvestDate} />
            <Text style={styles.label}>Growth stage</Text>
            <View style={styles.stageChoices}>
              {['planned', 'planted', 'vegetative', 'flowering', 'fruiting', 'maturity', 'harvested'].map((stage) => (
                <Pressable
                  accessibilityRole="radio"
                  accessibilityState={{ selected: growthStage === stage }}
                  key={stage}
                  onPress={() => setGrowthStage(stage)}
                  style={[styles.stageChoice, growthStage === stage && styles.selectedFarmChoice]}
                >
                  <Text style={[styles.farmChoiceText, growthStage === stage && styles.selectedFarmChoiceText]}>
                    {stage}
                  </Text>
                </Pressable>
              ))}
            </View>
            <PrimaryButton loading={saveCropMutation.isPending} onPress={submitCrop}>
              {editingCropId ? 'Save crop changes' : 'Save crop'}
            </PrimaryButton>
            {editingCropId ? (
              <Pressable
                accessibilityRole="button"
                onPress={() => clearCropForm(
                  setEditingCropId,
                  setCropType,
                  setCropVariety,
                  setCropAcres,
                  setPlantingDate,
                  setExpectedHarvestDate,
                  setGrowthStage,
                  setFarmId,
                )}
                style={styles.cancelEdit}
              >
                <Text style={styles.cancelEditText}>Cancel editing</Text>
              </Pressable>
            ) : null}
          </>
        )}
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Crop stages</Text>
        {crops.length === 0 ? (
          <Text style={styles.emptyCopy}>Your crop records will appear here.</Text>
        ) : (
          crops.map((crop) => (
            <CropRow
              crop={crop}
              farms={farms}
              key={crop.id}
              onEdit={() => {
                setEditingCropId(crop.id);
                setFarmId(crop.farm);
                setCropType(crop.crop_type);
                setCropVariety(crop.variety);
                setCropAcres(crop.area_acres);
                setPlantingDate(crop.planting_date ?? '');
                setExpectedHarvestDate(crop.expected_harvest_date ?? '');
                setGrowthStage(crop.growth_stage);
                setFormError('');
              }}
            />
          ))
        )}
      </View>
      {formError ? <Text accessibilityRole="alert" style={styles.error}>{formError}</Text> : null}
    </ScrollView>
  );
}

function FarmRow({
  farm,
  cropCount,
  onEdit,
}: {
  farm: Farm;
  cropCount: number;
  onEdit: () => void;
}) {
  return (
    <View style={styles.farmRow}>
      <View style={styles.farmCopy}>
        <Text style={styles.farmName}>{farm.name}</Text>
        <Text style={styles.cropMeta}>{cropCount} crop records</Text>
      </View>
      <View style={styles.farmActions}>
        <Text style={styles.farmArea}>{Number(farm.size_acres).toLocaleString()} acres</Text>
        <Pressable accessibilityRole="button" onPress={onEdit} style={styles.editButton}>
          <Text style={styles.editText}>Edit</Text>
        </Pressable>
      </View>
    </View>
  );
}

function CropRow({
  crop,
  farms,
  onEdit,
}: {
  crop: Crop;
  farms: Farm[];
  onEdit: () => void;
}) {
  return (
    <View style={styles.cropRow}>
      <View style={styles.cropCopy}>
        <Text style={styles.cropName}>{crop.crop_type}{crop.variety ? ` · ${crop.variety}` : ''}</Text>
        <Text style={styles.cropMeta}>
          {Number(crop.area_acres).toLocaleString()} acres · {farmNameFor(crop.farm, farms)}
        </Text>
        <Text style={styles.cropMeta}>
          {crop.planting_date ? `Planted ${crop.planting_date}` : 'Planting date not set'}
          {crop.expected_harvest_date ? ` · Harvest ${crop.expected_harvest_date}` : ''}
        </Text>
      </View>
      <View style={styles.cropActions}>
        <Text style={styles.stage}>{crop.growth_stage.replaceAll('_', ' ')}</Text>
        <Pressable accessibilityRole="button" onPress={onEdit} style={styles.editButton}>
          <Text style={styles.editText}>Edit</Text>
        </Pressable>
      </View>
    </View>
  );
}

function Field({
  label,
  value,
  placeholder,
  onChangeText,
  keyboardType,
}: {
  label: string;
  value: string;
  placeholder: string;
  onChangeText: (value: string) => void;
  keyboardType?: 'default' | 'decimal-pad';
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        keyboardType={keyboardType}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#9CA3AF"
        style={styles.input}
        value={value}
      />
    </View>
  );
}

function farmNameFor(farmId: string, farms: Farm[]) {
  return farms.find((farm) => farm.id === farmId)?.name ?? 'Farm';
}

function isDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function clearCropForm(
  setEditingCropId: (value: string) => void,
  setCropType: (value: string) => void,
  setCropVariety: (value: string) => void,
  setCropAcres: (value: string) => void,
  setPlantingDate: (value: string) => void,
  setExpectedHarvestDate: (value: string) => void,
  setGrowthStage: (value: string) => void,
  setFarmId: (value: string) => void,
) {
  setEditingCropId('');
  setCropType('');
  setCropVariety('');
  setCropAcres('');
  setPlantingDate('');
  setExpectedHarvestDate('');
  setGrowthStage('planned');
  setFarmId('');
}

const styles = StyleSheet.create({
  screen: { backgroundColor: colors.background, flex: 1 },
  content: { padding: 20, paddingBottom: 36 },
  center: { backgroundColor: colors.background, flex: 1, justifyContent: 'center', padding: 20 },
  backLink: { alignSelf: 'flex-start', marginBottom: 16, paddingVertical: 5 },
  backText: { color: colors.primary, fontSize: 13, fontWeight: '700' },
  card: { backgroundColor: colors.white, borderRadius: 17, gap: 13, marginBottom: 13, padding: 16 },
  sectionTitle: { color: colors.darkGreen, fontSize: 16, fontWeight: '800' },
  emptyCopy: { color: colors.muted, fontSize: 12, lineHeight: 18 },
  farmRow: { alignItems: 'center', borderBottomColor: colors.border, borderBottomWidth: StyleSheet.hairlineWidth, flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10 },
  farmCopy: { flex: 1 },
  farmName: { color: colors.text, fontSize: 13, fontWeight: '800' },
  farmArea: { color: colors.primary, fontSize: 12, fontWeight: '800' },
  farmActions: { alignItems: 'flex-end', gap: 7 },
  cropActions: { alignItems: 'flex-end', gap: 7 },
  editButton: { paddingHorizontal: 6, paddingVertical: 4 },
  editText: { color: colors.primary, fontSize: 10, fontWeight: '800' },
  cancelEdit: { alignItems: 'center', paddingVertical: 7 },
  cancelEditText: { color: colors.muted, fontSize: 11, fontWeight: '700' },
  cropMeta: { color: colors.muted, fontSize: 10, lineHeight: 15, marginTop: 3 },
  field: { gap: 6 },
  label: { color: colors.text, fontSize: 12, fontWeight: '700' },
  input: { borderColor: colors.border, borderRadius: 11, borderWidth: 1, color: colors.text, minHeight: 46, paddingHorizontal: 12 },
  farmChoices: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  stageChoices: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  farmChoice: { backgroundColor: '#F3F4F6', borderRadius: 10, paddingHorizontal: 11, paddingVertical: 9 },
  stageChoice: { backgroundColor: '#F3F4F6', borderRadius: 9, paddingHorizontal: 9, paddingVertical: 7 },
  selectedFarmChoice: { backgroundColor: colors.paleGreen },
  farmChoiceText: { color: colors.muted, fontSize: 11, fontWeight: '700' },
  selectedFarmChoiceText: { color: colors.primary },
  cropRow: { alignItems: 'center', borderBottomColor: colors.border, borderBottomWidth: StyleSheet.hairlineWidth, flexDirection: 'row', gap: 9, paddingVertical: 11 },
  cropCopy: { flex: 1 },
  cropName: { color: colors.text, fontSize: 13, fontWeight: '800', textTransform: 'capitalize' },
  stage: { backgroundColor: colors.paleGreen, borderRadius: 8, color: colors.primary, fontSize: 9, fontWeight: '800', overflow: 'hidden', paddingHorizontal: 7, paddingVertical: 5, textTransform: 'capitalize' },
  error: { color: colors.error, fontSize: 12, lineHeight: 17 },
});
