/**
 * NovelMap Plugin: Word Frequency Analyzer
 *
 * Example plugin demonstrating all plugin capabilities.
 * Install by copying this directory to ~/.novelmap/plugins/word-frequency/
 *
 * This plugin:
 *   - Analyzes word frequency across all manuscripts in a project
 *   - Identifies overused words and unique vocabulary per book
 *   - Provides a rendered HTML view with charts
 */

// Common English stop words to filter out
const STOP_WORDS = new Set([
  "the", "a", "an", "and", "or", "but", "in", "on", "at", "to", "for",
  "of", "with", "by", "from", "is", "was", "are", "were", "be", "been",
  "being", "have", "has", "had", "do", "does", "did", "will", "would",
  "could", "should", "may", "might", "shall", "can", "need", "must",
  "that", "this", "these", "those", "it", "its", "he", "she", "him",
  "her", "his", "they", "them", "their", "we", "us", "our", "you",
  "your", "i", "me", "my", "not", "no", "so", "if", "as", "up", "out",
  "about", "into", "over", "after", "than", "then", "just", "also",
  "more", "very", "all", "each", "every", "both", "few", "some", "any",
  "who", "what", "which", "when", "where", "how", "there", "here",
  "said", "like", "one", "two", "back", "down", "now", "only", "even",
]);

