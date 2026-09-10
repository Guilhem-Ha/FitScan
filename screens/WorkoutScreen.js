import React, { useEffect, useState, useRef } from "react";
import { View, Text, StyleSheet, Modal, StatusBar, Linking, TextInput } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { saveSession, saveWeight, getLastWeight } from "../data/storage";
import { C, T, R, E } from "../theme";
import { Press, PrimaryButton, ProgressBar, BackButton, FooterBar } from "../ui/kit";
import RestTimerScreen from "./RestTimerScreen";
import SessionCompleteScreen from "./SessionCompleteScreen";

const setsOf = (ex) => ex?.sets || 3;
const pad2 = (n) => String(n).padStart(2, "0");

// ─── Chrono écoulé ────────────────────────────────────────────────
// Isolé dans son propre composant : le tic d'une seconde ne re-rend que lui.
function ElapsedBadge({ startedAt }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  const s = Math.max(0, Math.floor((now - startedAt) / 1000));
  return (
    <View style={styles.elapsed}>
      <Text style={styles.elapsedText}>{pad2(Math.floor(s / 60))}:{pad2(s % 60)}</Text>
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
        <Text style={ws.label}>POIDS UTILISÉ</Text>
        {lastWeight ? (
          <Text style={ws.hint}>
            {lastWeight.weight} {lastWeight.unit} → {suggestedWeight} {lastWeight.unit} suggéré
          </Text>
        ) : null}
      </View>
      <View style={ws.row}>
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
            <Press key={u} style={[ws.unitBtn, unit === u && ws.unitBtnActive]} onPress={() => setUnit(u)} scaleTo={0.9}>
              <Text style={[ws.unitText, unit === u && { color: C.textPrimary }]}>{u}</Text>
            </Press>
          ))}
        </View>
        <Press style={[ws.saveBtn, saved && { backgroundColor: C.green }]} onPress={handleSave} scaleTo={0.9}>
          <Feather name="check" size={18} color={C.bg} />
        </Press>
      </View>
    </View>
  );
}

// ─── Exercice ─────────────────────────────────────────────────────
function ExerciseCard({ ex, index, expanded, onExpand, onSetsChange }) {
  const totalSets = setsOf(ex);
  const [done, setDone] = useState([]);
  const [timerSet, setTimerSet] = useState(null);
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
    if (!wasDone && next.length < totalSets) setTimerSet(next.length);
    onSetsChange?.(index, next.length);
  };

  // Le Modal vit hors des deux vues : replier la carte ne coupe pas un repos en cours.
  const timer = (
    <Modal visible={timerSet !== null} transparent animationType="fade" onRequestClose={() => setTimerSet(null)}>
      <RestTimerScreen
        seconds={ex.rest || 60}
        setNumber={timerSet}
        totalSets={totalSets}
        exerciseName={ex.name}
        onClose={() => setTimerSet(null)}
      />
    </Modal>
  );

  if (!expanded) {
    return (
      <>
        {timer}
        <Press style={[styles.collapsed, allDone && styles.collapsedDone]} onPress={onExpand} scaleTo={0.985}>
          {allDone ? (
            <View style={[styles.indexBox, styles.indexBoxDone]}>
              <Feather name="check" size={16} color={C.bg} />
            </View>
          ) : (
            <Text style={styles.collapsedIndex}>{pad2(index + 1)}</Text>
          )}
          <View style={{ flex: 1 }}>
            <Text style={[styles.collapsedName, allDone && { color: C.textSecondary }]} numberOfLines={1}>
              {ex.name.toUpperCase()}
            </Text>
            <Text style={styles.collapsedMeta}>
              {ex.sets} × {ex.reps} · {ex.rest}s{done.length > 0 && !allDone ? ` · ${done.length}/${totalSets} séries` : ""}
            </Text>
          </View>
          <Feather name="chevron-down" size={18} color={C.textMuted} />
        </Press>
      </>
    );
  }

  return (
    <View style={[styles.exCard, allDone && styles.exCardDone]}>
      {timer}

      <View style={styles.exTop}>
        <View style={[styles.indexBox, allDone && styles.indexBoxDone]}>
          {allDone
            ? <Feather name="check" size={16} color={C.bg} />
            : <Text style={styles.indexText}>{pad2(index + 1)}</Text>}
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.exName}>{ex.name.toUpperCase()}</Text>
          {ex.equipment ? <Text style={styles.exEquip}>{ex.equipment}</Text> : null}
        </View>
      </View>

      <View style={styles.tiles}>
        {[
          [ex.sets, "séries"],
          [ex.reps, "reps"],
          [`${ex.rest}s`, "repos"],
        ].map(([value, label]) => (
          <View key={label} style={styles.tile}>
            <Text style={styles.tileValue} numberOfLines={1} adjustsFontSizeToFit>{value}</Text>
            <Text style={styles.tileLabel}>{label}</Text>
          </View>
        ))}
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
              scaleTo={0.9}
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

      {ex.tips ? (
        <View style={styles.tipBox}>
          <MaterialCommunityIcons name="lightbulb-outline" size={16} color={C.amber} />
          <Text style={styles.tipText}>{ex.tips}</Text>
        </View>
      ) : null}

      {ex.youtubeQuery ? (
        <Press
          style={styles.videoRow}
          onPress={() => Linking.openURL("https://www.youtube.com/results?search_query=" + encodeURIComponent(ex.youtubeQuery))}
          scaleTo={0.98}
        >
          <View style={styles.videoPlay}>
            <Feather name="play" size={11} color="#fff" />
          </View>
          <Text style={styles.videoText}>Voir l'exécution</Text>
        </Press>
      ) : null}
    </View>
  );
}

