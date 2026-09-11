import React, { useEffect, useRef, useState } from "react";
import { View, Text, StyleSheet, StatusBar, Vibration, Animated, Easing, Platform } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { getSessions } from "../data/storage";
import { streakDays, performedVolumeKg, formatKg } from "../data/stats";
import { C, R } from "../theme";
import { Press } from "../ui/kit";

const INK = C.bg;
const INK_MUTED = "rgba(10,10,10,0.55)";
const INK_LINE = "rgba(10,10,10,0.18)";
const MONO = Platform.select({ ios: "Menlo", default: "monospace" });

const pad2 = (n) => String(n).padStart(2, "0");
const formatStamp = (d) =>
  `${pad2(d.getDate())}.${pad2(d.getMonth() + 1)}.${d.getFullYear()} · ${pad2(d.getHours())}:${pad2(d.getMinutes())}`;

/* Écran de fin de séance. Props :
   workout, performed (détail par exercice, cf. performedVolumeKg), elapsedMin,
   saveFailed, onGoHome */
export default function SessionCompleteScreen({
  workout = {}, performed = [], elapsedMin, saveFailed, onGoHome,
}) {
  const [streak, setStreak] = useState(null);
  const enter = useRef(new Animated.Value(0)).current;
  const finishedAt = useRef(new Date()).current;
  const exercises = workout.exercises || [];

  useEffect(() => {
    Vibration.vibrate([0, 200, 100, 200, 100, 300]);
    Animated.timing(enter, { toValue: 1, duration: 420, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
    // La séance du jour est comptée d'office : son enregistrement peut ne pas être terminé.
    getSessions()
      .then((sessions) => setStreak(streakDays([...sessions, { date: new Date().toISOString() }])))
      .catch(() => setStreak(null));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const exercisesDone = exercises.filter((ex, i) => (performed[i]?.setsDone || 0) >= (ex.sets || 3)).length;
  const volume = performedVolumeKg(exercises, performed);
  const minutes = elapsedMin ?? workout.totalDuration ?? 0;

  const rows = [
    ["DURÉE", `${minutes} MIN`],
    ["EXERCICES", `${exercisesDone} / ${exercises.length}`],
    ["VOLUME", volume > 0 ? `${formatKg(volume)} KG` : "—"],
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
