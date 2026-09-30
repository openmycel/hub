// Runs the evals.json of every skill and integration (skills/*, integrations/*) through the
// router the app uses (sdk/route.ts), with all of them in it, by rules only. A case passes when its skill answers as expected — and when
// a message that is not the skill's is not taken by it. No model, no network, no app code:
// the model passes (reminders, events, drafts) return nothing here; the app tests their
// prompts itself.
//
// Run: node scripts/eval.mjs   (Node 24: it runs the .ts files as is)

import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { langOf, route } from "../sdk/route.ts";

// An integration is a skill that talks to an outside service: it lives in integrations/
// and says so in its manifest; a skill does not.
const hub = join(dirname(fileURLToPath(import.meta.url)), "..");
const folders = [];
for (const kind of ["skills", "integrations"]) {
  const root = join(hub, kind);
  if (!existsSync(root)) continue;
  for (const d of readdirSync(root, { withFileTypes: true }))
    if (d.isDirectory() && existsSync(join(root, d.name, "index.ts")))
      folders.push({ kind, id: d.name, dir: join(root, d.name) });
}
folders.sort((a, b) => a.id.localeCompare(b.id));
const skills = [];
const dirOf = new Map();
for (const { kind, id, dir } of folders) {
  const where = `${kind}/${id}`;
  const skill = (await import(pathToFileURL(join(dir, "index.ts")).href)).default;
  const fail = (why) => {
    console.log(`FAIL ${where}: ${why}`);
    process.exitCode = 1;
  };
  if (skill?.manifest?.id !== id) {
    fail(`index.ts must export default a skill with manifest.id "${id}"`);
    continue;
  }
  if (dirOf.has(id)) {
    fail(`the id is taken by ${dirOf.get(id)}`);
    continue;
  }
  if ((kind === "integrations") !== (skill.manifest.category === "integration")) {
    fail(
      kind === "integrations"
        ? 'an integration has category "integration"'
        : 'category "integration" belongs in integrations/'
    );
    continue;
  }
  dirOf.set(id, dir);
  skills.push(skill);
}

// The app's shared model passes are not here: their words let nothing in.
const match = { mayBe: { reminderOrEvent: () => false, draft: () => false } };
const ctx = (text) => ({
  lang: langOf(text),
  whenLabel: (at) => (at ? at.toISOString() : "No date"),
  when: () => ({ at: null, allDay: false }),
  model: { reminderOrEvent: async () => null, draft: async () => null },
});

// What a routed result shows: the reply, the question, what runs at once (its params — the
// run itself may reach the network, evals do not), or the card's title and detail.
function shown(routed) {
  if (!routed) return null;
  const r = routed.result;
  if ("reply" in r) return { reply: r.reply };
  if ("ask" in r) return { ask: r.ask };
  if ("act" in r) return { act: r.act };
  return { card: { title: r.card.title, detail: r.card.detail } };
}

function wanted(c) {
  if (c.reply) return { reply: c.reply };
  if (c.ask) return { ask: c.ask };
  if (c.act) return { act: c.act };
  if (c.card) return { card: c.card };
  return null;
}

let passed = 0;
let total = 0;
for (const skill of skills) {
  const id = skill.manifest.id;
  const file = join(dirOf.get(id), "evals.json");
  if (!existsSync(file)) {
    console.log(`\n${id}: no evals.json`);
    continue;
  }
  const { cases } = JSON.parse(readFileSync(file, "utf8"));
  console.log(`\n${id}`);
  for (const c of cases) {
    const routed = await route(c.text, c.before, skills, ctx(c.text), match, {
      rulesOnly: true,
    });
    const mine = routed?.skill.manifest.id === id;
    const got = mine ? shown(routed) : null;
    const ok = JSON.stringify(got) === JSON.stringify(wanted(c));
    total++;
    if (ok) passed++;
    const by = routed && !mine ? ` (taken by ${routed.skill.manifest.id})` : "";
    console.log(`${ok ? "ok  " : "FAIL"} ${c.text} → ${JSON.stringify(got)}${by}`);
  }
}
console.log(`\nskills: ${passed}/${total}`);
if (passed !== total) process.exitCode = 1;
