// "15% of 2400", "tip 18% on 64.50": the numbers are read and counted by code. A 1.7B
// model gets arithmetic wrong; here it is not asked. No imports, so a script runs it as is.
// The Russian words in the patterns are data: the phrases Russian speakers type.

export type Percent = { rate: number; base: number; tip: boolean };

// "2 400", "64,50", "1,234.5" → a number; a comma is a decimal point unless it groups
// thousands ("1,234").
function number(raw: string): number {
  const t = raw.replace(/\s/g, "");
  const grouped = /^\d{1,3}(,\d{3})+(\.\d+)?$/.test(t);
  return Number(grouped ? t.replace(/,/g, "") : t.replace(",", "."));
}

const NUM = "(\\d[\\d\\s]*(?:[.,]\\d+)*)";
const RATE = `${NUM}\\s*(?:%|процент\\p{L}*|percent)`;
// "15% of 80", "18% on 64.50", and the same in Russian.
const OF = new RegExp(`${RATE}\\s+(?:от|of|on|из)\\s+${NUM}`, "iu");
// "tip on 64.50 at 18%": the base before the rate.
const BEFORE = new RegExp(`${NUM}\\s+(?:под|at|по)?\\s*${RATE}`, "iu");
const TIP = /(?<!\p{L})(чаев\p{L}*|tip)(?!\p{L})/iu;

export function readPercent(text: string): Percent | null {
  const of = OF.exec(text);
  const found = of ? { rate: number(of[1]), base: number(of[2]) } : null;
  const before = !found && TIP.test(text) ? BEFORE.exec(text) : null;
  const pair = found ?? (before ? { rate: number(before[2]), base: number(before[1]) } : null);
  if (!pair || !Number.isFinite(pair.rate) || !Number.isFinite(pair.base)) return null;
  if (pair.rate <= 0 || pair.rate > 1000) return null;
  return { ...pair, tip: TIP.test(text) };
}

// Two decimals at most, no trailing zeros: 360, 11.61, 0.5.
export function format(n: number, ru: boolean): string {
  const s = String(Math.round(n * 100) / 100);
  return ru ? s.replace(".", ",") : s;
}

export function answer({ rate, base, tip }: Percent, ru: boolean): string {
  const part = (base * rate) / 100;
  const [r, b, p, total] = [rate, base, part, base + part].map((n) => format(n, ru));
  if (tip) {
    return ru
      ? `Чаевые ${r}% от ${b} — ${p}, всего ${total}.`
      : `Tip: ${r}% of ${b} is ${p}, total ${total}.`;
  }
  return ru ? `${r}% от ${b} — ${p}.` : `${r}% of ${b} is ${p}.`;
}
