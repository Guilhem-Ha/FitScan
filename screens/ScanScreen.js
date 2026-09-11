import React, { useState } from "react";
import { View, Text, StyleSheet, Image, ScrollView, StatusBar, ActivityIndicator, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";
import { Feather } from "@expo/vector-icons";
import { identifyEquipment, generateWorkout } from "../services/geminiService";
import { C, T, R, E } from "../theme";
import { Press, PrimaryButton, GhostButton, IconBadge, StepHeader, FooterBar } from "../ui/kit";
import { categoryOf } from "../ui/categories";

function Corner({ style }) {
  return <View style={[styles.corner, style]} />;
}

export default function ScanScreen({ navigation, route }) {
  const { sessionName, level, goal, split, duration } = route.params;
  const [photos, setPhotos] = useState([]);
  const [equipments, setEquipments] = useState([]);
  const [scanning, setScanning] = useState(false);
  const [generating, setGenerating] = useState(false);
  const busy = scanning || generating;
  const lastPhoto = photos[photos.length - 1];

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
        ? [{ name: "Poids du corps", category: "accessoire", muscles: [] }]
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
      <StepHeader step={2} onBack={() => navigation.goBack()} />

      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <Text style={styles.eyebrow}>ÉTAPE 2</Text>
        <Text style={styles.title}>SCANNE TON MATOS</Text>
        <Text style={styles.subtitle}>Plusieurs photos OK — chaque scan ajoute à ta liste.</Text>

        {/* Viseur : dernière photo analysée, ou invitation à photographier */}
        <Press style={styles.viewfinder} onPress={() => pickImage(true)} disabled={busy} scaleTo={0.99}>
          {lastPhoto ? <Image source={{ uri: lastPhoto.uri }} style={styles.viewfinderImg} /> : null}
          {lastPhoto || scanning ? <View style={styles.viewfinderShade} /> : null}
          <Corner style={{ top: 12, left: 12, borderTopWidth: 2.5, borderLeftWidth: 2.5, borderTopLeftRadius: 10 }} />
          <Corner style={{ top: 12, right: 12, borderTopWidth: 2.5, borderRightWidth: 2.5, borderTopRightRadius: 10 }} />
          <Corner style={{ bottom: 12, left: 12, borderBottomWidth: 2.5, borderLeftWidth: 2.5, borderBottomLeftRadius: 10 }} />
          <Corner style={{ bottom: 12, right: 12, borderBottomWidth: 2.5, borderRightWidth: 2.5, borderBottomRightRadius: 10 }} />

          {scanning ? (
            <View style={styles.viewfinderCenter}>
              <ActivityIndicator color={C.accent} />
              <Text style={styles.scanningText}>Analyse en cours…</Text>
            </View>
          ) : lastPhoto ? (
            <View style={styles.photoCount}>
              <Feather name="check" size={11} color={C.bg} />
              <Text style={styles.photoCountText}>
                {photos.length} photo{photos.length > 1 ? "s" : ""}
              </Text>
            </View>
          ) : (
            <View style={styles.viewfinderCenter}>
              <Feather name="camera" size={20} color={C.textMuted} />
              <Text style={styles.viewfinderHint}>Vise ton équipement</Text>
            </View>
          )}
        </Press>

        <View style={styles.scanRow}>
          <PrimaryButton label="CAMÉRA" icon="camera" onPress={() => pickImage(true)} disabled={busy} style={styles.scanBtn} />
          <GhostButton label="GALERIE" icon="image" onPress={() => !busy && pickImage(false)} style={styles.scanBtn} />
        </View>

        <Press style={styles.noEquipBtn} onPress={() => handleGenerate(true)} disabled={busy} scaleTo={0.98}>
          <IconBadge name="user" size={42} color={C.green} />
          <View style={{ flex: 1 }}>
            <Text style={styles.noEquipTitle}>SANS ÉQUIPEMENT</Text>
            <Text style={styles.noEquipSub} numberOfLines={1}>Poids du corps · partout</Text>
          </View>
          {generating && equipments.length === 0
            ? <ActivityIndicator color={C.accent} size="small" />
            : <Feather name="arrow-right" size={18} color={C.textSecondary} />}
        </Press>

        <View style={styles.detectedHead}>
          <Text style={styles.label}>DÉTECTÉS</Text>
          <View style={[styles.countPill, equipments.length === 0 && styles.countPillEmpty]}>
            <Text style={[styles.countText, equipments.length === 0 && { color: C.textMuted }]}>{equipments.length}</Text>
          </View>
        </View>

        {equipments.length === 0 ? (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyText}>Aucun équipement scanné pour l'instant.</Text>
          </View>
        ) : (
          <View style={{ gap: 8 }}>
            {equipments.map((eq, i) => {
              const cat = categoryOf(eq.category);
              return (
                <View key={i} style={styles.equipRow}>
                  <IconBadge name={cat.icon} family="mci" size={42} color={cat.color} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.equipName}>{eq.name}</Text>
                    <Text style={styles.equipMuscles} numberOfLines={1}>{eq.muscles?.join(" · ") || "—"}</Text>
                  </View>
                  <Press
                    style={styles.removeBtn}
                    onPress={() => setEquipments((prev) => prev.filter((_, j) => j !== i))}
                    scaleTo={0.85}
                    accessibilityLabel={`Retirer ${eq.name}`}
                  >
                    <Feather name="x" size={16} color={C.textMuted} />
                  </Press>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>

      <FooterBar>
        <PrimaryButton
          label={generating && equipments.length > 0 ? "GÉNÉRATION EN COURS…" : "GÉNÉRER MA SÉANCE"}
          icon={generating ? null : "zap"}
          onPress={() => handleGenerate(false)}
          disabled={busy || equipments.length === 0}
        />
      </FooterBar>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  container: { paddingHorizontal: 24, paddingBottom: 120 },

  eyebrow: { ...T.label, color: C.accent, marginBottom: 2 },
  title: { fontFamily: "BebasNeue_400Regular", fontSize: 46, color: C.textPrimary, letterSpacing: 1.5, lineHeight: 48, marginBottom: 4 },
  subtitle: { ...T.body, fontSize: 14, marginBottom: 18 },
  label: { ...T.label, fontSize: 10 },

  viewfinder: {
    height: 150, borderRadius: R.lg, overflow: "hidden",
    backgroundColor: C.surface, borderWidth: 1, borderColor: C.border,
    alignItems: "center", justifyContent: "center",
    marginBottom: 12,
  },
  viewfinderImg: { ...StyleSheet.absoluteFillObject, width: "100%", height: "100%" },
  viewfinderShade: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(10,10,10,0.55)" },
  corner: { position: "absolute", width: 26, height: 26, borderColor: C.accent },
  viewfinderCenter: { flexDirection: "row", alignItems: "center", gap: 10 },
  viewfinderHint: { fontFamily: "DMSans_400Regular", fontSize: 13, color: C.textMuted },
  scanningText: { fontFamily: "DMSans_600SemiBold", fontSize: 13, color: C.accent },
  photoCount: {
    position: "absolute", bottom: 14, alignSelf: "center",
    flexDirection: "row", alignItems: "center", gap: 4,
    backgroundColor: C.accent, borderRadius: R.pill, paddingHorizontal: 10, paddingVertical: 4,
  },
  photoCountText: { fontFamily: "DMSans_700Bold", fontSize: 11, color: C.bg },

  scanRow: { flexDirection: "row", gap: 10, marginBottom: 10 },
  scanBtn: { flex: 1, paddingVertical: 15 },

  noEquipBtn: {
    flexDirection: "row", alignItems: "center", gap: 14,
    padding: 14, borderRadius: R.lg,
    backgroundColor: C.surface, borderWidth: 1, borderColor: C.border,
  },
  noEquipTitle: { fontFamily: "BebasNeue_400Regular", fontSize: 19, color: C.textPrimary, letterSpacing: 0.5 },
  noEquipSub: { ...T.small, marginTop: 1, color: C.textMuted },

  detectedHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 22, marginBottom: 10 },
  countPill: { minWidth: 22, alignItems: "center", backgroundColor: C.accentSoft, borderRadius: R.pill, paddingHorizontal: 7, paddingVertical: 2 },
  countPillEmpty: { backgroundColor: C.surface2 },
  countText: { fontFamily: "DMSans_700Bold", fontSize: 11, color: C.accent },

  emptyBox: {
    alignItems: "center", padding: 24,
    borderRadius: R.lg, borderWidth: 1, borderColor: C.border, borderStyle: "dashed",
  },
  emptyText: { ...T.body, fontSize: 14, color: C.textMuted, textAlign: "center" },

  equipRow: {
    flexDirection: "row", alignItems: "center", gap: 12,
    backgroundColor: C.surface, borderRadius: R.lg,
    borderWidth: 1, borderColor: C.border, padding: 10, ...E.raised,
  },
  equipName: { fontFamily: "DMSans_600SemiBold", fontSize: 15, color: C.textPrimary },
  equipMuscles: { ...T.small, marginTop: 1, color: C.textMuted },
  removeBtn: { width: 32, height: 32, borderRadius: R.pill, alignItems: "center", justifyContent: "center" },
});
