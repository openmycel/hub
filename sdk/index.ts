// The contract between OpenMycel and a skill. Types only: a skill imports them with
// `import type`, which the build erases, so a skill has no runtime dependency and the
// eval scripts run it in Node as is.
//
// A skill is a folder `skills/<id>/` — or `integrations/<id>/` when it talks to an outside
// service — whose index.ts default-exports a `Skill`. It never
// imports app code, fetches or stores anything itself: everything it may do comes in the
// context the app passes, limited by its manifest — the network too, only to the hosts
// the manifest names.

/**
 * The language of the message, an ISO 639-1 code: "en", "ru", "es", "ja"… A skill writes
 * its own words in English, the app's language; what it passes on (an article, a name, the
 * text to send) stays in this one.
 */
export type Lang = string;

/** Phone data a skill asks the owner for, in iOS Settings. */
export type Access = "Calendar" | "Reminders";

export type Manifest = {
  apiVersion: 1;
  /** Folder name and settings key: "percent". */
  id: string;
  name: string;
  /** One line under the name in Hub. */
  tagline: string;
  /** What it does and does not, on its Hub page. No promise it cannot keep. */
  description: string;
  /** Who publishes it: a folder `publishers/<id>/` with publisher.json and logo.png. */
  publisher: string;
  /** Hub section: through the iPhone's own apps, inside the app, or an outside service. */
  category: "iphone" | "app" | "integration";
  /** An SF Symbol on a coloured tile; `scale` is the symbol's share of the tile. */
  icon: { symbol: string; bg: string; fg: string; scale?: number };
  /** A drawn app icon instead of the tile (the app's own marks). */
  brand?: string;
  /** The iPhone apps it works through; Hub offers to get one that is deleted. */
  apps?: string[];
  /** App Store id of that app. */
  store?: string;
  access?: Access[];
  /** Words for the reply prompt, "reminders, timers": the model knows the skill exists. */
  can?: string;
  /** Phrases that work, shown in Hub. Every one is a case in the skill's evals. */
  examples: string[];
  /** Lower goes first when two skills of one kind (rules / model) could take a message. */
  priority?: number;
  /**
   * Every host the skill reaches, and why, shown in Hub before it is turned on. `net`
   * refuses any other host before the request. "*.wikipedia.org": any one subdomain.
   */
  connections?: { host: string; why: string }[];
};

/**
 * A publisher: `publishers/<id>/publisher.json`, with a square logo.png next to it. Hub
 * shows its page: the logo, the name, the description and every skill and integration
 * whose manifest names it.
 */
export type Publisher = {
  /** Folder name, the `publisher` in a manifest: "openmycel". */
  id: string;
  name: string;
  /** Who they are, on their page. A few sentences. */
  description: string;
  /** Their site or repo, opened from their page. */
  url?: string;
};

/** The card the owner confirms. Nothing happens before the tap. */
export type Card = {
  title: string;
  detail?: string;
  /** The button and its label while running: "Add" / "Adding…". */
  accept: [string, string];
  /** The title can be changed on the card before the tap. */
  editable?: boolean;
  /** Offer the system share sheet when the app it opens is missing or cannot send. */
  share?: boolean;
};

/**
 * A card to confirm, with what `run` gets after the tap. `params` must be plain JSON: it is
 * kept in the chat. With `editable`, the title the owner leaves comes back as `params.title`.
 */
export type Proposal<P> = { card: Card; params: P };
/**
 * Run at once, no card: `run` gets these params right away and its `reply` is the answer.
 * Only for a lookup that reads and shows (an article) — anything that writes or sends
 * waits for the tap on a card.
 */
export type Act<P> = { act: P };
/** The app asks this and waits: the next message goes to the intent's `resume`. */
export type Ask = { ask: string };
/** An answer shown as is, nothing is done: a calculation, a fact from the skill's data. */
export type Reply = { reply: string };
/** null: not this intent's message after all; the next one is tried. */
export type Read<P> = Proposal<P> | Act<P> | Ask | Reply | null;

