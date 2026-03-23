import React, { useEffect, useState, useRef } from "react";
import {
  View, Text, StyleSheet, TouchableOpacity, Modal,
  SafeAreaView, StatusBar, Linking, Vibration,
  Animated, Dimensions, TextInput, Platform,
} from "react-native";
import { saveSession, saveWeight, getLastWeight } from "../data/storage";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import { C, T } from "../theme";

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
          position: "absolute", width: p.size, height: p.size * 0.5,
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
          <Text style={cel.emoji}>🏆</Text>
          <Text style={cel.title}>SÉANCE{"\n"}TERMINÉE !</Text>
          <Text style={cel.sub}>Bravo, tu l'as fait 💪{"\n"}Ta séance a été sauvegardée.</Text>
          <TouchableOpacity style={cel.btn} onPress={onGoHome} activeOpacity={0.85}>
            <Text style={cel.btnText}>RETOUR À L'ACCUEIL →</Text>
          </TouchableOpacity>
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

  const color = remaining > seconds * 0.5 ? C.accent : remaining > seconds * 0.2 ? C.amber : C.red;

  return (
    <View style={timer.overlay}>
      <View style={timer.card}>
        <Text style={timer.label}>TEMPS DE REPOS</Text>
        <Text style={[timer.count, { color }]}>{remaining}</Text>
        <Text style={timer.unit}>secondes</Text>
        <View style={timer.barBg}>
          <View style={[timer.barFill, { width: `${(remaining / seconds) * 100}%`, backgroundColor: color }]} />
        </View>
        <TouchableOpacity style={[timer.btn, remaining === 0 && { backgroundColor: C.accent }]} onPress={onClose}>
          <Text style={[timer.btnText, remaining === 0 && { color: C.bg }]}>
            {remaining === 0 ? "C'EST PARTI 💪" : "PASSER"}
          </Text>
        </TouchableOpacity>
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
    <View style={ws.row}>
        <Text style={ws.label}>POIDS UTILISÉ</Text>
        {lastWeight && (
          <Text style={ws.hint}>
            Dernière fois : {lastWeight.weight}{lastWeight.unit}{suggestedWeight ? `  →  Suggéré : ${suggestedWeight}${lastWeight.unit}` : ""}
          </Text>
        )}
      </View>
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
        <TouchableOpacity
          style={[ws.unitBtn, unit === "kg" && ws.unitBtnActive]}
          onPress={() => setUnit("kg")}
        >
          <Text style={[ws.unitText, unit === "kg" && ws.unitTextActive]}>kg</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[ws.unitBtn, unit === "lbs" && ws.unitBtnActive]}
          onPress={() => setUnit("lbs")}
        >
          <Text style={[ws.unitText, unit === "lbs" && ws.unitTextActive]}>lbs</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[ws.saveBtn, saved && { backgroundColor: C.green }]}
          onPress={handleSave}
          activeOpacity={0.8}
        >
          <Text style={ws.saveBtnText}>{saved ? "✓" : "OK"}</Text>
        </TouchableOpacity>
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
    if (ex.requiresWeight) {
      getLastWeight(ex.name).then(setLastWeight);
    }
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
    <View style={styles.exWrap}>
      {showTimer && <RestTimer seconds={ex.rest || 60} onClose={() => setShowTimer(false)} />}

      <View style={styles.exTop}>
        <Text style={[styles.exIndex, allDone && { color: C.accent }]}>
          {String(index + 1).padStart(2, "0")}
        </Text>
        <View style={{ flex: 1 }}>
          <Text style={styles.exName}>{ex.name.toUpperCase()}</Text>
          <Text style={styles.exEquip}>{ex.equipment}</Text>
        </View>
        {allDone && <View style={styles.doneBadge}><Text style={styles.doneBadgeText}>✓</Text></View>}
      </View>

      <View style={styles.statsLine}>
        <View style={styles.statItem}>
          <Text style={styles.statNum} numberOfLines={1} adjustsFontSizeToFit>{ex.sets}</Text>
          <Text style={styles.statLbl}>séries</Text>
        </View>
        <Text style={styles.statSep}>×</Text>
        <View style={styles.statItem}>
          <Text style={styles.statNum} numberOfLines={1} adjustsFontSizeToFit>{ex.reps}</Text>
          <Text style={styles.statLbl}>répétitions</Text>
        </View>
        <Text style={styles.statSep}>·</Text>
        <View style={styles.statItem}>
          <Text style={styles.statNum} numberOfLines={1} adjustsFontSizeToFit>{ex.rest}s</Text>
          <Text style={styles.statLbl}>repos</Text>
        </View>
      </View>

      {/* Saisie du poids uniquement si nécessaire */}
      {ex.requiresWeight && (
        <WeightSelector
          exerciseName={ex.name}
          lastWeight={lastWeight}
          suggestedWeight={suggestedWeight}
        />
      )}

      <View style={styles.setsRow}>
        {Array.from({ length: totalSets }).map((_, i) => (
          <TouchableOpacity
            key={i}
            style={[styles.setBtn, done.includes(i) && styles.setBtnDone]}
            onPress={() => toggleSet(i)}
            activeOpacity={0.7}
          >
            <Text style={[styles.setBtnText, done.includes(i) && styles.setBtnTextDone]}>
              {done.includes(i) ? "✓" : i + 1}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {ex.muscles?.length > 0 && (
        <View style={styles.musclesRow}>
          {ex.muscles.map((m, i) => <Text key={i} style={styles.muscleChip}>{m}</Text>)}
        </View>
      )}

      {ex.tips && <Text style={styles.tips}>💡  {ex.tips}</Text>}

      {ex.youtubeQuery && (
        <TouchableOpacity
          style={styles.videoBtn}
          onPress={() => Linking.openURL(`https://www.youtube.com/results?search_query=${encodeURIComponent(ex.youtubeQuery)}`)}
          activeOpacity={0.8}
        >
          <View style={styles.videoBtnInner}>
            <View style={styles.videoPlay}><Text style={styles.videoPlayIcon}>▶</Text></View>
            <Text style={styles.videoBtnText}>VOIR L'EXÉCUTION</Text>
          </View>
        </TouchableOpacity>
      )}

      <View style={styles.separator} />
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
          enableOnAndroid={true}
          extraScrollHeight={120}
          enableAutomaticScroll={true}
        >

          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.back}>
            <Text style={styles.backText}>← RETOUR</Text>
          </TouchableOpacity>

          <Text style={styles.eyebrow}>TA SÉANCE</Text>
          <Text style={styles.title}>{workout.title?.toUpperCase()}</Text>

          <View style={styles.metaRow}>
            <Text style={styles.metaText}>{workout.totalDuration} MIN</Text>
            <Text style={styles.metaDot}>·</Text>
            <Text style={styles.metaText}>{workout.exercises?.length} EXERCICES</Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.timerHint}>
            <Text style={styles.timerHintIcon}>⏱</Text>
            <Text style={styles.timerHintText}>Coche chaque série pour déclencher le chrono de repos.</Text>
          </View>
          <View style={[styles.timerHint, { borderLeftColor: C.amber, marginBottom: 28 }]}>
            <Text style={styles.timerHintIcon}>💡</Text>
            <Text style={styles.timerHintText}>Pour les poids, commence avec une charge avec laquelle tu peux faire toutes les séries proprement — mieux vaut trop léger que se blesser !</Text>
          </View>

          {workout.warmup && (
            <View style={styles.blockSection}>
              <Text style={styles.blockLabel}>🔥  ÉCHAUFFEMENT — {workout.warmup.duration} MIN</Text>
              {workout.warmup.exercises?.map((ex, i) => (
                <Text key={i} style={styles.blockItem}>· {ex}</Text>
              ))}
            </View>
          )}

          <Text style={styles.sectionLabel}>EXERCICES</Text>
          {workout.exercises?.map((ex, i) => <ExerciseCard key={i} ex={ex} index={i} />)}

          {workout.cooldown && (
            <View style={styles.blockSection}>
              <Text style={styles.blockLabel}>🧊  RETOUR AU CALME — {workout.cooldown.duration} MIN</Text>
              {workout.cooldown.exercises?.map((ex, i) => (
                <Text key={i} style={styles.blockItem}>· {ex}</Text>
              ))}
            </View>
          )}

          {!readOnly && (
            <TouchableOpacity
              style={styles.finishBtn}
              onPress={() => setShowCelebration(true)}
              activeOpacity={0.85}
            >
              <Text style={styles.finishText}>TERMINER LA SÉANCE</Text>
            </TouchableOpacity>
          )}

        </KeyboardAwareScrollView>
    </SafeAreaView>
  );
}

