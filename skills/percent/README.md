# Percent

Counts a percentage of a number and a tip with the total: "15% of 2400", "tip 18% on
64.50", the same in Russian. The numbers are read and counted by code — a small
on-device model gets arithmetic wrong, so it is not asked.

The test plugin of the skills API: written only against the SDK (`sdk/index.ts`), it
replies and does nothing on the phone — no card, no access, no network.

- `index.ts` — the skill: manifest and one intent.
- `percent.ts` — the rules: which messages, which numbers, the answer.
- `evals.json` — messages and the expected reply (`null`: not this skill's message).
