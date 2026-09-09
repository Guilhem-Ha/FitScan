import React, { useEffect, useRef } from "react";
import { View, Text, StyleSheet, StatusBar, Vibration, Animated, Dimensions, Easing } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { C, T, R, E } from "../theme";
import { PrimaryButton, GhostButton } from "../ui/kit";

const { width: SW, height: SH } = Dimensions.get("window");
const CONFETTI_COLORS = [C.accent, "#FFFFFF", C.blue, C.amber, C.green];
const N = 48;

function Confetti() {
  const particles = useRef(
    Array.from({ length: N }, () => ({
      x: Math.random() * SW,
      y: new Animated.Value(-30),
      rot: new Animated.Value(0),
      color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
      size: 5 + Math.random() * 8,
      delay: Math.random() * 500,
      targetY: SH + 80 + Math.random() * SH * 0.3,
    }))
  ).current;

  useEffect(() => {
    Animated.parallel(
      particles.map((p) =>
        Animated.parallel([
          Animated.timing(p.y, { toValue: p.targetY, duration: 1900 + Math.random() * 800, delay: p.delay, useNativeDriver: true }),
          Animated.timing(p.rot, { toValue: (Math.random() > 0.5 ? 1 : -1) * 720, duration: 2300, delay: p.delay, useNativeDriver: true }),
        ])
      )
    ).start();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {particles.map((p, i) => (
        <Animated.View
          key={i}
          style={{
            position: "absolute", left: p.x,
            width: p.size, height: p.size * 0.5, borderRadius: 2,
            backgroundColor: p.color,
            transform: [
              { translateY: p.y },
              { rotate: p.rot.interpolate({ inputRange: [-720, 720], outputRange: ["-720deg", "720deg"] }) },
            ],
          }}
        />
      ))}
    </View>
  );
}

function Stat({ icon, value, label }) {
  return (
    <View style={styles.stat}>
      <Feather name={icon} size={14} color={C.accent} />
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

/* Écran de fin de séance. Props :
   workout, setsDone, totalSets, elapsedMin, saveFailed, onGoHome, onReview */
export default function SessionCompleteScreen({
  workout = {}, setsDone = 0, totalSets = 0, elapsedMin, saveFailed, onGoHome, onReview,
}) {
  const scale = useRef(new Animated.Value(0.85)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Vibration.vibrate([0, 200, 100, 200, 100, 300]);
    Animated.parallel([
      Animated.spring(scale, { toValue: 1, useNativeDriver: true, tension: 70, friction: 9 }),
      Animated.timing(opacity, { toValue: 1, duration: 320, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
    ]).start();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const minutes = elapsedMin ?? workout.totalDuration ?? 0;
  const exCount = workout.exercises?.length ?? 0;
  const pct = totalSets > 0 ? Math.round((setsDone / totalSets) * 100) : 100;

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />
      <Confetti />

      <Animated.View style={[styles.content, { opacity, transform: [{ scale }] }]}>
        <View style={styles.medal}>
          <Feather name="award" size={38} color={C.accent} />
        </View>

        <Text style={styles.eyebrow}>{workout.title?.toUpperCase() || "TA SÉANCE"}</Text>
        <Text style={styles.title}>SÉANCE{"\n"}TERMINÉE</Text>
        <Text style={[styles.sub, saveFailed && { color: C.amber }]}>
          {saveFailed
            ? "Impossible d'enregistrer la séance dans ton historique."
            : "Ta séance a été sauvegardée dans ton historique."}
        </Text>

        <View style={styles.statsRow}>
          <Stat icon="clock" value={minutes} label="MINUTES" />
          <Stat icon="list" value={exCount} label="EXERCICES" />
          <Stat icon="check-circle" value={pct + "%"} label="COMPLÉTÉ" />
        </View>

        <View style={styles.actions}>
          <PrimaryButton label="RETOUR À L'ACCUEIL" icon="home" onPress={onGoHome} />
          {onReview ? <GhostButton label="REVOIR LA SÉANCE" icon="rotate-ccw" onPress={onReview} /> : null}
        </View>
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  content: { flex: 1, paddingHorizontal: 28, justifyContent: "center" },

  medal: {
    width: 78, height: 78, borderRadius: 26,
    alignItems: "center", justifyContent: "center", marginBottom: 26,
    backgroundColor: C.accentSoft, borderWidth: 1, borderColor: "rgba(200,255,0,0.28)",
    ...E.accentGlow,
  },

  eyebrow: { ...T.label, color: C.accent, marginBottom: 6 },
  title: { fontFamily: "BebasNeue_400Regular", fontSize: 62, color: C.textPrimary, letterSpacing: 2, lineHeight: 62, marginBottom: 14 },
  sub: { ...T.body, maxWidth: 280, marginBottom: 32 },

  statsRow: { flexDirection: "row", gap: 10, marginBottom: 36 },
  stat: {
    flex: 1, alignItems: "center", gap: 4, paddingVertical: 18,
    backgroundColor: C.surface, borderRadius: R.md,
    borderWidth: 1, borderColor: C.border, ...E.raised,
  },
  statValue: { fontFamily: "BebasNeue_400Regular", fontSize: 32, color: C.accent, lineHeight: 34 },
  statLabel: { ...T.label, fontSize: 9 },

  actions: { gap: 12 },
});
