import React, { useEffect, useRef, useState } from "react";
import { View, Text, StyleSheet, Vibration, Animated, Easing } from "react-native";
import { C, T, R, E } from "../theme";
import { Press, PrimaryButton, Ring } from "../ui/kit";

/* Chrono de repos, monté dans un Modal depuis WorkoutScreen.
   setNumber / totalSets / exerciseName alimentent la ligne de contexte. */
export default function RestTimerScreen({ seconds = 60, onClose, setNumber, totalSets, exerciseName }) {
  /* Le temps restant se déduit d'une échéance absolue. Un compteur décrémenté à
     chaque tic prend du retard dès que l'app passe en arrière-plan ou que l'écran
     se verrouille : au retour, le repos afficherait plus de temps qu'il n'en reste. */
  const [endAt, setEndAt] = useState(() => Date.now() + seconds * 1000);
  const [total, setTotal] = useState(seconds);
  const [now, setNow] = useState(() => Date.now());
  const pulse = useRef(new Animated.Value(1)).current;
  const enter = useRef(new Animated.Value(0)).current;
  const hasBuzzed = useRef(false);
  const remaining = Math.max(0, Math.ceil((endAt - now) / 1000));

  useEffect(() => {
    Animated.timing(enter, { toValue: 1, duration: 260, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
    // Le tic tourne jusqu'au démontage : « +30s » après la fin doit repartir.
    const id = setInterval(() => setNow(Date.now()), 250);
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
      Animated.timing(pulse, { toValue: 1.05, duration: 120, useNativeDriver: true }),
      Animated.timing(pulse, { toValue: 1, duration: 260, useNativeDriver: true }),
    ]).start();
  }, [remaining]); // eslint-disable-line react-hooks/exhaustive-deps

  const done = remaining === 0;
  const ratio = total > 0 ? remaining / total : 0;
  const color = ratio > 0.2 || done ? C.accent : C.amber;

  return (
    <Animated.View style={[styles.overlay, { opacity: enter }]}>
      <View style={styles.card}>
        <Text style={styles.label}>TEMPS DE REPOS</Text>

        <Animated.View style={{ transform: [{ scale: pulse }] }}>
          <Ring size={196} stroke={10} value={ratio} color={color} trackColor={C.surface2}>
            <Text style={styles.count}>{remaining}</Text>
            <Text style={styles.unit}>{done ? "c'est reparti" : "secondes"}</Text>
          </Ring>
        </Animated.View>

        {setNumber && totalSets ? (
          <Text style={styles.context} numberOfLines={1}>
            Série {setNumber} sur {totalSets}{exerciseName ? ` · ${exerciseName}` : ""}
          </Text>
        ) : null}

        <View style={styles.actions}>
          <Press style={styles.addBtn} onPress={() => { setEndAt((end) => Math.max(end, Date.now()) + 30000); setTotal((t) => t + 30); }} scaleTo={0.92}>
            <Text style={styles.addText}>+30s</Text>
          </Press>
          <PrimaryButton
            label={done ? "C'EST PARTI" : "PASSER"}
            onPress={onClose}
            style={styles.skipBtn}
          />
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1, backgroundColor: "rgba(10,10,10,0.92)",
    alignItems: "center", justifyContent: "center", paddingHorizontal: 24,
  },
  card: {
    width: "100%", maxWidth: 360, alignItems: "center",
    backgroundColor: C.surface, borderRadius: R.lg,
    borderWidth: 1, borderColor: C.border,
    paddingHorizontal: 20, paddingTop: 24, paddingBottom: 20,
    ...E.floating,
  },
  label: { ...T.label, fontSize: 10, marginBottom: 20 },

  count: { fontFamily: "BebasNeue_400Regular", fontSize: 76, color: C.textPrimary, lineHeight: 78 },
  unit: { ...T.small, fontSize: 11, color: C.textMuted, marginTop: -4 },

  context: { fontFamily: "DMSans_400Regular", fontSize: 13, color: C.textSecondary, marginTop: 20 },

  actions: { flexDirection: "row", alignSelf: "stretch", gap: 10, marginTop: 22 },
  addBtn: {
    paddingHorizontal: 20, justifyContent: "center",
    borderRadius: R.md, borderWidth: 1, borderColor: C.borderHi,
  },
  addText: { fontFamily: "DMSans_700Bold", fontSize: 14, color: C.textPrimary },
  skipBtn: { flex: 1, paddingVertical: 16 },
});