function PhaseBlock({ icon, title, block }) {
  return (
    <View style={styles.phase}>
      <View style={styles.phaseHead}>
        <Feather name={icon} size={13} color={C.accent} />
        <Text style={styles.phaseLabel}>{title} — {block.duration} MIN</Text>
      </View>
      {block.exercises?.map((item, i) => (
        <Text key={i} style={styles.phaseItem}>· {item}</Text>
      ))}
    </View>
  );
}

// ─── Écran ────────────────────────────────────────────────────────
export default function WorkoutScreen({ navigation, route }) {
  const { workout, sessionName, level, goal, split, duration, equipments, readOnly } = route?.params || {};
  const [showComplete, setShowComplete] = useState(false);
  const [saveFailed, setSaveFailed] = useState(false);
  const [elapsedMin, setElapsedMin] = useState(0);
  const [progress, setProgress] = useState({});
  const [openIndex, setOpenIndex] = useState(0);
  const startedAt = useRef(Date.now());
  const alreadySaved = useRef(false);

  if (!workout) return null;

  const exercises = workout.exercises || [];
  const totalSets = exercises.reduce((a, ex) => a + setsOf(ex), 0);
  const setsDone = Object.values(progress).reduce((a, n) => a + n, 0);
  const ratio = totalSets > 0 ? setsDone / totalSets : 0;

  /* Un exercice terminé se replie et ouvre le suivant encore incomplet,
     en repartant du début si des exercices précédents ont été sautés. */
  const handleSetsChange = (idx, n) => {
    const merged = { ...progress, [idx]: n };
    setProgress(merged);
    if (idx !== openIndex || n < setsOf(exercises[idx])) return;
    const incomplete = (i) => (merged[i] || 0) < setsOf(exercises[i]);
    let next = exercises.findIndex((_, i) => i > idx && incomplete(i));
    if (next === -1) next = exercises.findIndex((_, i) => incomplete(i));
    if (next !== -1) setOpenIndex(next);
  };

  /* La séance n'est enregistrée qu'ici : la sauver à l'ouverture comptait une
     séance pour un simple aller-retour sur l'écran. */
  const finishSession = async () => {
    // Déjà enregistrée : revenir à la séance puis re-terminer réaffiche le même bilan.
    if (alreadySaved.current) { setShowComplete(true); return; }

    const minutes = Math.max(1, Math.round((Date.now() - startedAt.current) / 60000));
    setElapsedMin(minutes);
    setShowComplete(true);

    if (readOnly) return;
    alreadySaved.current = true;
    try {
      await saveSession({
        workout, sessionName, level, goal, split, duration, equipments,
        elapsedMin: minutes, setsDone, totalSets,
      });
    } catch {
      alreadySaved.current = false;
      setSaveFailed(true);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />

      {/* Plus de bouton « revoir » sur l'écran de fin : le retour Android ramène à la séance. */}
      <Modal
        visible={showComplete}
        animationType="fade"
        transparent={false}
        onRequestClose={() => setShowComplete(false)}
      >
        <SessionCompleteScreen
          workout={workout}
          progress={progress}
          startedAt={startedAt.current}
          elapsedMin={elapsedMin}
          saveFailed={saveFailed}
          onGoHome={() => {
            setShowComplete(false);
            navigation.reset({ index: 0, routes: [{ name: "Main" }] });
          }}
        />
      </Modal>

      <View style={styles.header}>
        <View style={styles.headerRow}>
          <BackButton onPress={() => navigation.goBack()} />
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle} numberOfLines={1}>{workout.title?.toUpperCase()}</Text>
            <Text style={styles.headerMeta}>
              {workout.totalDuration} min · {exercises.length} exercices
            </Text>
          </View>
          {!readOnly && <ElapsedBadge startedAt={startedAt.current} />}
        </View>
        {!readOnly && (
          <View style={styles.headerProgress}>
            <ProgressBar value={ratio} height={4} />
          </View>
        )}
      </View>

      <KeyboardAwareScrollView
        contentContainerStyle={[styles.container, readOnly && { paddingBottom: 40 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        enableOnAndroid
        extraScrollHeight={120}
        enableAutomaticScroll
      >
        {workout.warmup && <PhaseBlock icon="sunrise" title="ÉCHAUFFEMENT" block={workout.warmup} />}

        <View style={{ gap: 10 }}>
          {exercises.map((ex, i) => (
            <ExerciseCard
              key={i}
              ex={ex}
              index={i}
              expanded={i === openIndex}
              onExpand={() => setOpenIndex(i)}
              onSetsChange={handleSetsChange}
            />
          ))}
        </View>

        {workout.cooldown && <PhaseBlock icon="wind" title="RETOUR AU CALME" block={workout.cooldown} />}
      </KeyboardAwareScrollView>

      {!readOnly && (
        <FooterBar>
          <PrimaryButton label="TERMINER LA SÉANCE" onPress={finishSession} />
        </FooterBar>
      )}
    </SafeAreaView>
  );
}

// ─── Styles poids ─────────────────────────────────────────────────
const ws = StyleSheet.create({
  wrap: {
    marginBottom: 14, padding: 12,
    backgroundColor: C.accentSofter, borderRadius: R.md,
    borderWidth: 1, borderColor: "rgba(200,255,0,0.22)",
  },
  head: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 8, marginBottom: 10 },
  label: { ...T.label, fontSize: 9 },
  hint: { flexShrink: 1, fontFamily: "DMSans_600SemiBold", fontSize: 11, color: C.accent, textAlign: "right" },
  row: { flexDirection: "row", alignItems: "center", gap: 8 },
  input: {
    flex: 1, height: 46, borderRadius: R.sm,
    backgroundColor: C.bg, borderWidth: 1, borderColor: C.border,
    color: C.textPrimary, fontFamily: "DMSans_700Bold", fontSize: 18,
    textAlign: "center", paddingVertical: 0, includeFontPadding: false,
  },
  unitGroup: { flexDirection: "row", backgroundColor: C.bg, borderRadius: R.sm, borderWidth: 1, borderColor: C.border, padding: 3 },
  unitBtn: { paddingHorizontal: 10, paddingVertical: 9, borderRadius: R.xs },
  unitBtnActive: { backgroundColor: C.surfaceHi },
  unitText: { fontFamily: "DMSans_600SemiBold", fontSize: 12, color: C.textMuted },
  saveBtn: {
    width: 46, height: 46, borderRadius: R.sm,
    backgroundColor: C.accent, alignItems: "center", justifyContent: "center",
  },
});

// ─── Styles écran ─────────────────────────────────────────────────
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  container: { paddingHorizontal: 20, paddingTop: 14, paddingBottom: 120 },

  header: { paddingHorizontal: 20, paddingTop: 10, paddingBottom: 12, backgroundColor: C.bg, borderBottomWidth: 1, borderColor: C.border },
  headerRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  headerTitle: { fontFamily: "BebasNeue_400Regular", fontSize: 24, color: C.textPrimary, letterSpacing: 0.5, lineHeight: 26 },
  headerMeta: { fontFamily: "DMSans_400Regular", fontSize: 12, color: C.textSecondary },
  headerProgress: { marginTop: 12 },
  elapsed: {
    borderWidth: 1, borderColor: "rgba(200,255,0,0.45)", backgroundColor: C.accentSofter,
    borderRadius: R.xs, paddingHorizontal: 8, paddingVertical: 4,
  },
  elapsedText: { fontFamily: "DMSans_700Bold", fontSize: 12, color: C.accent, letterSpacing: 0.5 },

  phase: {
    backgroundColor: C.surface, borderRadius: R.lg,
    borderWidth: 1, borderColor: C.border,
    padding: 14, marginVertical: 10,
  },
  phaseHead: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 },
  phaseLabel: { ...T.label, fontSize: 10, color: C.textPrimary },
  phaseItem: { fontFamily: "DMSans_400Regular", fontSize: 13, color: C.textSecondary, lineHeight: 20 },

  collapsed: {
    flexDirection: "row", alignItems: "center", gap: 12,
    backgroundColor: C.surface, borderRadius: R.lg,
    borderWidth: 1, borderColor: C.border,
    paddingVertical: 14, paddingHorizontal: 16,
  },
  collapsedDone: { backgroundColor: C.accentSofter, borderColor: "rgba(200,255,0,0.2)" },
  collapsedIndex: { width: 34, fontFamily: "BebasNeue_400Regular", fontSize: 22, color: C.textMuted, textAlign: "center" },
  collapsedName: { fontFamily: "BebasNeue_400Regular", fontSize: 19, color: C.textPrimary, letterSpacing: 0.3 },
  collapsedMeta: { fontFamily: "DMSans_400Regular", fontSize: 12, color: C.textMuted },

  exCard: {
    backgroundColor: C.surface, borderRadius: R.lg,
    borderWidth: 1, borderColor: C.borderHi,
    padding: 16,
    ...E.raised,
  },
  exCardDone: { borderColor: "rgba(200,255,0,0.35)" },
  exTop: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 14 },
  indexBox: {
    width: 34, height: 34, borderRadius: R.xs,
    alignItems: "center", justifyContent: "center",
    backgroundColor: C.accentSoft,
  },
  indexBoxDone: { backgroundColor: C.accent },
  indexText: { fontFamily: "BebasNeue_400Regular", fontSize: 19, color: C.accent },
  exName: { fontFamily: "BebasNeue_400Regular", fontSize: 24, color: C.textPrimary, lineHeight: 26 },
  exEquip: { fontFamily: "DMSans_400Regular", fontSize: 12, color: C.textMuted, marginTop: 1 },

  tiles: { flexDirection: "row", gap: 8, marginBottom: 12 },
  tile: {
    flex: 1, alignItems: "center", paddingVertical: 10,
    backgroundColor: C.surface2, borderRadius: R.md,
    borderWidth: 1, borderColor: C.border,
  },
  tileValue: { fontFamily: "DMSans_700Bold", fontSize: 20, color: C.accent, lineHeight: 24 },
  tileLabel: { fontFamily: "DMSans_400Regular", fontSize: 11, color: C.textMuted },

  setsRow: { flexDirection: "row", gap: 8, marginBottom: 12, flexWrap: "wrap" },
  setBtn: {
    flex: 1, minWidth: 52, height: 46, borderRadius: R.md,
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

  tipBox: {
    flexDirection: "row", alignItems: "flex-start", gap: 10, marginBottom: 10,
    backgroundColor: C.surface2, borderRadius: R.md, padding: 12,
  },
  tipText: { flex: 1, fontFamily: "DMSans_400Regular", fontSize: 13, color: C.textSecondary, lineHeight: 19 },

  videoRow: {
    flexDirection: "row", alignItems: "center", gap: 10,
    backgroundColor: C.surface2, borderRadius: R.md,
    paddingVertical: 10, paddingHorizontal: 12,
  },
  videoPlay: { width: 24, height: 24, borderRadius: 6, backgroundColor: "#FF0000", alignItems: "center", justifyContent: "center" },
  videoText: { fontFamily: "DMSans_600SemiBold", fontSize: 13, color: C.textPrimary },
});
