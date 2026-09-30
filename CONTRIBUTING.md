# Contributing a skill or an integration to the Hub

How to write one: [docs/skills.md](docs/skills.md), [docs/integrations.md](docs/integrations.md).

Before you open a pull request:

- [ ] It is one folder — `skills/<id>/`, or `integrations/<id>/` with
      `category: "integration"` for an outside service — and `manifest.id` is `<id>`.
- [ ] `index.ts` imports only its own files and the SDK types, with `import type`.
- [ ] No network, storage, `setTimeout` or globals of its own: everything comes
      through the context.
- [ ] An integration lists every host in `connections`, reaches it only through
      `ctx.net`, and credits the service in its answer if its terms ask for it.
- [ ] Writes and sends go through a card; only a lookup that reads and shows uses `act`.
- [ ] Every phrase in `manifest.examples` is a case in `evals.json`.
- [ ] `evals.json` has cases your skill must not take — the neighbours of its words.
- [ ] `node scripts/eval.mjs` passes, for every skill.
- [ ] `README.md` says what the skill does and what it does not.
- [ ] The description promises nothing the skill cannot do.

In the pull request:

- what it does, in one line;
- which phone data or hosts it touches, and why;
- for an integration: the service's terms that allow it — calls from the app, a product
  that is not free, how to credit it — with links, and what the service answered to a
  real request;
- the output of `node scripts/eval.mjs`.

Review reads the code in full. Access to phone data, or a host on the internet, is
decided separately from the code. A skill that can't keep its description does not get
in.

Merged skills ship with the next OpenMycel release: the app pins a commit of the Hub,
and every release goes through App Review.

By contributing you agree that your skill is released under the MIT license of this repo.
