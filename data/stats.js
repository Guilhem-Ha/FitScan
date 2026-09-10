import { sessionMinutes } from "./storage";

// Semaine à la française : lundi → dimanche.
export function startOfWeek(date = new Date()) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return d;
}

export function weekSessions(sessions, weeksAgo = 0) {
  const start = startOfWeek();
  start.setDate(start.getDate() - 7 * weeksAgo);
  const end = new Date(start);
  end.setDate(end.getDate() + 7);
  return sessions.filter((s) => {
    const t = new Date(s.date);
    return t >= start && t < end;
  });
}

// Minutes par jour de la semaine en cours, index 0 = lundi.
export function weekMinutesByDay(sessions) {
  const days = Array(7).fill(0);
  weekSessions(sessions).forEach((s) => {
    days[(new Date(s.date).getDay() + 6) % 7] += sessionMinutes(s);
  });
  return days;
}

const dayKey = (d) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;

/* Jours consécutifs avec au moins une séance. La série part d'hier si rien
   n'a encore été fait aujourd'hui : elle ne se casse pas avant la fin du jour. */
export function streakDays(sessions) {
  const trained = new Set(sessions.map((s) => dayKey(new Date(s.date))));
  const cursor = new Date();
  if (!trained.has(dayKey(cursor))) cursor.setDate(cursor.getDate() - 1);
  let count = 0;
  while (trained.has(dayKey(cursor))) {
    count++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return count;
}

export function formatDuration(minutes) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m} MIN`;
  return `${h}H${String(m).padStart(2, "0")}`;
}

const toKg = (entry) => (entry.unit === "lbs" ? entry.weight * 0.4536 : entry.weight);
const round1 = (n) => Math.round(n * 10) / 10;

/* Charge la plus lourde jamais notée, tous exercices confondus, et l'écart
   entre les deux dernières saisies de cet exercice. L'historique est rangé du
   plus récent au plus ancien, avec des noms d'exercice en minuscules. */
export function personalRecord(weightHistory) {
  let best = null;
  Object.entries(weightHistory || {}).forEach(([exercise, entries]) => {
    entries.forEach((entry) => {
      const kg = toKg(entry);
      if (!best || kg > best.kg) best = { exercise, kg, entries };
    });
  });
  if (!best) return null;
  const [latest, previous] = best.entries;
  return {
    exercise: best.exercise,
    weightKg: round1(best.kg),
    deltaKg: previous ? round1(toKg(latest) - toKg(previous)) : null,
  };
}
