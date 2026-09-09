import React, { useEffect, useState, useRef } from "react";
import {
  View, Text, StyleSheet, Modal, StatusBar, Linking, TextInput,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import { Feather } from "@expo/vector-icons";
import { saveSession, saveWeight, getLastWeight } from "../data/storage";
import { C, T, R, E } from "../theme";
import { Press, PrimaryButton, SectionLabel, ProgressBar } from "../ui/kit";
import RestTimerScreen from "./RestTimerScreen";
import SessionCompleteScreen from "./SessionCompleteScreen";

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
      <Text style={ws.label}>POIDS UTILISÉ</Text>
      {lastWeight && (
        <View style={ws.hintRow}>
          <Feather name="trending-up" size={12} color={C.accent} />
          <Text style={ws.hint}>
            Dernière fois : {lastWeight.weight}{lastWeight.unit}
            {suggestedWeight ? "   →   Suggéré : " + suggestedWeight + lastWeight.unit : ""}
          </Text>
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
        {["kg", "lbs"].map((u) => (
          <Press key={u} style={[ws.unitBtn, unit === u && ws.unitBtnActive]} onPress={() => setUnit(u)} scaleTo={0.9}>
            <Text style={[ws.unitText, unit === u && { color: C.textPrimary }]}>{u}</Text>
          </Press>
        ))}
        <Press style={[ws.saveBtn, saved && { backgroundColor: C.green }]} onPress={handleSave} scaleTo={0.92}>
          {saved
            ? <Feather name="check" size={16} color={C.bg} />
            : <Text style={ws.saveBtnText}>OK</Text>}
        </Press>
      </View>
    </View>
  );
}

// ─── Exercice ─────────────────────────────────────────────────────
function ExerciseCard({ ex, index, onSetsChange }) {
  const totalSets = ex.sets || 3;
  const [done, setDone] = useState([]);
  const [showTimer, setShowTimer] = useState(false);
  const [lastWeight, setLastWeight] = useState(null);
  const allDone = done.length === totalSets;

  useEffect(() => {
    if (ex.requiresWeight) getLastWeight(ex.name).then(setLastWeight);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const suggestedWeight = lastWeight ? (lastWeight.weight + 2.5).toFixed(1) : null;

  /* Les effets restent hors de l'updater : React peut le rejouer, et prévenir
     le parent pendant ce calcul déclencherait un setState en plein rendu. */
  const toggleSet = (i) => {
    const wasDone = done.includes(i);
    const next = wasDone ? done.filter((s) => s !== i) : [...done, i];
    setDone(next);
    if (!wasDone && next.length < totalSets) setShowTimer(true);
    onSetsChange?.(index, next.length);
  };

  return (
    <View style={[styles.exCard, allDone && styles.exCardDone]}>
      <Modal visible={showTimer} transparent animationType="fade" onRequestClose={() => setShowTimer(false)}>
        <RestTimerScreen seconds={ex.rest || 60} onClose={() => setShowTimer(false)} />
      </Modal>

      <View style={styles.exTop}>
        <View style={[styles.exIndexBox, allDone && { backgroundColor: C.accent, borderColor: C.accent }]}>
          <Text style={[styles.exIndex, allDone && { color: C.bg }]}>{String(index + 1).padStart(2, "0")}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.exName}>{ex.name.toUpperCase()}</Text>
          <Text style={styles.exEquip}>{ex.equipment}</Text>
        </View>
        {allDone && (
          <View style={styles.doneBadge}>
            <Feather name="check" size={14} color={C.bg} />
          </View>
        )}
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
        <WeightSelector exerciseName={ex.name} lastWeight={lastWeight} suggestedWeight={suggestedWeight} />
      )}

      <View style={styles.setsRow}>
        {Array.from({ length: totalSets }).map((_, i) => {
          const isDone = done.includes(i);
          return (
            <Press
              key={i}
              style={[styles.setBtn, isDone && styles.setBtnDone]}
              onPress={() => toggleSet(i)}
              scaleTo={0.88}
            >
              {isDone
                ? <Feather name="check" size={18} color={C.bg} />
                : <Text style={styles.setBtnText}>{i + 1}</Text>}
            </Press>
          );
        })}
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
        <View style={styles.tipsBox}>
          <Feather name="info" size={13} color={C.accent} />
          <Text style={styles.tips}>{ex.tips}</Text>
        </View>
      )}

      {ex.youtubeQuery && (
        <Press
          style={styles.videoBtn}
          onPress={() => Linking.openURL("https://www.youtube.com/results?search_query=" + encodeURIComponent(ex.youtubeQuery))}
          scaleTo={0.96}
        >
          <View style={styles.videoPlay}>
            <Feather name="play" size={11} color="#fff" />
          </View>
          <Text style={styles.videoBtnText}>VOIR L'EXÉCUTION</Text>
        </Press>
      )}
    </View>
  );
}