// ─── Styles poids ─────────────────────────────────────────────────
const ws = StyleSheet.create({
  wrap: { paddingLeft: 56, marginBottom: 14 },
  row: { marginBottom: 8 },
  label: { ...T.label, fontSize: 10, marginBottom: 4 },
  hint: { fontFamily: "DMSans_400Regular", fontSize: 12, color: C.accent, marginBottom: 8 },
  inputRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  input: {
    width: 70, height: 44, backgroundColor: C.surface2,
    color: C.textPrimary, fontFamily: "DMSans_700Bold",
    fontSize: 18, textAlign: "center", textAlignVertical: "center",
    borderBottomWidth: 1, borderColor: C.border,
    paddingVertical: 0, includeFontPadding: false,
  },
  unitBtn: {
    paddingHorizontal: 10, paddingVertical: 8,
    borderWidth: 1, borderColor: C.border,
  },
  unitBtnActive: { borderColor: C.textPrimary, backgroundColor: C.surface2 },
  unitText: { fontFamily: "DMSans_600SemiBold", fontSize: 12, color: C.textMuted },
  unitTextActive: { color: C.textPrimary },
  saveBtn: {
    paddingHorizontal: 14, paddingVertical: 8,
    backgroundColor: C.accent,
  },
  saveBtnText: { fontFamily: "DMSans_700Bold", fontSize: 13, color: C.bg },
});

