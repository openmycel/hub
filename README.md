# OpenMycel Hub

Where the skills of [OpenMycel](https://github.com/openmycel/openmycel) live — a private
assistant that runs on the iPhone, with the model on the device. A skill teaches it one
job: set a timer, add an event, count a tip. The Hub holds the SDK, the router and every
skill; the app builds all of them in and ships them with its next release.

## Why skills are code in the Hub, not downloads

The App Store does not let an app download code that changes what it does (App Review
Guideline 2.5.2, [developer.apple.com/app-store/review/guidelines](https://developer.apple.com/app-store/review/guidelines/)).
So a skill is not installed from the internet: it is merged here, reviewed, and compiled
into the app, which then goes through App Review. The price is the release cadence — a new
skill reaches people with the next app update.

## How the app picks a skill

The assistant has no agent loop. A message goes through the skills in a fixed order, and
the model never chooses the skill — it only fills in the one the words chose:

1. The answer to the app's own question ("How long?" → "10 minutes").
2. Skills that read the message by rules, no model.
3. Skills that need a pass of the on-device model.
4. Nobody took it — the model answers as a chat.

Nothing is written or sent before the owner taps a card. Only a lookup that reads and
shows answers at once.

## Skills and integrations

- **A skill** does one job on the phone or answers from its own rules: a timer, an
  event, a tip. → [docs/skills.md](docs/skills.md), with `skills/percent` as the example.
- **An integration** is a skill that talks to a service on the internet: it names every
  host it reaches and gets the network only from the app. →
  [docs/integrations.md](docs/integrations.md), with `integrations/wikipedia` as the example.

## Layout

```
sdk/index.ts        the contract: types only
sdk/route.ts        the router the app runs, and the evals run too
skills/<id>/        one skill
  index.ts          export default { manifest, intents }
  evals.json        messages and what it must do with them
  README.md         what it does and does not
  logo.png          optional: its icon in Hub
integrations/<id>/  one integration: the same files, plus the hosts it reaches
publishers/<id>/    who publishes them: publisher.json and logo.png
docs/               how to write a skill, an integration
scripts/eval.mjs    runs every skill's evals through the router
```

## Rules

- Import nothing but your own files and the SDK types. No `fetch`, `XMLHttpRequest`,
  `WebSocket`, `eval`, `Function`, `require`, `globalThis`: the app gives what the manifest
  asks for, and nothing else reaches a skill.
- No model where rules are enough. A model pass costs seconds on a phone and can be wrong.
- One question, then do it: if a parameter is missing, `ask` once; the answer comes to
  `resume`.
- Every write and every message sent goes through a card; `run` happens only after the
  tap.
- The network only from `run` and only to the hosts in `connections`. A lookup that
  reads and shows may `act` at once, and it sends only the words it looks up.

## Evals

Every skill and integration has `evals.json`: messages and what it must do with them,
including the messages it must leave to others.

```shell
node scripts/eval.mjs   # Node 24
```

It runs every skill's cases through the real router with every skill in it, so a new skill
that takes another skill's messages fails too. Skills built on the app's shared model
passes (Reminders, Calendar, Messages, Mail) are covered here by rules only; the app tests
their prompts on the model. Integrations are checked without the network: their cases
check what `run` would get.

## From a pull request to the App Store

1. Fork, add `skills/<id>/` or `integrations/<id>/` with `index.ts`, `evals.json`,
   `README.md`.
2. `node scripts/eval.mjs` — all green, yours and everybody else's.
3. Open a pull request. Say what the skill does, which phone data and which hosts it
   touches, and paste the eval output.
4. Review: the code is read in full; new access or a new host is a separate yes.
5. Merged here, the skill enters the app when the app moves its pin of the Hub to the
   new commit, and ships with the next release after App Review.

See [CONTRIBUTING.md](CONTRIBUTING.md) for the checklist.

## Author and license

Created by Nikita MRCS — [@nmrcs](https://github.com/nmrcs). Contributors are
credited in the git history.

MIT.
