import React, { useEffect, useState, useRef } from "react";
import {
  View, Text, StyleSheet, Modal,
  SafeAreaView, StatusBar, Linking, Vibration,
  Animated, Dimensions, TextInput,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { saveSession, saveWeight, getLastWeight } from "../data/storage";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import { C, T, R, E } from "../theme";
import { Press, PrimaryButton, SectionLabel, IconBadge, Ring } from "../ui/kit";

const { width: SW, height: SH } = Dimensions.get("window");
const CONFETTI_COLORS = ["#C8FF00", "#FFFFFF", "#FF0000", "#3B82F6", "#F59E0B", "#10B981"];
const N = 60;

// ─── Confettis ────────────────────────────────────────────────────
function Confetti() {
  const particles = useRef(
    Array.from({ length: N }, () => ({
      x: new Animated.Value(Math.random() * SW),
      y: new Animated.Value(-20),
      rot: new Animated.Value(0),
      color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
      size: 6 + Math.random() * 8,
      delay: Math.random() * 500,
      targetY: SH + 80 + Math.random() * SH * 0.3,
    }))
  ).current;

  useEffect(() => {
    const anims = particles.map((p) =>
      Animated.parallel([
        Animated.timing(p.y, { toValue: p.targetY, duration: 1800 + Math.random() * 800, delay: p.delay, useNativeDriver: true }),
        Animated.timing(p.rot, { toValue: (Math.random() > 0.5 ? 1 : -1) * 720, duration: 2200, delay: p.delay, useNativeDriver: true }),
      ])
    );
    Animated.parallel(anims).start();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {particles.map((p, i) => (
        <Animated.View key={i} style={{
          position: "absolute", width: p.size, height: p.size * 0.5, borderRadius: 2,
          backgroundColor: p.color, left: p.x,
          transform: [{ translateY: p.y }, { rotate: p.rot.interpolate({ inputRange: [-720, 720], outputRange: ["-720deg", "720deg"] }) }],
        }} />
      ))}
    </View>
  );
}

// ─── Modal célébration ────────────────────────────────────────────
function CelebrationModal({ visible, onGoHome }) {
  const scale = useRef(new Animated.Value(0.8)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Vibration.vibrate([0, 200, 100, 200, 100, 300]);
      Animated.parallel([
        Animated.spring(scale, { toValue: 1, useNativeDriver: true, tension: 80, friction: 8 }),
        Animated.timing(opacity, { toValue: 1, duration: 300, useNativeDriver: true }),
      ]).start();
    } else {
      scale.setValue(0.8);
      opacity.setValue(0);
    }
  }, [visible]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <Modal visible={visible} transparent animationType="none">
      <View style={cel.overlay}>
        {visible && <Confetti />}
        <Animated.View style={[cel.card, { transform: [{ scale }], opacity }]}>
          <IconBadge name="award" size={72} />
          <Text style={cel.title}>SÉANCE{"\n"}TERMINÉE !</Text>
          <Text style={cel.sub}>Bravo, tu l'as fait.{"\n"}Ta séance a été sauvegardée.</Text>
          <PrimaryButton label="RETOUR À L'ACCUEIL" icon="home" onPress={onGoHome} style={cel.btn} />
        </Animated.View>
      </View>
    </Modal>
  );
}

