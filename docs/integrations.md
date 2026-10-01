# Write an integration

An integration is a skill that talks to a service on the internet. It is written the same
way as any skill ([skills.md](skills.md)) and lives in `integrations/<id>/` with
`category: "integration"`, plus three things: it names every host it reaches, it reaches
them only through the context, and it shows what came back. `integrations/wikipedia` is
the example: "tell me about Jupiter" → the article's first
sentences and the link, from the Wikipedia in the language of the message.

An integration with its own screens, storage or sign-in is not in the SDK yet: it comes
with the first one that needs it.

## The code

`integrations/wikipedia/index.ts`, in full:

```typescript
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
```

`wiki.ts` next to it holds the rules: which messages ask for an article, the request
URL, and the answer from what Wikipedia sends back.

## The network

- **`connections` in the manifest** — every host and why, shown on the skill's Hub page
  before it is turned on. `*.wikipedia.org` lets in one subdomain: `ja.wikipedia.org`, not
  `a.b.wikipedia.org`.
- **`ctx.net.json(url)`** in `run` — a GET, JSON back. A host outside `connections` is
  refused before the request. The app sets the User-Agent with its name and the Hub's
  address; the skill sets no headers. It throws on no network or an error status: catch
  it and return `{ ok: false, reason }`.
- **No `fetch` of your own.** The app gives the network through the context, and review
  reads every URL the skill builds.

## Card or `act`

- **Writes or sends** — a card, and `run` only after the tap: the owner sees what goes out.
- **Reads and shows** — `{ act: params }`: `run` goes at once, its `reply` is the answer.
  Send only the words you look up, nothing else from the phone. Wikipedia is an `act`.

## The answer

`run` returns `{ ok: true, reply }`: markdown, shown in the chat as the answer — text and
a link. Say where it came from and under which licence, if the service asks for it:
Wikipedia's text is CC BY-SA 4.0, so the answer links the article. `detail` is a short
note of what was found.

Read the service's terms before the code: may an app call the API directly from the
phone, for a product that is not free, with or without a key; how to credit it. The
reasons Wikipedia fits and some weather and currency APIs did not were all in their terms.

## Evals

`integrations/wikipedia/evals.json`, a few of its cases:

```json
{
  "skill": "wikipedia",
  "cases": [
    { "text": "Tell me about Jupiter", "act": { "title": "Jupiter", "lang": "en" } },
    { "text": "Who was Ada Lovelace?", "act": { "title": "Ada Lovelace", "lang": "en" } },
    { "text": "What's 20% of 3500?", "act": null }
  ]
}
```

An `act` case checks the params `run` would get — the evals never reach the network.
Check the real service by hand before the pull request, and paste what it answered.
