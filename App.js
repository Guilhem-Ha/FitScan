import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useFonts } from "expo-font";
import { BebasNeue_400Regular } from "@expo-google-fonts/bebas-neue";
import { DMSans_400Regular, DMSans_600SemiBold, DMSans_700Bold } from "@expo-google-fonts/dm-sans";
import { View, Text, ActivityIndicator, StatusBar, TouchableOpacity, StyleSheet, Animated, ScrollView, Dimensions } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { useRef, useState, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { C } from "./theme";

import HomeScreen from "./screens/HomeScreen";
import NewSessionScreen from "./screens/NewSessionScreen";
import ScanScreen from "./screens/ScanScreen";
import WorkoutScreen from "./screens/WorkoutScreen";
import QuickScanScreen from "./screens/QuickScanScreen";
import ProgressScreen from "./screens/ProgressScreen";
import OnboardingScreen from "./screens/OnboardingScreen";

const Stack = createNativeStackNavigator();
const TABS = ["TRAINING", "SCAN", "PROGRÈS"];
const { width: SW } = Dimensions.get("window");

function MainTabs({ navigation }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const scrollRef = useRef(null);
  const brightness = useRef(TABS.map((_, i) => new Animated.Value(i === 0 ? 1 : 0))).current;
  const isScrolling = useRef(false);

  const goTo = (index) => {
    scrollRef.current?.scrollTo({ x: index * SW, animated: true });
    setActiveIndex(index);
    TABS.forEach((_, i) => {
      Animated.timing(brightness[i], {
        toValue: i === index ? 1 : 0,
        duration: 200,
        useNativeDriver: false,
      }).start();
    });
  };

  const onScroll = (e) => {
    const x = e.nativeEvent.contentOffset.x;
    const position = x / SW;
    const floored = Math.floor(position);
    const offset = position - floored;

    TABS.forEach((_, i) => {
      let val = 0;
      if (i === floored) val = 1 - offset;
      else if (i === floored + 1) val = offset;
      brightness[i].setValue(val);
    });
  };

  const onScrollEnd = (e) => {
    const index = Math.round(e.nativeEvent.contentOffset.x / SW);
    setActiveIndex(index);
  };

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={onScroll}
        onMomentumScrollEnd={onScrollEnd}
        scrollEventThrottle={16}
        style={{ flex: 1 }}
      >
        <View style={{ width: SW, flex: 1 }}>
          <HomeScreen navigation={navigation} />
        </View>
        <View style={{ width: SW, flex: 1 }}>
          <QuickScanScreen navigation={navigation} />
        </View>
        <View style={{ width: SW, flex: 1 }}>
          <ProgressScreen navigation={navigation} />
        </View>
      </ScrollView>

      <View style={tabStyles.bar}>
        <View style={tabStyles.divider} />
        <View style={tabStyles.row}>
          {TABS.map((label, index) => {
            const color = brightness[index].interpolate({
              inputRange: [0, 1], outputRange: [C.textMuted, C.textPrimary],
            });
            const indicatorWidth = brightness[index].interpolate({
              inputRange: [0, 1], outputRange: [0, 24],
            });
            return (
              <TouchableOpacity key={index} style={tabStyles.tab} onPress={() => goTo(index)} activeOpacity={0.7}>
                <Animated.View style={[tabStyles.indicator, { width: indicatorWidth }]} />
                <Animated.Text style={[tabStyles.label, { color }]}>{label}</Animated.Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    </View>
  );
}

export default function App() {
  const [fontsLoaded] = useFonts({
    BebasNeue_400Regular, DMSans_400Regular, DMSans_600SemiBold, DMSans_700Bold,
  });
  const [showOnboarding, setShowOnboarding] = useState(null);

  useEffect(() => {
    AsyncStorage.getItem("fitscan_onboarding_done").then((val) => {
      setShowOnboarding(val !== "true");
    });
  }, []);

  if (!fontsLoaded || showOnboarding === null) {
    return (
      <View style={{ flex: 1, backgroundColor: C.bg, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator color={C.accent} size="large" />
      </View>
    );
  }

  if (showOnboarding) {
    return (
      <SafeAreaProvider>
        <GestureHandlerRootView style={{ flex: 1 }}>
          <OnboardingScreen onDone={() => setShowOnboarding(false)} />
        </GestureHandlerRootView>
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <StatusBar barStyle="light-content" backgroundColor={C.bg} translucent={false} />
        <NavigationContainer>
          <Stack.Navigator screenOptions={{ headerShown: false, animation: "fade_from_bottom" }}>
            <Stack.Screen name="Main" component={MainTabs} />
            <Stack.Screen name="NewSession" component={NewSessionScreen} />
            <Stack.Screen name="Scan" component={ScanScreen} />
            <Stack.Screen name="Workout" component={WorkoutScreen} />
          </Stack.Navigator>
        </NavigationContainer>
      </GestureHandlerRootView>
    </SafeAreaProvider>
  );
}

const tabStyles = StyleSheet.create({
  bar: { backgroundColor: C.bg, paddingBottom: 24 },
  divider: { height: 1, backgroundColor: C.border },
  row: { flexDirection: "row" },
  tab: { flex: 1, paddingTop: 14, paddingBottom: 4, alignItems: "center" },
  label: { fontFamily: "DMSans_600SemiBold", fontSize: 11, letterSpacing: 1.5 },
  indicator: { height: 2, backgroundColor: C.textPrimary, marginBottom: 6 },
});