import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
  StatusBar,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { identifyEquipment, generateWorkout } from '../services/geminiService';
import { C, T } from '../theme';

const CAT_COLORS = {
  cardio: C.blue,
  force: C.red,
  poids_libre: C.amber,
  accessoire: C.green,
};

export default function ScanScreen({ navigation, route }) {
  const { sessionName, level, goal, split, duration } = route.params;
  const [photos, setPhotos] = useState([]);
  const [equipments, setEquipments] = useState([]);
  const [scanning, setScanning] = useState(false);
  const [generating, setGenerating] = useState(false);

  const pickImage = async (useCamera) => {
    const { status } = await (useCamera
      ? ImagePicker.requestCameraPermissionsAsync()
      : ImagePicker.requestMediaLibraryPermissionsAsync());
    if (status !== 'granted') {
      Alert.alert('Permission refusée');
      return;
    }
    const picked = await (useCamera
      ? ImagePicker.launchCameraAsync({ quality: 0.7, base64: true })
      : ImagePicker.launchImageLibraryAsync({ quality: 0.7, base64: true }));
    if (!picked.canceled && picked.assets[0]) {
      await analyzePhoto(picked.assets[0].uri, picked.assets[0].base64);
    }
  };

  const analyzePhoto = async (uri, base64) => {
    setScanning(true);
    try {
      const result = await identifyEquipment(base64);
      const found = result.equipments || [];
      if (found.length === 0) {
        Alert.alert('Rien détecté', 'Essaie un autre angle.');
        return;
      }
      setPhotos((prev) => [...prev, { uri, count: found.length }]);
      setEquipments((prev) => {
        const existing = prev.map((e) => e.name.toLowerCase());
        return [
          ...prev,
          ...found.filter((e) => !existing.includes(e.name.toLowerCase())),
        ];
      });
      Alert.alert(
        `${found.length} détecté(s) 🎯`,
        found.map((e) => `• ${e.name}`).join('\n')
      );
    } catch (err) {
      Alert.alert('Erreur', err.message);
    } finally {
      setScanning(false);
    }
  };

  const handleGenerate = async (noEquipment = false) => {
    setGenerating(true);
    try {
      const equipsToUse = noEquipment
        ? [
            {
              name: 'Poids du corps',
              category: 'accessoire',
              muscles: [],
              emoji: '🤸',
            },
          ]
        : equipments;
      const workout = await generateWorkout({
        equipments: equipsToUse,
        level,
        goal,
        split,
        duration,
      });
      navigation.navigate('Workout', {
        workout,
        sessionName,
        level,
        goal,
        split,
        duration,
        equipments: equipsToUse,
      });
    } catch (err) {
      Alert.alert('Erreur', err.message);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />
      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.back}>
          <Text style={styles.backText}>← RETOUR</Text>
        </TouchableOpacity>

        <Text style={styles.eyebrow}>ÉTAPE 2 / 3</Text>
        <Text style={styles.title}>SCANNE{'\n'}TON MATOS</Text>
        <Text style={styles.subtitle}>
          Plusieurs photos OK — chaque scan ajoute à ta liste.
        </Text>

        <View style={styles.divider} />

        {/* Boutons scan */}
        <View style={styles.scanRow}>
          <TouchableOpacity
            style={styles.scanBtn}
            onPress={() => pickImage(true)}
            disabled={scanning || generating}
            activeOpacity={0.8}>
            <Text style={styles.scanBtnText}>📷 CAMÉRA</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.scanBtn}
            onPress={() => pickImage(false)}
            disabled={scanning || generating}
            activeOpacity={0.8}>
            <Text style={styles.scanBtnText}>🖼 GALERIE</Text>
          </TouchableOpacity>
        </View>

        {/* Sans équipement */}
        <TouchableOpacity
          style={[
            styles.noEquipBtn,
            (scanning || generating) && { opacity: 0.6 },
          ]}
          onPress={() => handleGenerate(true)}
          disabled={scanning || generating}
          activeOpacity={0.8}>
          <Text style={styles.noEquipIcon}>🤸</Text>
          <View style={styles.noEquipTextBlock}>
            <Text style={styles.noEquipTitle}>SANS ÉQUIPEMENT</Text>
            <Text style={styles.noEquipSub} numberOfLines={1}>
              Poids du corps · Partout, tout de suite
            </Text>
          </View>
          {generating && equipments.length === 0 ? (
            <ActivityIndicator color={C.accent} size="small" />
          ) : (
            <Text style={styles.noEquipArrow}>→</Text>
          )}
        </TouchableOpacity>

        {scanning && (
          <View style={styles.scanningBox}>
            <ActivityIndicator color={C.accent} size="small" />
            <Text style={styles.scanningText}>Analyse en cours…</Text>
          </View>
        )}

        {/* Photos */}
        {photos.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>PHOTOS ({photos.length})</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {photos.map((p, i) => (
                <View key={i} style={styles.thumb}>
                  <Image source={{ uri: p.uri }} style={styles.thumbImg} />
                  <View style={styles.thumbBadge}>
                    <Text style={styles.thumbBadgeText}>{p.count}🏋️</Text>
                  </View>
                </View>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Équipements */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>
            ÉQUIPEMENTS DÉTECTÉS ({equipments.length})
          </Text>
          {equipments.length === 0 ? (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyText}>
                Aucun équipement scanné pour l'instant.
              </Text>
            </View>
          ) : (
            equipments.map((eq, i) => (
              <View key={i} style={styles.equipRow}>
                <View
                  style={[
                    styles.equipIconBox,
                    { borderColor: CAT_COLORS[eq.category] || C.textMuted },
                  ]}>
                  <Text style={styles.equipEmoji}>{eq.emoji || '🏋️'}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.equipName}>{eq.name}</Text>
                  <Text style={styles.equipMuscles}>
                    {eq.muscles?.join(' · ') || '—'}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() =>
                    setEquipments((prev) => prev.filter((_, j) => j !== i))
                  }
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                  <Text style={styles.removeText}>✕</Text>
                </TouchableOpacity>
              </View>
            ))
          )}
        </View>

        {/* Générer */}
        {equipments.length > 0 && (
          <TouchableOpacity
            style={[styles.generateBtn, generating && { opacity: 0.6 }]}
            onPress={() => handleGenerate(false)}
            disabled={generating}
            activeOpacity={0.85}>
            {generating ? (
              <View
                style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <ActivityIndicator color={C.bg} size="small" />
                <Text style={styles.generateText}>GÉNÉRATION EN COURS…</Text>
              </View>
            ) : (
              <Text style={styles.generateText}>
                ⚡ GÉNÉRER MA SÉANCE ({equipments.length} appareils)
              </Text>
            )}
          </TouchableOpacity>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  container: { paddingBottom: 60 },

  back: { paddingHorizontal: 24, paddingTop: 20, marginBottom: 20 },
  backText: { ...T.label },
  eyebrow: {
    ...T.label,
    color: C.accent,
    paddingHorizontal: 24,
    marginBottom: 4,
  },
  title: {
    fontFamily: 'BebasNeue_400Regular',
    fontSize: 56,
    color: C.textPrimary,
    letterSpacing: 2,
    lineHeight: 56,
    paddingHorizontal: 24,
    marginBottom: 10,
  },
  subtitle: { ...T.body, paddingHorizontal: 24, marginBottom: 4 },
  divider: {
    height: 1,
    backgroundColor: C.border,
    marginHorizontal: 24,
    marginVertical: 24,
  },

  scanRow: {
    flexDirection: 'row',
    gap: 12,
    marginHorizontal: 24,
    marginBottom: 12,
  },
  scanBtn: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: C.border,
  },
  scanBtnText: {
    fontFamily: 'DMSans_700Bold',
    color: C.textPrimary,
    fontSize: 14,
    letterSpacing: 1,
  },

  noEquipBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 16,
    paddingHorizontal: 24,
    marginBottom: 24,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: C.border,
  },
  noEquipIcon: { fontSize: 26 },
  noEquipTextBlock: { flex: 1 },
  noEquipTitle: {
    fontFamily: 'BebasNeue_400Regular',
    fontSize: 18,
    color: C.textPrimary,
    letterSpacing: 0.5,
  },
  noEquipSub: { ...T.small, marginTop: 2 },
  noEquipArrow: { fontSize: 18, color: C.textSecondary },

  scanningBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: C.surface,
    padding: 14,
    marginHorizontal: 24,
    marginBottom: 16,
  },
  scanningText: { ...T.body, color: C.accent },

  section: { marginHorizontal: 24, marginBottom: 24 },
  sectionLabel: { ...T.label, marginBottom: 12 },

  thumb: { marginRight: 8, position: 'relative' },
  thumbImg: { width: 80, height: 80 },
  thumbBadge: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    backgroundColor: 'rgba(0,0,0,0.75)',
    paddingHorizontal: 5,
    paddingVertical: 2,
  },
  thumbBadgeText: { color: '#fff', fontSize: 10 },

  emptyBox: { backgroundColor: C.surface, padding: 24, alignItems: 'center' },
  emptyText: { ...T.body },

  equipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: C.surface,
    padding: 14,
    marginBottom: 2,
  },
  equipIconBox: {
    width: 52,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
  },
  equipEmoji: { fontSize: 26 },
  equipName: {
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 15,
    color: C.textPrimary,
  },
  equipMuscles: { ...T.small, marginTop: 2 },
  removeText: { color: C.red, fontSize: 18, fontWeight: '700' },

  generateBtn: {
    backgroundColor: C.accent,
    marginHorizontal: 24,
    paddingVertical: 18,
    alignItems: 'center',
  },
  generateText: {
    fontFamily: 'DMSans_700Bold',
    fontSize: 15,
    color: C.bg,
    letterSpacing: 1.5,
  },
});
