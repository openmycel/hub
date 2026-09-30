# Wikipedia

Looks up a person, a place or a thing: "tell me about Jupiter", "who was Ada Lovelace?",
"кто такой Пушкин". The answer is the article's own first sentences with the link at the
end — the model does not write it, so it does not make facts up.

The first skill that reaches the network, and the first `act`: it only reads and shows,
so it runs at once, without a card. Only the subject leaves the phone, to the Wikipedia
in the language of the message (`ctx.lang`: "ja" → ja.wikipedia.org), so the article
comes in the owner's language.

Not a web search: no news, prices or schedules.

- `index.ts` — the skill: manifest with `connections`, one intent: `read` → `act`, `run`.
- `wiki.ts` — the rules: which messages, the request, the answer from what Wikipedia
  sends back. One request: `api.php` with `generator=search` (the first five matches),
  `prop=extracts` (three sentences, plain text), `info` (the link), `pageprops` (a page
  that only lists meanings is skipped).
- `evals.json` — messages and what runs (`act`: the subject and the language; `null`: not
  this skill's message).

Wikipedia's text is CC BY-SA 4.0: the answer links the article and names the licence
([Terms of Use](https://foundation.wikimedia.org/wiki/Policy:Terms_of_Use)). Requests carry
a User-Agent with the app's name and the Hub's address, as the
[User-Agent policy](https://foundation.wikimedia.org/wiki/Policy:User-Agent_policy) asks.
