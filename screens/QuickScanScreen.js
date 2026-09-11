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
import { categoryOf } from "../ui/categories";

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
      // Un appareil dont la demande échoue ne doit pas faire perdre les exercices des autres.
      const settled = await Promise.allSettled(found.map((eq) => getQuickExercises(eq.name)));
      const withExercises = found
        .map((eq, i) => (settled[i].status === "fulfilled" ? { ...eq, exercises: settled[i].value.exercises } : null))
        .filter((eq) => eq && eq.exercises.length > 0);
      if (withExercises.length === 0) {
        throw settled.find((r) => r.status === "rejected")?.reason || new Error("Aucun exercice proposé. Réessaie.");
      }
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
        <Text style={styles.title}>EXERCICES SUGGÉRÉS</Text>
        <Text style={styles.subtitle}>Un appareil, des exercices immédiatement.</Text>

        <Press style={styles.photoCard} onPress={() => pickImage(true)} disabled={scanning} scaleTo={0.99}>
          {photo ? <Image source={{ uri: photo }} style={styles.photo} /> : null}
          {photo && scanning ? <View style={styles.shade} /> : null}
          {scanning ? (
            <View style={styles.center}>
              <ActivityIndicator color={C.accent} size="large" />
              <Text style={styles.scanningText}>Analyse en cours…</Text>
            </View>
          ) : !photo ? (
            <View style={styles.center}>
              <IconBadge name="camera" size={48} />
              <Text style={styles.placeholderText}>Prends une photo d'un appareil</Text>
            </View>
          ) : null}
        </Press>

        <GhostButton
          label="CHOISIR DEPUIS LA GALERIE"
          icon="image"
          onPress={() => !scanning && pickImage(false)}
          style={styles.galleryBtn}
        />

        {results.map((item, idx) => {
          const cat = categoryOf(item.category);
          return (
            <View key={idx} style={styles.equipBlock}>
              <View style={styles.equipHeader}>
                <IconBadge name={cat.icon} family="mci" size={36} color={cat.color} />
                <Text style={styles.equipName} numberOfLines={1}>{item.name.toUpperCase()}</Text>
              </View>

              <View style={{ gap: 8 }}>
                {item.exercises.map((ex, i) => (
                  <View key={i} style={styles.exCard}>
                    <View style={styles.indexBox}>
                      <Text style={styles.indexText}>{String(i + 1).padStart(2, "0")}</Text>
                    </View>
                    <View style={styles.exInfo}>
                      <Text style={styles.exName}>{ex.name.toUpperCase()}</Text>
                      <View style={styles.chips}>
                        <View style={styles.pill}>
                          <Text style={styles.pillText}>{ex.sets} × {ex.reps}</Text>
                        </View>
                        {ex.muscles?.slice(0, 2).map((m, j) => (
                          <View key={j} style={styles.chip}>
                            <Text style={styles.chipText}>{m}</Text>
                          </View>
                        ))}
                      </View>
                      {ex.tips ? <Text style={styles.exTips}>{ex.tips}</Text> : null}
                    </View>
                    {ex.youtubeQuery ? (
                      <Press
                        style={styles.videoBtn}
                        onPress={() => Linking.openURL(`https://www.youtube.com/results?search_query=${encodeURIComponent(ex.youtubeQuery)}`)}
                        scaleTo={0.88}
                        accessibilityLabel={`Voir ${ex.name} en vidéo`}
                      >
                        <Feather name="play" size={13} color="#fff" />
                      </Press>
                    ) : null}
                  </View>
                ))}
              </View>
            </View>
          );
        })}

        {photo && !scanning && results.length > 0 && (
          <GhostButton label="NOUVELLE PHOTO" icon="refresh-cw" onPress={reset} style={{ marginTop: 24 }} />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  container: { paddingHorizontal: 24, paddingTop: 20, paddingBottom: 40 },

  eyebrow: { ...T.label, color: C.accent, marginBottom: 2 },
  title: { fontFamily: "BebasNeue_400Regular", fontSize: 44, color: C.textPrimary, letterSpacing: 1.5, lineHeight: 46 },
  subtitle: { ...T.body, fontSize: 14, marginBottom: 18 },

  photoCard: {
    height: 170, borderRadius: R.lg, overflow: "hidden",
    backgroundColor: C.surface, borderWidth: 1, borderColor: C.border,
    alignItems: "center", justifyContent: "center",
  },
  photo: { ...StyleSheet.absoluteFillObject, width: "100%", height: "100%" },
  shade: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(10,10,10,0.7)" },
  center: { alignItems: "center", gap: 12 },
  scanningText: { fontFamily: "DMSans_600SemiBold", fontSize: 14, color: C.accent },
  placeholderText: { ...T.body, fontSize: 14, color: C.textMuted },

  galleryBtn: { marginTop: 10, paddingVertical: 14 },

  equipBlock: { marginTop: 24 },
  equipHeader: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 12 },
  equipName: { flex: 1, fontFamily: "BebasNeue_400Regular", fontSize: 26, color: C.textPrimary, letterSpacing: 0.5 },

  exCard: {
    flexDirection: "row", alignItems: "flex-start", gap: 12,
    backgroundColor: C.surface, borderRadius: R.lg,
    borderWidth: 1, borderColor: C.border,
    padding: 14,
    ...E.raised,
  },
  indexBox: {
    width: 32, height: 32, borderRadius: R.xs,
    alignItems: "center", justifyContent: "center",
    backgroundColor: C.accentSoft,
  },
  indexText: { fontFamily: "BebasNeue_400Regular", fontSize: 18, color: C.accent },
  exInfo: { flex: 1, gap: 6 },
  exName: { fontFamily: "BebasNeue_400Regular", fontSize: 19, color: C.textPrimary, lineHeight: 21 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  pill: { backgroundColor: C.accentSoft, borderRadius: R.pill, paddingHorizontal: 9, paddingVertical: 3 },
  pillText: { fontFamily: "DMSans_700Bold", fontSize: 11, color: C.accent },
  chip: { backgroundColor: C.surface2, borderRadius: R.pill, paddingHorizontal: 9, paddingVertical: 3 },
  chipText: { fontFamily: "DMSans_400Regular", fontSize: 11, color: C.textSecondary },
  exTips: { fontFamily: "DMSans_400Regular", fontSize: 12, color: C.textSecondary, lineHeight: 17 },

  videoBtn: {
    width: 34, height: 34, borderRadius: R.xs,
    backgroundColor: "#FF0000", alignItems: "center", justifyContent: "center",
  },
});
