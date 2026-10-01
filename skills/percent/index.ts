import type { Intent, Skill } from "../../sdk/index.ts";
import { answer, readPercent } from "./percent.ts";

// The test plugin for the skills API: written only against the SDK (sdk/index.ts), no app
// code. It replies with a number and does nothing on the phone, so it needs no card,
// no access and no network.

const count: Intent = {
  id: "percent",
  match: (text) => /\d\s*(%|процент|percent)/iu.test(text),
  read(text, ctx) {
    const found = readPercent(text);
    return found ? { reply: answer(found, ctx.lang === "ru") } : null;
  },
};

const skill: Skill = {
  manifest: {
    apiVersion: 1,
    id: "percent",
    name: "Percent",
    tagline: "Percentages and tips, counted exactly",
    description:
      "Counts a percentage of a number and a tip with the total. The numbers are counted by code, not by the model, so they are exact. Nothing leaves the phone.",
    publisher: "openmycel",
    category: "app",
    icon: { symbol: "percent", bg: "#FF9500", fg: "#FFFFFF", scale: 0.5 },
    examples: ["15% of 2400", "Tip 18% on 64.50", "What's 20% of 3500?"],
  },
  intents: [count],
};

export default skill;
