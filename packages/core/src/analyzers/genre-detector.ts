import type { Database as DB } from "../db/database.js";

/**
 * Genre and sub-genre auto-detection.
 *
 * Analyzes manuscript text for lexical markers, structural patterns, and
 * thematic signals to classify genre and sub-genres. Designed to help
 * authors — especially new ones — understand where their work sits in the
 * market without having to be genre experts themselves.
 */

export interface GenreSignal {
  genre: string;
  subGenres: string[];
  confidence: number; // 0–1
  markers: string[];  // example words/phrases that triggered this signal
}

export interface GenreAnalysis {
  manuscriptId: number;
  manuscriptTitle: string;
  /** Primary genre (highest confidence) */
  primaryGenre: string;
  /** All detected genres ranked by confidence */
  genres: GenreSignal[];
  /** Word count of the manuscript */
  wordCount: number;
  /** Suggested BISAC-style categories */
  suggestedCategories: string[];
  /** Thematic keywords found */
  themes: string[];
}

export interface ProjectGenreAnalysis {
  projectId: number;
  manuscripts: GenreAnalysis[];
  /** Overall series genre (aggregated) */
  seriesGenre: string;
  /** Recurring themes across all books */
  recurringThemes: string[];
  /** Genre consistency note */
  genreConsistency: string;
}

// --- Genre lexicons ---

interface GenreProfile {
  genre: string;
  subGenres: { name: string; keywords: string[] }[];
  /** Primary keywords — presence of these strongly suggests this genre */
  keywords: string[];
  /** Structural markers — chapter-level patterns */
  structuralHints: string[];
}

