import React, { useEffect, useRef, useState } from "react";
import { View, Text, StyleSheet, StatusBar, Vibration, Animated, Easing, Platform } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { getSessions, getWeightHistory } from "../data/storage";
import { streakDays } from "../data/stats";
import { C, R } from "../theme";
import { Press } from "../ui/kit";

const INK = C.bg;
const INK_MUTED = "rgba(10,10,10,0.55)";
const INK_LINE = "rgba(10,10,10,0.18)";
const MONO = Platform.select({ ios: "Menlo", default: "monospace" });

const pad2 = (n) => String(n).padStart(2, "0");
const formatStamp = (d) =>
  `${pad2(d.getDate())}.${pad2(d.getMonth() + 1)}.${d.getFullYear()} · ${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
// « 3 240 » : séparateur de milliers posé à la main, sans dépendre d'Intl sous Hermes.
const formatKg = (n) => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, " ");

/* Reps renvoyées par Gemini : "10-12", "15", "30s". Seules les répétitions
   comptent dans le volume (borne basse d'une fourchette), pas les efforts chronométrés. */
function repsCount(reps) {
  const s = String(reps ?? "");
  if (/\d\s*(s|sec|min)\b/i.test(s)) return 0;
  const m = s.match(/\d+/);
  return m ? parseInt(m[0], 10) : 0;
}

/* Volume = charge × reps × séries cochées, pour chaque exercice dont un poids a
   été noté pendant cette séance. Les charges en lbs sont converties en kg. */
async function sessionVolumeKg(exercises, progress, startedAt) {
  const history = await getWeightHistory();
  return exercises.reduce((total, ex, i) => {
    const entry = history[ex.name.toLowerCase().trim()]?.[0];
    if (!entry || new Date(entry.date).getTime() < startedAt) return total;
    const kg = entry.unit === "lbs" ? entry.weight * 0.4536 : entry.weight;
    return total + kg * repsCount(ex.reps) * (progress[i] || 0);
  }, 0);
}

/* Écran de fin de séance. Props :
   workout, progress (séries cochées par index d'exercice), startedAt (ms),
   elapsedMin, saveFailed, onGoHome */
export default function SessionCompleteScreen({
  workout = {}, progress = {}, startedAt = 0, elapsedMin, saveFailed, onGoHome,
}) {
  const [volume, setVolume] = useState(null);
  const [streak, setStreak] = useState(null);
  const enter = useRef(new Animated.Value(0)).current;
  const finishedAt = useRef(new Date()).current;
  const exercises = workout.exercises || [];

  useEffect(() => {
    Vibration.vibrate([0, 200, 100, 200, 100, 300]);
    Animated.timing(enter, { toValue: 1, duration: 420, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
    sessionVolumeKg(exercises, progress, startedAt).then(setVolume).catch(() => setVolume(0));
    // La séance du jour est comptée d'office : son enregistrement peut ne pas être terminé.
    getSessions()
      .then((sessions) => setStreak(streakDays([...sessions, { date: new Date().toISOString() }])))
      .catch(() => setStreak(null));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const exercisesDone = exercises.filter((ex, i) => (progress[i] || 0) >= (ex.sets || 3)).length;
  const minutes = elapsedMin ?? workout.totalDuration ?? 0;

  const rows = [
    ["DURÉE", `${minutes} MIN`],
    ["EXERCICES", `${exercisesDone} / ${exercises.length}`],
    ["VOLUME", volume ? `${formatKg(volume)} KG` : "—"],
    ["SÉRIE", streak ? `${streak} JOUR${streak > 1 ? "S" : ""}` : "—"],
  ];

  const translateY = enter.interpolate({ inputRange: [0, 1], outputRange: [24, 0] });

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor={C.accent} />

      <Animated.View style={[styles.content, { opacity: enter, transform: [{ translateY }] }]}>
        <Text style={styles.stamp}>{formatStamp(finishedAt)}</Text>
        <Text style={styles.title}>SÉANCE{"\n"}TERMINÉE.</Text>

        <View style={styles.rows}>
          {rows.map(([label, value]) => (
            <View key={label} style={styles.row}>
              <Text style={styles.rowLabel}>{label}</Text>
              <Text style={styles.rowValue}>{value}</Text>
            </View>
          ))}
        </View>
      </Animated.View>

      <View style={styles.footer}>
        {saveFailed ? (
          <View style={styles.warning}>
            <Feather name="alert-triangle" size={14} color={INK} />
            <Text style={styles.warningText}>Impossible d'enregistrer la séance dans ton historique.</Text>
          </View>
        ) : null}
        <Press style={styles.homeBtn} onPress={onGoHome}>
          <Text style={styles.homeText}>RETOUR À L'ACCUEIL</Text>
        </Press>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.accent },
  content: { flex: 1, paddingHorizontal: 24, paddingTop: 48 },

  stamp: { fontFamily: MONO, fontSize: 11, color: INK_MUTED, letterSpacing: 1.5 },
  title: {
    fontFamily: "BebasNeue_400Regular", fontSize: 78, color: INK,
    letterSpacing: 1, lineHeight: 74, marginTop: 14, marginBottom: 36,
  },

  rows: { borderTopWidth: 1, borderColor: INK_LINE },
  row: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    paddingVertical: 17, borderBottomWidth: 1, borderColor: INK_LINE,
  },
  rowLabel: { fontFamily: MONO, fontSize: 11, color: INK_MUTED, letterSpacing: 2 },
  rowValue: { fontFamily: "BebasNeue_400Regular", fontSize: 32, color: INK, letterSpacing: 0.5 },

  footer: { paddingHorizontal: 24, paddingBottom: 28 },
  warning: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, marginBottom: 12 },
  warningText: { fontFamily: "DMSans_600SemiBold", fontSize: 13, color: INK },
  homeBtn: { backgroundColor: INK, borderRadius: R.md, paddingVertical: 18, alignItems: "center" },
  homeText: { fontFamily: "DMSans_700Bold", fontSize: 14, color: C.accent, letterSpacing: 2 },
});