// ─── Styles célébration ───────────────────────────────────────────
const cel = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.88)", alignItems: "center", justifyContent: "center" },
  card: { backgroundColor: C.surface, padding: 36, alignItems: "center", width: SW * 0.85 },
  emoji: { fontSize: 56, marginBottom: 16 },
  title: { fontFamily: "BebasNeue_400Regular", fontSize: 48, color: C.textPrimary, letterSpacing: 2, lineHeight: 48, textAlign: "center", marginBottom: 12 },
  sub: { fontFamily: "DMSans_400Regular", fontSize: 15, color: C.textSecondary, textAlign: "center", lineHeight: 22, marginBottom: 28 },
  btn: { backgroundColor: C.accent, width: "100%", paddingVertical: 16, alignItems: "center" },
  btnText: { fontFamily: "DMSans_700Bold", fontSize: 14, color: C.bg, letterSpacing: 2 },
});

// ─── Styles timer ─────────────────────────────────────────────────
const timer = StyleSheet.create({
  overlay: { position: "absolute", top: -20, left: -24, right: -24, bottom: -20, backgroundColor: "rgba(0,0,0,0.95)", zIndex: 10, alignItems: "center", justifyContent: "center" },
  card: { backgroundColor: C.surface, padding: 36, alignItems: "center", width: 280 },
  label: { ...T.label, marginBottom: 16 },
  count: { fontFamily: "BebasNeue_400Regular", fontSize: 96, lineHeight: 96 },
  unit: { ...T.small, marginTop: 4, marginBottom: 24 },
  barBg: { width: "100%", height: 2, backgroundColor: C.border, marginBottom: 28 },
  barFill: { height: "100%" },
  btn: { width: "100%", paddingVertical: 16, alignItems: "center", borderWidth: 1, borderColor: C.border },
  btnText: { fontFamily: "DMSans_700Bold", fontSize: 14, letterSpacing: 1.5, color: C.textPrimary },
});