const GENRE_PROFILES: GenreProfile[] = [
  {
    genre: "Thriller",
    keywords: [
      "assassin", "operative", "surveillance", "classified", "covert",
      "detonation", "hostage", "extraction", "intelligence", "agency",
      "target", "protocol", "threat", "countdown", "abort", "mission",
      "sniper", "tactical", "secure channel", "dead drop", "handler",
      "safehouse", "asset", "compromised", "exfiltrate", "cipher",
      "interrogation", "perimeter", "backup", "eliminate", "strike team",
    ],
    subGenres: [
      {
        name: "Techno-Thriller",
        keywords: [
          "satellite", "cyber", "hack", "encryption", "server", "drone",
          "algorithm", "firewall", "ai", "artificial intelligence", "neural",
          "quantum", "network", "malware", "ransomware", "biometric",
          "surveillance system", "darknet", "blockchain", "exploit",
          "zero-day", "backdoor", "payload", "silicon", "processor",
        ],
      },
      {
        name: "Political Thriller",
        keywords: [
          "senator", "president", "cabinet", "diplomat", "embassy",
          "parliament", "coalition", "treaty", "sanctions", "geopolitical",
          "administration", "chief of staff", "secretary of state",
          "nato", "united nations", "summit", "bilateral", "regime",
          "coup", "election", "campaign", "lobbyist", "congressional",
        ],
      },
      {
        name: "Spy Thriller",
        keywords: [
          "mi6", "cia", "mossad", "fsb", "kgb", "double agent",
          "mole", "tradecraft", "legend", "cover identity", "sleeper",
          "defector", "station chief", "case officer", "burned",
        ],
      },
      {
        name: "Legal Thriller",
        keywords: [
          "attorney", "verdict", "plaintiff", "defendant", "courtroom",
          "judge", "jury", "deposition", "objection", "counsel",
          "prosecution", "defense", "testimony", "cross-examine", "statute",
        ],
      },
      {
        name: "Medical Thriller",
        keywords: [
          "pathogen", "outbreak", "quarantine", "vaccine", "pandemic",
          "contagion", "cdc", "lab", "specimen", "clinical trial",
          "patient zero", "biosafety", "autopsy", "viral", "mutation",
        ],
      },
    ],
    structuralHints: ["short chapters", "cliffhanger endings", "multiple pov"],
  },
  {
    genre: "Science Fiction",
    keywords: [
      "starship", "galaxy", "planet", "orbit", "light-year", "warp",
      "colony", "alien", "species", "terraforming", "cryogenic",
      "faster than light", "space station", "hyperspace", "nebula",
      "android", "cyborg", "nanobots", "hologram", "teleport",
      "fusion reactor", "antimatter", "interstellar", "parsec",
    ],
    subGenres: [
      {
        name: "Space Opera",
        keywords: [
          "empire", "fleet", "admiral", "rebellion", "galactic",
          "federation", "armada", "battleship", "cruiser", "sector",
        ],
      },
      {
        name: "Cyberpunk",
        keywords: [
          "neon", "implant", "augmented", "megacorp", "street samurai",
          "netrunner", "chrome", "jack in", "datajack", "sprawl",
        ],
      },
      {
        name: "Hard Science Fiction",
        keywords: [
          "orbital mechanics", "delta-v", "thrust", "radiation shielding",
          "relativistic", "lagrange point", "acceleration", "mass ratio",
        ],
      },
      {
        name: "Dystopian",
        keywords: [
          "ration", "sector", "compliance", "citizen", "surveillance state",
          "re-education", "curfew", "resistance", "underground", "permit",
        ],
      },
    ],
    structuralHints: ["world-building exposition", "technical detail"],
  },
  {
    genre: "Fantasy",
    keywords: [
      "magic", "spell", "wizard", "sorcerer", "enchant", "rune",
      "dragon", "elf", "dwarf", "kingdom", "throne", "quest",
      "prophecy", "ancient", "mystical", "potion", "conjure",
      "tome", "grimoire", "incantation", "ward", "arcane",
      "sword", "shield", "castle", "knight", "realm", "oath",
    ],
    subGenres: [
      {
        name: "Epic Fantasy",
        keywords: [
          "chosen one", "dark lord", "army", "siege", "battle",
          "heir", "bloodline", "fate", "destiny", "war council",
        ],
      },
      {
        name: "Urban Fantasy",
        keywords: [
          "city", "apartment", "subway", "detective", "precinct",
          "supernatural", "vampire", "werewolf", "fae", "portal",
        ],
      },
      {
        name: "Dark Fantasy",
        keywords: [
          "blood", "shadow", "death", "necromancer", "undead",
          "corruption", "curse", "torment", "abyss", "demon",
        ],
      },
      {
        name: "Grimdark",
        keywords: [
          "mercenary", "sellsword", "grim", "bleak", "betrayal",
          "cynical", "brutal", "ruthless", "scarred", "ravaged",
        ],
      },
    ],
    structuralHints: ["maps", "glossary", "appendix"],
  },
  {
    genre: "Mystery",
    keywords: [
      "detective", "clue", "suspect", "alibi", "motive", "evidence",
      "forensic", "crime scene", "witness", "homicide", "investigate",
      "whodunit", "red herring", "case", "autopsy", "victim",
    ],
    subGenres: [
      {
        name: "Cozy Mystery",
        keywords: [
          "bakery", "cat", "village", "knitting", "book club",
          "tea", "garden", "antique", "inn", "neighborly",
        ],
      },
      {
        name: "Noir",
        keywords: [
          "dame", "gumshoe", "rain", "alley", "whiskey",
          "smoke", "shadows", "two-timing", "double-cross", "seedy",
        ],
      },
      {
        name: "Police Procedural",
        keywords: [
          "precinct", "lieutenant", "badge", "forensics", "ballistics",
          "warrant", "booking", "perp", "collar", "dispatch",
        ],
      },
    ],
    structuralHints: ["reveal in final chapters", "investigation structure"],
  },
  {
    genre: "Romance",
    keywords: [
      "kiss", "heart", "love", "desire", "passion", "embrace",
      "longing", "chemistry", "attraction", "gaze", "tender",
      "blush", "sigh", "whisper", "caress", "intimate",
    ],
    subGenres: [
      {
        name: "Contemporary Romance",
        keywords: [
          "coffee shop", "office", "dating app", "roommate",
          "best friend", "second chance", "workplace", "holiday",
        ],
      },
      {
        name: "Historical Romance",
        keywords: [
          "duke", "duchess", "regency", "corset", "ballroom",
          "carriage", "lord", "lady", "manor", "chaperone",
        ],
      },
      {
        name: "Romantic Suspense",
        keywords: [
          "protect", "danger", "bodyguard", "safe house", "threat",
          "stalker", "witness protection", "undercover",
        ],
      },
      {
        name: "Paranormal Romance",
        keywords: [
          "vampire", "shifter", "mate", "pack", "alpha",
          "immortal", "fated", "bond", "supernatural",
        ],
      },
    ],
    structuralHints: ["dual pov", "happily ever after", "meet cute"],
  },
  {
    genre: "Horror",
    keywords: [
      "scream", "terror", "dread", "nightmare", "horror",
      "creature", "dark", "blood", "corpse", "haunted",
      "sinister", "malevolent", "grotesque", "lurk", "prey",
    ],
    subGenres: [
      {
        name: "Psychological Horror",
        keywords: [
          "paranoia", "hallucination", "insanity", "delusion",
          "obsession", "unreliable", "perception", "madness",
        ],
      },
      {
        name: "Cosmic Horror",
        keywords: [
          "elder", "void", "incomprehensible", "tentacle", "ancient",
          "cult", "ritual", "forbidden knowledge", "sanity",
        ],
      },
      {
        name: "Gothic Horror",
        keywords: [
          "manor", "attic", "secret passage", "candelabra",
          "gargoyle", "mist", "raven", "crypt", "ancestral",
        ],
      },
    ],
    structuralHints: ["building dread", "isolation", "unreliable narrator"],
  },
  {
    genre: "Literary Fiction",
    keywords: [
      "reflection", "memory", "consciousness", "identity", "mortality",
      "solitude", "longing", "nostalgia", "epiphany", "introspection",
      "melancholy", "existential", "disillusion", "alienation",
    ],
    subGenres: [
      {
        name: "Historical Fiction",
        keywords: [
          "century", "era", "colonial", "war", "revolution",
          "dynasty", "ancient", "medieval", "victorian", "antebellum",
        ],
      },
      {
        name: "Coming of Age",
        keywords: [
          "adolescent", "growing up", "first love", "innocence",
          "adulthood", "school", "graduation", "summer",
        ],
      },
    ],
    structuralHints: ["introspective prose", "nonlinear timeline"],
  },
];