// ─── Timer ────────────────────────────────────────────────────────
function RestTimer({ seconds, onClose }) {
  const [remaining, setRemaining] = useState(seconds);
  const intervalRef = useRef(null);

  useEffect(() => {
    intervalRef.current = setInterval(() => {
      setRemaining((prev) => {
        if (prev <= 1) { clearInterval(intervalRef.current); Vibration.vibrate([0, 300, 100, 300]); return 0; }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(intervalRef.current);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const done = remaining === 0;
  const color = remaining > seconds * 0.5 ? C.accent : remaining > seconds * 0.2 ? C.amber : C.red;

  return (
    <View style={timer.overlay}>
      <View style={timer.card}>
        <SectionLabel accent>TEMPS DE REPOS</SectionLabel>

        <Ring size={190} stroke={9} value={remaining / seconds} color={color}>
          <Text style={[timer.count, { color }]}>{remaining}</Text>
          <Text style={timer.unit}>secondes</Text>
        </Ring>

        <Press style={[timer.btn, done && timer.btnDone]} onPress={onClose}>
          <Feather name={done ? "play" : "skip-forward"} size={15} color={done ? C.bg : C.textPrimary} />
          <Text style={[timer.btnText, done && { color: C.bg }]}>
            {done ? "C'EST PARTI" : "PASSER"}
          </Text>
        </Press>
      </View>
    </View>
  );
}

// ─── Sélecteur de poids ───────────────────────────────────────────
function WeightSelector({ exerciseName, lastWeight, suggestedWeight }) {
  const [weight, setWeight] = useState("");
  const [unit, setUnit] = useState("kg");
  const [saved, setSaved] = useState(false);

  const handleSave = async () => {
    if (!weight || isNaN(parseFloat(weight))) return;
    await saveWeight(exerciseName, parseFloat(weight), unit);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <View style={ws.wrap}>
      <View style={ws.head}>
        <Feather name="anchor" size={12} color={C.textMuted} />
        <Text style={ws.label}>POIDS UTILISÉ</Text>
      </View>

      {lastWeight && (
        <View style={ws.hintRow}>
          <Text style={ws.hintText}>
            Dernière fois {lastWeight.weight}{lastWeight.unit}
          </Text>
          {suggestedWeight && (
            <>
              <Feather name="arrow-right" size={11} color={C.accent} />
              <Text style={[ws.hintText, { color: C.accent }]}>
                Suggéré {suggestedWeight}{lastWeight.unit}
              </Text>
            </>
          )}
        </View>
      )}

      <View style={ws.inputRow}>
        <TextInput
          style={ws.input}
          placeholder="0"
          placeholderTextColor={C.textMuted}
          keyboardType="decimal-pad"
          value={weight}
          onChangeText={setWeight}
          maxLength={6}
        />
        <View style={ws.unitGroup}>
          {["kg", "lbs"].map((u) => (
            <Press key={u} style={[ws.unitBtn, unit === u && ws.unitBtnActive]} onPress={() => setUnit(u)} scaleTo={0.92}>
              <Text style={[ws.unitText, unit === u && { color: C.accent }]}>{u}</Text>
            </Press>
          ))}
        </View>
        <Press style={[ws.saveBtn, saved && { backgroundColor: C.green }]} onPress={handleSave} scaleTo={0.9}>
          <Feather name={saved ? "check" : "save"} size={15} color={C.bg} />
        </Press>
      </View>
    </View>
  );
}

// ─── Exercice ─────────────────────────────────────────────────────
function ExerciseCard({ ex, index }) {
  const totalSets = ex.sets || 3;
  const [done, setDone] = useState([]);
  const [showTimer, setShowTimer] = useState(false);
  const [lastWeight, setLastWeight] = useState(null);
  const allDone = done.length === totalSets;

  useEffect(() => {
    if (ex.requiresWeight) getLastWeight(ex.name).then(setLastWeight);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const suggestedWeight = lastWeight ? (lastWeight.weight + 2.5).toFixed(1) : null;

  const toggleSet = (i) => {
    setDone((prev) => {
      if (prev.includes(i)) return prev.filter((s) => s !== i);
      const next = [...prev, i];
      if (next.length < totalSets) setShowTimer(true);
      return next;
    });
  };

  return (
    <View style={[styles.exCard, allDone && styles.exCardDone]}>
      {showTimer && <RestTimer seconds={ex.rest || 60} onClose={() => setShowTimer(false)} />}

      <View style={styles.exTop}>
        <View style={[styles.exIndexBox, allDone && styles.exIndexBoxDone]}>
          <Text style={[styles.exIndex, allDone && { color: C.bg }]}>
            {allDone ? "✓" : String(index + 1).padStart(2, "0")}
          </Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.exName}>{ex.name.toUpperCase()}</Text>
          <Text style={styles.exEquip}>{ex.equipment}</Text>
        </View>
      </View>

      <View style={styles.statsLine}>
        <View style={styles.statItem}>
          <Text style={styles.statNum} numberOfLines={1} adjustsFontSizeToFit>{ex.sets}</Text>
          <Text style={styles.statLbl}>séries</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statNum} numberOfLines={1} adjustsFontSizeToFit>{ex.reps}</Text>
          <Text style={styles.statLbl}>répétitions</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statNum} numberOfLines={1} adjustsFontSizeToFit>{ex.rest}s</Text>
          <Text style={styles.statLbl}>repos</Text>
        </View>
      </View>

      {ex.requiresWeight && (
        <WeightSelector
          exerciseName={ex.name}
          lastWeight={lastWeight}
          suggestedWeight={suggestedWeight}
        />
      )}

      <View style={styles.setsRow}>
        {Array.from({ length: totalSets }).map((_, i) => (
          <Press
            key={i}
            style={[styles.setBtn, done.includes(i) && styles.setBtnDone]}
            onPress={() => toggleSet(i)}
            scaleTo={0.9}
          >
            {done.includes(i)
              ? <Feather name="check" size={17} color={C.bg} />
              : <Text style={styles.setBtnText}>{i + 1}</Text>}
          </Press>
        ))}
      </View>

      {ex.muscles?.length > 0 && (
        <View style={styles.musclesRow}>
          {ex.muscles.map((m, i) => (
            <View key={i} style={styles.muscleChip}>
              <Text style={styles.muscleChipText}>{m}</Text>
            </View>
          ))}
        </View>
      )}

      {ex.tips && (
        <View style={styles.tipRow}>
          <Feather name="info" size={13} color={C.textMuted} />
          <Text style={styles.tips}>{ex.tips}</Text>
        </View>
      )}

      {ex.youtubeQuery && (
        <Press
          style={styles.videoBtn}
          onPress={() => Linking.openURL(`https://www.youtube.com/results?search_query=${encodeURIComponent(ex.youtubeQuery)}`)}
          scaleTo={0.96}
        >
          <View style={styles.videoPlay}><Feather name="play" size={12} color="#fff" /></View>
          <Text style={styles.videoBtnText}>VOIR L'EXÉCUTION</Text>
        </Press>
      )}
    </View>
  );
}

// ─── Bloc échauffement / retour au calme ──────────────────────────
function PhaseBlock({ icon, title, block }) {
  return (
    <View style={styles.blockSection}>
      <View style={styles.blockHead}>
        <Feather name={icon} size={14} color={C.accent} />
        <Text style={styles.blockLabel}>{title} — {block.duration} MIN</Text>
      </View>
      {block.exercises?.map((ex, i) => (
        <View key={i} style={styles.blockItemRow}>
          <View style={styles.blockBullet} />
          <Text style={styles.blockItem}>{ex}</Text>
        </View>
      ))}
    </View>
  );
}

// ─── Écran ────────────────────────────────────────────────────────
export default function WorkoutScreen({ navigation, route }) {
  const { workout, sessionName, level, goal, split, duration, equipments, readOnly } = route?.params || {};
  const [showCelebration, setShowCelebration] = useState(false);

  useEffect(() => {
    if (!readOnly && workout) {
      saveSession({ workout, sessionName, level, goal, split, duration, equipments }).catch(() => {});
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (!workout) return null;

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />

      <CelebrationModal
        visible={showCelebration}
        onGoHome={() => { setShowCelebration(false); navigation.reset({ index: 0, routes: [{ name: "Main" }] }); }}
      />

      <KeyboardAwareScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        enableOnAndroid
        extraScrollHeight={120}
        enableAutomaticScroll
      >
        <Press style={styles.back} onPress={() => navigation.goBack()} scaleTo={0.94}>
          <Feather name="chevron-left" size={16} color={C.textSecondary} />
          <Text style={styles.backText}>RETOUR</Text>
        </Press>

        <View style={styles.header}>
          <Text style={styles.eyebrow}>TA SÉANCE</Text>
          <Text style={styles.title}>{workout.title?.toUpperCase()}</Text>
          <View style={styles.metaRow}>
            <View style={styles.metaPill}>
              <Feather name="clock" size={12} color={C.accent} />
              <Text style={styles.metaText}>{workout.totalDuration} MIN</Text>
            </View>
            <View style={styles.metaPill}>
              <Feather name="list" size={12} color={C.accent} />
              <Text style={styles.metaText}>{workout.exercises?.length} EXERCICES</Text>
            </View>
          </View>
        </View>

        <View style={styles.body}>
          <View style={styles.hintCard}>
            <Feather name="clock" size={14} color={C.accent} />
            <Text style={styles.hintText}>Coche chaque série pour déclencher le chrono de repos.</Text>
          </View>
          <View style={[styles.hintCard, styles.hintCardAmber]}>
            <Feather name="alert-triangle" size={14} color={C.amber} />
            <Text style={styles.hintText}>
              Pour les poids, commence avec une charge que tu tiens sur toutes les séries — mieux vaut trop léger que se blesser.
            </Text>
          </View>

          {workout.warmup && (
            <PhaseBlock icon="sunrise" title="ÉCHAUFFEMENT" block={workout.warmup} />
          )}

          <SectionLabel accent style={styles.sectionSpaced}>EXERCICES</SectionLabel>
          <View style={{ gap: 14 }}>
            {workout.exercises?.map((ex, i) => <ExerciseCard key={i} ex={ex} index={i} />)}
          </View>

          {workout.cooldown && (
            <PhaseBlock icon="moon" title="RETOUR AU CALME" block={workout.cooldown} />
          )}

          {!readOnly && (
            <PrimaryButton
              label="TERMINER LA SÉANCE"
              icon="check-circle"
              onPress={() => setShowCelebration(true)}
              style={styles.finishBtn}
            />
          )}
        </View>
      </KeyboardAwareScrollView>
    </SafeAreaView>
  );
}

// ─── Styles poids ─────────────────────────────────────────────────
const ws = StyleSheet.create({
  wrap: {
    backgroundColor: C.surface2, borderRadius: R.md,
    borderWidth: 1, borderColor: C.border,
    padding: 14, marginBottom: 14,
  },
  head: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 8 },
  label: { ...T.label, fontSize: 10 },
  hintRow: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 10, flexWrap: "wrap" },
  hintText: { fontFamily: "DMSans_400Regular", fontSize: 12, color: C.textSecondary },

  inputRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  input: {
    width: 78, height: 46, backgroundColor: C.bg,
    color: C.textPrimary, fontFamily: "DMSans_700Bold",
    fontSize: 18, textAlign: "center",
    borderRadius: R.sm, borderWidth: 1, borderColor: C.borderHi,
    paddingVertical: 0, includeFontPadding: false,
  },
  unitGroup: { flexDirection: "row", gap: 6, flex: 1 },
  unitBtn: {
    paddingHorizontal: 12, paddingVertical: 10,
    borderRadius: R.pill, borderWidth: 1, borderColor: C.border,
    backgroundColor: C.bg,
  },
  unitBtnActive: { borderColor: C.accent, backgroundColor: C.accentSoft },
  unitText: { fontFamily: "DMSans_600SemiBold", fontSize: 12, color: C.textMuted },

  saveBtn: {
    width: 46, height: 46, borderRadius: R.sm,
    backgroundColor: C.accent, alignItems: "center", justifyContent: "center",
  },
});

// ─── Styles célébration ───────────────────────────────────────────
const cel = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.9)", alignItems: "center", justifyContent: "center" },
  card: {
    backgroundColor: C.surface, borderRadius: R.lg,
    borderWidth: 1, borderColor: C.borderHi,
    padding: 32, alignItems: "center", width: SW * 0.85,
    ...E.floating,
  },
  title: {
    fontFamily: "BebasNeue_400Regular", fontSize: 46, color: C.textPrimary,
    letterSpacing: 2, lineHeight: 46, textAlign: "center", marginTop: 20, marginBottom: 12,
  },
  sub: { fontFamily: "DMSans_400Regular", fontSize: 15, color: C.textSecondary, textAlign: "center", lineHeight: 22, marginBottom: 28 },
  btn: { alignSelf: "stretch" },
});

// ─── Styles timer ─────────────────────────────────────────────────
const timer = StyleSheet.create({
  overlay: {
    position: "absolute", top: -8, left: -8, right: -8, bottom: -8,
    backgroundColor: "rgba(0,0,0,0.95)", borderRadius: R.lg,
    zIndex: 10, alignItems: "center", justifyContent: "center",
  },
  card: { alignItems: "center", padding: 24, gap: 20 },
  count: { fontFamily: "BebasNeue_400Regular", fontSize: 84, lineHeight: 86 },
  unit: { ...T.small, color: C.textMuted, marginTop: -6 },
  btn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    paddingHorizontal: 28, paddingVertical: 14,
    borderRadius: R.pill, borderWidth: 1, borderColor: C.borderHi,
  },
  btnDone: { backgroundColor: C.accent, borderColor: C.accent },
  btnText: { fontFamily: "DMSans_700Bold", fontSize: 14, letterSpacing: 1.5, color: C.textPrimary },
});

// ─── Styles écran ─────────────────────────────────────────────────
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  container: { paddingBottom: 48 },

  back: {
    flexDirection: "row", alignItems: "center", gap: 6,
    alignSelf: "flex-start", marginLeft: 24, marginTop: 16, marginBottom: 12,
    paddingVertical: 8, paddingHorizontal: 12,
    backgroundColor: C.surface, borderRadius: R.pill,
    borderWidth: 1, borderColor: C.border,
  },
  backText: { ...T.label, fontSize: 10 },

  header: { paddingHorizontal: 24, paddingBottom: 24 },
  eyebrow: { ...T.label, color: C.accent, marginBottom: 4 },
  title: { fontFamily: "BebasNeue_400Regular", fontSize: 40, color: C.textPrimary, letterSpacing: 1, lineHeight: 42, marginBottom: 14 },
  metaRow: { flexDirection: "row", gap: 8 },
  metaPill: {
    flexDirection: "row", alignItems: "center", gap: 6,
    backgroundColor: C.accentSoft, borderRadius: R.pill,
    paddingHorizontal: 12, paddingVertical: 6,
  },
  metaText: { ...T.label, fontSize: 10, color: C.accent },

  body: { paddingHorizontal: 24 },
  sectionSpaced: { marginTop: 28 },

  hintCard: {
    flexDirection: "row", alignItems: "flex-start", gap: 10,
    backgroundColor: C.accentSofter, borderRadius: R.md,
    borderWidth: 1, borderColor: "rgba(200,255,0,0.18)",
    padding: 14, marginBottom: 10,
  },
  hintCardAmber: { backgroundColor: "rgba(245,158,11,0.07)", borderColor: "rgba(245,158,11,0.2)" },
  hintText: { flex: 1, fontFamily: "DMSans_400Regular", fontSize: 13, color: C.textSecondary, lineHeight: 19 },

  blockSection: {
    backgroundColor: C.surface, borderRadius: R.lg,
    borderWidth: 1, borderColor: C.border,
    padding: 18, marginTop: 20,
  },
  blockHead: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 12 },
  blockLabel: { fontFamily: "DMSans_700Bold", fontSize: 12, color: C.textPrimary, letterSpacing: 1 },
  blockItemRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 7 },
  blockBullet: { width: 4, height: 4, borderRadius: 2, backgroundColor: C.textMuted },
  blockItem: { flex: 1, fontFamily: "DMSans_400Regular", fontSize: 14, color: C.textSecondary, lineHeight: 20 },

  exCard: {
    backgroundColor: C.surface, borderRadius: R.lg,
    borderWidth: 1, borderColor: C.border,
    padding: 18,
    ...E.raised,
  },
  exCardDone: { borderColor: "rgba(200,255,0,0.3)" },

  exTop: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 16 },
  exIndexBox: {
    width: 42, height: 42, borderRadius: R.md,
    alignItems: "center", justifyContent: "center",
    backgroundColor: C.surface2, borderWidth: 1, borderColor: C.border,
  },
  exIndexBoxDone: { backgroundColor: C.accent, borderColor: C.accent },
  exIndex: { fontFamily: "BebasNeue_400Regular", fontSize: 22, color: C.textSecondary, lineHeight: 24 },
  exName: { fontFamily: "BebasNeue_400Regular", fontSize: 26, color: C.textPrimary, lineHeight: 28 },
  exEquip: { fontFamily: "DMSans_400Regular", fontSize: 13, color: C.textMuted, marginTop: 2 },

  statsLine: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: C.surface2, borderRadius: R.md,
    paddingVertical: 12, marginBottom: 14,
  },
  statItem: { flex: 1, alignItems: "center", paddingHorizontal: 4 },
  statNum: { fontFamily: "DMSans_700Bold", fontSize: 20, color: C.accent, lineHeight: 24 },
  statLbl: { fontFamily: "DMSans_400Regular", fontSize: 11, color: C.textMuted, marginTop: 1 },
  statDivider: { width: 1, height: 26, backgroundColor: C.border },

  setsRow: { flexDirection: "row", gap: 8, marginBottom: 14, flexWrap: "wrap" },
  setBtn: {
    width: 46, height: 46, borderRadius: R.md,
    alignItems: "center", justifyContent: "center",
    backgroundColor: C.surface2, borderWidth: 1, borderColor: C.border,
  },
  setBtnDone: { backgroundColor: C.accent, borderColor: C.accent },
  setBtnText: { fontFamily: "BebasNeue_400Regular", fontSize: 20, color: C.textSecondary },

  musclesRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 12 },
  muscleChip: {
    backgroundColor: C.surface2, borderRadius: R.pill,
    paddingHorizontal: 10, paddingVertical: 4,
    borderWidth: 1, borderColor: C.border,
  },
  muscleChipText: { fontFamily: "DMSans_400Regular", fontSize: 11, color: C.textSecondary },

  tipRow: { flexDirection: "row", alignItems: "flex-start", gap: 8, marginBottom: 12 },
  tips: { flex: 1, fontFamily: "DMSans_400Regular", fontSize: 13, fontStyle: "italic", color: C.textSecondary, lineHeight: 19 },

  videoBtn: {
    flexDirection: "row", alignItems: "center", gap: 10,
    alignSelf: "flex-start",
    backgroundColor: C.surface2, borderRadius: R.pill,
    borderWidth: 1, borderColor: C.border,
    paddingVertical: 8, paddingHorizontal: 12,
  },
  videoPlay: { width: 24, height: 24, borderRadius: 12, backgroundColor: "#FF0000", alignItems: "center", justifyContent: "center" },
  videoBtnText: { fontFamily: "DMSans_600SemiBold", fontSize: 13, color: C.textPrimary, letterSpacing: 0.5 },

  finishBtn: { marginTop: 32 },
});
