import type { Intent, Skill } from "../../sdk/index.ts";

// Events in the iPhone's Calendar, add-only: the app never reads the calendar.

type Event = { title: string; at: string | null; allDay: boolean };

const add: Intent<Event> = {
  id: "event",
  model: true,
  match: (text, ctx) => ctx.mayBe.reminderOrEvent(text),
  // The same pass as Reminders (one per message): a reminder is theirs.
  async read(text, ctx) {
    const found = await ctx.model.reminderOrEvent(text);
    if (found?.kind !== "event") return null;
    return {
      card: {
        title: found.title,
        detail: ctx.whenLabel(found.at, found.allDay),
        accept: ["Add", "Adding…"],
        editable: true,
      },
      params: {
        title: found.title,
        at: found.at?.toISOString() ?? null,
        allDay: found.allDay,
      },
    };
  },
  // An event needs a day: the card says "No date" and the tap explains.
  run: async (p, ctx) =>
    p.at
      ? ctx.calendar.addEvent({
          title: p.title,
          at: new Date(p.at),
          allDay: p.allDay,
        })
      : { ok: false, reason: "Say the day, and the time if there is one." },
};

const skill: Skill = {
  manifest: {
    apiVersion: 1,
    id: "calendar",
    name: "Calendar",
    tagline: "Events from the chat",
    description:
      "Adds an event after you tap Add. Access is add-only: it never reads your calendar.",
    publisher: "openmycel",
    category: "iphone",
    icon: { symbol: "calendar", bg: "#FFFFFF", fg: "#FF3B30" },
    brand: "apple-calendar",
    apps: ["Calendar"],
    access: ["Calendar"],
    can: "calendar events",
    examples: [
      "Dentist Friday at 10, add it to my calendar",
      "Team meeting tomorrow at 11:30, add it",
    ],
    priority: 20,
  },
  intents: [add],
};

export default skill;