// Thematic keyword groups
const THEME_LEXICON: Record<string, string[]> = {
  "power & corruption": ["power", "corrupt", "tyrant", "oppression", "authoritarian", "regime", "control"],
  "identity & belonging": ["identity", "belonging", "outsider", "exile", "homeland", "refugee", "immigrant"],
  "technology & humanity": ["artificial intelligence", "ai", "human", "machine", "consciousness", "singularity", "ethics"],
  "war & conflict": ["war", "battle", "soldier", "civilian", "casualty", "ceasefire", "armistice", "invasion"],
  "love & loss": ["love", "loss", "grief", "mourning", "heartbreak", "separation", "reunion"],
  "justice & morality": ["justice", "moral", "ethical", "right", "wrong", "innocent", "guilty", "judge"],
  "survival & resilience": ["survive", "resilience", "endure", "overcome", "struggle", "persevere", "grit"],
  "betrayal & trust": ["betray", "trust", "loyal", "treachery", "deceive", "secret", "lie", "truth"],
  "freedom & oppression": ["freedom", "liberty", "oppression", "chains", "escape", "captive", "liberate"],
  "redemption": ["redeem", "redemption", "forgive", "atone", "second chance", "repent", "salvation"],
  "sacrifice": ["sacrifice", "cost", "price", "give up", "martyr", "selfless"],
  "family & legacy": ["family", "father", "mother", "child", "heir", "legacy", "generation", "ancestor"],
};

/**
 * Analyze a single manuscript for genre signals.
 */
export function analyzeGenre(
  db: DB,
  manuscriptId: number
): GenreAnalysis {
  const manuscript = db.db
    .prepare("SELECT * FROM manuscript WHERE id = ?")
    .get(manuscriptId) as { id: number; title: string; project_id: number } | undefined;

  if (!manuscript) throw new Error(`Manuscript ${manuscriptId} not found`);

  const chapters = db.db
    .prepare("SELECT body FROM chapter WHERE manuscript_id = ? ORDER BY order_index")
    .all(manuscriptId) as { body: string }[];

  const fullText = chapters.map((c) => c.body).join("\n\n");
  const textLower = fullText.toLowerCase();
  const words = textLower.split(/\s+/);
  const wordCount = words.length;

  // Score each genre
  const genreScores: GenreSignal[] = [];

  for (const profile of GENRE_PROFILES) {
    const { matchCount, matchedTerms } = countMatches(textLower, profile.keywords);
    const baseScore = matchCount / Math.max(wordCount / 1000, 1); // normalize per 1k words

    // Score sub-genres
    const subGenreResults: { name: string; score: number }[] = [];
    for (const sub of profile.subGenres) {
      const subResult = countMatches(textLower, sub.keywords);
      const subScore = subResult.matchCount / Math.max(wordCount / 1000, 1);
      if (subScore > 0.1) {
        subGenreResults.push({ name: sub.name, score: subScore });
      }
    }

    if (baseScore > 0.05) {
      // Confidence: normalize to 0–1 range (empirically, 2+ matches per 1k words is strong)
      const confidence = Math.min(1, baseScore / 3);

      subGenreResults.sort((a, b) => b.score - a.score);

      genreScores.push({
        genre: profile.genre,
        subGenres: subGenreResults.map((s) => s.name),
        confidence: Math.round(confidence * 100) / 100,
        markers: matchedTerms.slice(0, 10),
      });
    }
  }

  genreScores.sort((a, b) => b.confidence - a.confidence);

  // Detect themes
  const themes = detectThemes(textLower, wordCount);

  // Build suggested BISAC categories
  const suggestedCategories = buildCategories(genreScores, themes);

  return {
    manuscriptId,
    manuscriptTitle: manuscript.title,
    primaryGenre: genreScores[0]?.genre ?? "General Fiction",
    genres: genreScores,
    wordCount,
    suggestedCategories,
    themes,
  };
}

