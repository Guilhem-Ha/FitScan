import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, ScrollView, StatusBar } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { getSessions, getWeightHistory, sessionMinutes } from "../data/storage";
import { weekSessions, weekMinutesByDay, formatDuration, personalRecord } from "../data/stats";
import { C, T, R, E } from "../theme";
import { ProgressBar, IconBadge } from "../ui/kit";

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

export default function ProgressScreen() {
  const [sessions, setSessions] = useState([]);
  const [record, setRecord] = useState(null);

  useEffect(() => {
    const load = () => {
      getSessions().then(setSessions);
      getWeightHistory().then((history) => setRecord(personalRecord(history)));
    };
    load();
    const interval = setInterval(load, 2000);
    return () => clearInterval(interval);
  }, []);

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

  muscleTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  muscleName: { fontFamily: "DMSans_600SemiBold", fontSize: 13, color: C.textPrimary },
  muscleCount: { fontFamily: "DMSans_700Bold", fontSize: 12, color: C.accent },

  recordCard: { flexDirection: "row", alignItems: "center", gap: 14 },
  recordTitle: { fontFamily: "DMSans_600SemiBold", fontSize: 14, color: C.textPrimary },
  recordSub: { ...T.small, color: C.textMuted, marginTop: 2 },
});
