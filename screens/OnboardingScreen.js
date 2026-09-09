import React, { useState, useEffect, useRef } from "react";
import {
  View, Text, StyleSheet, TouchableOpacity,
  Animated, Dimensions, StatusBar, Image,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { C, T, R } from "../theme";
import { PrimaryButton } from "../ui/kit";

const { width: SW, height: SH } = Dimensions.get("window");
const SLIDE_DURATION = 10000;

const SLIDES = [
  {
    eyebrow: "BIENVENUE",
    title: "ENTRAINE-TOI\nINTELLIGEMMENT.",
    body: "FitScan analyse ton équipement et génère des séances personnalisées pour toi, en quelques secondes.",
    accent: "01 / 04",
    image: "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&q=80",
  },
  {
    eyebrow: "ÉTAPE 1",
    title: "SCANNE\nTON MATOS.",
    body: "Prends une photo de ton équipement — haltères, machines, barres. L'IA identifie tout automatiquement.",
    accent: "02 / 04",
    image: "https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?w=800&q=80",
  },
  {
    eyebrow: "ÉTAPE 2",
    title: "GÉNÈRE\nTA SÉANCE.",
    body: "Choisis ton niveau, ton objectif et ta durée. FitScan crée un programme adapté avec vidéos d'exécution.",
    accent: "03 / 04",
    image: "https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=800&q=80",
  },
  {
    eyebrow: "ÉTAPE 3",
    title: "SUIS TA\nPROGRESSION.",
    body: "Note tes poids, consulte tes stats et vois tes muscles les plus travaillés. Progresse séance après séance.",
    accent: "04 / 04",
    image: "https://images.unsplash.com/photo-1526506118085-60ce8714f8c5?w=800&q=80",
  },
];

export default function OnboardingScreen({ onDone }) {
  const [current, setCurrent] = useState(0);
  const progresses = useRef(SLIDES.map(() => new Animated.Value(0))).current;
  const pausedRef = useRef(false);
  const animRef = useRef(null);
  const elapsedRef = useRef(0);
  const startTimeRef = useRef(null);

  const handleDone = async () => {
    await AsyncStorage.setItem("fitscan_onboarding_done", "true");
    onDone();
  };

  const goTo = (index) => {
    if (index >= SLIDES.length) { handleDone(); return; }
    if (index < 0) return;
    progresses.forEach((p, i) => p.setValue(i < index ? 1 : 0));
    elapsedRef.current = 0;
    setCurrent(index);
  };

  const startAnim = (from = 0) => {
    if (animRef.current) animRef.current.stop();
    startTimeRef.current = Date.now();
    progresses[current].setValue(from);
    const remaining = SLIDE_DURATION * (1 - from);
    animRef.current = Animated.timing(progresses[current], {
      toValue: 1,
      duration: remaining,
      useNativeDriver: false,
    });
    animRef.current.start(({ finished }) => {
      if (finished && !pausedRef.current && current < SLIDES.length - 1) goTo(current + 1);
    });
  };

  const pauseAnim = () => {
    if (pausedRef.current) return;
    pausedRef.current = true;
    if (animRef.current) animRef.current.stop();
    const elapsed = Date.now() - (startTimeRef.current || Date.now());
    elapsedRef.current = elapsed / SLIDE_DURATION;
  };

  const resumeAnim = () => {
    if (!pausedRef.current) return;
    pausedRef.current = false;
    startAnim(elapsedRef.current);
  };

  useEffect(() => {
    pausedRef.current = false;
    elapsedRef.current = 0;
    startAnim(0);
    return () => { if (animRef.current) animRef.current.stop(); };
  }, [current]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleTap = (e) => {
    if (pausedRef.current) return;
    const x = e.nativeEvent.locationX;
    if (x > SW / 2) goTo(current + 1);
    else goTo(current - 1);
  };

  const slide = SLIDES[current];
  const isLast = current === SLIDES.length - 1;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      <Image source={{ uri: slide.image }} style={styles.bgImage} />

      {/* Barres de progression */}
      <View style={styles.bars}>
        {SLIDES.map((_, i) => (
          <View key={i} style={styles.barBg}>
            <Animated.View
              style={[styles.barFill, {
                width: progresses[i].interpolate({
                  inputRange: [0, 1], outputRange: ["0%", "100%"],
                }),
              }]}
            />
          </View>
        ))}
      </View>

      <TouchableOpacity style={styles.skipBtn} onPress={handleDone} activeOpacity={0.7}>
        <Text style={styles.skipText}>PASSER</Text>
      </TouchableOpacity>

      {/* Zone principale — tap pour avancer, maintenir pour pauser */}
      <TouchableOpacity
        style={styles.tapZone}
        onPress={handleTap}
        onLongPress={pauseAnim}
        onPressOut={resumeAnim}
        delayLongPress={150}
        activeOpacity={1}
      >
        <View style={styles.sheet}>
          <View style={styles.grabber} />

          <Text style={styles.accentText}>{slide.accent}</Text>
          <Text style={styles.eyebrow}>{slide.eyebrow}</Text>
          <Text style={styles.title}>{slide.title}</Text>
          <Text style={styles.body}>{slide.body}</Text>

          {isLast ? (
            <PrimaryButton label="COMMENCER" icon="arrow-right" onPress={handleDone} style={styles.startBtn} />
          ) : (
            <Text style={styles.tapHintText}>Maintenir pour pauser · Appuyer pour avancer</Text>
          )}
        </View>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },

  bgImage: {
    position: "absolute",
    top: 0, left: 0, right: 0,
    height: SH * 0.58,
    resizeMode: "cover",
  },

  bars: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingTop: 56,
    gap: 4,
    zIndex: 10,
  },
  barBg: {
    flex: 1, height: 3,
    borderRadius: R.pill,
    backgroundColor: "rgba(255,255,255,0.25)",
    overflow: "hidden",
  },
  barFill: { height: "100%", borderRadius: R.pill, backgroundColor: "#fff" },

  skipBtn: {
    position: "absolute",
    top: 96, right: 20, zIndex: 20,
    paddingVertical: 8, paddingHorizontal: 14,
    borderRadius: R.pill,
    backgroundColor: "rgba(0,0,0,0.45)",
    borderWidth: 1, borderColor: "rgba(255,255,255,0.15)",
  },
  skipText: { fontFamily: "DMSans_600SemiBold", fontSize: 11, color: "#fff", letterSpacing: 1.5 },

  tapZone: { flex: 1, justifyContent: "flex-end" },

  sheet: {
    backgroundColor: C.bg,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 24,
    paddingTop: 14,
    paddingBottom: 40,
  },
  grabber: {
    width: 40, height: 4, borderRadius: R.pill,
    backgroundColor: C.border,
    alignSelf: "center", marginBottom: 22,
  },

  accentText: { fontFamily: "BebasNeue_400Regular", fontSize: 13, color: C.accent, letterSpacing: 3, marginBottom: 12 },
  eyebrow: { ...T.label, color: C.textMuted, marginBottom: 12 },
  title: {
    fontFamily: "BebasNeue_400Regular",
    fontSize: 50, color: C.textPrimary,
    letterSpacing: 2, lineHeight: 50, marginBottom: 14,
  },
  body: {
    fontFamily: "DMSans_400Regular",
    fontSize: 15, color: C.textSecondary,
    lineHeight: 24, maxWidth: 320,
  },

  startBtn: { marginTop: 28 },
  tapHintText: { ...T.small, color: C.textMuted, textAlign: "center", marginTop: 24 },
});
