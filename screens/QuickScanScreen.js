import React, { useState } from "react";
import {
  View, Text, StyleSheet, TouchableOpacity, Image,
  ScrollView, StatusBar, ActivityIndicator, Alert, Linking,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";
import { identifyEquipment, getQuickExercises } from "../services/geminiService";
import { C, T } from "../theme";

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
      // Récupère les exercices pour chaque équipement en parallèle
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

        <Text style={styles.eyebrow}>SCAN RAPIDE</Text>
        <Text style={styles.title}>EXERCICES{"\n"}SUGGÉRÉS</Text>
        <Text style={styles.subtitle}>Scanne un appareil et obtiens des exercices immédiatement.</Text>

        <View style={styles.divider} />

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
          <TouchableOpacity
            style={styles.placeholder}
            onPress={() => pickImage(true)}
            disabled={scanning}
            activeOpacity={0.8}
          >
            <Text style={styles.placeholderIcon}>📷</Text>
            <Text style={styles.placeholderText}>Prends une photo d'un appareil</Text>
          </TouchableOpacity>
        )}

        {/* Bouton galerie uniquement */}
        <View style={styles.scanRow}>
          <TouchableOpacity style={styles.scanBtn} onPress={() => pickImage(false)} disabled={scanning} activeOpacity={0.8}>
            <Text style={styles.scanBtnText}>🖼  CHOISIR DEPUIS LA GALERIE</Text>
          </TouchableOpacity>
        </View>

        {/* Résultats */}
        {results.map((item, idx) => (
          <View key={idx} style={styles.equipBlock}>
            {/* Header équipement */}
            <View style={[styles.equipHeader, { borderLeftColor: CAT_COLORS[item.category] || C.textMuted }]}>
              <Text style={styles.equipEmoji}>{item.emoji || "🏋️"}</Text>
              <Text style={styles.equipName}>{item.name.toUpperCase()}</Text>
            </View>

            {/* Liste exercices */}
            {item.exercises.map((ex, i) => (
              <View key={i} style={styles.exRow}>
                <Text style={styles.exNum}>{String(i + 1).padStart(2, "0")}</Text>
                <View style={styles.exInfo}>
                  <Text style={styles.exName}>{ex.name.toUpperCase()}</Text>
                  <Text style={styles.exMeta}>{ex.sets} séries · {ex.reps} reps</Text>
                  {ex.muscles?.length > 0 && (
                    <Text style={styles.exMuscles}>{ex.muscles.join(" · ")}</Text>
                  )}
                  {ex.tips && <Text style={styles.exTips}>💡 {ex.tips}</Text>}
                </View>
                {ex.youtubeQuery && (
                  <TouchableOpacity
                    style={styles.videoBtn}
                    onPress={() => Linking.openURL(`https://www.youtube.com/results?search_query=${encodeURIComponent(ex.youtubeQuery)}`)}
                    activeOpacity={0.8}
                  >
                    <View style={styles.videoPlay}>
                      <Text style={styles.videoPlayIcon}>▶</Text>
                    </View>
                  </TouchableOpacity>
                )}
              </View>
            ))}
          </View>
        ))}

        {photo && !scanning && results.length > 0 && (
          <TouchableOpacity style={styles.resetBtn} onPress={reset} activeOpacity={0.7}>
            <Text style={styles.resetText}>NOUVELLE PHOTO</Text>
          </TouchableOpacity>
        )}

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  container: { paddingBottom: 40 },

  eyebrow: { ...T.label, color: C.accent, paddingHorizontal: 24, paddingTop: 24, marginBottom: 4 },
  title: { fontFamily: "BebasNeue_400Regular", fontSize: 48, color: C.textPrimary, letterSpacing: 2, lineHeight: 48, paddingHorizontal: 24, marginBottom: 8 },
  subtitle: { ...T.body, paddingHorizontal: 24, marginBottom: 4 },
  divider: { height: 1, backgroundColor: C.border, marginHorizontal: 24, marginVertical: 20 },

  placeholder: {
    marginHorizontal: 24, height: 160, backgroundColor: C.surface,
    alignItems: "center", justifyContent: "center", marginBottom: 16,
    borderWidth: 1, borderColor: C.border, borderStyle: "dashed",
  },
  placeholderIcon: { fontSize: 40, marginBottom: 8 },
  placeholderText: { ...T.body },

  photoWrap: { marginHorizontal: 24, marginBottom: 16, position: "relative" },
  photo: { width: "100%", height: 200 },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.7)",
    alignItems: "center", justifyContent: "center", gap: 12,
  },
  overlayText: { fontFamily: "DMSans_600SemiBold", fontSize: 14, color: C.accent },

  scanRow: { flexDirection: "row", gap: 12, marginHorizontal: 24, marginBottom: 24 },
  scanBtn: { flex: 1, paddingVertical: 14, alignItems: "center", borderWidth: 1, borderColor: C.border },
  scanBtnText: { fontFamily: "DMSans_700Bold", color: C.textPrimary, fontSize: 13, letterSpacing: 1 },

  equipBlock: { marginBottom: 8 },
  equipHeader: {
    flexDirection: "row", alignItems: "center", gap: 12,
    paddingHorizontal: 24, paddingVertical: 16,
    backgroundColor: C.surface,
    borderLeftWidth: 3,
  },
  equipEmoji: { fontSize: 22 },
  equipName: { fontFamily: "BebasNeue_400Regular", fontSize: 24, color: C.textPrimary, letterSpacing: 1 },

  exRow: {
    flexDirection: "row", alignItems: "flex-start",
    paddingHorizontal: 24, paddingVertical: 16,
    borderTopWidth: 1, borderColor: C.border, gap: 14,
  },
  exNum: { fontFamily: "BebasNeue_400Regular", fontSize: 28, color: C.textMuted, lineHeight: 30, width: 36 },
  exInfo: { flex: 1 },
  exName: { fontFamily: "BebasNeue_400Regular", fontSize: 20, color: C.textPrimary, lineHeight: 22, marginBottom: 4 },
  exMeta: { ...T.label, fontSize: 11, color: C.textSecondary, marginBottom: 4 },
  exMuscles: { ...T.small, color: C.textMuted, marginBottom: 4 },
  exTips: { fontFamily: "DMSans_400Regular", fontSize: 12, fontStyle: "italic", color: C.textSecondary, lineHeight: 17 },

  videoBtn: { paddingTop: 2 },
  videoPlay: { width: 32, height: 32, backgroundColor: "#FF0000", alignItems: "center", justifyContent: "center" },
  videoPlayIcon: { color: "#fff", fontSize: 12, marginLeft: 2 },

  resetBtn: { marginHorizontal: 24, marginTop: 8, paddingVertical: 14, alignItems: "center", borderWidth: 1, borderColor: C.border },
  resetText: { fontFamily: "DMSans_700Bold", fontSize: 13, color: C.textSecondary, letterSpacing: 1.5 },
});