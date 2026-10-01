# Write a skill

A skill teaches the assistant one job and does it on the phone, or answers from its own
rules. `skills/percent` is the smallest complete one: it counts "15% of 2400" and a tip,
and replies with the number. Code counts; a small model gets arithmetic wrong.

For a skill that reaches a service on the internet, see [integrations.md](integrations.md).

## The folder

```
skills/<id>/
  index.ts      export default { manifest, intents }
  <rules>.ts    your own rules, if any (percent.ts)
  evals.json    messages and what the skill must do with them
  README.md     what it does and does not
  logo.png      optional: its icon in Hub instead of the symbol tile; square, 256 px or
                more; yours, or a brand's only as its trademark rules allow
```

## The code

`skills/percent/index.ts`, in full:

```typescript
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
```

`percent.ts` next to it reads the numbers and writes the answer. Import the contract
with `import type` only — the build erases it, so a skill has no dependencies and Node
runs it as is.

## An intent

| Function                      | When                                            | Returns                                                          |
| ----------------------------- | ----------------------------------------------- | ---------------------------------------------------------------- |
| `match(text, ctx)`            | every message                                   | `true` if the words make it a candidate                          |
| `read(text, ctx)`             | after `match`                                   | `{ reply }`, `{ ask }`, `{ card, params }`, `{ act }` or `null`  |
| `resume(question, text, ctx)` | the message right after your own `ask`          | the same as `read`                                               |
| `run(params, ctx)`            | after the tap on the card, or at once for `act` | `{ ok: true, detail?, ref?, reply? }` or `{ ok: false, reason }` |

- `{ reply }` — an answer shown as is: a number, a fact from the skill's own data.
- `{ ask }` — one question; the owner's next message comes to `resume`.
- `{ card, params }` — a card to confirm. Nothing is written or sent before the tap; then
  `run` gets `params`. `params` must be plain JSON — the card keeps them in the chat. With
  `card.editable`, the title the owner leaves on the card comes back as `params.title`.
- `{ act }` — run at once, no card, for a lookup that only reads and shows. See
  [integrations.md](integrations.md).
- `null` — not this intent's message after all; the next one is tried.

Set `model: true` on an intent whose `read` uses the model: it is tried after the rule
readers.

## What a skill gets

Only the context, never imports.

- `ReadContext`: `lang` — the language of the message, an ISO 639-1 code ("en", "ru",
  "ja"); dates and times in the text (`when`, `whenLabel`); the app's shared model passes
  (`model.reminderOrEvent`, `model.draft`).
- `RunContext`: add a reminder or a timer and rename one (`reminders`), add a calendar
  event (`calendar`), open a text or an email for the owner to send (`compose`), write
  a note or add a line to one (`notes`; refused to a skill with `connections`), and `net`
  for integrations.

A skill writes its own words in English, the app's language. What it passes on — an
article, a name, the text to send — stays in the owner's language.

## The manifest

`sdk/index.ts` documents every field. The ones people see: `name`, `tagline`,
`description` (no promise the skill cannot keep), `examples` (each is a case in your
evals), `icon`, `publisher` and `category` — `iphone` (works through the iPhone's own apps),
`app` (inside the app) or `integration` (an outside service). `priority` orders skills
of one kind when two could take a message: lower goes first.

`publisher` is the id of a folder in `publishers/`: `publisher.json` (`id`, `name`,
`description`, an optional `url`) and a square `logo.png`. Hub shows the publisher's page
with every skill and integration that names it. A new publisher comes in the same pull
request as its first skill.

## Evals

`skills/percent/evals.json`, a few of its cases:

```json
{
  "skill": "percent",
  "cases": [
    { "text": "15% of 2400", "reply": "15% of 2400 is 360." },
    { "text": "Tip 18% on 64.50", "reply": "Tip: 18% of 64.5 is 11.61, total 76.11." },
    { "text": "Battery at 15%, what should I do?", "reply": null }
  ]
}
```

A case expects `reply`, `ask`, `card` (`{ "title", "detail" }`) or `act`; `before` is the
app's question the message answers. A case whose expectation is `null` is not your
skill's message: it fails if your skill takes it. Add the neighbours of your words — the
messages that look like yours and belong to someone else.

```shell
node scripts/eval.mjs   # Node 24
```