/**
 * Analyze all manuscripts in a project and produce a series-level analysis.
 */
export function analyzeProjectGenre(
  db: DB,
  projectId: number
): ProjectGenreAnalysis {
  const manuscripts = db.db
    .prepare("SELECT id FROM manuscript WHERE project_id = ? ORDER BY id")
    .all(projectId) as { id: number }[];

  const analyses = manuscripts.map((ms) => analyzeGenre(db, ms.id));

  // Aggregate series genre
  const genreCounts = new Map<string, number>();
  for (const a of analyses) {
    for (const g of a.genres) {
      genreCounts.set(g.genre, (genreCounts.get(g.genre) ?? 0) + g.confidence);
    }
  }
  const sortedGenres = [...genreCounts.entries()].sort((a, b) => b[1] - a[1]);
  const seriesGenre = sortedGenres[0]?.[0] ?? "General Fiction";

  // Recurring themes
  const themeCounts = new Map<string, number>();
  for (const a of analyses) {
    for (const t of a.themes) {
      themeCounts.set(t, (themeCounts.get(t) ?? 0) + 1);
    }
  }
  const recurringThemes = [...themeCounts.entries()]
    .filter(([, count]) => count >= Math.max(2, analyses.length * 0.5))
    .sort((a, b) => b[1] - a[1])
    .map(([theme]) => theme);

  // Genre consistency
  const primaryGenres = new Set(analyses.map((a) => a.primaryGenre));
  let genreConsistency: string;
  if (primaryGenres.size === 1) {
    genreConsistency = `All books are consistently ${seriesGenre}.`;
  } else if (primaryGenres.size <= 2) {
    genreConsistency = `The series blends ${[...primaryGenres].join(" and ")}.`;
  } else {
    genreConsistency = `The series spans multiple genres: ${[...primaryGenres].join(", ")}. Consider whether this is intentional for marketing purposes.`;
  }

  return {
    projectId,
    manuscripts: analyses,
    seriesGenre,
    recurringThemes,
    genreConsistency,
  };
}

// --- Helpers ---

function countMatches(
  textLower: string,
  keywords: string[]
): { matchCount: number; matchedTerms: string[] } {
  let matchCount = 0;
  const matchedTerms: string[] = [];

  for (const kw of keywords) {
    const kwLower = kw.toLowerCase();
    let idx = 0;
    let found = false;
    while ((idx = textLower.indexOf(kwLower, idx)) !== -1) {
      // Verify word boundary
      const before = idx > 0 ? textLower[idx - 1] : " ";
      const after = idx + kwLower.length < textLower.length ? textLower[idx + kwLower.length] : " ";
      if (/[\s.,;:!?'"()\-—]/.test(before) && /[\s.,;:!?'"()\-—]/.test(after)) {
        matchCount++;
        if (!found) {
          matchedTerms.push(kw);
          found = true;
        }
      }
      idx += kwLower.length;
    }
  }

  return { matchCount, matchedTerms };
}

function detectThemes(textLower: string, wordCount: number): string[] {
  const results: { theme: string; score: number }[] = [];

  for (const [theme, keywords] of Object.entries(THEME_LEXICON)) {
    const { matchCount } = countMatches(textLower, keywords);
    const score = matchCount / Math.max(wordCount / 1000, 1);
    if (score > 0.15) {
      results.push({ theme, score });
    }
  }

  results.sort((a, b) => b.score - a.score);
  return results.slice(0, 6).map((r) => r.theme);
}

function buildCategories(genres: GenreSignal[], themes: string[]): string[] {
  const categories: string[] = [];

  for (const g of genres.slice(0, 2)) {
    categories.push(`FICTION / ${g.genre}`);
    for (const sub of g.subGenres.slice(0, 2)) {
      categories.push(`FICTION / ${g.genre} / ${sub}`);
    }
  }

  if (themes.includes("technology & humanity")) {
    categories.push("FICTION / Science Fiction / High Tech");
  }
  if (themes.includes("war & conflict")) {
    categories.push("FICTION / War & Military");
  }
  if (themes.includes("power & corruption")) {
    categories.push("FICTION / Political");
  }

  return [...new Set(categories)].slice(0, 6);
}
