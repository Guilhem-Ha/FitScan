export const C = {
  bg:            "#0A0A0A",
  surface:       "#141414",
  surface2:      "#1C1C1C",
  surfaceHi:     "#232323",   // survol / état pressé
  border:        "#2A2A2A",
  borderHi:      "#383838",
  accent:        "#C8FF00",
  accentDim:     "#8AAF00",
  accentSoft:    "rgba(200,255,0,0.12)",  // fonds teintés lime
  accentSofter:  "rgba(200,255,0,0.06)",
  blue:          "#3B82F6",
  red:           "#EF4444",
  amber:         "#F59E0B",
  green:         "#10B981",
  textPrimary:   "#FFFFFF",
  textSecondary: "#888888",
  textMuted:     "#444444",
};

// ── Rayons : hiérarchie douce (MOMENTUM) ──────────────────
export const R = {
  xs: 8,
  sm: 12,
  md: 16,
  lg: 22,
  pill: 999,
};

export const SP = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 };

// ── Profondeur : 3 niveaux, jamais plus ───────────────────
export const E = {
  flat: {},
  raised: {
    shadowColor: "#000",
    shadowOpacity: 0.45,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  floating: {
    shadowColor: "#000",
    shadowOpacity: 0.6,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 12 },
    elevation: 10,
  },
  accentGlow: {
    shadowColor: C.accent,
    shadowOpacity: 0.35,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
};

export const T = {
  hero:     { fontFamily: "BebasNeue_400Regular", fontSize: 52, color: C.textPrimary, letterSpacing: 2 },
  h1:       { fontFamily: "BebasNeue_400Regular", fontSize: 40, color: C.textPrimary, letterSpacing: 1.5 },
  h2:       { fontFamily: "BebasNeue_400Regular", fontSize: 28, color: C.textPrimary, letterSpacing: 1 },
  h3:       { fontFamily: "BebasNeue_400Regular", fontSize: 22, color: C.textPrimary, letterSpacing: 0.5 },
  num:      { fontFamily: "BebasNeue_400Regular", fontSize: 36, color: C.accent, letterSpacing: 0.5 },
  label:    { fontFamily: "DMSans_600SemiBold", fontSize: 11, color: C.textSecondary, letterSpacing: 2, textTransform: "uppercase" },
  body:     { fontFamily: "DMSans_400Regular", fontSize: 15, color: C.textSecondary, lineHeight: 22 },
  bodyBold: { fontFamily: "DMSans_600SemiBold", fontSize: 15, color: C.textPrimary },
  small:    { fontFamily: "DMSans_400Regular", fontSize: 12, color: C.textSecondary },
  btn:      { fontFamily: "DMSans_700Bold", fontSize: 15, color: C.bg, letterSpacing: 1 },
};

export const S = {
  btnPrimary: {
    backgroundColor: C.accent,
    borderRadius: R.md,
    paddingVertical: 18,
    alignItems: "center",
    ...E.accentGlow,
  },
  btnSecondary: {
    backgroundColor: C.surface,
    borderRadius: R.md,
    paddingVertical: 18,
    alignItems: "center",
    borderWidth: 1,
    borderColor: C.borderHi,
  },
  card: {
    backgroundColor: C.surface,
    borderRadius: R.lg,
    borderWidth: 1,
    borderColor: C.border,
    padding: 20,
    ...E.raised,
  },
  cardTinted: {
    backgroundColor: C.accentSofter,
    borderRadius: R.lg,
    borderWidth: 1,
    borderColor: "rgba(200,255,0,0.18)",
    padding: 20,
  },
  chip: {
    backgroundColor: C.surface2,
    borderRadius: R.pill,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: C.border,
  },
  chipActive: {
    backgroundColor: C.accentSoft,
    borderColor: C.accent,
  },
};
