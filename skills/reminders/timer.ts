// "Timer for 12 minutes, pasta": read by rules, no model pass.
// The alert is a reminder with an alarm (RunContext.reminders.timer): the app has no
// notifications of its own. No imports, so a script runs it as is.
// The Russian words in the patterns and questions are data: what Russian speakers type
// and read. Everything else is English.

export type Timer = { minutes: number; label: string };

const TIMER = /(?<!\p{L})(таймер|timer)/iu;

const WORDS: Record<string, number> = {
  минуту: 1,
  одну: 1,
  две: 2,
  три: 3,
  пять: 5,
  десять: 10,
  пятнадцать: 15,
  двадцать: 20,
  тридцать: 30,
  сорок: 40,
  a: 1,
  an: 1,
  one: 1,
  two: 2,
  three: 3,
  five: 5,
  ten: 10,
  fifteen: 15,
  twenty: 20,
  thirty: 30,
  forty: 40,
};

function amount(word: string | undefined): number {
  if (!word) return 1;
  const n = Number(word.replace(",", "."));
  return Number.isFinite(n) ? n : (WORDS[word.toLowerCase()] ?? NaN);
}

function duration(text: string): number | null {
  if (/полчаса|half an hour/iu.test(text)) return 30;
  if (/полтора часа|an hour and a half/iu.test(text)) return 90;
  const m =
    /(?<!\p{L})(\d+(?:[.,]\d+)?|\p{L}+)?[\s-]*(минут\p{L}*|мин(?!\p{L})|час\p{L}*|секунд\p{L}*|сек(?!\p{L})|minutes?|mins?|hours?|hrs?|seconds?|secs?)(?!\p{L})/iu.exec(
      text
    );
  if (!m) return null;
  // "a timer for an hour": no number means one.
  const word = m[1] && !/^(на|for|по)$/i.test(m[1]) ? m[1] : undefined;
  const n = amount(word);
  if (!Number.isFinite(n) || n <= 0) return null;
  const unit = m[2].toLowerCase();
  if (/^(час|hour|hr)/.test(unit)) return n * 60;
  if (/^(сек|sec)/.test(unit)) return n / 60;
  return n;
}

// "Timer for 12 minutes, pasta" and "timer 10 minutes — eggs": the name comes after a
// comma or a dash.
function labelOf(text: string): string {
  const m = /[,—–-]\s*([^,—–-]+?)\s*[.!]?$/u.exec(text);
  if (!m || TIMER.test(m[1]) || duration(m[1]) !== null) return "";
  // Quotes copied along with an example: «tea“ → Tea.
  const label = m[1].replace(/["'«»„“”‘’]/gu, "").trim();
  return label.charAt(0).toUpperCase() + label.slice(1);
}

// `asked`: the message answers the app's own question (TIMER_ASKS), so "10 minutes"
// counts without the word.
export function readTimer(text: string, asked = false): Timer | null {
  if (!asked && !TIMER.test(text)) return null;
  // "10" after the app asked "How long?": minutes.
  const bare = asked ? /^\s*(\d+)\s*[.!]?\s*$/.exec(text) : null;
  const minutes = bare ? Number(bare[1]) : duration(text);
  // Longer than a day is not a timer.
  if (minutes === null || minutes <= 0 || minutes > 24 * 60) return null;
  return { minutes, label: labelOf(text) };
}

// "Set a timer" without a duration: the app asks by itself instead of the model, which
// asked "What timer do you need?" and then could not tell the answer was for the timer.
// The answer is read as a timer only after exactly these words (see readTimer).
// How-questions ("how does a timer work?") go to the model.
export const TIMER_ASKS = {
  ru: "На сколько поставить таймер? Например: «на 10 минут, чай».",
  en: "How long should the timer run? For example: “10 minutes, pasta”.",
};
const HOW = /^\s*(как|что|чем|зачем|почему|сколько|how|what|why|which)(?!\p{L})/iu;
// A request for a timer, not a story about one ("my timer broke"): a verb that asks, or
// the word alone.
const WANTS =
  /(?<!\p{L})(постав|завед|включи|запуст|установ|сделай|нужен|можешь|сможешь|умеешь|set|start|need|can you|could you)|^\s*(таймер|timer)\s*[.!?]*\s*$/iu;
const REMINDS = /(?<!\p{L})(напомн|remind)/iu;

export function askTimer(text: string): string | null {
  if (!TIMER.test(text) || !WANTS.test(text) || HOW.test(text) || REMINDS.test(text)) return null;
  if (duration(text) !== null) return null;
  return /[а-яё]/i.test(text) ? TIMER_ASKS.ru : TIMER_ASKS.en;
}

export function isTimerAsk(text: string | undefined): boolean {
  return text === TIMER_ASKS.ru || text === TIMER_ASKS.en;
}

// "10 min", "1 h 30 min", "45 s".
export function timerLabel(minutes: number): string {
  if (minutes < 1) return `${Math.round(minutes * 60)} s`;
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  if (!h) return `${m} min`;
  return m ? `${h} h ${m} min` : `${h} h`;
}
