// Which article a message asks for, the request that finds it and the answer from what
// Wikipedia sends back. No imports: the evals run it in Node as is.
//
// The answer is the article's own first sentences, not the model's words: a small model
// makes facts up, the article does not.

// "Расскажи про Юпитер", "кто такой Пушкин", "tell me about Ada Lovelace", "what is a
// quasar": the subject is what follows.
const ASKS: RegExp[] = [
  /^расскажи(?:те)?\s+(?:мне\s+)?(?:про|об?|обо)\s+(.+)$/iu,
  /^кто\s+(?:такой|такая|такие|таков|был|была|были)\s+(.+)$/iu,
  /^что\s+такое\s+(.+)$/iu,
  /^(?:найди|поищи|посмотри)\s+(?:в\s+)?википеди[ия]\s+(?:про\s+|об?\s+)?(.+)$/iu,
  /^(?:найди|поищи|посмотри)\s+(.+?)\s+в\s+википедии$/iu,
  /^википедия[:,]?\s+(.+)$/iu,
  /^tell\s+me\s+about\s+(.+)$/i,
  /^who\s+(?:is|was|are|were)\s+(.+)$/i,
  /^what\s+(?:is|are|was|were)\s+(?:an?\s+|the\s+)?(.+)$/i,
  /^what'?s\s+(?:an?\s+|the\s+)?(.+)$/i,
  /^(?:look\s+up|search(?:\s+for)?)\s+(.+?)\s+(?:on|in)\s+wikipedia$/i,
  /^wikipedia[:,]?\s+(.+)$/i,
];

// Subjects that are not an article: the owner, the assistant, the moment. "What is your
// name", "what's the time", "что такое сегодня".
const NOT_A_SUBJECT =
  /(?<![\p{L}])(?:you|your|yours|my|me|i|it|this|that|time|weather|date|today|tomorrow|ты|тебя|твой|твое|твоя|мой|мое|моя|меня|я|это|он|она|они|погода|время|сегодня|завтра)(?![\p{L}])/iu;

export function readSubject(text: string): string | null {
  const t = text.trim().replace(/\s+/g, " ");
  for (const re of ASKS) {
    const m = re.exec(t);
    if (!m) continue;
    const subject = m[1]
      .replace(/[?!.…]+$/u, "")
      .replace(/^["«“']+|["»”']+$/gu, "")
      .trim();
    if (!subject || subject.length > 80) return null;
    // A whole sentence is a question for the model, not a title to look up.
    if (subject.split(" ").length > 6) return null;
    if (NOT_A_SUBJECT.test(subject)) return null;
    // Numbers and percentages are counted by other skills.
    if (/\d\s*%|\d\s*процент/iu.test(subject)) return null;
    return subject;
  }
  return null;
}

// Wikipedia of the message's language: "ja" → ja.wikipedia.org. Anything that is not a
// language code goes to the English one.
export const host = (lang: string): string =>
  `${/^[a-z]{2,3}$/.test(lang) ? lang : "en"}.wikipedia.org`;

// One request: the first five matches of the search with their first sentences as plain
// text, the link and whether the page only lists meanings ("Mercury most commonly refers
// to:"). API:Query with generator=search, prop=extracts (TextExtracts), info, pageprops.
export function searchUrl(subject: string, lang: string): string {
  const q = new URLSearchParams({
    action: "query",
    format: "json",
    formatversion: "2",
    generator: "search",
    gsrsearch: subject,
    gsrlimit: "5",
    prop: "extracts|info|pageprops",
    ppprop: "disambiguation",
    exintro: "1",
    explaintext: "1",
    exsentences: "3",
    inprop: "url",
    redirects: "1",
  });
  return `https://${host(lang)}/w/api.php?${q.toString()}`;
}

export type Article = { title: string; text: string; url: string };

type Page = {
  index?: number;
  title?: string;
  pageprops?: { disambiguation?: string };
  extract?: string;
  fullurl?: string;
};

export function articleOf(json: unknown): Article | null {
  const pages = (json as { query?: { pages?: Page[] } })?.query?.pages ?? [];
  // The pages come unordered; `index` is the search rank. A list of meanings is skipped.
  const page = pages
    .filter((p) => !p.pageprops || !("disambiguation" in p.pageprops))
    .sort((a, b) => (a.index ?? 99) - (b.index ?? 99))[0];
  if (!page?.title || !page.fullurl) return null;
  // Stress marks ("Юпи́тер") are for reading aloud, not for the chat; and what is left of
  // a pronunciation after plain text drops it: "A quasar ( KWAY-zar) is".
  const text = (page.extract ?? "")
    .replace(/\u0301/g, "")
    .replace(/\s\(\s[^()]*\)/g, "")
    // Zero-width spaces left from the article's markup (es.wikipedia).
    .replace(/\u200b/g, "")
    .trim();
  if (!text) return null;
  // "Меркурий_(планета)": brackets in a markdown link's address would end it early.
  const url = page.fullurl.replace(/\(/g, "%28").replace(/\)/g, "%29");
  return { title: page.title, text, url };
}

// Markdown for the chat: the article's words in the message's language, then the source
// and its licence (CC BY-SA 4.0 asks for a link to the article).
export function replyOf(a: Article): string {
  return `${a.text}\n\n[Wikipedia: ${a.title}](${a.url}) · CC BY-SA 4.0`;
}