// ─── Styles écran ─────────────────────────────────────────────────
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  container: { paddingBottom: 60 },

  back: { paddingHorizontal: 24, paddingTop: 20, marginBottom: 20 },
  backText: { ...T.label },

  eyebrow: { ...T.label, color: C.accent, paddingHorizontal: 24, marginBottom: 4 },
  title: { fontFamily: "BebasNeue_400Regular", fontSize: 40, color: C.textPrimary, letterSpacing: 1, lineHeight: 42, paddingHorizontal: 24, marginBottom: 12 },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 24, marginBottom: 4 },
  metaText: { ...T.label, color: C.textSecondary },
  metaDot: { color: C.textMuted },

  divider: { height: 1, backgroundColor: C.border, marginHorizontal: 24, marginVertical: 24 },

  timerHint: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 24, marginBottom: 24, borderLeftWidth: 2, borderLeftColor: C.accent, paddingLeft: 14 },
  timerHintIcon: { fontSize: 14 },
  timerHintText: { fontFamily: "DMSans_400Regular", fontSize: 13, color: C.textSecondary, flex: 1 },

  blockSection: { paddingHorizontal: 24, marginBottom: 28 },
  blockLabel: { fontFamily: "DMSans_700Bold", fontSize: 12, color: C.textSecondary, marginBottom: 10, letterSpacing: 1, textTransform: "uppercase" },
  blockItem: { fontFamily: "DMSans_400Regular", fontSize: 14, color: C.textSecondary, marginBottom: 6, lineHeight: 20 },

  sectionLabel: { ...T.label, paddingHorizontal: 24, marginBottom: 20 },

  exWrap: { paddingHorizontal: 24 },
  exTop: { flexDirection: "row", alignItems: "flex-start", gap: 14, marginBottom: 16 },
  exIndex: { fontFamily: "BebasNeue_400Regular", fontSize: 32, color: C.textMuted, lineHeight: 34, width: 42 },
  exName: { fontFamily: "BebasNeue_400Regular", fontSize: 28, color: C.textPrimary, lineHeight: 30 },
  exEquip: { fontFamily: "DMSans_400Regular", fontSize: 13, color: C.textMuted, marginTop: 3 },
  doneBadge: { width: 28, height: 28, backgroundColor: C.accent, alignItems: "center", justifyContent: "center" },
  doneBadgeText: { fontSize: 13, color: C.bg, fontWeight: "700" },

  statsLine: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 16, paddingLeft: 56, flexWrap: "wrap" },
  statItem: { alignItems: "center", maxWidth: 120 },
  statNum: { fontFamily: "DMSans_700Bold", fontSize: 22, color: C.accent, lineHeight: 24 },
  statLbl: { fontFamily: "DMSans_400Regular", fontSize: 11, color: C.textMuted, marginTop: 1 },
  statSep: { fontFamily: "BebasNeue_400Regular", fontSize: 20, color: C.textMuted },

  setsRow: { flexDirection: "row", gap: 8, marginBottom: 14, paddingLeft: 56, flexWrap: "wrap" },
  setBtn: { width: 44, height: 44, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: C.border },
  setBtnDone: { backgroundColor: C.accent, borderColor: C.accent },
  setBtnText: { fontFamily: "BebasNeue_400Regular", fontSize: 20, color: C.textSecondary },
  setBtnTextDone: { color: C.bg },

  musclesRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 12, paddingLeft: 56 },
  muscleChip: { fontFamily: "DMSans_400Regular", fontSize: 12, color: C.textMuted },

  tips: { fontFamily: "DMSans_400Regular", fontSize: 13, fontStyle: "italic", color: C.textSecondary, lineHeight: 19, marginBottom: 14, paddingLeft: 56 },

  videoBtn: { paddingLeft: 56, marginBottom: 4 },
  videoBtnInner: { flexDirection: "row", alignItems: "center", gap: 10, alignSelf: "flex-start", paddingVertical: 8, paddingHorizontal: 4 },
  videoPlay: { width: 28, height: 28, backgroundColor: "#FF0000", alignItems: "center", justifyContent: "center" },
  videoPlayIcon: { color: "#fff", fontSize: 11, marginLeft: 2 },
  videoBtnText: { fontFamily: "DMSans_600SemiBold", fontSize: 13, color: C.textPrimary, letterSpacing: 0.5 },

  separator: { height: 1, backgroundColor: C.border, marginVertical: 24 },

  finishBtn: { backgroundColor: C.accent, marginHorizontal: 24, paddingVertical: 18, alignItems: "center", marginTop: 8 },
  finishText: { fontFamily: "DMSans_700Bold", fontSize: 15, color: C.bg, letterSpacing: 2 },
});