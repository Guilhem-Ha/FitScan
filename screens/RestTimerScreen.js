import React, { useEffect, useRef, useState } from "react";
import { View, Text, StyleSheet, Vibration, Animated, Easing } from "react-native";
import { Feather } from "@expo/vector-icons";
import { C, T, R, E } from "../theme";
import { Press, Ring } from "../ui/kit";

const SIZE = 224;
const STROKE = 10;

/* Chrono de repos — plein écran, anneau de progression sans dépendance SVG.
   Monté dans un Modal depuis WorkoutScreen : <RestTimerScreen seconds={60} onClose={…} /> */
export default function RestTimerScreen({ seconds = 60, onClose }) {
  const [remaining, setRemaining] = useState(seconds);
  const pulse = useRef(new Animated.Value(1)).current;
  const enter = useRef(new Animated.Value(0)).current;
  const hasBuzzed = useRef(false);

  /* Le tic tourne jusqu'au démontage : s'il s'arrêtait à zéro, un « +30s »
     après la fin laisserait le compteur figé. */
  useEffect(() => {
    Animated.timing(enter, { toValue: 1, duration: 260, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
    const id = setInterval(() => setRemaining((prev) => (prev > 0 ? prev - 1 : 0)), 1000);
    return () => clearInterval(id);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (remaining === 0 && !hasBuzzed.current) {
      hasBuzzed.current = true;
      Vibration.vibrate([0, 300, 100, 300]);
    } else if (remaining > 0) {
      hasBuzzed.current = false;
    }
    Animated.sequence([
      Animated.timing(pulse, { toValue: 1.06, duration: 120, useNativeDriver: true }),
      Animated.timing(pulse, { toValue: 1, duration: 260, useNativeDriver: true }),
    ]).start();
  }, [remaining]); // eslint-disable-line react-hooks/exhaustive-deps

  const done = remaining === 0;
  const ratio = seconds > 0 ? remaining / seconds : 0;
  const color = ratio > 0.5 ? C.accent : ratio > 0.2 ? C.amber : C.red;

  const add = (s) => setRemaining((r) => Math.max(0, r + s));

  const mm = String(Math.floor(remaining / 60)).padStart(2, "0");
  const ss = String(remaining % 60).padStart(2, "0");

  return (
    <Animated.View style={[styles.overlay, { opacity: enter }]}>
      <Text style={styles.label}>TEMPS DE REPOS</Text>

      <Animated.View style={{ transform: [{ scale: pulse }] }}>
        <Ring size={SIZE} stroke={STROKE} value={1 - ratio} color={color}>
          <View style={styles.ringInner}>
            <Text style={[styles.count, { color: done ? C.accent : C.textPrimary }]}>{mm}:{ss}</Text>
            <Text style={styles.unit}>{done ? "prêt" : "restantes"}</Text>
          </View>
        </Ring>
      </Animated.View>

      <View style={styles.adjustRow}>
        <Press style={styles.adjustBtn} onPress={() => add(-15)} scaleTo={0.92}>
          <Feather name="minus" size={15} color={C.textPrimary} />
          <Text style={styles.adjustText}>15s</Text>
        </Press>
        <Press style={styles.adjustBtn} onPress={() => add(30)} scaleTo={0.92}>
          <Feather name="plus" size={15} color={C.textPrimary} />
          <Text style={styles.adjustText}>30s</Text>
        </Press>
      </View>

      <Press style={[styles.cta, done && styles.ctaDone]} onPress={onClose} scaleTo={0.97}>
        <Feather name={done ? "play" : "skip-forward"} size={16} color={done ? C.bg : C.textPrimary} />
        <Text style={[styles.ctaText, done && { color: C.bg }]}>
          {done ? "C'EST PARTI" : "PASSER LE REPOS"}
        </Text>
      </Press>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(10,10,10,0.97)",
    alignItems: "center", justifyContent: "center", paddingHorizontal: 32,
  },
  label: { ...T.label, color: C.accent, marginBottom: 32 },

  ringInner: { alignItems: "center" },
  count: { fontFamily: "BebasNeue_400Regular", fontSize: 72, lineHeight: 74, letterSpacing: 2 },
  unit: { ...T.label, fontSize: 10, color: C.textMuted, marginTop: 2 },

  adjustRow: { flexDirection: "row", gap: 12, marginTop: 36 },
  adjustBtn: {
    flexDirection: "row", alignItems: "center", gap: 6,
    backgroundColor: C.surface, borderRadius: R.pill,
    borderWidth: 1, borderColor: C.border,
    paddingHorizontal: 18, paddingVertical: 11,
  },
  adjustText: { fontFamily: "DMSans_600SemiBold", fontSize: 13, color: C.textPrimary },

  cta: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10,
    marginTop: 28, width: "100%", maxWidth: 320,
    paddingVertical: 17, borderRadius: R.md,
    backgroundColor: C.surface, borderWidth: 1, borderColor: C.borderHi,
  },
  ctaDone: { backgroundColor: C.accent, borderColor: C.accent, ...E.accentGlow },
  ctaText: { fontFamily: "DMSans_700Bold", fontSize: 14, letterSpacing: 1.5, color: C.textPrimary },
});