export type When = { at: Date | null; allDay: boolean };

export type MatchContext = {
  /** The words that let a message into a shared model pass (ReadContext.model). */
  mayBe: {
    reminderOrEvent(text: string): boolean;
    draft(text: string): boolean;
  };
};

export type ReadContext = {
  /** The language of the message: answer and ask in it. */
  lang: Lang;
  /** "Today, 19:00", "Tomorrow", "No date". */
  whenLabel(at: Date | null, allDay: boolean): string;
  /** Date and time in the message: "tomorrow at 9", "on Friday". */
  when(text: string): When;
  /** Passes of the on-device model that several skills share: one pass per message. */
  model: {
    reminderOrEvent(text: string): Promise<{
      kind: "reminder" | "event";
      title: string;
      at: Date | null;
      allDay: boolean;
    } | null>;
    draft(text: string): Promise<{ kind: "sms" | "email"; text: string } | null>;
  };
};

/**
 * How `run` went. `ref`: what it made (a reminder id), for a later rename. `reply`: what it
 * found, shown in the chat under the card (markdown: text, a link, an image).
 */
export type Done =
  | { ok: true; detail?: string; ref?: string; stay?: boolean; reply?: string }
  | { ok: false; reason: string };

export type RunContext = {
  lang: Lang;
  reminders: {
    add(r: { title: string; at: Date | null; allDay: boolean }): Promise<Done>;
    /**
     * A reminder with an alarm in `minutes`: it rings from Reminders with the app closed.
     * `detail` of the result: "rings at Today, 22:19".
     */
    timer(title: string, minutes: number): Promise<Done>;
    rename(ref: string, title: string): Promise<Done>;
  };
  calendar: {
    addEvent(e: { title: string; at: Date; allDay: boolean }): Promise<Done>;
  };
  /**
   * The system sheet with the text; the owner picks who and sends. `detail` "Sent" or
   * "Saved"; closed without sending — `stay`: the card waits for another try.
   */
  compose: {
    text(body: string): Promise<Done>;
    email(body: string): Promise<Done>;
  };
  /**
   * The notes inside the app, after the tap. `append` finds the note by `title` (exact,
   * then the newest that starts with it, then the newest that contains it; null: the
   * last one written), `detail` names it: "Added to “Shopping list”". A skill with
   * `connections` is refused: it would learn the titles of the owner's notes and could
   * send them.
   */
  notes: {
    create(title: string, body: string): Promise<Done>;
    append(title: string | null, text: string): Promise<Done>;
  };
  /**
   * A GET to a host in the manifest's `connections`, the JSON it answers. Only from `run`:
   * after the tap on a card, or at once for an `act`. The app names itself in User-Agent;
   * the skill sets no headers. Throws on another host, no network, or an error status.
   */
  net: {
    json(url: string): Promise<unknown>;
  };
};

export type Intent<P = unknown> = {
  id: string;
  /** `read` runs the model: tried after the intents that read by rules. */
  model?: boolean;
  /** Is the message a candidate, by words only: cheap, no model, no promises. */
  match(text: string, ctx: MatchContext): boolean;
  read(text: string, ctx: ReadContext): Read<P> | Promise<Read<P>>;
  /** The answer to this intent's own `ask`, read without the words `match` needs. */
  resume?(question: string, text: string, ctx: ReadContext): Read<P> | Promise<Read<P>>;
  /** After the tap, or at once for an `act`. Absent for intents that only reply. */
  run?(params: P, ctx: RunContext): Promise<Done>;
};

export type Skill = {
  manifest: Manifest;
  // Each intent keeps its own params type; the app only passes them back to its `run`.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  intents: Intent<any>[];
  /** A new name for what `run` made (its `ref`): "rename the last timer to Tea". */
  rename?(ref: string, title: string, ctx: RunContext): Promise<Done>;
};
