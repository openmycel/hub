import type { Intent, Proposal, Skill } from "../../sdk/index.ts";
import { capital, noteAsk, noteAskedFor, noteTitle, readNote, type NoteRequest } from "./notes.ts";

// Notes inside the app, written from the chat: they live in the app's encrypted database,
// not in Apple Notes. The skill reads the words, the app writes after the tap
// (RunContext.notes).

type NoteParams =
  | { mode: "new"; title: string; body: string }
  | { mode: "add"; title: string | null; body: string };

function noteCard(request: NoteRequest): Proposal<NoteParams> {
  if (request.mode === "new") {
    const title = request.title ?? noteTitle(request.body);
    return {
      card: {
        title,
        detail: request.body,
        accept: ["Save", "Saving…"],
        editable: true,
      },
      params: { mode: "new", title, body: request.body },
    };
  }
  return {
    card: {
      title: request.title ?? "Last note",
      detail: `+ ${request.body}`,
      accept: ["Add", "Adding…"],
    },
    params: { mode: "add", title: request.title, body: request.body },
  };
}

const note: Intent<NoteParams> = {
  id: "note",
  match: (text) => /(?<!\p{L})(заметк|note)/iu.test(text),
  // With the text — a card; without it the skill asks for the text.
  read(text, ctx) {
    const request = readNote(text);
    if (!request) return null;
    return request.body ? noteCard(request) : { ask: noteAsk(request, ctx.lang === "ru") };
  },
  // The text right after that question.
  resume(question, text) {
    const request = noteAskedFor(question);
    const body = capital(text);
    return request && body ? noteCard({ ...request, body }) : null;
  },
  run: (p, ctx) =>
    p.mode === "new" ? ctx.notes.create(p.title, p.body) : ctx.notes.append(p.title, p.body),
};

const skill: Skill = {
  manifest: {
    apiVersion: 1,
    id: "notes",
    name: "Notes",
    tagline: "Notes from the chat, kept in the app",
    description:
      "Writes a new note or adds a line to one after you tap Save or Add. The notes stay in the app's encrypted data, in Folders, not in Apple Notes. Nothing leaves the phone.",
    publisher: "openmycel",
    category: "app",
    icon: { symbol: "note.text", bg: "#FFCC00", fg: "#FFFFFF", scale: 0.5 },
    can: "notes",
    examples: ["Note: the wifi password is on the router", "Add to note Shopping: eggs"],
  },
  intents: [note],
};

export default skill;
