import React, { useState, useEffect, useRef } from "react";
import { View, Text, StyleSheet, FlatList, StatusBar, Animated, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { Feather } from "@expo/vector-icons";
import { getSessions, deleteSession, sessionMinutes } from "../data/storage";
import { C, T, R, E } from "../theme";
import { Press, PrimaryButton, SectionLabel, IconBadge } from "../ui/kit";

const GOAL_LABELS = { force: "FORCE", cardio: "CARDIO", mixte: "MIXTE" };
const LEVEL_LABELS = { debutant: "DÉBUTANT", intermediaire: "INTER", avance: "AVANCÉ" };

function formatDate(iso) {
  return new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "short" }).toUpperCase();
}

function SessionCard({ item, onPress, onDelete }) {
  const [deleteMode, setDeleteMode] = useState(false);
  const anim = useRef(new Animated.Value(0)).current;

  const showDelete = () => {
    setDeleteMode(true);
    Animated.timing(anim, { toValue: 1, duration: 250, useNativeDriver: false }).start();
  };
  const hideDelete = () => {
    Animated.timing(anim, { toValue: 0, duration: 200, useNativeDriver: false }).start(() => setDeleteMode(false));
  };

  const bgColor = anim.interpolate({ inputRange: [0, 1], outputRange: [C.surface, C.red] });

  return (
    <Animated.View style={[styles.cardWrap, { backgroundColor: bgColor }]}>
      {!deleteMode ? (
        <Press style={styles.cardContent} onPress={onPress} onLongPress={showDelete} delayLongPress={400} scaleTo={0.985}>
          <View style={styles.cardTop}>
            <Text style={styles.cardDate}>{formatDate(item.date)}</Text>
            <View style={styles.cardTags}>
              <View style={styles.tag}><Text style={styles.tagText}>{GOAL_LABELS[item.goal]}</Text></View>
              <View style={[styles.tag, styles.tagMuted]}>
                <Text style={[styles.tagText, { color: C.textSecondary }]}>{LEVEL_LABELS[item.level]}</Text>
              </View>
            </View>
          </View>

          <Text style={styles.cardTitle} numberOfLines={2}>{item.workout?.title?.toUpperCase()}</Text>

          <View style={styles.cardMeta}>
            <Feather name="clock" size={12} color={C.textMuted} />
            <Text style={styles.cardMetaText}>{sessionMinutes(item)} MIN</Text>
            <View style={styles.metaDot} />
            <Feather name="list" size={12} color={C.textMuted} />
            <Text style={styles.cardMetaText}>{item.workout?.exercises?.length} EX.</Text>
            <View style={styles.metaDot} />
            <Feather name="box" size={12} color={C.textMuted} />
            <Text style={styles.cardMetaText}>{item.equipments?.length}</Text>
          </View>
        </Press>
      ) : (
        <View style={styles.deleteRow}>
          <TouchableOpacity style={styles.cancelZone} onPress={hideDelete} activeOpacity={1} onLongPress={hideDelete} delayLongPress={400} />
          <Press style={styles.deleteBtnInner} onPress={() => { hideDelete(); onDelete(item.id); }}>
            <Feather name="trash-2" size={15} color="#fff" />
            <Text style={styles.deleteBtnText}>SUPPRIMER</Text>
          </Press>
        </View>
      )}
    </Animated.View>
  );
}

