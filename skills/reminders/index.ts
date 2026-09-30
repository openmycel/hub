import type { Intent, Skill } from "../../sdk/index.ts";
import { askTimer, isTimerAsk, readTimer, timerLabel, type Timer } from "./timer.ts";

// Reminders and timers in the iPhone's Reminders app. A timer is a reminder with an alarm
// to the second, so it is part of this skill, on and off with it (owner, 2026-09-30).

type Remind = { title: string; at: string | null; allDay: boolean };

const remind: Intent<Remind> = {
  id: "remind",
  model: true,
  match: (text, ctx) => ctx.mayBe.reminderOrEvent(text),
  // One pass tells a reminder from an event; an event is Calendar's.
  async read(text, ctx) {
    const found = await ctx.model.reminderOrEvent(text);
    if (found?.kind !== "reminder") return null;
    return {
      card: {
        title: found.title,
        detail: ctx.whenLabel(found.at, found.allDay),
        accept: ["Add", "Adding…"],
        editable: true,
      },
      params: {
        title: found.title,
        at: found.at?.toISOString() ?? null,
        allDay: found.allDay,
      },
    };
  },
  run: (p, ctx) =>
    ctx.reminders.add({
      title: p.title,
      at: p.at ? new Date(p.at) : null,
      allDay: p.allDay,
    }),
};

type TimerParams = { title: string; minutes: number };

function timerCard({ minutes, label }: Timer) {
  return {
    card: {
      title: label || "Timer",
      detail: `Timer · ${timerLabel(minutes)}`,
      accept: ["Start", "Starting…"] as [string, string],
      editable: true,
    },
    params: { title: label || "Timer", minutes },
  };
}

const timer: Intent<TimerParams> = {
  id: "timer",
  // "timer" in English and Russian.
  match: (text) => /(?<!\p{L})(таймер|timer)/iu.test(text),
  // With a duration — a card; without one the app asks "How long?" by itself.
  read(text) {
    const found = readTimer(text);
    if (found) return timerCard(found);
    const ask = askTimer(text);
    return ask ? { ask } : null;
  },
  // "10 minutes", "10" right after that question.
  resume(question, text) {
    if (!isTimerAsk(question)) return null;
    const found = readTimer(text, true);
    return found ? timerCard(found) : null;
  },
  async run(p, ctx) {
    const done = await ctx.reminders.timer(p.title, p.minutes);
    return done.ok
      ? { ...done, detail: `Timer · ${timerLabel(p.minutes)} · ${done.detail}` }
      : done;
  },
};

const skill: Skill = {
  manifest: {
    apiVersion: 1,
    id: "reminders",
    name: "Reminders",
    tagline: "Reminders and timers from the chat",
    description:
      "Adds a reminder after you tap Add, with an alert at its time. A timer is a reminder too: it rings from Reminders with the app closed.",
    author: "OpenMycel",
    category: "iphone",
    icon: { symbol: "checklist", bg: "#FFFFFF", fg: "#007AFF" },
    brand: "apple-reminders",
    apps: ["Reminders"],
    access: ["Reminders"],
    can: "reminders, timers",
    examples: ["Remind me about the bike at 1", "Timer for 12 minutes, pasta"],
    priority: 20,
  },
  intents: [timer, remind],
  rename: (ref, title, ctx) => ctx.reminders.rename(ref, title),
};

export default skill;
