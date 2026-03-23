export const C = {
  bg:            "#0A0A0A",   // noir profond
  surface:       "#141414",   // cards — légèrement plus clair
  surface2:      "#1C1C1C",   // cards secondaires
  border:        "#2A2A2A",   // bordures très subtiles
  accent:        "#C8FF00",   // vert lime électrique
  accentDim:     "#8AAF00",
  blue:          "#3B82F6",
  red:           "#EF4444",
  amber:         "#F59E0B",
  green:         "#10B981",
  textPrimary:   "#FFFFFF",
  textSecondary: "#888888",
  textMuted:     "#444444",
};

export const T = {
  hero:     { fontFamily: "BebasNeue_400Regular", fontSize: 52, color: C.textPrimary, letterSpacing: 2 },
  h1:       { fontFamily: "BebasNeue_400Regular", fontSize: 40, color: C.textPrimary, letterSpacing: 1.5 },
  h2:       { fontFamily: "BebasNeue_400Regular", fontSize: 28, color: C.textPrimary, letterSpacing: 1 },
  label:    { fontFamily: "DMSans_600SemiBold", fontSize: 11, color: C.textSecondary, letterSpacing: 2, textTransform: "uppercase" },
  body:     { fontFamily: "DMSans_400Regular", fontSize: 15, color: C.textSecondary, lineHeight: 22 },
  bodyBold: { fontFamily: "DMSans_600SemiBold", fontSize: 15, color: C.textPrimary },
  small:    { fontFamily: "DMSans_400Regular", fontSize: 12, color: C.textSecondary },
  btn:      { fontFamily: "DMSans_700Bold", fontSize: 15, color: C.bg, letterSpacing: 1 },
};

export const S = {
  btnPrimary: {
    backgroundColor: C.accent,
    borderRadius: 0,
    paddingVertical: 18,
    alignItems: "center",
  },
  btnSecondary: {
    backgroundColor: "transparent",
    borderRadius: 0,
    paddingVertical: 18,
    alignItems: "center",
    borderWidth: 1,
    borderColor: C.textPrimary,
  },
  card: {
    backgroundColor: C.surface,
    borderRadius: 0,
    padding: 20,
  },
};