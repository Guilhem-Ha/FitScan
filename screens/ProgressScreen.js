import React, { useState, useCallback } from "react";
import { useScreenRefresh } from "../hooks/useScreenRefresh";
import { View, Text, StyleSheet, ScrollView, StatusBar } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { getSessions, getWeightHistory, sessionMinutes } from "../data/storage";
import {
  weekSessions, weekMinutesByDay, formatDuration, personalRecord, weightSeries, formatDayMonth,
} from "../data/stats";
import { C, T, R, E } from "../theme";
import { ProgressBar, IconBadge, Chip } from "../ui/kit";
import LineChart from "../ui/LineChart";

const DAY_LABELS = ["L", "M", "M", "J", "V", "S", "D"];
const CHART_HEIGHT = 84;

function WeekChart({ sessions }) {
  const byDay = weekMinutesByDay(sessions);
  const max = Math.max(...byDay, 1);
  const today = (new Date().getDay() + 6) % 7;
  const diff = weekSessions(sessions).length - weekSessions(sessions, 1).length;

  return (
    <View style={styles.card}>
      <View style={styles.cardHead}>
        <Text style={styles.cardLabel}>CETTE SEMAINE</Text>
        <Text style={[styles.diff, diff <= 0 && { color: C.textMuted }]}>
          {diff === 0 ? "= sem. dernière" : `${diff > 0 ? "+" : "−"}${Math.abs(diff)} vs. sem. dernière`}
        </Text>
      </View>
      <View style={styles.chart}>
        {byDay.map((minutes, i) => (
          <View key={i} style={styles.chartCol}>
            <View style={styles.barSlot}>
              <View
                style={[
                  styles.bar,
                  {
                    height: minutes > 0 ? Math.max(10, (minutes / max) * CHART_HEIGHT) : 10,
                    backgroundColor: minutes > 0 ? C.accent : C.surface2,
                  },
                ]}
              />
            </View>
            <Text style={[styles.dayLabel, i === today && { color: C.textPrimary }]}>{DAY_LABELS[i]}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function StatTile({ value, label }) {
  return (
    <View style={styles.tile}>
      <Text style={styles.tileValue} numberOfLines={1} adjustsFontSizeToFit>{value}</Text>
      <Text style={styles.tileLabel}>{label}</Text>
    </View>
  );
}

/* Courbe de la charge maximale notée par jour, pour l'exercice choisi.
   Les exercices sont rangés du plus récemment travaillé au plus ancien. */
function WeightTracking({ history }) {
  const [selected, setSelected] = useState(null);
  const exercises = Object.entries(history)
    .filter(([, entries]) => entries?.length)
    .sort((a, b) => new Date(b[1][0].date) - new Date(a[1][0].date))
    .map(([name]) => name);

  if (exercises.length === 0) return null;

  const current = exercises.includes(selected) ? selected : exercises[0];
  const series = weightSeries(history[current]);
  const first = series[0];
  const last = series[series.length - 1];
  const delta = Math.round((last.kg - first.kg) * 10) / 10;
  const values = series.map((p) => p.kg);

  return (
    <View style={styles.card}>
      <Text style={[styles.cardLabel, { marginBottom: 12 }]}>SUIVI DES CHARGES</Text>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chips}
        style={styles.chipsScroll}
      >
        {exercises.map((name) => (
          <Chip key={name} label={name} active={name === current} onPress={() => setSelected(name)} />
        ))}
      </ScrollView>

      <View style={styles.weightHead}>
        <Text style={styles.weightValue}>{last.kg} KG</Text>
        {series.length > 1 ? (
          <View style={[styles.deltaPill, delta <= 0 && styles.deltaPillFlat]}>
            <Text style={[styles.deltaText, delta <= 0 && { color: C.textSecondary }]}>
              {delta === 0
                ? `Stable depuis le ${formatDayMonth(first.date)}`
                : `${delta > 0 ? "+" : "−"}${Math.abs(delta)} kg depuis le ${formatDayMonth(first.date)}`}
            </Text>
          </View>
        ) : null}
      </View>

      {series.length > 1 ? (
        <>
          <LineChart values={values} height={130} />
          <View style={styles.axis}>
            <Text style={styles.axisText}>{formatDayMonth(first.date)}</Text>
            <Text style={styles.axisText}>{Math.min(...values)} – {Math.max(...values)} kg</Text>
            <Text style={styles.axisText}>{formatDayMonth(last.date)}</Text>
          </View>
        </>
      ) : (
        <Text style={styles.weightHint}>
          Note une charge pour cet exercice lors d'une autre séance pour voir ta courbe.
        </Text>
      )}
    </View>
  );
}

export default function ProgressScreen({ isActive = true }) {
  const [sessions, setSessions] = useState([]);
  const [history, setHistory] = useState({});

  const load = useCallback(() => {
    getSessions().then(setSessions);
    getWeightHistory().then(setHistory);
  }, []);
  useScreenRefresh(load, isActive);

  const record = personalRecord(history);
  const week = weekSessions(sessions);
  const weekMinutes = week.reduce((a, s) => a + sessionMinutes(s), 0);
  const weekExercises = week.reduce((a, s) => a + (s.workout?.exercises?.length || 0), 0);

  const muscleCount = {};
  sessions.forEach((s) => {
    s.workout?.exercises?.forEach((ex) => {
      ex.muscles?.forEach((m) => {
        const key = m.charAt(0).toUpperCase() + m.slice(1).toLowerCase();
        muscleCount[key] = (muscleCount[key] || 0) + 1;
      });
    });
  });
  const topMuscles = Object.entries(muscleCount).sort((a, b) => b[1] - a[1]).slice(0, 5);
  const maxMuscle = topMuscles[0]?.[1] || 1;

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <Text style={styles.eyebrow}>MES STATS</Text>
        <Text style={styles.title}>PROGRÈS</Text>

        {sessions.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>AUCUNE DONNÉE</Text>
            <Text style={styles.emptyBody}>Termine ta première séance pour voir tes statistiques.</Text>
          </View>
        ) : (
          <>
            <WeekChart sessions={sessions} />

            <View style={styles.tiles}>
              <StatTile value={week.length} label="Séances" />
              <StatTile value={formatDuration(weekMinutes)} label="Entraînement" />
              <StatTile value={weekExercises} label="Exercices" />
            </View>

            <WeightTracking history={history} />

            {topMuscles.length > 0 && (
              <View style={styles.card}>
                <Text style={[styles.cardLabel, { marginBottom: 14 }]}>RÉPARTITION MUSCULAIRE</Text>
                <View style={{ gap: 12 }}>
                  {topMuscles.map(([muscle, count]) => (
                    <View key={muscle} style={{ gap: 6 }}>
                      <View style={styles.muscleTop}>
                        <Text style={styles.muscleName}>{muscle}</Text>
                        <Text style={styles.muscleCount}>{count}</Text>
                      </View>
                      <ProgressBar value={count / maxMuscle} height={5} trackColor={C.surface2} />
                    </View>
                  ))}
                </View>
              </View>
            )}

            {record && (
              <View style={[styles.card, styles.recordCard]}>
                <IconBadge name="trophy-outline" family="mci" size={42} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.recordTitle}>Record : {record.weightKg} kg au {record.exercise}</Text>
                  <Text style={styles.recordSub}>
                    {record.deltaKg > 0
                      ? `+${record.deltaKg} kg depuis la dernière séance`
                      : record.deltaKg < 0
                        ? `${record.deltaKg} kg depuis la dernière séance`
                        : "Ta charge la plus lourde notée"}
                  </Text>
                </View>
              </View>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  container: { paddingHorizontal: 24, paddingTop: 20, paddingBottom: 40 },

  eyebrow: { ...T.label, color: C.accent, marginBottom: 2 },
  title: { fontFamily: "BebasNeue_400Regular", fontSize: 50, color: C.textPrimary, letterSpacing: 2, lineHeight: 52, marginBottom: 16 },

  empty: { paddingTop: 16 },
  emptyTitle: { fontFamily: "BebasNeue_400Regular", fontSize: 34, color: C.textPrimary, letterSpacing: 1.5, marginBottom: 8 },
  emptyBody: { ...T.body, maxWidth: 280 },

  card: {
    backgroundColor: C.surface, borderRadius: R.lg,
    borderWidth: 1, borderColor: C.border,
    padding: 16, marginBottom: 12,
    ...E.raised,
  },
  cardHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 14 },
  cardLabel: { ...T.label, fontSize: 10 },
  diff: { fontFamily: "DMSans_600SemiBold", fontSize: 11, color: C.accent },

  chart: { flexDirection: "row", gap: 8 },
  chartCol: { flex: 1, alignItems: "center", gap: 6 },
  barSlot: { height: CHART_HEIGHT, justifyContent: "flex-end", alignSelf: "stretch" },
  bar: { borderRadius: 6 },
  dayLabel: { fontFamily: "DMSans_600SemiBold", fontSize: 10, color: C.textMuted },

  tiles: { flexDirection: "row", gap: 8, marginBottom: 12 },
  tile: {
    flex: 1, paddingVertical: 14, paddingHorizontal: 12,
    backgroundColor: C.surface, borderRadius: R.md,
    borderWidth: 1, borderColor: C.border,
  },
  tileValue: { fontFamily: "BebasNeue_400Regular", fontSize: 30, color: C.accent, lineHeight: 32 },
  tileLabel: { ...T.small, fontSize: 11, color: C.textMuted },

  chipsScroll: { marginHorizontal: -16, marginBottom: 14 },
  chips: { gap: 6, paddingHorizontal: 16 },
  weightHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10, marginBottom: 8 },
  weightValue: { fontFamily: "BebasNeue_400Regular", fontSize: 36, color: C.textPrimary, letterSpacing: 0.5, lineHeight: 38 },
  deltaPill: { flexShrink: 1, backgroundColor: C.accentSoft, borderRadius: R.pill, paddingHorizontal: 10, paddingVertical: 4 },
  deltaPillFlat: { backgroundColor: C.surface2 },
  deltaText: { fontFamily: "DMSans_600SemiBold", fontSize: 11, color: C.accent },
  axis: { flexDirection: "row", justifyContent: "space-between", marginTop: 6 },
  axisText: { fontFamily: "DMSans_400Regular", fontSize: 11, color: C.textMuted },
  weightHint: { ...T.small, color: C.textMuted, lineHeight: 17 },

  muscleTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  muscleName: { fontFamily: "DMSans_600SemiBold", fontSize: 13, color: C.textPrimary },
  muscleCount: { fontFamily: "DMSans_700Bold", fontSize: 12, color: C.accent },

  recordCard: { flexDirection: "row", alignItems: "center", gap: 14 },
  recordTitle: { fontFamily: "DMSans_600SemiBold", fontSize: 14, color: C.textPrimary },
  recordSub: { ...T.small, color: C.textMuted, marginTop: 2 },
});
