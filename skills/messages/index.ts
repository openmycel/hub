import type { Intent, Skill } from "../../sdk/index.ts";

// A text written from what the owner says, opened in the system Messages sheet: the owner
// picks who and sends, the app sends nothing and needs no contacts.

const write: Intent<{ title: string }> = {
  id: "sms",
  model: true,
  match: (text, ctx) => ctx.mayBe.draft(text),
  // One pass tells a text from an email (shared with Mail).
  async read(text, ctx) {
    const found = await ctx.model.draft(text);
    if (found?.kind !== "sms") return null;
    return {
      card: {
        title: found.text,
        detail: "Text",
        accept: ["Review and send", "Opening…"],
        share: true,
      },
      params: { title: found.text },
    };
  },
  run: (p, ctx) => ctx.compose.text(p.title),
};

const skill: Skill = {
  manifest: {
    apiVersion: 1,
    id: "messages",
    name: "Messages",
    tagline: "Texts written for you, you hit send",
    description:
      "Writes a short text from what you say and opens it in Messages. You pick who it goes to and send it; the app sends nothing.",
    author: "OpenMycel",
    category: "iphone",
    icon: { symbol: "message.fill", bg: "#34C759", fg: "#FFFFFF", scale: 0.62 },
    apps: ["Messages"],
    store: "1146560473",
    can: "texts",
    examples: ["Text Anna that I'm running late", "Tell Sam I'll bring the charger"],
    // Before Reminders: "remind me to text Anna" is kept out by the draft words themselves.
    priority: 10,
  },
  intents: [write],
};

export default skill;
