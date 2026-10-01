import type { Intent, Skill } from "../../sdk/index.ts";
import { articleOf, host, readSubject, replyOf, searchUrl } from "./wiki.ts";

// Facts from Wikipedia: "tell me about Jupiter" → at once, no card, the article's first
// sentences and the link at the end — from the Wikipedia of the message's language
// (ctx.lang: "ja" → ja.wikipedia.org). The first skill that reaches the network: only the
// subject leaves the phone, only to Wikipedia; it reads and shows, so it needs no tap.

type Params = { title: string; lang: string };

const lookUp: Intent<Params> = {
  id: "look-up",
  match: (text) => readSubject(text) !== null,
  read(text, ctx) {
    const subject = readSubject(text);
    if (!subject) return null;
    return { act: { title: subject, lang: ctx.lang } };
  },
  async run({ title, lang }, ctx) {
    let json: unknown;
    try {
      json = await ctx.net.json(searchUrl(title, lang));
    } catch (e) {
      return { ok: false, reason: `Wikipedia did not answer: ${(e as Error).message}` };
    }
    const article = articleOf(json);
    if (!article) return { ok: false, reason: `No article “${title}” in ${host(lang)}.` };
    return { ok: true, detail: article.title, reply: replyOf(article) };
  },
};

const skill: Skill = {
  manifest: {
    apiVersion: 1,
    id: "wikipedia",
    name: "Wikipedia",
    tagline: "Facts from the article, not made up",
    description:
      "Looks up a person, a place or a thing in Wikipedia and answers with the article's first sentences and the link. The model does not write the answer, so it does not invent facts. Only the subject of your question goes to Wikipedia, in the language you write in; nothing else leaves the phone. No news, prices or schedules: it is an encyclopedia.",
    publisher: "openmycel",
    category: "integration",
    icon: { symbol: "book.closed.fill", bg: "#FFFFFF", fg: "#000000", scale: 0.5 },
    can: "facts from Wikipedia",
    examples: ["Tell me about Jupiter", "Who was Ada Lovelace?", "What is a quasar?"],
    // After every skill that reads by rules: "what's 20% of 3500" is Percent's.
    priority: 90,
    connections: [
      { host: "*.wikipedia.org", why: "Looks up the article, in the language of your message" },
    ],
  },
  intents: [lookUp],
};

export default skill;
