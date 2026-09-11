import { useCallback, useEffect, useRef } from "react";
import { AppState } from "react-native";
import { useFocusEffect } from "@react-navigation/native";

/* Recharge les données d'un écran quand il redevient visible, au lieu de relire
   le stockage en boucle :
   - retour sur l'écran principal depuis une autre page (séance, profil) ;
   - arrivée sur son onglet : les trois onglets restent montés côte à côte, donc
     changer d'onglet ne déclenche aucun événement de navigation ;
   - retour de l'app au premier plan, la date ayant pu changer entre-temps.
   Un onglet masqué ne recharge rien : il le fera en redevenant actif. */
export function useScreenRefresh(load, isActive = true) {
  const loadRef = useRef(load);
  loadRef.current = load;
  const activeRef = useRef(isActive);
  activeRef.current = isActive;

  useFocusEffect(
    useCallback(() => {
      if (activeRef.current) loadRef.current();
    }, [])
  );

  // Seulement au passage inactif → actif : le montage est déjà couvert par le focus.
  const wasActive = useRef(isActive);
  useEffect(() => {
    if (isActive && !wasActive.current) loadRef.current();
    wasActive.current = isActive;
  }, [isActive]);

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active" && activeRef.current) loadRef.current();
    });
    return () => subscription.remove();
  }, []);
}