/** @type {import('@novelmap/core').AnalyzerPlugin & import('@novelmap/core').ViewPlugin} */
const plugin = {
  manifest: {
    name: "word-frequency",
    version: "1.0.0",
    description: "Analyzes word frequency across manuscripts.",
    capabilities: ["analyzer", "view"],
  },

  // --- Analyzer capability ---

  async analyze(db, projectId) {
    const manuscripts = db.db
      .prepare("SELECT id, title FROM manuscript WHERE project_id = ? ORDER BY id")
      .all(projectId);

    const globalFreq = new Map();
    const perBook = [];

    for (const ms of manuscripts) {
      const chapters = db.db
        .prepare("SELECT body FROM chapter WHERE manuscript_id = ?")
        .all(ms.id);

      const bookFreq = new Map();
      let wordCount = 0;

      for (const ch of chapters) {
        const words = ch.body.toLowerCase().replace(/[^a-z\s'-]/g, "").split(/\s+/);
        for (const word of words) {
          if (word.length < 3 || STOP_WORDS.has(word)) continue;
          wordCount++;
          bookFreq.set(word, (bookFreq.get(word) || 0) + 1);
          globalFreq.set(word, (globalFreq.get(word) || 0) + 1);
        }
      }

      const sorted = [...bookFreq.entries()].sort((a, b) => b[1] - a[1]);

      perBook.push({
        manuscriptId: ms.id,
        manuscriptTitle: ms.title,
        wordCount,
        uniqueWords: bookFreq.size,
        topWords: sorted.slice(0, 25).map(([word, count]) => ({ word, count })),
      });
    }

    const globalSorted = [...globalFreq.entries()].sort((a, b) => b[1] - a[1]);

    // Find overused words (appear in top 20 of every book)
    const topPerBook = perBook.map((b) => new Set(b.topWords.slice(0, 20).map((w) => w.word)));
    const overused = globalSorted
      .filter(([word]) => topPerBook.every((set) => set.has(word)))
      .slice(0, 10)
      .map(([word, count]) => ({ word, count }));

    // Find unique vocabulary per book (words that only appear in one book)
    const wordToBooks = new Map();
    for (const book of perBook) {
      for (const { word } of book.topWords) {
        if (!wordToBooks.has(word)) wordToBooks.set(word, []);
        wordToBooks.get(word).push(book.manuscriptTitle);
      }
    }
    const uniquePerBook = perBook.map((book) => ({
      manuscriptTitle: book.manuscriptTitle,
      uniqueWords: book.topWords
        .filter(({ word }) => wordToBooks.get(word)?.length === 1)
        .slice(0, 10),
    }));

    return {
      title: "Word Frequency Analysis",
      summary: `Analyzed ${globalFreq.size.toLocaleString()} unique words across ${perBook.length} manuscripts.`,
      data: {
        globalTopWords: globalSorted.slice(0, 50).map(([word, count]) => ({ word, count })),
        overusedWords: overused,
        perBook,
        uniquePerBook,
        totalUniqueWords: globalFreq.size,
      },
    };
  },

  // --- View capability ---

  label: "Word Frequency",
  icon: "M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25H12",

  async render(db, projectId) {
    const result = await plugin.analyze(db, projectId);
    const data = result.data;

    const h = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;");

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Word Frequency — NovelMap Plugin</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { background: #1a1a2e; color: #e0e0e0; font-family: system-ui, sans-serif; padding: 30px; }
    h1 { color: #e94560; margin-bottom: 5px; }
    h2 { color: #a0c4ff; margin: 30px 0 15px; font-size: 1.3em; }
    .subtitle { color: #888; margin-bottom: 25px; }
    .stats { display: flex; gap: 15px; margin-bottom: 25px; }
    .stat { background: #16213e; border: 1px solid #0f3460; border-radius: 10px; padding: 15px 20px; text-align: center; flex: 1; }
    .stat .val { font-size: 1.8em; font-weight: bold; color: #e94560; }
    .stat .lbl { font-size: 0.75em; color: #888; text-transform: uppercase; letter-spacing: 0.1em; margin-top: 3px; }
    .bar-chart { margin: 10px 0; }
    .bar-row { display: flex; align-items: center; margin: 4px 0; }
    .bar-label { width: 120px; text-align: right; padding-right: 10px; font-size: 0.85em; color: #a0a0a0; }
    .bar-track { flex: 1; background: #0f3460; border-radius: 4px; height: 22px; overflow: hidden; }
    .bar-fill { height: 100%; border-radius: 4px; display: flex; align-items: center; padding-left: 8px; font-size: 0.75em; color: white; }
    .section { background: #16213e; border: 1px solid #0f3460; border-radius: 12px; padding: 20px; margin: 15px 0; }
    .overused { display: flex; flex-wrap: wrap; gap: 8px; }
    .overused .tag { background: #e94560; color: white; padding: 4px 14px; border-radius: 20px; font-size: 0.85em; }
    .unique-tag { background: #45e9a0; color: #1a1a2e; padding: 3px 12px; border-radius: 20px; font-size: 0.8em; display: inline-block; margin: 2px; }
  </style>
</head>
<body>
  <h1>Word Frequency</h1>
  <p class="subtitle">${h(result.summary)}</p>

  <div class="stats">
    <div class="stat"><div class="val">${data.totalUniqueWords.toLocaleString()}</div><div class="lbl">Unique Words</div></div>
    <div class="stat"><div class="val">${data.perBook.length}</div><div class="lbl">Books Analyzed</div></div>
    <div class="stat"><div class="val">${data.overusedWords.length}</div><div class="lbl">Overused Words</div></div>
  </div>

  ${data.overusedWords.length > 0 ? `
  <h2>Overused Words</h2>
  <p style="color:#888;font-size:0.85em;margin-bottom:10px;">Words that appear in the top 20 most frequent of every book.</p>
  <div class="overused">
    ${data.overusedWords.map((w) => `<span class="tag">${h(w.word)} (${w.count})</span>`).join("")}
  </div>` : ""}

  <h2>Top Words (All Books)</h2>
  <div class="section">
    <div class="bar-chart">
      ${data.globalTopWords.slice(0, 20).map((w) => {
        const maxCount = data.globalTopWords[0].count;
        const pct = Math.round((w.count / maxCount) * 100);
        return `<div class="bar-row">
          <div class="bar-label">${h(w.word)}</div>
          <div class="bar-track">
            <div class="bar-fill" style="width:${pct}%;background:#e94560;">${w.count}</div>
          </div>
        </div>`;
      }).join("")}
    </div>
  </div>

  ${data.perBook.map((book) => `
  <h2>${h(book.manuscriptTitle)}</h2>
  <div class="section">
    <p style="color:#888;font-size:0.85em;margin-bottom:10px;">${book.wordCount.toLocaleString()} words, ${book.uniqueWords.toLocaleString()} unique</p>
    <div class="bar-chart">
      ${book.topWords.slice(0, 15).map((w) => {
        const maxCount = book.topWords[0].count;
        const pct = Math.round((w.count / maxCount) * 100);
        return `<div class="bar-row">
          <div class="bar-label">${h(w.word)}</div>
          <div class="bar-track">
            <div class="bar-fill" style="width:${pct}%;background:#a0c4ff;">${w.count}</div>
          </div>
        </div>`;
      }).join("")}
    </div>
  </div>`).join("")}

  ${data.uniquePerBook.some((b) => b.uniqueWords.length > 0) ? `
  <h2>Unique Vocabulary Per Book</h2>
  <p style="color:#888;font-size:0.85em;margin-bottom:10px;">Top words that appear only in one book — distinctive vocabulary.</p>
  ${data.uniquePerBook.filter((b) => b.uniqueWords.length > 0).map((book) => `
  <div class="section">
    <h3 style="color:#a0c4ff;margin-bottom:8px;">${h(book.manuscriptTitle)}</h3>
    <div>${book.uniqueWords.map((w) => `<span class="unique-tag">${h(w.word)} (${w.count})</span>`).join("")}</div>
  </div>`).join("")}` : ""}

</body>
</html>`;
  },
};

module.exports = plugin;
module.exports.default = plugin;
