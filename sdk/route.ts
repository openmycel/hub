// Which skill takes a message: the same code in the app (../ui/chat-view.tsx) and in the
// eval script (scripts/eval-skills.mjs). No app imports, so Node runs it as is.
//
// Order: the answer to the app's own question first (`resume`), then intents that read
// by rules, then intents that need the model — within each, by manifest priority. The
// model never picks the skill; it only fills in the one the words chose.

import type {
  Act,
  Ask,
  Intent,
  Lang,
  MatchContext,
  Proposal,
  ReadContext,
  Reply,
  Skill,
} from "./index.ts";

export type Routed = {
  skill: Skill;
  intent: Intent;
  result: Proposal<unknown> | Act<unknown> | Ask | Reply;
};

// A script that names its language, first match wins: kana before Han, because Japanese
// writes both. Cyrillic is taken for Russian — the one Cyrillic language the skills have
// words for.
const SCRIPTS: [RegExp, Lang][] = [
  [/[а-яё]/i, "ru"],
  [/[\u3040-\u30ff]/u, "ja"],
  [/[\uac00-\ud7af]/u, "ko"],
  [/[\u4e00-\u9fff]/u, "zh"],
  [/[\u0600-\u06ff]/u, "ar"],
  [/[\u0590-\u05ff]/u, "he"],
  [/[\u0370-\u03ff]/u, "el"],
  [/[\u0e00-\u0e7f]/u, "th"],
  [/[\u0900-\u097f]/u, "hi"],
  [/[\u10a0-\u10ff]/u, "ka"],
  [/[\u0530-\u058f]/u, "hy"],
];

/**
 * The language of a message by its script. Latin script alone does not tell English from
 * Spanish: such a message is taken for `latin` — the app passes the phone's language when
 * that one is written in Latin script, English otherwise.
 */
export function langOf(text: string, latin: Lang = "en"): Lang {
  for (const [re, lang] of SCRIPTS) if (re.test(text)) return lang;
  return latin;
}

/** The phone's language as `latin` for langOf: itself if written in Latin script. */
export function latinOf(device: Lang): Lang {
  return SCRIPTS.some(([, lang]) => lang === device) ? "en" : device;
}

function byPriority(skills: Skill[]): Skill[] {
  return [...skills].sort((a, b) => (a.manifest.priority ?? 50) - (b.manifest.priority ?? 50));
}

export async function route(
  text: string,
  /** The assistant's last message: an `ask` of some intent, or anything else. */
  before: string | undefined,
  skills: Skill[],
  ctx: ReadContext,
  match: MatchContext,
  options: { rulesOnly?: boolean } = {}
): Promise<Routed | null> {
  const sorted = byPriority(skills);
  if (before) {
    for (const skill of sorted) {
      for (const intent of skill.intents) {
        const result = intent.resume ? await intent.resume(before, text, ctx) : null;
        if (result) return { skill, intent, result };
      }
    }
  }
  for (const model of [false, true]) {
    if (model && options.rulesOnly) break;
    for (const skill of sorted) {
      for (const intent of skill.intents) {
        if (!!intent.model !== model || !intent.match(text, match)) continue;
        const result = await intent.read(text, ctx);
        if (result) return { skill, intent, result };
      }
    }
  }
  return null;
}
