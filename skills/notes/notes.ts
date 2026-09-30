// "Заметка: молоко, хлеб", "добавь в заметку Покупки: яйца": read by rules, no model pass,
// like a timer (../reminders/timer.ts). A note needs the word "заметка" / "note", so
// "запиши меня к стоматологу" stays a calendar event. Without the text the skill asks,
// and the next message is the text.

/** `title` null: a new note is named by its first words; the last one for `add`. */
export type NoteRequest =
  | { mode: "new"; title: string | null; body: string }
  | { mode: "add"; title: string | null; body: string };

const NOTE = "(?:заметк\\p{L}*|note|notes)";
// "Заметка: …", "новая заметка …", "note: …" at the start.
const LEADS = new RegExp(`^\\s*(?:новая\\s+|new\\s+)?${NOTE}(?!\\p{L})\\s*`, "iu");
// A verb that writes a new note.
const NEW = new RegExp(
  `^\\s*(?:давай\\s+|пожалуйста\\s+|please\\s+)?(?:запиши|сохрани|создай|сделай|напиши|make|take|save|write|create)(?!\\p{L})(?:\\s+(?:a|an|me|мне))?\\s+(?:в\\s+|to\\s+|as\\s+)?(?:(?:новую|a new|new)\\s+)?${NOTE}(?!\\p{L})\\s*`,
  "iu"
);
// A verb that adds to an existing note.
const ADD = new RegExp(
  `^\\s*(?:давай\\s+|пожалуйста\\s+|please\\s+)?(?:добавь|допиши|add|append)(?!\\p{L})\\s+(?:в|to)\\s+(?:(?:мою|the|my)\\s+)?(?:(последн\\p{L}*|last)\\s+)?${NOTE}(?!\\p{L})\\s*`,
  "iu"
);
// "Как сделать заметку?" is a question for the model.
const HOW = /^\s*(как|что|чем|зачем|почему|где|how|what|why|where|which)(?!\p{L})/iu;

export function capital(text: string): string {
  const t = text.trim();
  return t.charAt(0).toUpperCase() + t.slice(1);
}

// «Покупки»: молоко → ["Покупки", "молоко"]; "Покупки: молоко" → the same; ": молоко" →
// [null, "молоко"]. `firstWord`: "Покупки яйца" without a colon names the note by its
// first word (adding to a note needs a name).
function titled(rest: string, firstWord: boolean): [string | null, string] {
  const quoted = /^["«„“]([^"»”“]+)["»”“]\s*:?\s*([\s\S]*)$/u.exec(rest);
  if (quoted) return [quoted[1].trim(), unlead(quoted[2])];
  const colon = /^([^:\n]{0,40}):\s*([\s\S]*)$/u.exec(rest);
  if (colon) return [colon[1].trim() || null, colon[2]];
  if (firstWord) {
    const word = /^(\S+)(?:\s+([\s\S]+))?$/u.exec(rest.trim());
    if (word) return [word[1], unlead(word[2] ?? "")];
  }
  return [null, rest];
}

// "Заметка - купить", "Заметка — купить", "note: buy": a colon or a dash before the text.
function unlead(text: string): string {
  return text.replace(/^\s*[:\-–—]\s*/u, "");
}

export function readNote(text: string): NoteRequest | null {
  if (HOW.test(text)) return null;
  const add = ADD.exec(text);
  if (add) {
    const rest = text.slice(add[0].length);
    // "в последнюю заметку": the note written last.
    const [title, body] = add[1] ? [null, unlead(rest)] : titled(unlead(rest), true);
    return { mode: "add", title: title && capital(title), body: capital(body) };
  }
  const lead = NEW.exec(text) ?? LEADS.exec(text);
  if (!lead) return null;
  // "Заметки" alone or "note that" in a story: only the start of a message is a request.
  const [title, body] = titled(unlead(text.slice(lead[0].length)), false);
  return { mode: "new", title: title && capital(title), body: capital(body) };
}

/** The name of a new note without one: its first line, cut at a word, at most 40 letters. */
export function noteTitle(body: string): string {
  const line = body.split("\n")[0].trim();
  if (line.length <= 40) return capital(line);
  const cut = line.slice(0, 40);
  return capital(cut.slice(0, cut.lastIndexOf(" ") > 20 ? cut.lastIndexOf(" ") : 40)) + "…";
}

// The app's own questions when the text is missing; the answer after exactly these words
// is the text. Adding to a note names it in quotes, so the question keeps which note.
export function noteAsk(request: NoteRequest, ru: boolean): string {
  if (request.mode === "new") return ru ? "Что записать в заметку?" : "What should the note say?";
  if (!request.title) return ru ? "Что добавить в заметку?" : "What should I add to the note?";
  return ru ? `Что добавить в «${request.title}»?` : `What should I add to “${request.title}”?`;
}

/** The request the app asked the text for, or null if `text` is not its question. */
export function noteAskedFor(text: string | undefined): NoteRequest | null {
  if (!text) return null;
  if (text === "Что записать в заметку?" || text === "What should the note say?") {
    return { mode: "new", title: null, body: "" };
  }
  if (text === "Что добавить в заметку?" || text === "What should I add to the note?") {
    return { mode: "add", title: null, body: "" };
  }
  const named = /^(?:Что добавить в «(.+)»\?|What should I add to “(.+)”\?)$/u.exec(text);
  return named ? { mode: "add", title: named[1] ?? named[2], body: "" } : null;
}
