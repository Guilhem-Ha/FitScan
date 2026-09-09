import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  ScrollView,
  StatusBar,
  ActivityIndicator,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { identifyEquipment, generateWorkout } from "../services/geminiService";
import { C, T, R, E } from "../theme";
import { Press, PrimaryButton, SectionLabel, IconBadge } from "../ui/kit";

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
    if (status !== "granted") {
      Alert.alert("Permission refusée");
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
        Alert.alert("Rien détecté", "Essaie un autre angle.");
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
        `${found.length} détecté(s)`,
        found.map((e) => `• ${e.name}`).join("\n")
      );
    } catch (err) {
      Alert.alert("Erreur", err.message);
    } finally {
      setScanning(false);
    }
  };

  const handleGenerate = async (noEquipment = false) => {
    setGenerating(true);
    try {
      const equipsToUse = noEquipment
        ? [{ name: "Poids du corps", category: "accessoire", muscles: [], emoji: "🤸" }]
        : equipments;
      const workout = await generateWorkout({
        equipments: equipsToUse,
        level,
        goal,
        split,
        duration,
      });
      navigation.navigate("Workout", {
        workout,
        sessionName,
        level,
        goal,
        split,
        duration,
        equipments: equipsToUse,
      });
    } catch (err) {
      Alert.alert("Erreur", err.message);
    } finally {
      setGenerating(false);
    }
  };

  const busy = scanning || generating;

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <Press style={styles.back} onPress={() => navigation.goBack()} scaleTo={0.94}>
          <Feather name="chevron-left" size={16} color={C.textSecondary} />
          <Text style={styles.backText}>RETOUR</Text>
        </Press>

        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text style={styles.eyebrow}>ÉTAPE 2 / 3</Text>
            <Text style={styles.title}>SCANNE{"\n"}TON MATOS</Text>
          </View>
          <IconBadge name="camera" size={46} />
        </View>

        <View style={styles.body}>
          <Text style={styles.subtitle}>
            Plusieurs photos OK — chaque scan ajoute à ta liste.
          </Text>

          {/* Boutons scan */}
          <View style={styles.scanRow}>
            <Press style={styles.scanBtn} onPress={() => pickImage(true)} disabled={busy}>
              <Feather name="camera" size={18} color={C.textPrimary} />
              <Text style={styles.scanBtnText}>CAMÉRA</Text>
            </Press>
            <Press style={styles.scanBtn} onPress={() => pickImage(false)} disabled={busy}>
              <Feather name="image" size={18} color={C.textPrimary} />
              <Text style={styles.scanBtnText}>GALERIE</Text>
            </Press>
          </View>

          {/* Sans équipement */}
          <Press style={styles.noEquipBtn} onPress={() => handleGenerate(true)} disabled={busy} scaleTo={0.98}>
            <IconBadge name="wind" tone="muted" size={42} />
            <View style={styles.noEquipTextBlock}>
              <Text style={styles.noEquipTitle}>SANS ÉQUIPEMENT</Text>
              <Text style={styles.noEquipSub} numberOfLines={1}>
                Poids du corps · Partout, tout de suite
              </Text>
            </View>
            {generating && equipments.length === 0 ? (
              <ActivityIndicator color={C.accent} size="small" />
            ) : (
              <Feather name="arrow-right" size={18} color={C.textSecondary} />
            )}
          </Press>

          {scanning && (
            <View style={styles.scanningBox}>
              <ActivityIndicator color={C.accent} size="small" />
              <Text style={styles.scanningText}>Analyse en cours…</Text>
            </View>
          )}

          {/* Photos */}
          {photos.length > 0 && (
            <>
              <SectionLabel style={styles.sectionSpaced}>PHOTOS ({photos.length})</SectionLabel>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {photos.map((p, i) => (
                  <View key={i} style={styles.thumb}>
                    <Image source={{ uri: p.uri }} style={styles.thumbImg} />
                    <View style={styles.thumbBadge}>
                      <Feather name="check" size={10} color={C.bg} />
                      <Text style={styles.thumbBadgeText}>{p.count}</Text>
                    </View>
                  </View>
                ))}
              </ScrollView>
            </>
          )}

          {/* Équipements */}
          <SectionLabel accent={equipments.length > 0} style={styles.sectionSpaced}>
            ÉQUIPEMENTS DÉTECTÉS ({equipments.length})
          </SectionLabel>

          {equipments.length === 0 ? (
            <View style={styles.emptyBox}>
              <Feather name="inbox" size={22} color={C.textMuted} />
              <Text style={styles.emptyText}>Aucun équipement scanné pour l'instant.</Text>
            </View>
          ) : (
            <View style={{ gap: 8 }}>
              {equipments.map((eq, i) => (
                <View key={i} style={styles.equipRow}>
                  <View
                    style={[
                      styles.equipIconBox,
                      { borderColor: CAT_COLORS[eq.category] || C.border },
                    ]}
                  >
                    <Text style={styles.equipEmoji}>{eq.emoji || "🏋️"}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.equipName}>{eq.name}</Text>
                    <Text style={styles.equipMuscles} numberOfLines={1}>
                      {eq.muscles?.join(" · ") || "—"}
                    </Text>
                  </View>
                  <Press
                    style={styles.removeBtn}
                    onPress={() => setEquipments((prev) => prev.filter((_, j) => j !== i))}
                    scaleTo={0.85}
                  >
                    <Feather name="x" size={16} color={C.red} />
                  </Press>
                </View>
              ))}
            </View>
          )}

          {/* Générer */}
          {equipments.length > 0 && (
            <View style={styles.generateWrap}>
              {generating ? (
                <View style={styles.generatingBtn}>
                  <ActivityIndicator color={C.bg} size="small" />
                  <Text style={styles.generatingText}>GÉNÉRATION EN COURS…</Text>
                </View>
              ) : (
                <PrimaryButton
                  label={`GÉNÉRER MA SÉANCE (${equipments.length})`}
                  icon="zap"
                  onPress={() => handleGenerate(false)}
                />
              )}
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  container: { paddingBottom: 48 },

  back: {
    flexDirection: "row", alignItems: "center", gap: 6,
    alignSelf: "flex-start", marginLeft: 24, marginTop: 16, marginBottom: 12,
    paddingVertical: 8, paddingHorizontal: 12,
    backgroundColor: C.surface, borderRadius: R.pill,
    borderWidth: 1, borderColor: C.border,
  },
  backText: { ...T.label, fontSize: 10 },

  header: { flexDirection: "row", alignItems: "center", gap: 16, paddingHorizontal: 24, paddingBottom: 20 },
  eyebrow: { ...T.label, color: C.accent, marginBottom: 4 },
  title: { fontFamily: "BebasNeue_400Regular", fontSize: 52, color: C.textPrimary, letterSpacing: 2, lineHeight: 52 },

  body: { paddingHorizontal: 24 },
  subtitle: { ...T.body, marginBottom: 20 },
  sectionSpaced: { marginTop: 28 },

  scanRow: { flexDirection: "row", gap: 10, marginBottom: 12 },
  scanBtn: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    paddingVertical: 16,
    backgroundColor: C.surface, borderRadius: R.md,
    borderWidth: 1, borderColor: C.borderHi,
  },
  scanBtnText: { fontFamily: "DMSans_700Bold", color: C.textPrimary, fontSize: 14, letterSpacing: 1 },

  noEquipBtn: {
    flexDirection: "row", alignItems: "center", gap: 14,
    paddingVertical: 14, paddingHorizontal: 16,
    backgroundColor: C.surface, borderRadius: R.md,
    borderWidth: 1, borderColor: C.border,
  },
  noEquipTextBlock: { flex: 1 },
  noEquipTitle: { fontFamily: "BebasNeue_400Regular", fontSize: 19, color: C.textPrimary, letterSpacing: 0.5 },
  noEquipSub: { ...T.small, color: C.textMuted, marginTop: 2 },

  scanningBox: {
    flexDirection: "row", alignItems: "center", gap: 10,
    backgroundColor: C.accentSofter, borderRadius: R.md,
    borderWidth: 1, borderColor: "rgba(200,255,0,0.18)",
    padding: 14, marginTop: 12,
  },
  scanningText: { ...T.body, color: C.accent },

  thumb: { marginRight: 10, position: "relative" },
  thumbImg: { width: 84, height: 84, borderRadius: R.sm },
  thumbBadge: {
    position: "absolute", bottom: 6, right: 6,
    flexDirection: "row", alignItems: "center", gap: 3,
    backgroundColor: C.accent, borderRadius: R.pill,
    paddingHorizontal: 7, paddingVertical: 3,
  },
  thumbBadgeText: { fontFamily: "DMSans_700Bold", color: C.bg, fontSize: 10 },

  emptyBox: {
    alignItems: "center", gap: 10,
    backgroundColor: C.surface, borderRadius: R.lg,
    borderWidth: 1, borderColor: C.border,
    padding: 28,
  },
  emptyText: { ...T.body, color: C.textMuted },

  equipRow: {
    flexDirection: "row", alignItems: "center", gap: 14,
    backgroundColor: C.surface, borderRadius: R.md,
    borderWidth: 1, borderColor: C.border,
    padding: 12,
    ...E.raised,
  },
  equipIconBox: {
    width: 48, height: 48, borderRadius: R.md,
    alignItems: "center", justifyContent: "center",
    borderWidth: 1.5, backgroundColor: C.surface2,
  },
  equipEmoji: { fontSize: 24 },
  equipName: { fontFamily: "DMSans_600SemiBold", fontSize: 15, color: C.textPrimary },
  equipMuscles: { ...T.small, color: C.textMuted, marginTop: 2 },
  removeBtn: {
    width: 32, height: 32, borderRadius: R.pill,
    alignItems: "center", justifyContent: "center",
    backgroundColor: "rgba(239,68,68,0.1)",
  },

  generateWrap: { marginTop: 28 },
  generatingBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10,
    backgroundColor: C.accentDim, borderRadius: R.md, paddingVertical: 18,
  },
  generatingText: { fontFamily: "DMSans_700Bold", fontSize: 15, color: C.bg, letterSpacing: 1.5 },
});
