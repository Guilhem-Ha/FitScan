import React, { useState } from "react";
import { View, Text, StyleSheet, Image, ScrollView, StatusBar, ActivityIndicator, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";
import { Feather } from "@expo/vector-icons";
import { identifyEquipment, generateWorkout } from "../services/geminiService";
import { C, T, R, E } from "../theme";
import { Press, PrimaryButton, SectionLabel, IconBadge } from "../ui/kit";

const CAT_COLORS = { cardio: C.blue, force: C.red, poids_libre: C.amber, accessoire: C.green };
const CAT_ICONS = { cardio: "heart", force: "activity", poids_libre: "disc", accessoire: "circle" };

export default function ScanScreen({ navigation, route }) {
  const { sessionName, level, goal, split, duration } = route.params;
  const [photos, setPhotos] = useState([]);
  const [equipments, setEquipments] = useState([]);
  const [scanning, setScanning] = useState(false);
  const [generating, setGenerating] = useState(false);
  const busy = scanning || generating;

  const pickImage = async (useCamera) => {
    const { status } = await (useCamera
      ? ImagePicker.requestCameraPermissionsAsync()
      : ImagePicker.requestMediaLibraryPermissionsAsync());
    if (status !== "granted") { Alert.alert("Permission refusée"); return; }
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
      if (found.length === 0) { Alert.alert("Rien détecté", "Essaie un autre angle."); return; }
      setPhotos((prev) => [...prev, { uri, count: found.length }]);
      setEquipments((prev) => {
        const existing = prev.map((e) => e.name.toLowerCase());
        return [...prev, ...found.filter((e) => !existing.includes(e.name.toLowerCase()))];
      });
      Alert.alert(found.length + " détecté(s)", found.map((e) => "• " + e.name).join("\n"));
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
        ? [{ name: "Poids du corps", category: "accessoire", muscles: [], icon: "user" }]
        : equipments;
      const workout = await generateWorkout({ equipments: equipsToUse, level, goal, split, duration });
      navigation.navigate("Workout", {
        workout, sessionName, level, goal, split, duration, equipments: equipsToUse,
      });
    } catch (err) {
      Alert.alert("Erreur", err.message);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <Press style={styles.back} onPress={() => navigation.goBack()} scaleTo={0.92}>
          <Feather name="arrow-left" size={16} color={C.textPrimary} />
          <Text style={styles.backText}>RETOUR</Text>
        </Press>

        <View style={styles.head}>
          <Text style={styles.eyebrow}>ÉTAPE 2 / 3</Text>
          <Text style={styles.title}>SCANNE{"\n"}TON MATOS</Text>
          <Text style={styles.subtitle}>Plusieurs photos OK — chaque scan ajoute à ta liste.</Text>
        </View>

        <View style={styles.body}>
          <View style={styles.scanRow}>
            <Press style={styles.scanBtn} onPress={() => pickImage(true)} disabled={busy}>
              <IconBadge name="camera" size={40} />
              <Text style={styles.scanBtnText}>CAMÉRA</Text>
            </Press>
            <Press style={styles.scanBtn} onPress={() => pickImage(false)} disabled={busy}>
              <IconBadge name="image" size={40} tone="neutral" />
              <Text style={styles.scanBtnText}>GALERIE</Text>
            </Press>
          </View>

          <Press style={styles.noEquipBtn} onPress={() => handleGenerate(true)} disabled={busy} scaleTo={0.98}>
            <IconBadge name="user" size={44} tone="neutral" />
            <View style={{ flex: 1 }}>
              <Text style={styles.noEquipTitle}>SANS ÉQUIPEMENT</Text>
              <Text style={styles.noEquipSub} numberOfLines={1}>Poids du corps · Partout, tout de suite</Text>
            </View>
            {generating && equipments.length === 0
              ? <ActivityIndicator color={C.accent} size="small" />
              : <Feather name="arrow-right" size={18} color={C.textSecondary} />}
          </Press>

          {scanning && (
            <View style={styles.scanningBox}>
              <ActivityIndicator color={C.accent} size="small" />
              <Text style={styles.scanningText}>Analyse en cours…</Text>
            </View>
          )}

          {photos.length > 0 && (
            <>
              <SectionLabel style={styles.spaced}>PHOTOS ({photos.length})</SectionLabel>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
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

          <SectionLabel style={styles.spaced} accent={equipments.length > 0}>
            ÉQUIPEMENTS DÉTECTÉS ({equipments.length})
          </SectionLabel>

          {equipments.length === 0 ? (
            <View style={styles.emptyBox}>
              <Feather name="search" size={20} color={C.textMuted} />
              <Text style={styles.emptyText}>Aucun équipement scanné pour l'instant.</Text>
            </View>
          ) : (
            <View style={{ gap: 10 }}>
              {equipments.map((eq, i) => (
                <View key={i} style={styles.equipRow}>
                  <View style={[styles.equipIconBox, { borderColor: CAT_COLORS[eq.category] || C.border }]}>
                    <Feather
                      name={CAT_ICONS[eq.category] || "box"}
                      size={20}
                      color={CAT_COLORS[eq.category] || C.textSecondary}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.equipName}>{eq.name}</Text>
                    <Text style={styles.equipMuscles} numberOfLines={1}>{eq.muscles?.join(" · ") || "—"}</Text>
                  </View>
                  <Press
                    style={styles.removeBtn}
                    onPress={() => setEquipments((prev) => prev.filter((_, j) => j !== i))}
                    scaleTo={0.85}
                  >
                    <Feather name="x" size={16} color={C.textSecondary} />
                  </Press>
                </View>
              ))}
            </View>
          )}

          {equipments.length > 0 && (
            <PrimaryButton
              label={generating ? "GÉNÉRATION EN COURS…" : "GÉNÉRER MA SÉANCE"}
              icon={generating ? null : "zap"}
              onPress={() => handleGenerate(false)}
              disabled={generating}
              style={{ marginTop: 28 }}
            />
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  container: { paddingBottom: 56 },

  back: {
    flexDirection: "row", alignItems: "center", gap: 8, alignSelf: "flex-start",
    marginLeft: 24, marginTop: 16, marginBottom: 24,
    backgroundColor: C.surface, borderRadius: R.pill,
    borderWidth: 1, borderColor: C.border, paddingHorizontal: 14, paddingVertical: 9,
  },
  backText: { ...T.label, color: C.textPrimary, fontSize: 10 },

  head: { paddingHorizontal: 24, marginBottom: 28 },
  eyebrow: { ...T.label, color: C.accent, marginBottom: 4 },
  title: { fontFamily: "BebasNeue_400Regular", fontSize: 56, color: C.textPrimary, letterSpacing: 2, lineHeight: 56, marginBottom: 10 },
  subtitle: { ...T.body },

  body: { paddingHorizontal: 24 },
  spaced: { marginTop: 28 },

  scanRow: { flexDirection: "row", gap: 12, marginBottom: 12 },
  scanBtn: {
    flex: 1, alignItems: "center", gap: 10, paddingVertical: 20,
    backgroundColor: C.surface, borderRadius: R.lg,
    borderWidth: 1, borderColor: C.border, ...E.raised,
  },
  scanBtnText: { ...T.label, color: C.textPrimary, fontSize: 10 },

  noEquipBtn: {
    flexDirection: "row", alignItems: "center", gap: 14,
    padding: 14, borderRadius: R.lg,
    backgroundColor: C.surface, borderWidth: 1, borderColor: C.border,
  },
  noEquipTitle: { fontFamily: "BebasNeue_400Regular", fontSize: 19, color: C.textPrimary, letterSpacing: 0.5 },
  noEquipSub: { ...T.small, marginTop: 2, color: C.textMuted },

  scanningBox: {
    flexDirection: "row", alignItems: "center", gap: 10, marginTop: 12,
    backgroundColor: C.accentSofter, borderRadius: R.md,
    borderWidth: 1, borderColor: "rgba(200,255,0,0.18)", padding: 14,
  },
  scanningText: { ...T.body, color: C.accent },

  thumb: { position: "relative" },
  thumbImg: { width: 88, height: 88, borderRadius: R.md },
  thumbBadge: {
    position: "absolute", bottom: 6, right: 6, flexDirection: "row", alignItems: "center", gap: 3,
    backgroundColor: C.accent, borderRadius: R.pill, paddingHorizontal: 7, paddingVertical: 3,
  },
  thumbBadgeText: { fontFamily: "DMSans_700Bold", color: C.bg, fontSize: 10 },

  emptyBox: {
    alignItems: "center", gap: 8, padding: 28,
    backgroundColor: C.surface, borderRadius: R.lg,
    borderWidth: 1, borderColor: C.border, borderStyle: "dashed",
  },
  emptyText: { ...T.body, textAlign: "center" },

  equipRow: {
    flexDirection: "row", alignItems: "center", gap: 14,
    backgroundColor: C.surface, borderRadius: R.lg,
    borderWidth: 1, borderColor: C.border, padding: 12, ...E.raised,
  },
  equipIconBox: {
    width: 48, height: 48, borderRadius: R.md,
    alignItems: "center", justifyContent: "center",
    borderWidth: 1.5, backgroundColor: C.surface2,
  },
  equipName: { fontFamily: "DMSans_600SemiBold", fontSize: 15, color: C.textPrimary },
  equipMuscles: { ...T.small, marginTop: 2, color: C.textMuted },
  removeBtn: {
    width: 32, height: 32, borderRadius: R.pill,
    alignItems: "center", justifyContent: "center", backgroundColor: C.surface2,
  },
});