// ─── Écran ────────────────────────────────────────────────────────
export default function WorkoutScreen({ navigation, route }) {
  const { workout, sessionName, level, goal, split, duration, equipments, readOnly } = route?.params || {};
  const [showComplete, setShowComplete] = useState(false);
  const [progress, setProgress] = useState({});
  const startedAt = useRef(Date.now());

  useEffect(() => {
    if (!readOnly && workout) {
      saveSession({ workout, sessionName, level, goal, split, duration, equipments }).catch(() => {});
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (!workout) return null;

  const totalSets = (workout.exercises || []).reduce((a, ex) => a + (ex.sets || 3), 0);
  const setsDone = Object.values(progress).reduce((a, n) => a + n, 0);
  const ratio = totalSets > 0 ? setsDone / totalSets : 0;

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />

      <Modal visible={showComplete} animationType="fade" transparent={false}>
        <SessionCompleteScreen
          workout={workout}
          setsDone={setsDone}
          totalSets={totalSets}
          elapsedMin={Math.max(1, Math.round((Date.now() - startedAt.current) / 60000))}
          onGoHome={() => {
            setShowComplete(false);
            navigation.reset({ index: 0, routes: [{ name: "Main" }] });
          }}
          onReview={() => setShowComplete(false)}
        />
      </Modal>

      {!readOnly && (
        <View style={styles.progressBar}>
          <ProgressBar value={ratio} height={4} />
        </View>
      )}

      <KeyboardAwareScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        enableOnAndroid
        extraScrollHeight={120}
        enableAutomaticScroll
      >
        <Press style={styles.back} onPress={() => navigation.goBack()} scaleTo={0.92}>
          <Feather name="arrow-left" size={16} color={C.textPrimary} />
          <Text style={styles.backText}>RETOUR</Text>
        </Press>

        <View style={styles.head}>
          <Text style={styles.eyebrow}>TA SÉANCE</Text>
          <Text style={styles.title}>{workout.title?.toUpperCase()}</Text>
          <View style={styles.metaRow}>
            <View style={styles.metaChip}>
              <Feather name="clock" size={12} color={C.textSecondary} />
              <Text style={styles.metaText}>{workout.totalDuration} MIN</Text>
            </View>
            <View style={styles.metaChip}>
              <Feather name="list" size={12} color={C.textSecondary} />
              <Text style={styles.metaText}>{workout.exercises?.length} EXERCICES</Text>
            </View>
            {!readOnly && (
              <View style={[styles.metaChip, { backgroundColor: C.accentSoft, borderColor: "rgba(200,255,0,0.25)" }]}>
                <Text style={[styles.metaText, { color: C.accent }]}>{setsDone}/{totalSets} SÉRIES</Text>
              </View>
            )}
          </View>
        </View>

        <View style={styles.body}>
          <View style={styles.hint}>
            <Feather name="watch" size={14} color={C.accent} />
            <Text style={styles.hintText}>Coche chaque série pour déclencher le chrono de repos.</Text>
          </View>
          <View style={[styles.hint, { borderColor: "rgba(245,158,11,0.25)", backgroundColor: "rgba(245,158,11,0.06)" }]}>
            <Feather name="alert-circle" size={14} color={C.amber} />
            <Text style={styles.hintText}>
              Commence avec une charge que tu tiens sur toutes les séries — mieux vaut trop léger que se blesser.
            </Text>
          </View>

          {workout.warmup && (
            <View style={styles.block}>
              <View style={styles.blockHead}>
                <Feather name="sunrise" size={14} color={C.accent} />
                <Text style={styles.blockLabel}>ÉCHAUFFEMENT — {workout.warmup.duration} MIN</Text>
              </View>
              {workout.warmup.exercises?.map((ex, i) => (
                <Text key={i} style={styles.blockItem}>· {ex}</Text>
              ))}
            </View>
          )}

          <SectionLabel style={{ marginTop: 4 }} accent>EXERCICES</SectionLabel>
          <View style={{ gap: 14 }}>
            {workout.exercises?.map((ex, i) => (
              <ExerciseCard
                key={i}
                ex={ex}
                index={i}
                onSetsChange={(idx, n) => setProgress((p) => ({ ...p, [idx]: n }))}
              />
            ))}
          </View>

          {workout.cooldown && (
            <View style={[styles.block, { marginTop: 24 }]}>
              <View style={styles.blockHead}>
                <Feather name="wind" size={14} color={C.blue} />
                <Text style={styles.blockLabel}>RETOUR AU CALME — {workout.cooldown.duration} MIN</Text>
              </View>
              {workout.cooldown.exercises?.map((ex, i) => (
                <Text key={i} style={styles.blockItem}>· {ex}</Text>
              ))}
            </View>
          )}

          {!readOnly && (
            <PrimaryButton
              label="TERMINER LA SÉANCE"
              icon="flag"
              style={{ marginTop: 28 }}
              onPress={() => setShowComplete(true)}
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
    marginBottom: 14, padding: 14,
    backgroundColor: C.surface2, borderRadius: R.md,
    borderWidth: 1, borderColor: C.border,
  },
  label: { ...T.label, fontSize: 10, marginBottom: 6 },
  hintRow: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 10 },
  hint: { fontFamily: "DMSans_400Regular", fontSize: 12, color: C.accent, flex: 1 },
  inputRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  input: {
    width: 74, height: 44, borderRadius: R.sm,
    backgroundColor: C.bg, borderWidth: 1, borderColor: C.border,
    color: C.textPrimary, fontFamily: "DMSans_700Bold", fontSize: 18,
    textAlign: "center", paddingVertical: 0, includeFontPadding: false,
  },
  unitBtn: {
    paddingHorizontal: 12, paddingVertical: 11, borderRadius: R.sm,
    borderWidth: 1, borderColor: C.border,
  },
  unitBtnActive: { borderColor: C.textPrimary, backgroundColor: C.surfaceHi },
  unitText: { fontFamily: "DMSans_600SemiBold", fontSize: 12, color: C.textMuted },
  saveBtn: {
    marginLeft: "auto", minWidth: 52, alignItems: "center",
    paddingHorizontal: 16, paddingVertical: 11,
    borderRadius: R.sm, backgroundColor: C.accent,
  },
  saveBtnText: { fontFamily: "DMSans_700Bold", fontSize: 13, color: C.bg },
});

// ─── Styles écran ─────────────────────────────────────────────────
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  container: { paddingBottom: 56 },

  progressBar: { paddingHorizontal: 24, paddingTop: 6 },

  back: {
    flexDirection: "row", alignItems: "center", gap: 8, alignSelf: "flex-start",
    marginLeft: 24, marginTop: 16, marginBottom: 24,
    backgroundColor: C.surface, borderRadius: R.pill,
    borderWidth: 1, borderColor: C.border, paddingHorizontal: 14, paddingVertical: 9,
  },
  backText: { ...T.label, color: C.textPrimary, fontSize: 10 },

  head: { paddingHorizontal: 24, marginBottom: 24 },
  eyebrow: { ...T.label, color: C.accent, marginBottom: 4 },
  title: { fontFamily: "BebasNeue_400Regular", fontSize: 42, color: C.textPrimary, letterSpacing: 1, lineHeight: 44, marginBottom: 14 },
  metaRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  metaChip: {
    flexDirection: "row", alignItems: "center", gap: 6,
    backgroundColor: C.surface, borderRadius: R.pill,
    borderWidth: 1, borderColor: C.border,
    paddingHorizontal: 11, paddingVertical: 6,
  },
  metaText: { ...T.label, fontSize: 9, color: C.textSecondary },

  body: { paddingHorizontal: 24 },

  hint: {
    flexDirection: "row", alignItems: "flex-start", gap: 10, marginBottom: 12,
    backgroundColor: C.accentSofter, borderRadius: R.md,
    borderWidth: 1, borderColor: "rgba(200,255,0,0.18)", padding: 14,
  },
  hintText: { fontFamily: "DMSans_400Regular", fontSize: 13, color: C.textSecondary, flex: 1, lineHeight: 19 },

  block: {
    marginTop: 16, marginBottom: 20, padding: 16,
    backgroundColor: C.surface, borderRadius: R.lg,
    borderWidth: 1, borderColor: C.border,
  },
  blockHead: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 10 },
  blockLabel: { ...T.label, fontSize: 10, color: C.textPrimary },
  blockItem: { fontFamily: "DMSans_400Regular", fontSize: 14, color: C.textSecondary, marginBottom: 6, lineHeight: 20 },

  exCard: {
    backgroundColor: C.surface, borderRadius: R.lg,
    borderWidth: 1, borderColor: C.border, padding: 18, ...E.raised,
  },
  exCardDone: { borderColor: "rgba(200,255,0,0.3)", backgroundColor: C.accentSofter },

  exTop: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 16 },
  exIndexBox: {
    width: 42, height: 42, borderRadius: R.md,
    alignItems: "center", justifyContent: "center",
    backgroundColor: C.surface2, borderWidth: 1, borderColor: C.border,
  },
  exIndex: { fontFamily: "BebasNeue_400Regular", fontSize: 20, color: C.textSecondary, lineHeight: 22 },
  exName: { fontFamily: "BebasNeue_400Regular", fontSize: 26, color: C.textPrimary, lineHeight: 28 },
  exEquip: { fontFamily: "DMSans_400Regular", fontSize: 13, color: C.textMuted, marginTop: 2 },
  doneBadge: {
    width: 28, height: 28, borderRadius: R.pill,
    backgroundColor: C.accent, alignItems: "center", justifyContent: "center",
  },

  statsLine: {
    flexDirection: "row", alignItems: "center", marginBottom: 14,
    backgroundColor: C.surface2, borderRadius: R.md, paddingVertical: 12,
  },
  statItem: { flex: 1, alignItems: "center" },
  statDivider: { width: 1, height: 26, backgroundColor: C.border },
  statNum: { fontFamily: "DMSans_700Bold", fontSize: 20, color: C.accent, lineHeight: 22 },
  statLbl: { fontFamily: "DMSans_400Regular", fontSize: 11, color: C.textMuted, marginTop: 1 },

  setsRow: { flexDirection: "row", gap: 8, marginBottom: 14, flexWrap: "wrap" },
  setBtn: {
    width: 46, height: 46, borderRadius: R.md,
    alignItems: "center", justifyContent: "center",
    backgroundColor: C.surface2, borderWidth: 1, borderColor: C.border,
  },
  setBtnDone: { backgroundColor: C.accent, borderColor: C.accent, ...E.accentGlow },
  setBtnText: { fontFamily: "BebasNeue_400Regular", fontSize: 20, color: C.textSecondary },

  musclesRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 12 },
  muscleChip: {
    backgroundColor: C.surface2, borderRadius: R.pill,
    borderWidth: 1, borderColor: C.border,
    paddingHorizontal: 10, paddingVertical: 4,
  },
  muscleChipText: { fontFamily: "DMSans_400Regular", fontSize: 11, color: C.textSecondary },

  tipsBox: {
    flexDirection: "row", alignItems: "flex-start", gap: 8, marginBottom: 12,
    backgroundColor: C.accentSofter, borderRadius: R.md, padding: 12,
  },
  tips: { fontFamily: "DMSans_400Regular", fontSize: 13, color: C.textSecondary, lineHeight: 19, flex: 1 },

  videoBtn: {
    flexDirection: "row", alignItems: "center", gap: 10, alignSelf: "flex-start",
    backgroundColor: C.surface2, borderRadius: R.pill,
    borderWidth: 1, borderColor: C.border,
    paddingVertical: 8, paddingHorizontal: 12,
  },
  videoPlay: {
    width: 24, height: 24, borderRadius: R.pill, backgroundColor: "#FF0000",
    alignItems: "center", justifyContent: "center",
  },
  videoBtnText: { fontFamily: "DMSans_600SemiBold", fontSize: 12, color: C.textPrimary, letterSpacing: 0.5 },
});
