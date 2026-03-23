import React, { useState, useEffect, useRef } from "react";
import {
  View, Text, StyleSheet, ScrollView, StatusBar,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { getSessions } from "../data/storage";
import { C, T } from "../theme";

const GOAL_LABELS = { force: "FORCE", cardio: "CARDIO", mixte: "MIXTE" };
const MUSCLE_GROUPS = ["Pectoraux", "Dos", "Biceps", "Triceps", "Épaules", "Abdominaux", "Quadriceps", "Ischio-jambiers", "Fessiers", "Mollets"];

function StatBox({ value, label }) {
  return (
    <View style={styles.statBox}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function MuscleBar({ muscle, count, max }) {
  const pct = max > 0 ? count / max : 0;
  return (
    <View style={styles.muscleRow}>
      <Text style={styles.muscleName}>{muscle}</Text>
      <View style={styles.barBg}>
        <View style={[styles.barFill, { width: `${pct * 100}%` }]} />
      </View>
      <Text style={styles.muscleCount}>{count}</Text>
    </View>
  );
}

export default function ProgressScreen() {
  const [sessions, setSessions] = useState([]);

  // Recharge les données toutes les 2s pour rester synchronisé
  useEffect(() => {
    getSessions().then(setSessions);
    const interval = setInterval(() => {
      getSessions().then(setSessions);
    }, 2000);
    return () => clearInterval(interval);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Stats calculées
  const totalSessions = sessions.length;
  const totalMinutes = sessions.reduce((acc, s) => acc + (s.workout?.totalDuration || 0), 0);
  const totalExercices = sessions.reduce((acc, s) => acc + (s.workout?.exercises?.length || 0), 0);

  // Streak hebdomadaire
  const now = new Date();
  const thisWeek = sessions.filter((s) => {
    const d = new Date(s.date);
    const diff = (now - d) / (1000 * 60 * 60 * 24);
    return diff <= 7;
  }).length;

  // Objectif le plus fréquent
  const goalCount = sessions.reduce((acc, s) => {
    acc[s.goal] = (acc[s.goal] || 0) + 1;
    return acc;
  }, {});
  const topGoal = Object.entries(goalCount).sort((a, b) => b[1] - a[1])[0]?.[0];

  // Muscles les plus travaillés
  const muscleCount = {};
  sessions.forEach((s) => {
    s.workout?.exercises?.forEach((ex) => {
      ex.muscles?.forEach((m) => {
        const key = m.charAt(0).toUpperCase() + m.slice(1).toLowerCase();
        muscleCount[key] = (muscleCount[key] || 0) + 1;
      });
    });
  });
  const topMuscles = Object.entries(muscleCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6);
  const maxMuscle = topMuscles[0]?.[1] || 1;

  // Dernière séance
  const lastSession = sessions[0];
  const daysSinceLast = lastSession
    ? Math.floor((now - new Date(lastSession.date)) / (1000 * 60 * 60 * 24))
    : null;

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>

        <Text style={styles.eyebrow}>MES STATS</Text>
        <Text style={styles.title}>PROGRÈS</Text>

        <View style={styles.divider} />

        {totalSessions === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>AUCUNE{"\n"}DONNÉE</Text>
            <Text style={styles.emptyBody}>Complète ta première séance pour voir tes statistiques.</Text>
          </View>
        ) : (
          <>
            {/* Stats principales */}
            <Text style={styles.sectionLabel}>CETTE SEMAINE</Text>
            <View style={styles.statsRow}>
              <StatBox value={thisWeek} label="SÉANCES" />
              <StatBox value={`${totalMinutes}`} label="MIN TOTAL" />
              <StatBox value={totalExercices} label="EXERCICES" />
            </View>

            <View style={styles.divider} />

            {/* Résumé global */}
            <Text style={styles.sectionLabel}>TOTAL</Text>
            <View style={styles.summaryGrid}>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryValue}>{totalSessions}</Text>
                <Text style={styles.summaryLabel}>Séances complétées</Text>
              </View>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryValue}>{Math.round(totalMinutes / 60)}h</Text>
                <Text style={styles.summaryLabel}>D'entraînement</Text>
              </View>
              {topGoal && (
                <View style={styles.summaryItem}>
                  <Text style={styles.summaryValue}>{GOAL_LABELS[topGoal] || topGoal}</Text>
                  <Text style={styles.summaryLabel}>Objectif principal</Text>
                </View>
              )}
              {daysSinceLast !== null && (
                <View style={styles.summaryItem}>
                  <Text style={styles.summaryValue}>
                    {daysSinceLast === 0 ? "Aujourd'hui" : `J-${daysSinceLast}`}
                  </Text>
                  <Text style={styles.summaryLabel}>Dernière séance</Text>
                </View>
              )}
            </View>

            <View style={styles.divider} />

            {/* Muscles les plus travaillés */}
            {topMuscles.length > 0 && (
              <>
                <Text style={styles.sectionLabel}>MUSCLES LES PLUS TRAVAILLÉS</Text>
                <View style={styles.muscleList}>
                  {topMuscles.map(([muscle, count]) => (
                    <MuscleBar key={muscle} muscle={muscle} count={count} max={maxMuscle} />
                  ))}
                </View>
                <View style={styles.divider} />
              </>
            )}

            {/* Historique récent */}
            <Text style={styles.sectionLabel}>HISTORIQUE RÉCENT</Text>
            {sessions.slice(0, 5).map((s, i) => (
              <View key={i} style={styles.historyRow}>
                <View style={styles.historyLeft}>
                  <Text style={styles.historyTitle} numberOfLines={1}>{s.workout?.title?.toUpperCase()}</Text>
                  <Text style={styles.historyMeta}>
                    {new Date(s.date).toLocaleDateString("fr-FR", { day: "numeric", month: "short" }).toUpperCase()}
                    {" · "}{s.workout?.totalDuration} MIN
                    {" · "}{s.workout?.exercises?.length} EX.
                  </Text>
                </View>
                <Text style={styles.historyGoal}>{GOAL_LABELS[s.goal] || s.goal}</Text>
              </View>
            ))}
          </>
        )}

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  container: { paddingBottom: 40 },

  eyebrow: { ...T.label, color: C.accent, paddingHorizontal: 24, paddingTop: 24, marginBottom: 4 },
  title: { fontFamily: "BebasNeue_400Regular", fontSize: 56, color: C.textPrimary, letterSpacing: 3, lineHeight: 56, paddingHorizontal: 24 },
  divider: { height: 1, backgroundColor: C.border, marginHorizontal: 24, marginVertical: 24 },
  sectionLabel: { ...T.label, paddingHorizontal: 24, marginBottom: 16 },

  empty: { paddingHorizontal: 24, paddingTop: 40 },
  emptyTitle: { fontFamily: "BebasNeue_400Regular", fontSize: 48, color: C.textPrimary, letterSpacing: 2, lineHeight: 48, marginBottom: 12 },
  emptyBody: { ...T.body, maxWidth: 260 },

  statsRow: { flexDirection: "row", paddingHorizontal: 24, gap: 0 },
  statBox: { flex: 1, alignItems: "center", paddingVertical: 20, backgroundColor: C.surface, marginRight: 2 },
  statValue: { fontFamily: "BebasNeue_400Regular", fontSize: 36, color: C.accent, lineHeight: 38 },
  statLabel: { ...T.label, fontSize: 9, marginTop: 4 },

  summaryGrid: { paddingHorizontal: 24, gap: 16 },
  summaryItem: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 12, borderBottomWidth: 1, borderColor: C.border },
  summaryValue: { fontFamily: "BebasNeue_400Regular", fontSize: 22, color: C.textPrimary },
  summaryLabel: { ...T.body, fontSize: 14 },

  muscleList: { paddingHorizontal: 24, gap: 12 },
  muscleRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  muscleName: { fontFamily: "DMSans_400Regular", fontSize: 13, color: C.textSecondary, width: 110 },
  barBg: { flex: 1, height: 3, backgroundColor: C.border },
  barFill: { height: "100%", backgroundColor: C.accent },
  muscleCount: { fontFamily: "DMSans_600SemiBold", fontSize: 12, color: C.textMuted, width: 20, textAlign: "right" },

  historyRow: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 24, paddingVertical: 14,
    borderBottomWidth: 1, borderColor: C.border,
  },
  historyLeft: { flex: 1, marginRight: 12 },
  historyTitle: { fontFamily: "BebasNeue_400Regular", fontSize: 18, color: C.textPrimary, letterSpacing: 0.5 },
  historyMeta: { ...T.label, fontSize: 10, color: C.textMuted, marginTop: 3 },
  historyGoal: { ...T.label, fontSize: 10, color: C.accent },
});