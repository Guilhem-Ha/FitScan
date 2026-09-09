import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, ScrollView, StatusBar } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { getSessions, sessionMinutes } from "../data/storage";
import { C, T, R, E } from "../theme";
import { Card, SectionLabel, ProgressBar, IconBadge } from "../ui/kit";

const GOAL_LABELS = { force: "FORCE", cardio: "CARDIO", mixte: "MIXTE" };

function StatBox({ value, label, icon }) {
  return (
    <View style={styles.statBox}>
      <Feather name={icon} size={14} color={C.accent} />
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function MuscleBar({ muscle, count, max }) {
  const pct = max > 0 ? count / max : 0;
  return (
    <View style={styles.muscleRow}>
      <View style={styles.muscleTop}>
        <Text style={styles.muscleName}>{muscle}</Text>
        <Text style={styles.muscleCount}>{count}</Text>
      </View>
      <ProgressBar value={pct} height={6} />
    </View>
  );
}

export default function ProgressScreen() {
  const [sessions, setSessions] = useState([]);

  useEffect(() => {
    getSessions().then(setSessions);
    const interval = setInterval(() => getSessions().then(setSessions), 2000);
    return () => clearInterval(interval);
  }, []);

  const totalSessions = sessions.length;
  const totalMinutes = sessions.reduce((a, s) => a + sessionMinutes(s), 0);
  const totalExercices = sessions.reduce((a, s) => a + (s.workout?.exercises?.length || 0), 0);

  const now = new Date();
  const thisWeek = sessions.filter((s) => (now - new Date(s.date)) / 864e5 <= 7).length;

  const goalCount = sessions.reduce((acc, s) => { acc[s.goal] = (acc[s.goal] || 0) + 1; return acc; }, {});
  const topGoal = Object.entries(goalCount).sort((a, b) => b[1] - a[1])[0]?.[0];

  const muscleCount = {};
  sessions.forEach((s) => {
    s.workout?.exercises?.forEach((ex) => {
      ex.muscles?.forEach((m) => {
        const key = m.charAt(0).toUpperCase() + m.slice(1).toLowerCase();
        muscleCount[key] = (muscleCount[key] || 0) + 1;
      });
    });
  });
  const topMuscles = Object.entries(muscleCount).sort((a, b) => b[1] - a[1]).slice(0, 6);
  const maxMuscle = topMuscles[0]?.[1] || 1;

  const lastSession = sessions[0];
  const daysSinceLast = lastSession ? Math.floor((now - new Date(lastSession.date)) / 864e5) : null;

  const summary = [
    { icon: "check-circle", value: totalSessions, label: "Séances complétées" },
    { icon: "clock", value: Math.round(totalMinutes / 60) + "h", label: "D'entraînement" },
    topGoal && { icon: "target", value: GOAL_LABELS[topGoal] || topGoal, label: "Objectif principal" },
    daysSinceLast !== null && {
      icon: "calendar",
      value: daysSinceLast === 0 ? "Aujourd'hui" : "J-" + daysSinceLast,
      label: "Dernière séance",
    },
  ].filter(Boolean);

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text style={styles.eyebrow}>MES STATS</Text>
            <Text style={styles.title}>PROGRÈS</Text>
          </View>
          <IconBadge name="trending-up" size={46} />
        </View>

        {totalSessions === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>AUCUNE{"\n"}DONNÉE</Text>
            <Text style={styles.emptyBody}>Complète ta première séance pour voir tes statistiques.</Text>
          </View>
        ) : (
          <View style={styles.body}>
            <SectionLabel accent>CETTE SEMAINE</SectionLabel>
            <View style={styles.statsRow}>
              <StatBox icon="activity" value={thisWeek} label="SÉANCES" />
              <StatBox icon="clock" value={totalMinutes} label="MIN TOTAL" />
              <StatBox icon="list" value={totalExercices} label="EXERCICES" />
            </View>

            <SectionLabel style={styles.sectionSpaced}>TOTAL</SectionLabel>
            <Card style={{ padding: 0 }}>
              {summary.map((it, i) => (
                <View key={it.label} style={[styles.summaryItem, i === summary.length - 1 && { borderBottomWidth: 0 }]}>
                  <View style={styles.summaryLeft}>
                    <Feather name={it.icon} size={15} color={C.textMuted} />
                    <Text style={styles.summaryLabel}>{it.label}</Text>
                  </View>
                  <Text style={styles.summaryValue}>{it.value}</Text>
                </View>
              ))}
            </Card>

            {topMuscles.length > 0 && (
              <>
                <SectionLabel style={styles.sectionSpaced}>MUSCLES LES PLUS TRAVAILLÉS</SectionLabel>
                <Card style={{ gap: 16 }}>
                  {topMuscles.map(([muscle, count]) => (
                    <MuscleBar key={muscle} muscle={muscle} count={count} max={maxMuscle} />
                  ))}
                </Card>
              </>
            )}

            <SectionLabel style={styles.sectionSpaced}>HISTORIQUE RÉCENT</SectionLabel>
            <View style={{ gap: 10 }}>
              {sessions.slice(0, 5).map((s, i) => (
                <Card key={i} style={styles.historyRow}>
                  <View style={styles.historyLeft}>
                    <Text style={styles.historyTitle} numberOfLines={1}>{s.workout?.title?.toUpperCase()}</Text>
                    <Text style={styles.historyMeta}>
                      {new Date(s.date).toLocaleDateString("fr-FR", { day: "numeric", month: "short" }).toUpperCase()}
                      {" · "}{sessionMinutes(s)} MIN{" · "}{s.workout?.exercises?.length} EX.
                    </Text>
                  </View>
                  <View style={styles.historyTag}>
                    <Text style={styles.historyGoal}>{GOAL_LABELS[s.goal] || s.goal}</Text>
                  </View>
                </Card>
              ))}
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  container: { paddingBottom: 48 },

  header: { flexDirection: "row", alignItems: "center", gap: 16, paddingHorizontal: 24, paddingTop: 24, paddingBottom: 24 },
  eyebrow: { ...T.label, color: C.accent, marginBottom: 4 },
  title: { fontFamily: "BebasNeue_400Regular", fontSize: 56, color: C.textPrimary, letterSpacing: 3, lineHeight: 56 },

  body: { paddingHorizontal: 24 },
  sectionSpaced: { marginTop: 28 },

  empty: { paddingHorizontal: 24, paddingTop: 40 },
  emptyTitle: { fontFamily: "BebasNeue_400Regular", fontSize: 48, color: C.textPrimary, letterSpacing: 2, lineHeight: 48, marginBottom: 12 },
  emptyBody: { ...T.body, maxWidth: 260 },

  statsRow: { flexDirection: "row", gap: 10 },
  statBox: {
    flex: 1, alignItems: "center", gap: 4, paddingVertical: 18,
    backgroundColor: C.surface, borderRadius: R.md,
    borderWidth: 1, borderColor: C.border, ...E.raised,
  },
  statValue: { fontFamily: "BebasNeue_400Regular", fontSize: 34, color: C.accent, lineHeight: 36 },
  statLabel: { ...T.label, fontSize: 9 },

  summaryItem: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    paddingHorizontal: 18, paddingVertical: 15,
    borderBottomWidth: 1, borderColor: C.border,
  },
  summaryLeft: { flexDirection: "row", alignItems: "center", gap: 10 },
  summaryLabel: { ...T.body, fontSize: 14 },
  summaryValue: { fontFamily: "BebasNeue_400Regular", fontSize: 22, color: C.textPrimary, letterSpacing: 0.5 },

  muscleRow: { gap: 7 },
  muscleTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  muscleName: { fontFamily: "DMSans_600SemiBold", fontSize: 13, color: C.textPrimary },
  muscleCount: { fontFamily: "DMSans_600SemiBold", fontSize: 12, color: C.textMuted },

  historyRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 14, paddingHorizontal: 18 },
  historyLeft: { flex: 1, marginRight: 12 },
  historyTitle: { fontFamily: "BebasNeue_400Regular", fontSize: 19, color: C.textPrimary, letterSpacing: 0.5 },
  historyMeta: { ...T.label, fontSize: 10, color: C.textMuted, marginTop: 3 },
  historyTag: { backgroundColor: C.accentSoft, borderRadius: R.pill, paddingHorizontal: 10, paddingVertical: 4 },
  historyGoal: { ...T.label, fontSize: 9, color: C.accent, letterSpacing: 1.2 },
});
