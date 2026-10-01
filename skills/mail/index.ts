import type { Intent, Skill } from "../../sdk/index.ts";

// An email written from what the owner says, opened in the system Mail sheet: the owner
// picks who and sends, the app sends nothing and needs no contacts.

const write: Intent<{ title: string }> = {
  id: "email",
  model: true,
  match: (text, ctx) => ctx.mayBe.draft(text),
  // One pass tells a text from an email (shared with Messages).
  async read(text, ctx) {
    const found = await ctx.model.draft(text);
    if (found?.kind !== "email") return null;
    return {
      card: {
        title: found.text,
        detail: "Email",
        accept: ["Review and send", "Opening…"],
        share: true,
      },
      params: { title: found.text },
    };
  },
  run: (p, ctx) => ctx.compose.email(p.title),
};

const skill: Skill = {
  manifest: {
    apiVersion: 1,
    id: "mail",
    name: "Mail",
    tagline: "Emails written for you, you hit send",
    description:
      "Writes a short email from what you say and opens it in Mail. You pick who it goes to and send it; the app sends nothing.",
    publisher: "openmycel",
    category: "iphone",
    icon: { symbol: "envelope.fill", bg: "#1A8CFF", fg: "#FFFFFF", scale: 0.6 },
    apps: ["Mail"],
    store: "1108187098",
    can: "emails",
    examples: ["Write to the landlord that I am moving out", "Email my boss that I'm sick today"],
    priority: 10,
  },
  intents: [write],
};

export default skill;
