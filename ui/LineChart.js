import React, { useState } from "react";
import { View, StyleSheet } from "react-native";
import { C } from "../theme";

const PAD_X = 8;
const PAD_Y = 12;

/* Courbe sans dépendance SVG (react-native-svg est natif et forcerait un nouvel
   APK) : chaque segment est une vue pivotée tendue entre deux points. */
export default function LineChart({ values, height = 130, color = C.accent, thickness = 2.5 }) {
  const [width, setWidth] = useState(0);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const innerW = Math.max(0, width - PAD_X * 2);
  const innerH = height - PAD_Y * 2;

  const points = values.map((v, i) => ({
    x: PAD_X + (values.length === 1 ? innerW / 2 : (i / (values.length - 1)) * innerW),
    // Une série plate se trace au milieu plutôt que collée en bas.
    y: PAD_Y + (max === min ? innerH / 2 : (1 - (v - min) / (max - min)) * innerH),
  }));

  return (
    <View style={{ height }} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
      {[0, 0.5, 1].map((t) => (
        <View key={t} style={[styles.grid, { top: PAD_Y + t * innerH }]} />
      ))}

      {width > 0 && points.slice(1).map((b, i) => {
        const a = points[i];
        const length = Math.hypot(b.x - a.x, b.y - a.y);
        return (
          <View
            key={`s${i}`}
            style={{
              position: "absolute",
              left: (a.x + b.x) / 2 - length / 2,
              top: (a.y + b.y) / 2 - thickness / 2,
              width: length,
              height: thickness,
              borderRadius: thickness,
              backgroundColor: color,
              transform: [{ rotate: `${Math.atan2(b.y - a.y, b.x - a.x)}rad` }],
            }}
          />
        );
      })}

      {width > 0 && points.map((p, i) => {
        const last = i === points.length - 1;
        const size = last ? 12 : 8;
        return (
          <View
            key={`p${i}`}
            style={{
              position: "absolute",
              left: p.x - size / 2,
              top: p.y - size / 2,
              width: size,
              height: size,
              borderRadius: size / 2,
              backgroundColor: last ? color : C.surface,
              borderWidth: last ? 0 : 2,
              borderColor: color,
            }}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { position: "absolute", left: 0, right: 0, height: 1, backgroundColor: C.border },
});
