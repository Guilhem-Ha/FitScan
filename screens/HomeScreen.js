import React, { useState, useEffect, useRef } from "react";
import {
  View, Text, StyleSheet, TouchableOpacity, FlatList,
  StatusBar, Animated,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { getSessions, deleteSession } from "../data/storage";
import { C, T } from "../theme";

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
    Animated.timing(anim, { toValue: 0, duration: 200, useNativeDriver: false }).start(() => {
      setDeleteMode(false);
    });
  };

  const bgColor = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [C.surface, C.red],
  });

  return (
    <Animated.View style={[styles.cardWrap, { backgroundColor: bgColor }]}>
      {!deleteMode ? (
        // ── Mode normal ──────────────────────────────
        <TouchableOpacity
          style={styles.cardContent}
          onPress={onPress}
          onLongPress={showDelete}
          delayLongPress={400}
          activeOpacity={0.75}
        >
          <View style={styles.cardTop}>
            <Text style={styles.cardDate}>{formatDate(item.date)}</Text>
            <View style={styles.cardTags}>
              <Text style={styles.cardTag}>{GOAL_LABELS[item.goal]}</Text>
              <Text style={styles.cardTag}>{LEVEL_LABELS[item.level]}</Text>
            </View>
          </View>
          <Text style={styles.cardTitle} numberOfLines={2}>
            {item.workout?.title?.toUpperCase()}
          </Text>
          <View style={styles.cardMeta}>
            <Text style={styles.cardMetaText}>{item.workout?.totalDuration} MIN</Text>
            <Text style={styles.cardMetaDot}>·</Text>
            <Text style={styles.cardMetaText}>{item.workout?.exercises?.length} EXERCICES</Text>
            <Text style={styles.cardMetaDot}>·</Text>
            <Text style={styles.cardMetaText}>{item.equipments?.length} APPAREIL(S)</Text>
          </View>
        </TouchableOpacity>
      ) : (
        // ── Mode suppression ─────────────────────────
        <View style={styles.deleteRow}>
          {/* Zone gauche = annuler */}
          <TouchableOpacity style={styles.cancelZone} onPress={hideDelete} activeOpacity={1} onLongPress={hideDelete} delayLongPress={400} />
          {/* Bouton supprimer à droite */}
          <TouchableOpacity
            style={styles.deleteBtnInner}
            onPress={() => { hideDelete(); onDelete(item.id); }}
            activeOpacity={0.8}
          >
            <Text style={styles.deleteBtnText}>SUPPRIMER</Text>
          </TouchableOpacity>
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
    const interval = setInterval(() => {
      getSessions().then(setSessions);
    }, 2000);
    return () => clearInterval(interval);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleDelete = (id) => {
    setSessions((prev) => prev.filter((s) => s.id !== id));
    deleteSession(id);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />

      <View style={styles.header}>
        <Text style={styles.headerLabel}>MES ENTRAÎNEMENTS</Text>
        <Text style={styles.headerTitle}>FITSCAN</Text>
      </View>

      <View style={styles.divider} />

      {sessions.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>AUCUNE{"\n"}SÉANCE</Text>
          <Text style={styles.emptyBody}>Lance ton premier entraînement en scannant ton équipement.</Text>
        </View>
      ) : (
        <>
          <View style={styles.listHeader}>
            <Text style={styles.listLabel}>{sessions.length} SÉANCE{sessions.length > 1 ? "S" : ""}</Text>
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
        <TouchableOpacity
          style={styles.fab}
          onPress={() => navigation.navigate("NewSession")}
          activeOpacity={0.85}
        >
          <Text style={styles.fabText}>+ NOUVELLE SÉANCE</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },

  header: { paddingHorizontal: 24, paddingTop: 24, paddingBottom: 20 },
  headerLabel: { ...T.label, color: C.accent, marginBottom: 4 },
  headerTitle: { fontFamily: "BebasNeue_400Regular", fontSize: 56, color: C.textPrimary, letterSpacing: 3, lineHeight: 56 },

  divider: { height: 1, backgroundColor: C.border, marginHorizontal: 24 },

  listHeader: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    paddingHorizontal: 24, paddingVertical: 16,
  },
  listLabel: { ...T.label, color: C.textPrimary },
  listHint: { ...T.small, color: C.textMuted, fontStyle: "italic" },

  list: { paddingBottom: 120 },

  cardWrap: {
    marginBottom: 2,
    height: 110,
    overflow: "hidden",
  },

  // Mode normal
  cardContent: {
    flex: 1,
    paddingHorizontal: 24,
    paddingVertical: 16,
    justifyContent: "space-between",
  },
  cardTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  cardDate: { ...T.label, color: C.textMuted },
  cardTags: { flexDirection: "row", gap: 8 },
  cardTag: { ...T.label, color: C.accent },
  cardTitle: { fontFamily: "BebasNeue_400Regular", fontSize: 22, color: C.textPrimary, letterSpacing: 0.5, lineHeight: 24 },
  cardMeta: { flexDirection: "row", alignItems: "center", gap: 6 },
  cardMetaText: { ...T.label, fontSize: 10, color: C.textSecondary },
  cardMetaDot: { color: C.textMuted, fontSize: 10 },

  // Mode suppression
  deleteRow: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    paddingRight: 20,
  },
  cancelZone: { flex: 1, height: "100%" },
  deleteBtnInner: {
    borderWidth: 1.5,
    borderColor: "#fff",
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  deleteBtnText: {
    fontFamily: "BebasNeue_400Regular",
    fontSize: 18, color: "#fff", letterSpacing: 1.5,
  },

  empty: { flex: 1, paddingHorizontal: 24, paddingTop: 60 },
  emptyTitle: { fontFamily: "BebasNeue_400Regular", fontSize: 64, color: C.textPrimary, letterSpacing: 2, lineHeight: 64, marginBottom: 16 },
  emptyBody: { ...T.body, maxWidth: 260 },

  fabWrap: { position: "absolute", bottom: 0, left: 0, right: 0, paddingHorizontal: 24, paddingBottom: 36, paddingTop: 16, backgroundColor: C.bg },
  fab: { backgroundColor: C.accent, paddingVertical: 18, alignItems: "center" },
  fabText: { fontFamily: "DMSans_700Bold", fontSize: 15, color: C.bg, letterSpacing: 2 },
});