export default function HomeScreen() {
  const navigation = useNavigation();
  const [sessions, setSessions] = useState([]);

  useEffect(() => {
    getSessions().then(setSessions);
    const interval = setInterval(() => getSessions().then(setSessions), 2000);
    return () => clearInterval(interval);
  }, []);

  const handleDelete = (id) => {
    setSessions((prev) => prev.filter((s) => s.id !== id));
    deleteSession(id);
  };

  const weekCount = sessions.filter((s) => (Date.now() - new Date(s.date)) / 864e5 <= 7).length;

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />

      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerLabel}>MES ENTRAÎNEMENTS</Text>
          <Text style={styles.headerTitle}>FITSCAN</Text>
        </View>
        <IconBadge name="zap" size={46} />
      </View>

      {sessions.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>AUCUNE{"\n"}SÉANCE</Text>
          <Text style={styles.emptyBody}>Lance ton premier entraînement en scannant ton équipement.</Text>
        </View>
      ) : (
        <>
          <View style={styles.streak}>
            <Text style={styles.streakValue}>{weekCount}</Text>
            <Text style={styles.streakLabel}>séance{weekCount > 1 ? "s" : ""} cette semaine</Text>
          </View>

          <View style={styles.listHeader}>
            <SectionLabel style={{ marginBottom: 0 }}>
              {sessions.length} SÉANCE{sessions.length > 1 ? "S" : ""}
            </SectionLabel>
            <Text style={styles.listHint}>maintenir pour supprimer</Text>
          </View>

          <FlatList
            data={sessions}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <SessionCard
                item={item}
                onPress={() => navigation.navigate("Workout", { workout: item.workout, readOnly: true })}
                onDelete={handleDelete}
              />
            )}
            contentContainerStyle={styles.list}
            showsVerticalScrollIndicator={false}
          />
        </>
      )}

      <View style={styles.fabWrap}>
        <PrimaryButton label="NOUVELLE SÉANCE" icon="plus" onPress={() => navigation.navigate("NewSession")} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },

  header: { flexDirection: "row", alignItems: "center", gap: 16, paddingHorizontal: 24, paddingTop: 24, paddingBottom: 20 },
  headerLabel: { ...T.label, color: C.accent, marginBottom: 4 },
  headerTitle: { fontFamily: "BebasNeue_400Regular", fontSize: 56, color: C.textPrimary, letterSpacing: 3, lineHeight: 56 },

  streak: {
    flexDirection: "row", alignItems: "baseline", gap: 10,
    marginHorizontal: 24, marginBottom: 8,
    backgroundColor: C.accentSofter, borderRadius: R.md,
    borderWidth: 1, borderColor: "rgba(200,255,0,0.18)",
    paddingHorizontal: 16, paddingVertical: 14,
  },
  streakValue: { fontFamily: "BebasNeue_400Regular", fontSize: 30, color: C.accent, lineHeight: 32 },
  streakLabel: { ...T.body, fontSize: 14, color: C.textPrimary },

  listHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 24, paddingVertical: 16 },
  listHint: { ...T.small, color: C.textMuted, fontStyle: "italic" },

  list: { paddingHorizontal: 20, paddingBottom: 130, gap: 12 },

  cardWrap: { borderRadius: R.lg, borderWidth: 1, borderColor: C.border, overflow: "hidden", ...E.raised },
  cardContent: { paddingHorizontal: 18, paddingVertical: 16, gap: 10 },
  cardTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  cardDate: { ...T.label, color: C.textMuted },
  cardTags: { flexDirection: "row", gap: 6 },
  tag: { backgroundColor: C.accentSoft, borderRadius: R.pill, paddingHorizontal: 10, paddingVertical: 4 },
  tagMuted: { backgroundColor: C.surface2 },
  tagText: { ...T.label, fontSize: 9, color: C.accent, letterSpacing: 1.2 },
  cardTitle: { fontFamily: "BebasNeue_400Regular", fontSize: 24, color: C.textPrimary, letterSpacing: 0.5, lineHeight: 26 },
  cardMeta: { flexDirection: "row", alignItems: "center", gap: 6 },
  cardMetaText: { ...T.label, fontSize: 10, color: C.textSecondary, marginRight: 2 },
  metaDot: { width: 3, height: 3, borderRadius: 2, backgroundColor: C.textMuted, marginHorizontal: 2 },

  deleteRow: { flexDirection: "row", alignItems: "center", justifyContent: "flex-end", paddingRight: 16, height: 116 },
  cancelZone: { flex: 1, height: "100%" },
  deleteBtnInner: {
    flexDirection: "row", alignItems: "center", gap: 8,
    borderWidth: 1.5, borderColor: "#fff", borderRadius: R.pill,
    paddingHorizontal: 18, paddingVertical: 10,
  },
  deleteBtnText: { fontFamily: "BebasNeue_400Regular", fontSize: 18, color: "#fff", letterSpacing: 1.5 },

  empty: { flex: 1, paddingHorizontal: 24, paddingTop: 60 },
  emptyTitle: { fontFamily: "BebasNeue_400Regular", fontSize: 64, color: C.textPrimary, letterSpacing: 2, lineHeight: 64, marginBottom: 16 },
  emptyBody: { ...T.body, maxWidth: 260 },

  fabWrap: { position: "absolute", bottom: 0, left: 0, right: 0, paddingHorizontal: 24, paddingBottom: 28, paddingTop: 20, backgroundColor: C.bg },
});
