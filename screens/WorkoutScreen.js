import React, { useEffect, useState, useRef } from "react";
import { View, Text, StyleSheet, Modal, StatusBar, Linking, TextInput } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { saveSession, saveWeight, getLastWeight, sessionMinutes } from "../data/storage";
import { performedVolumeKg, formatKg } from "../data/stats";
import { C, T, R, E } from "../theme";
import { Press, PrimaryButton, ProgressBar, BackButton, FooterBar } from "../ui/kit";
import RestTimerScreen from "./RestTimerScreen";
import SessionCompleteScreen from "./SessionCompleteScreen";

const setsOf = (ex) => ex?.sets || 3;
const pad2 = (n) => String(n).padStart(2, "0");
const formatDate = (iso) =>
  new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "short" });

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
function WeightSelector({ exerciseName, lastWeight, suggestedWeight, onSaved }) {
  const [weight, setWeight] = useState("");
  const [unit, setUnit] = useState("kg");
  const [saved, setSaved] = useState(false);

  const handleSave = async () => {
    const value = parseFloat(String(weight).replace(",", "."));
    if (!Number.isFinite(value)) return;
    await saveWeight(exerciseName, value, unit);
    onSaved?.({ weight: value, unit });
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
/* En historique (readOnly), `performed` vient de la séance enregistrée : les séries
   cochées sont figées et la charge notée remplace le champ de saisie. */
function ExerciseCard({ ex, index, expanded, onToggle, onSetsChange, onWeightSaved, readOnly, performed }) {
  const totalSets = setsOf(ex);
  const [done, setDone] = useState(() =>
    readOnly && performed
      ? Array.from({ length: Math.min(performed.setsDone || 0, totalSets) }, (_, i) => i)
      : []
  );
  const [timerSet, setTimerSet] = useState(null);
  const [lastWeight, setLastWeight] = useState(null);
  const allDone = done.length === totalSets;
  const usedWeight = performed?.weight;

  useEffect(() => {
    if (ex.requiresWeight && !readOnly) getLastWeight(ex.name).then(setLastWeight);
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
  const timer = readOnly ? null : (
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
    const meta = readOnly && performed
      ? `${performed.setsDone || 0}/${totalSets} séries${usedWeight ? ` · ${usedWeight.weight} ${usedWeight.unit}` : ""}`
      : `${ex.sets} × ${ex.reps} · ${ex.rest}s${done.length > 0 && !allDone ? ` · ${done.length}/${totalSets} séries` : ""}`;
    return (
      <>
        {timer}
        <Press style={[styles.collapsed, allDone && styles.collapsedDone]} onPress={onToggle} scaleTo={0.985}>
          {allDone ? (
            <View style={[styles.indexBox, styles.indexBoxDone]}>
              <Feather name="check" size={16} color={C.bg} />
            </View>
          ) : (
            <Text style={styles.collapsedIndex}>{pad2(index + 1)}</Text>
          )}
          <View style={{ flex: 1 }}>
            <Text style={[styles.collapsedName, allDone && !readOnly && { color: C.textSecondary }]} numberOfLines={1}>
              {ex.name.toUpperCase()}
            </Text>
            <Text style={[styles.collapsedMeta, readOnly && performed && { color: C.textSecondary }]}>{meta}</Text>
          </View>
          <Feather name="chevron-down" size={18} color={C.textMuted} />
        </Press>
      </>
    );
  }

  return (
    <View style={[styles.exCard, allDone && styles.exCardDone]}>
      {timer}

      <Press style={styles.exTop} onPress={onToggle} scaleTo={0.99}>
        <View style={[styles.indexBox, allDone && styles.indexBoxDone]}>
          {allDone
            ? <Feather name="check" size={16} color={C.bg} />
            : <Text style={styles.indexText}>{pad2(index + 1)}</Text>}
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.exName}>{ex.name.toUpperCase()}</Text>
          {ex.equipment ? <Text style={styles.exEquip}>{ex.equipment}</Text> : null}
        </View>
        <Feather name="chevron-up" size={18} color={C.textMuted} />
      </Press>

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

      {readOnly ? (
        usedWeight ? (
          <View style={[ws.wrap, ws.readOnlyRow]}>
            <Text style={ws.label}>POIDS UTILISÉ</Text>
            <Text style={ws.readOnlyValue}>{usedWeight.weight} {usedWeight.unit}</Text>
          </View>
        ) : null
      ) : ex.requiresWeight ? (
        <WeightSelector
          exerciseName={ex.name}
          lastWeight={lastWeight}
          suggestedWeight={suggestedWeight}
          onSaved={(w) => onWeightSaved?.(index, w)}
        />
      ) : null}

      <View style={styles.setsRow}>
        {Array.from({ length: totalSets }).map((_, i) => {
          const isDone = done.includes(i);
          const content = isDone
            ? <Feather name="check" size={18} color={C.bg} />
            : <Text style={styles.setBtnText}>{i + 1}</Text>;
          return readOnly ? (
            <View key={i} style={[styles.setBtn, isDone && styles.setBtnDoneStatic]}>{content}</View>
          ) : (
            <Press key={i} style={[styles.setBtn, isDone && styles.setBtnDone]} onPress={() => toggleSet(i)} scaleTo={0.9}>
              {content}
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

// Résumé d'une séance passée, calculé sur ce qui a réellement été fait.
function HistorySummary({ exercises, performed }) {
  if (!performed) {
    return (
      <View style={styles.legacyNote}>
        <Feather name="info" size={14} color={C.textMuted} />
        <Text style={styles.legacyText}>
          Le détail des séries n'était pas encore enregistré pour cette séance : seul le programme prévu s'affiche.
        </Text>
      </View>
    );
  }
  const plannedSets = exercises.reduce((a, ex) => a + setsOf(ex), 0);
  const doneSets = performed.reduce((a, p) => a + (p?.setsDone || 0), 0);
  const exercisesDone = exercises.filter((ex, i) => (performed[i]?.setsDone || 0) >= setsOf(ex)).length;
  const volume = performedVolumeKg(exercises, performed);

  return (
    <View style={styles.summary}>
      {[
        [`${doneSets}/${plannedSets}`, "Séries"],
        [`${exercisesDone}/${exercises.length}`, "Exercices"],
        [volume > 0 ? `${formatKg(volume)} kg` : "—", "Volume"],
      ].map(([value, label]) => (
        <View key={label} style={styles.summaryTile}>
          <Text style={styles.summaryValue} numberOfLines={1} adjustsFontSizeToFit>{value}</Text>
          <Text style={styles.summaryLabel}>{label}</Text>
        </View>
      ))}
    </View>
  );
}

// ─── Écran ────────────────────────────────────────────────────────
export default function WorkoutScreen({ navigation, route }) {
  const { workout, session, sessionName, level, goal, split, duration, equipments, readOnly } = route?.params || {};
  const [showComplete, setShowComplete] = useState(false);
  const [saveFailed, setSaveFailed] = useState(false);
  const [elapsedMin, setElapsedMin] = useState(0);
  const [progress, setProgress] = useState({});
  const [weights, setWeights] = useState({});
  const [completed, setCompleted] = useState([]);
  // En historique tout est replié : on parcourt le récapitulatif, puis on ouvre ce qu'on veut.
  const [openIndex, setOpenIndex] = useState(readOnly ? -1 : 0);
  const startedAt = useRef(Date.now());
  const alreadySaved = useRef(false);

  if (!workout) return null;

  const exercises = workout.exercises || [];
  const performedHistory = readOnly ? session?.performed : null;
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
    // Ce qui a vraiment été fait, exercice par exercice, pour l'historique.
    const performed = exercises.map((_, i) => ({ setsDone: progress[i] || 0, weight: weights[i] || null }));
    setElapsedMin(minutes);
    setCompleted(performed);
    setShowComplete(true);

    if (readOnly) return;
    alreadySaved.current = true;
    try {
      await saveSession({
        workout, sessionName, level, goal, split, duration, equipments,
        elapsedMin: minutes, setsDone, totalSets, performed,
      });
    } catch {
      alreadySaved.current = false;
      setSaveFailed(true);
    }
  };

  const headerMeta = readOnly && session
    ? `${formatDate(session.date)} · ${sessionMinutes(session)} min · ${exercises.length} exercices`
    : `${workout.totalDuration} min · ${exercises.length} exercices`;

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
          performed={completed}
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
            <Text style={styles.headerMeta}>{headerMeta}</Text>
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
        {readOnly && <HistorySummary exercises={exercises} performed={performedHistory} />}

        {workout.warmup && <PhaseBlock icon="sunrise" title="ÉCHAUFFEMENT" block={workout.warmup} />}

        <View style={{ gap: 10 }}>
          {exercises.map((ex, i) => (
            <ExerciseCard
              key={i}
              ex={ex}
              index={i}
              readOnly={readOnly}
              performed={performedHistory?.[i]}
              expanded={i === openIndex}
              onToggle={() => setOpenIndex(i === openIndex ? -1 : i)}
              onSetsChange={handleSetsChange}
              onWeightSaved={(idx, w) => setWeights((prev) => ({ ...prev, [idx]: w }))}
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
  readOnlyRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  readOnlyValue: { fontFamily: "BebasNeue_400Regular", fontSize: 24, color: C.accent, letterSpacing: 0.5 },
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

  summary: { flexDirection: "row", gap: 8, marginBottom: 4 },
  summaryTile: {
    flex: 1, paddingVertical: 12, paddingHorizontal: 12,
    backgroundColor: C.surface, borderRadius: R.md,
    borderWidth: 1, borderColor: C.border,
  },
  summaryValue: { fontFamily: "BebasNeue_400Regular", fontSize: 26, color: C.accent, lineHeight: 28 },
  summaryLabel: { ...T.small, fontSize: 11, color: C.textMuted },
  legacyNote: {
    flexDirection: "row", alignItems: "flex-start", gap: 10,
    backgroundColor: C.surface, borderRadius: R.md,
    borderWidth: 1, borderColor: C.border, padding: 12, marginBottom: 4,
  },
  legacyText: { flex: 1, fontFamily: "DMSans_400Regular", fontSize: 12, color: C.textSecondary, lineHeight: 17 },

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
  setBtnDoneStatic: { backgroundColor: C.accent, borderColor: C.accent },
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
