import React, { useState } from "react";
import {
  View, Text, StyleSheet, Image,
  ScrollView, StatusBar, ActivityIndicator, Alert, Linking,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { identifyEquipment, getQuickExercises } from "../services/geminiService";
import { C, T, R, E } from "../theme";
import { Press, GhostButton, IconBadge } from "../ui/kit";

const CAT_COLORS = { cardio: C.blue, force: C.red, poids_libre: C.amber, accessoire: C.green };

export default function QuickScanScreen() {
  const [photo, setPhoto] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [results, setResults] = useState([]);

  const pickImage = async (useCamera) => {
    const { status } = await (useCamera
      ? ImagePicker.requestCameraPermissionsAsync()
      : ImagePicker.requestMediaLibraryPermissionsAsync());
    if (status !== "granted") { Alert.alert("Permission refusée"); return; }
    const picked = await (useCamera
      ? ImagePicker.launchCameraAsync({ quality: 0.7, base64: true })
      : ImagePicker.launchImageLibraryAsync({ quality: 0.7, base64: true }));
    if (!picked.canceled && picked.assets[0]) {
      setPhoto(picked.assets[0].uri);
      setResults([]);
      await analyzePhoto(picked.assets[0].base64);
    }
  };

  const analyzePhoto = async (base64) => {
    setScanning(true);
    try {
      const result = await identifyEquipment(base64);
      const found = result.equipments || [];
      if (found.length === 0) {
        Alert.alert("Rien détecté", "Essaie un autre angle ou une autre photo.");
        return;
      }
      const withExercises = await Promise.all(
        found.map(async (eq) => {
          const data = await getQuickExercises(eq.name);
          return { ...eq, exercises: data.exercises || [] };
        })
      );
      setResults(withExercises);
    } catch (err) {
      Alert.alert("Erreur", err.message);
    } finally {
      setScanning(false);
    }
  };

  const reset = () => { setPhoto(null); setResults([]); };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>

        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text style={styles.eyebrow}>SCAN RAPIDE</Text>
            <Text style={styles.title}>EXERCICES{"\n"}SUGGÉRÉS</Text>
          </View>
          <IconBadge name="maximize" size={46} />
        </View>

        <View style={styles.body}>
          <Text style={styles.subtitle}>Scanne un appareil et obtiens des exercices immédiatement.</Text>

          {/* Photo */}
          {photo ? (
            <View style={styles.photoWrap}>
              <Image source={{ uri: photo }} style={styles.photo} />
              {scanning && (
                <View style={styles.overlay}>
                  <ActivityIndicator color={C.accent} size="large" />
                  <Text style={styles.overlayText}>Analyse en cours…</Text>
                </View>
              )}
            </View>
          ) : (
            <Press style={styles.placeholder} onPress={() => pickImage(true)} disabled={scanning} scaleTo={0.98}>
              <IconBadge name="camera" size={52} />
              <Text style={styles.placeholderText}>Prends une photo d'un appareil</Text>
            </Press>
          )}

          <GhostButton
            label="CHOISIR DEPUIS LA GALERIE"
            icon="image"
            onPress={() => pickImage(false)}
            style={styles.galleryBtn}
          />
        </View>

        {/* Résultats */}
        {results.map((item, idx) => (
          <View key={idx} style={styles.equipBlock}>
            <View style={styles.equipHeader}>
              <View style={[styles.catDot, { backgroundColor: CAT_COLORS[item.category] || C.textMuted }]} />
              <Text style={styles.equipEmoji}>{item.emoji || "🏋️"}</Text>
              <Text style={styles.equipName} numberOfLines={1}>{item.name.toUpperCase()}</Text>
            </View>

            <View style={styles.exList}>
              {item.exercises.map((ex, i) => (
                <View key={i} style={styles.exRow}>
                  <Text style={styles.exNum}>{String(i + 1).padStart(2, "0")}</Text>
                  <View style={styles.exInfo}>
                    <Text style={styles.exName}>{ex.name.toUpperCase()}</Text>
                    <View style={styles.exMetaRow}>
                      <View style={styles.metaPill}>
                        <Text style={styles.metaPillText}>{ex.sets} × {ex.reps}</Text>
                      </View>
                      {ex.muscles?.length > 0 && (
                        <Text style={styles.exMuscles} numberOfLines={1}>{ex.muscles.join(" · ")}</Text>
                      )}
                    </View>
                    {ex.tips && (
                      <View style={styles.tipRow}>
                        <Feather name="info" size={11} color={C.textMuted} />
                        <Text style={styles.exTips}>{ex.tips}</Text>
                      </View>
                    )}
                  </View>
                  {ex.youtubeQuery && (
                    <Press
                      style={styles.videoBtn}
                      onPress={() => Linking.openURL(`https://www.youtube.com/results?search_query=${encodeURIComponent(ex.youtubeQuery)}`)}
                      scaleTo={0.88}
                    >
                      <Feather name="play" size={13} color="#fff" />
                    </Press>
                  )}
                </View>
              ))}
            </View>
          </View>
        ))}

        {photo && !scanning && results.length > 0 && (
          <View style={styles.body}>
            <GhostButton label="NOUVELLE PHOTO" icon="refresh-cw" onPress={reset} />
          </View>
        )}

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  container: { paddingBottom: 40 },

  header: { flexDirection: "row", alignItems: "center", gap: 16, paddingHorizontal: 24, paddingTop: 24, paddingBottom: 20 },
  eyebrow: { ...T.label, color: C.accent, marginBottom: 4 },
  title: { fontFamily: "BebasNeue_400Regular", fontSize: 46, color: C.textPrimary, letterSpacing: 2, lineHeight: 46 },

  body: { paddingHorizontal: 24 },
  subtitle: { ...T.body, marginBottom: 20 },

  placeholder: {
    height: 170, alignItems: "center", justifyContent: "center", gap: 12,
    backgroundColor: C.surface, borderRadius: R.lg,
    borderWidth: 1, borderColor: C.border, borderStyle: "dashed",
  },
  placeholderText: { ...T.body, color: C.textMuted },

  photoWrap: { position: "relative", borderRadius: R.lg, overflow: "hidden", borderWidth: 1, borderColor: C.border },
  photo: { width: "100%", height: 210 },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.72)",
    alignItems: "center", justifyContent: "center", gap: 12,
  },
  overlayText: { fontFamily: "DMSans_600SemiBold", fontSize: 14, color: C.accent },

  galleryBtn: { marginTop: 12, paddingVertical: 15 },

  equipBlock: {
    marginHorizontal: 24, marginTop: 20,
    backgroundColor: C.surface, borderRadius: R.lg,
    borderWidth: 1, borderColor: C.border,
    overflow: "hidden",
    ...E.raised,
  },
  equipHeader: {
    flexDirection: "row", alignItems: "center", gap: 10,
    paddingHorizontal: 16, paddingVertical: 14,
    backgroundColor: C.surface2,
  },
  catDot: { width: 8, height: 8, borderRadius: 4 },
  equipEmoji: { fontSize: 20 },
  equipName: { flex: 1, fontFamily: "BebasNeue_400Regular", fontSize: 22, color: C.textPrimary, letterSpacing: 1 },

  exList: { paddingHorizontal: 16 },
  exRow: {
    flexDirection: "row", alignItems: "flex-start", gap: 12,
    paddingVertical: 14,
    borderTopWidth: 1, borderColor: C.border,
  },
  exNum: { fontFamily: "BebasNeue_400Regular", fontSize: 24, color: C.textMuted, lineHeight: 26, width: 28 },
  exInfo: { flex: 1, gap: 6 },
  exName: { fontFamily: "BebasNeue_400Regular", fontSize: 19, color: C.textPrimary, lineHeight: 21 },
  exMetaRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  metaPill: {
    backgroundColor: C.accentSoft, borderRadius: R.pill,
    paddingHorizontal: 9, paddingVertical: 3,
  },
  metaPillText: { fontFamily: "DMSans_600SemiBold", fontSize: 10, color: C.accent, letterSpacing: 0.5 },
  exMuscles: { ...T.small, fontSize: 11, color: C.textMuted, flex: 1 },
  tipRow: { flexDirection: "row", alignItems: "flex-start", gap: 6 },
  exTips: { flex: 1, fontFamily: "DMSans_400Regular", fontSize: 12, fontStyle: "italic", color: C.textSecondary, lineHeight: 17 },

  videoBtn: {
    width: 34, height: 34, borderRadius: R.pill,
    backgroundColor: "#FF0000", alignItems: "center", justifyContent: "center",
    marginTop: 2,
  },
});
