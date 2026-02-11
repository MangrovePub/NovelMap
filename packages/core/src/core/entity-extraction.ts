import type { Database as DB } from "../db/database.js";
import type { EntityType } from "./types.js";

export interface ExtractionCandidate {
  text: string;
  suggestedType: EntityType;
  confidence: "high" | "medium" | "low";
  score: number;
  occurrences: number;
  chapterSpread: number;
  sampleContexts: string[];
  relatedCandidates: string[];
}

export interface ExtractionResult {
  candidates: ExtractionCandidate[];
  existingEntities: string[];
}

// ─── Common words filter ──────────────────────────────────────

const COMMON_WORDS = new Set([
  // Short function words (2-letter words that appear capitalized at sentence starts)
  "an", "am", "as", "at", "be", "by", "do", "go", "he", "if", "in",
  "is", "it", "me", "my", "no", "of", "on", "or", "so", "to", "up", "us", "we",
  // Function words (pronouns, determiners, conjunctions, prepositions)
  "the", "and", "but", "for", "not", "you", "all", "can", "had", "her",
  "was", "one", "our", "out", "get", "has", "him", "his",
  "how", "its", "may", "new", "now", "old", "see", "way", "who", "did",
  "got", "let", "say", "she", "too", "use", "when", "then", "than",
  "them", "they", "this", "that", "with", "have", "from", "been", "some",
  "what", "were", "will", "each", "make", "like", "long", "look", "many",
  "come", "could", "more", "would", "about", "after", "again", "being",
  "before", "between", "both", "came", "every", "first", "just", "know",
  "last", "little", "made", "much", "must", "never", "next", "only",
  "other", "over", "same", "should", "still", "such", "take", "their",
  "these", "think", "those", "time", "under", "very", "well",
  "where", "while", "years", "young", "another", "because", "nothing",
  "something", "through", "without", "right", "going", "back",
  "here", "there", "also", "most", "need", "even", "into", "good",
  "keep", "down", "want", "away", "part", "hand", "high",
  "room", "left", "head", "door", "side", "life", "eyes", "face",
  "thing", "enough", "any", "few", "several", "whose", "whom",
  "whether", "either", "neither", "nor", "yet", "so", "if", "as", "no", "yes",
  // Common verbs (capitalized at sentence starts)
  "turned", "looked", "moved", "walked", "stood", "stopped", "called",
  "watched", "started", "seemed", "continued", "reached", "pulled",
  "held", "opened", "closed", "tried", "wanted", "needed", "became",
  "began", "decided", "learned", "remembered", "realized", "understood",
  "heard", "felt", "found", "gave", "told", "took", "went", "done",
  "seen", "known", "sent", "caught", "kept", "meant", "lost", "paid",
  "said", "spoke", "replied", "answered", "explained", "added",
  "figured", "supposed", "noticed", "recognized", "considered",
  "grabbed", "dropped", "stepped", "leaned", "pressed", "pushed",
  "glanced", "stared", "nodded", "shook", "shrugged", "sighed",
  "whispered", "muttered", "shouted", "screamed", "laughed", "smiled",
  "pointed", "waved", "waited", "paused", "hesitated", "agreed",
  "followed", "returned", "arrived", "entered", "approached", "crossed",
  "drove", "running", "sitting", "standing", "waiting", "coming",
  "leaving", "talking", "working", "thinking", "looking", "getting",
  "making", "taking", "trying", "playing", "reading", "writing",
  "knowing", "seeing", "hearing", "feeling", "falling", "pulling",
  "everything", "everybody", "everyone", "anything", "anyone", "somewhere", "someone",
  // Common adjectives
  "better", "best", "worse", "worst", "less", "least", "greater",
  "local", "national", "federal", "official", "special",
  "major", "minor", "public", "private", "modern", "current", "recent",
  "different", "various", "certain", "possible", "likely", "clear",
  "open", "close", "full", "empty", "dark", "light", "hard", "soft",
  "large", "small", "fast", "slow", "early", "late", "sure", "real",
  "whole", "entire", "single", "double", "multiple", "simple", "complex",
  "main", "total", "direct", "social", "human", "foreign", "free",
  "true", "false", "wrong", "fine", "fair", "safe", "worth",
  "ready", "quick", "quiet", "alone", "alive", "dead", "strong", "weak",
  "clean", "dry", "wet", "hot", "cold", "cool", "warm", "bright", "deep",
  "thick", "thin", "heavy", "flat", "sharp", "rough", "smooth", "tight",
  "cheap", "rich", "poor", "fresh", "strange", "familiar", "ordinary",
  "obvious", "serious", "nervous", "angry", "glad", "sorry", "afraid",
  // Common nouns (not entity names)
  "people", "place", "world", "house", "point", "asked",
  "almost", "around", "really", "thought", "night", "work",
  "day", "way", "man", "woman", "girl", "boy", "child", "children",
  "people", "person", "group", "team", "family", "friend", "friends",
  "secretary", "president", "minister", "director", "doctor", "dr",
  "professor", "officer", "agent", "captain", "colonel", "lieutenant",
  "general", "commander", "chief", "deputy", "assistant", "senior", "junior",
  "sir", "madam", "lady", "lord", "king", "queen", "prince", "princess",
  "brother", "sister", "father", "mother", "daughter", "son", "uncle", "aunt",
  "husband", "wife", "partner", "boss", "guard", "soldier", "pilot",
  "driver", "nurse", "lawyer", "judge", "mayor", "governor", "senator",
  "marshal", "detective", "inspector", "analyst", "advisor", "spokesman",
  "protocol", "research", "science", "technology", "system", "program",
  "project", "report", "record", "document", "file", "data", "process",
  "service", "network", "security", "intelligence", "defense", "policy",
  "meeting", "mission", "operation", "session", "conference", "management",
  "recognition", "detention", "investigation", "headquarters", "facility",
  "mineral", "material", "evidence", "surveillance", "assessment",
  "morning", "afternoon", "evening", "midnight", "noon", "dawn", "dusk",
  "moment", "minute", "hour", "week", "month", "year", "decade", "century",
  "today", "tomorrow", "yesterday", "tonight", "weekend",
  "north", "south", "east", "west", "northern", "southern",
  "eastern", "western", "central", "upper", "lower",
  "street", "road", "avenue", "building", "floor", "office", "center",
  "field", "station", "airport", "hotel", "school", "church",
  "water", "fire", "air", "earth", "wind", "rain", "snow",
  "black", "white", "red", "blue", "green", "gray", "brown",
  "money", "power", "truth", "silence", "blood", "death", "peace",
  "war", "law", "order", "love", "fear", "hope", "pain",
  "half", "rest", "end", "top", "bottom", "front", "rear",
  "beginning", "middle", "inside", "outside", "behind", "above",
  "below", "across", "beside", "beyond", "toward", "towards",
  "city", "town", "country", "state", "island", "river", "lake",
  "mountain", "valley", "coast", "border", "region", "district",
  "phone", "screen", "camera", "door", "window", "wall", "table",
  "chair", "bed", "car", "truck", "van", "bus", "train", "plane", "ship",
  "computer", "laptop", "signal", "message", "email", "voice", "sound",
  "question", "answer", "problem", "reason", "idea", "plan", "story",
  "news", "press", "media", "paper", "letter", "note", "card", "list",
  "case", "test", "source", "target", "subject", "matter", "issue",
  "chance", "risk", "threat", "attack", "damage", "control", "access",
  "level", "rate", "cost", "price", "deal", "trade", "market", "business",
  "company", "industry", "government", "military", "police", "army", "navy",
  "walk", "talk", "run", "call", "move", "turn", "step", "stop", "start",
  "pass", "fall", "rise", "drop", "break", "cut", "hit", "set", "put",
  // Numbers & ordinals
  "zero", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten",
  "eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen", "seventeen",
  "eighteen", "nineteen", "twenty", "thirty", "forty", "fifty", "sixty", "seventy",
  "eighty", "ninety", "hundred", "thousand", "million", "billion", "dozen", "couple",
  "second", "third", "fourth", "fifth", "sixth", "seventh", "eighth", "ninth", "tenth",
  "emergency", "library", "cabinet", "days", "christmas", "american",
  "yeah", "welcome", "hello", "hey", "okay", "please", "thanks", "sorry",
  "conditions", "terms", "critical", "plant", "unit", "units", "mom", "dad",
  "sen", "rep", "hon", "dept", "corp", "assoc",
  "which", "kill", "phase", "congress", "ramseys",
  "english", "chinese", "french", "russian", "german", "japanese", "korean",
  "british", "european", "african", "asian", "arab", "indian", "canadian",
  "mexican", "spanish", "italian", "brazilian", "iranian", "israeli",
  // Narrative / chapter words
  "chapter", "book", "section", "prologue", "epilogue",
  "however", "although", "finally", "suddenly", "perhaps",
  "certainly", "fortunately", "unfortunately", "apparently", "obviously",
  "meanwhile", "acknowledged", "alright", "okay",
  // Time words (always capitalized but not entities)
  "monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday",
  "january", "february", "march", "april", "june", "july", "august",
  "september", "october", "november", "december",
  // Common sentence starters
  "once", "since", "until", "during",
]);

// ─── Known locations ──────────────────────────────────────────

const KNOWN_LOCATIONS = new Set([
  // Major world cities
  "Shanghai", "Beijing", "Tokyo", "Seoul", "Mumbai", "Delhi", "Bangkok",
  "Singapore", "Dubai", "Istanbul", "Moscow", "London", "Paris", "Berlin",
  "Rome", "Madrid", "Amsterdam", "Vienna", "Prague", "Warsaw", "Athens",
  "Cairo", "Lagos", "Nairobi", "Johannesburg", "Sydney", "Melbourne",
  "Toronto", "Montreal", "Vancouver",
  // US cities
  "Atlanta", "Austin", "Baltimore", "Boston", "Charlotte", "Chicago",
  "Cincinnati", "Cleveland", "Columbus", "Dallas", "Denver", "Detroit",
  "Houston", "Indianapolis", "Jacksonville", "Kansas", "Louisville",
  "Memphis", "Miami", "Milwaukee", "Minneapolis", "Nashville",
  "Newark", "Norfolk", "Oakland", "Orlando", "Philadelphia", "Phoenix",
  "Pittsburgh", "Portland", "Sacramento", "Seattle", "Tampa",
  "Tucson", "Washington", "Honolulu", "Anchorage",
  // Countries
  "China", "Japan", "Korea", "India", "Russia", "Germany", "France",
  "England", "Britain", "Italy", "Spain", "Brazil", "Mexico", "Canada",
  "Australia", "Egypt", "Israel", "Iran", "Iraq", "Afghanistan",
  "Pakistan", "Vietnam", "Thailand", "Indonesia", "Philippines",
  "Taiwan", "Ukraine", "Poland", "Turkey", "Sweden", "Norway",
  "Finland", "Denmark", "Switzerland", "Austria", "Greece", "Portugal",
  // US states
  "California", "Texas", "Florida", "Virginia", "Georgia", "Michigan",
  "Ohio", "Pennsylvania", "Illinois", "Minnesota", "Wisconsin",
  "Colorado", "Arizona", "Oregon", "Montana", "Alaska", "Hawaii",
  "Nevada", "Utah", "Iowa", "Alabama", "Mississippi", "Tennessee",
  "Kentucky", "Carolina", "Connecticut", "Maryland", "Massachusetts",
  // Multi-word cities / bases
  "Grand Rapids", "Fort Meade", "New York", "Los Angeles", "San Francisco",
  "San Diego", "Las Vegas", "San Antonio", "New Orleans", "Salt Lake",
  "Fort Worth", "El Paso", "St. Louis", "Hong Kong", "Tel Aviv",
  "Kuala Lumpur", "Ho Chi Minh", "Camp David",
  // Regions / continents
  "America", "Europe", "Asia", "Africa", "Pacific", "Atlantic",
  "Arctic", "Antarctic", "Siberia", "Sahara", "Himalayas",
]);

// ─── All-caps words that aren't real acronyms ────────────────
// Character names or common words used for emphasis in dialogue
const CAPS_NOT_ACRONYMS = new Set([
  "KNOX", "RAMSEY", "HELLO", "READ", "STOP", "HELP", "MOVE", "WAIT",
  "COME", "LOOK", "HERE", "THERE", "WHAT", "WHERE", "WHEN", "FIRE",
  "DOWN", "BACK", "OPEN", "SHUT", "HOLD", "STAY", "KILL", "DEAD",
  "LOVE", "HOME", "GONE", "DAMN", "JUST", "YEAH", "OKAY", "CALL",
]);

// ─── Context signals ──────────────────────────────────────────

const CHARACTER_SIGNALS = [
  "said", "asked", "replied", "whispered", "shouted", "yelled",
  "nodded", "shook", "looked", "walked", "ran", "turned", "smiled",
  "frowned", "laughed", "sighed", "thought", "felt", "knew", "wanted",
  "told", "watched", "stood", "sat", "leaned", "paused", "continued",
  "shrugged", "muttered", "snapped", "glanced", "stared", "grabbed",
];

const CHARACTER_TITLES = [
  "mr", "mrs", "ms", "dr", "professor", "colonel", "general", "agent",
  "captain", "lieutenant", "sergeant", "officer", "detective", "inspector",
  "president", "director", "commander", "major", "admiral", "senator",
  "governor", "ambassador", "minister", "secretary", "chief",
];

const LOCATION_PREPOSITIONS = [
  "in", "to", "from", "at", "near", "outside", "across", "toward",
  "towards", "through", "around", "beyond",
];

// ─── Internal types ───────────────────────────────────────────

interface RawCandidate {
  text: string;
  positions: number[];
  sentenceStartCount: number;
  totalCount: number;
  chapters: Set<number>;
}

// ─── Core algorithm ───────────────────────────────────────────

export function extractEntityCandidates(
  db: DB,
  projectId: number,
  manuscriptId?: number
): ExtractionResult {
  // Get chapters
  let chapters: { id: number; body: string }[];
  if (manuscriptId) {
    chapters = db.db
      .prepare("SELECT id, body FROM chapter WHERE manuscript_id = ? ORDER BY order_index")
      .all(manuscriptId) as { id: number; body: string }[];
  } else {
    chapters = db.db
      .prepare(
        "SELECT c.id, c.body FROM chapter c JOIN manuscript m ON c.manuscript_id = m.id WHERE m.project_id = ? ORDER BY m.id, c.order_index"
      )
      .all(projectId) as { id: number; body: string }[];
  }

  if (chapters.length === 0) {
    return { candidates: [], existingEntities: [] };
  }

  // Get existing entity names
  const existingEntities = (
    db.db
      .prepare("SELECT name FROM entity WHERE project_id = ?")
      .all(projectId) as { name: string }[]
  ).map((e) => e.name);
  const existingNamesLower = new Set(existingEntities.map((n) => n.toLowerCase()));

  // Phase 1: Scan for capitalized phrases and acronyms
  const rawCandidates = new Map<string, RawCandidate>();
  const fullText = chapters.map((c) => c.body).join("\n\n");

  for (let ci = 0; ci < chapters.length; ci++) {
    const text = chapters[ci].body;
    scanText(text, ci, rawCandidates);
  }

  // Phase 2: Score candidates
  const totalChapters = chapters.length;
  const scored: ExtractionCandidate[] = [];

  for (const [key, raw] of rawCandidates) {
    // Skip common words
    if (COMMON_WORDS.has(key.toLowerCase())) continue;

    // Skip street-address phrases (e.g. "Saginaw Street") — too granular
    const rawWords = raw.text.split(/\s+/);
    if (rawWords.length >= 2 && STREET_SUFFIXES.has(rawWords[rawWords.length - 1].toLowerCase())) continue;

    // Skip already-existing entities
    if (existingNamesLower.has(key.toLowerCase())) continue;

    // Minimum occurrences (acronyms are distinctive enough with 1)
    const isAcronym = /^[A-Z]{2,6}$/.test(raw.text);
    if (raw.totalCount < 2 && !isAcronym) continue;

    const sentenceStartRatio = raw.sentenceStartCount / raw.totalCount;

    // Skip words that almost exclusively appear at sentence starts (likely not entities)
    const wordCount = raw.text.split(/\s+/).length;
    if (sentenceStartRatio >= 1.0 && raw.totalCount < 6 && wordCount === 1) continue;
    if (sentenceStartRatio > 0.9 && raw.totalCount < 4) continue;

    // Score
    const frequencyScore = Math.min(25, raw.totalCount * 3);
    const spreadScore = Math.min(25, (raw.chapters.size / totalChapters) * 25);
    const nonStartScore = (1 - sentenceStartRatio) * 25;

    let shapeScore = 0;
    if (/^[A-Z]{2,6}$/.test(raw.text)) {
      shapeScore = 15; // Acronym
    } else if (wordCount >= 2) {
      shapeScore = 20; // Multi-word name
    } else if (raw.text.length >= 3) {
      shapeScore = 15; // Single word, 3+ chars
    } else {
      shapeScore = 8; // Short word (e.g., "Wu")
    }

    const score = frequencyScore + spreadScore + nonStartScore + shapeScore;

    // Minimum score threshold
    const minScore = raw.text.length <= 2 ? 35 : wordCount >= 2 ? 25 : 30;
    if (score < minScore) continue;

    // Phase 3: Classify type
    const contexts = getContextSnippets(fullText, raw.text, 10);
    const suggestedType = classifyType(raw.text, contexts);

    // Confidence
    let confidence: "high" | "medium" | "low";
    if (score >= 60) confidence = "high";
    else if (score >= 35) confidence = "medium";
    else confidence = "low";

    scored.push({
      text: raw.text,
      suggestedType,
      confidence,
      score,
      occurrences: raw.totalCount,
      chapterSpread: raw.chapters.size,
      sampleContexts: contexts.slice(0, 3),
      relatedCandidates: [],
    });
  }

  // Phase 4: Deduplicate (merge substrings into longer forms)
  const deduped = deduplicateCandidates(scored);

  // Sort by score descending, cap at 200 most relevant
  deduped.sort((a, b) => b.score - a.score);
  const capped = deduped.slice(0, 200);

  return {
    candidates: capped,
    existingEntities,
  };
}

// ─── Text scanning ────────────────────────────────────────────

function scanText(
  text: string,
  chapterIndex: number,
  candidates: Map<string, RawCandidate>
): void {
  // Find sentence boundaries
  const sentenceStarts = new Set<number>();
  sentenceStarts.add(0);

  // After . ! ? followed by whitespace
  const sentenceBoundary = /[.!?]\s+/g;
  let match: RegExpExecArray | null;
  while ((match = sentenceBoundary.exec(text)) !== null) {
    sentenceStarts.add(match.index + match[0].length);
  }

  // After paragraph breaks (position 0 is already added above)
  const paragraphStarts = /\n\n\s*/g;
  while ((match = paragraphStarts.exec(text)) !== null) {
    sentenceStarts.add(match.index + match[0].length);
  }

  // Find capitalized phrases (1-4 words)
  const phraseRegex = /\b([A-Z][a-z]+(?:'s)?(?:\s+[A-Z][a-z]+(?:'s)?){0,3})\b/g;
  while ((match = phraseRegex.exec(text)) !== null) {
    const raw = match[1];
    // Strip possessives
    let clean = raw.replace(/'s$/g, "").replace(/'s\b/g, "");
    if (clean.length < 2) continue;

    const pos = match.index;
    const atSentenceStart = isSentenceStart(pos, text, sentenceStarts);

    // Strip leading common words from multi-word phrases ("But Knox" → "Knox")
    const words = clean.split(/\s+/);
    while (words.length > 1 && COMMON_WORDS.has(words[0].toLowerCase())) {
      words.shift();
    }
    clean = words.join(" ");
    if (clean.length < 2 || COMMON_WORDS.has(clean.toLowerCase())) continue;

    addCandidate(candidates, clean, pos, chapterIndex, atSentenceStart);

    // Also add individual words from multi-word phrases
    if (words.length > 1) {
      for (const word of words) {
        if (word.length >= 2 && !COMMON_WORDS.has(word.toLowerCase())) {
          addCandidate(candidates, word, pos, chapterIndex, atSentenceStart);
        }
      }
    }
  }

  // Find acronyms (2-6 uppercase letters)
  const acronymRegex = /\b([A-Z]{2,6})\b/g;
  while ((match = acronymRegex.exec(text)) !== null) {
    const acr = match[1];
    // Skip common abbreviations that aren't organizations
    if (["OK", "AM", "PM", "TV", "US", "UK", "EU", "UN", "ID", "IT", "OR", "AN", "AT", "AS", "IF", "IS", "IN", "ON", "SO", "TO", "UP", "NO", "OF", "IV", "IP", "AI", "AD", "DC", "AC", "DO", "GO", "ER", "DR", "MR", "MS", "VS", "RE", "EM", "AG"].includes(acr)) continue;
    // Skip all-caps words that are just emphasized text, not real acronyms
    // (e.g., "HELLO", "KNOX" in dialogue emphasis). Real acronyms are
    // typically not common English words when lowercased.
    if (acr.length >= 4 && COMMON_WORDS.has(acr.toLowerCase())) continue;
    if (CAPS_NOT_ACRONYMS.has(acr)) continue;
    const pos = match.index;
    const atSentenceStart = isSentenceStart(pos, text, sentenceStarts);
    addCandidate(candidates, acr, pos, chapterIndex, atSentenceStart);
  }
}

function isSentenceStart(pos: number, text: string, sentenceStarts: Set<number>): boolean {
  // Check if this position is at or very near a sentence start
  for (let i = pos; i >= Math.max(0, pos - 3); i--) {
    if (sentenceStarts.has(i)) return true;
  }
  // Also check: is this right after a quote mark at sentence start?
  if (pos > 0 && (text[pos - 1] === '"' || text[pos - 1] === '\u201C')) {
    for (let i = pos - 1; i >= Math.max(0, pos - 4); i--) {
      if (sentenceStarts.has(i)) return true;
    }
  }
  return false;
}

function addCandidate(
  candidates: Map<string, RawCandidate>,
  text: string,
  position: number,
  chapterIndex: number,
  atSentenceStart: boolean
): void {
  const key = text;
  const existing = candidates.get(key);
  if (existing) {
    existing.positions.push(position);
    existing.totalCount++;
    existing.chapters.add(chapterIndex);
    if (atSentenceStart) existing.sentenceStartCount++;
  } else {
    candidates.set(key, {
      text,
      positions: [position],
      sentenceStartCount: atSentenceStart ? 1 : 0,
      totalCount: 1,
      chapters: new Set([chapterIndex]),
    });
  }
}

// ─── Context extraction ───────────────────────────────────────

function getContextSnippets(fullText: string, candidateText: string, maxSnippets: number): string[] {
  const snippets: string[] = [];
  const lower = fullText.toLowerCase();
  const target = candidateText.toLowerCase();
  let idx = 0;

  while (snippets.length < maxSnippets) {
    idx = lower.indexOf(target, idx);
    if (idx === -1) break;

    const start = Math.max(0, idx - 40);
    const end = Math.min(fullText.length, idx + target.length + 40);
    let snippet = fullText.substring(start, end).replace(/\n/g, " ");
    if (start > 0) snippet = "\u2026" + snippet;
    if (end < fullText.length) snippet = snippet + "\u2026";
    snippets.push(snippet);

    idx += target.length;
  }

  return snippets;
}

// ─── Type classification ──────────────────────────────────────

// Keywords that identify location phrases (e.g. "Hart Plaza", "Situation Room")
const LOCATION_NAME_KEYWORDS = new Set([
  "plaza", "room", "building", "tower", "bridge", "park", "center", "centre",
  "hall", "base", "compound", "embassy", "station", "hospital", "airport",
  "harbor", "harbour", "port", "dam", "lake", "river", "mountain", "valley",
  "bay", "island", "islands", "peninsula", "falls", "springs", "creek", "ridge",
  "heights", "hills", "woods", "forest", "beach", "coast", "cape", "county",
]);

// Keywords that identify organization phrases (e.g. "Movement Festival")
const ORG_NAME_KEYWORDS = new Set([
  "festival", "foundation", "corporation", "association", "institute",
  "university", "college", "academy", "agency", "bureau", "department",
  "ministry", "group", "corp", "inc", "ltd", "council", "commission",
  "authority", "alliance", "coalition", "consortium", "syndicate",
  "network", "initiative", "project", "program", "service", "services",
  "committee", "senate", "board", "division",
]);

// Street-address suffixes (these entities are too granular to be useful)
const STREET_SUFFIXES = new Set([
  "street", "road", "avenue", "boulevard", "drive", "lane", "court",
  "highway", "way", "route", "freeway", "turnpike", "parkway", "alley",
]);

function classifyType(text: string, contexts: string[]): EntityType {
  // Rule 1: Acronyms → organization
  if (/^[A-Z]{2,6}$/.test(text)) return "organization";

  // Rule 2: Known location names
  if (KNOWN_LOCATIONS.has(text)) return "location";

  // Rule 3: Multi-word phrases with location/org keywords in the name itself
  const words = text.split(/\s+/);
  if (words.length >= 2) {
    const lastWord = words[words.length - 1].toLowerCase();
    if (LOCATION_NAME_KEYWORDS.has(lastWord)) return "location";
    if (ORG_NAME_KEYWORDS.has(lastWord)) return "organization";
  }

  let characterScore = 0;
  let locationScore = 0;
  let orgScore = 0;
  const textLower = text.toLowerCase();

  for (const ctx of contexts) {
    const lower = ctx.toLowerCase();

    // Character signals: "Liu said", "said Liu"
    for (const signal of CHARACTER_SIGNALS) {
      if (lower.includes(`${textLower} ${signal}`)) characterScore += 3;
      if (lower.includes(`${signal} ${textLower}`)) characterScore += 3;
    }

    // Character title signals: "Agent Ramsey", "Dr. Wu"
    for (const title of CHARACTER_TITLES) {
      if (lower.includes(`${title} ${textLower}`)) characterScore += 5;
      if (lower.includes(`${title}. ${textLower}`)) characterScore += 5;
    }

    // Location signals: "in Shanghai", "to Detroit", "from Chicago"
    for (const prep of LOCATION_PREPOSITIONS) {
      if (lower.includes(`${prep} ${textLower}`)) locationScore += 3;
    }

    // Organization signals: "the MSS", "the Agency"
    if (lower.includes(`the ${textLower}`)) orgScore += 2;
    for (const orgWord of ["agency", "bureau", "department", "ministry", "institute", "corporation", "company", "force", "intelligence", "committee"]) {
      if (lower.includes(`${textLower} ${orgWord}`)) orgScore += 4;
    }
  }

  // Multi-word names without location/org keywords are likely character names
  // (e.g. "Lisa Ramsey", "Liu Wei"). Give a stronger bias since prepositions
  // like "to Lisa Ramsey" create false location signals.
  const wordCount = text.split(/\s+/).length;
  if (wordCount >= 2 && wordCount <= 3) {
    const lastWord = words[words.length - 1].toLowerCase();
    const hasKeyword = LOCATION_NAME_KEYWORDS.has(lastWord) || ORG_NAME_KEYWORDS.has(lastWord);
    characterScore += hasKeyword ? 0 : 8;
  }

  const maxScore = Math.max(characterScore, locationScore, orgScore);
  if (maxScore === 0) return "character"; // default

  if (locationScore === maxScore && locationScore > characterScore) return "location";
  if (orgScore === maxScore && orgScore > characterScore) return "organization";
  return "character";
}

// ─── Deduplication ────────────────────────────────────────────

function deduplicateCandidates(candidates: ExtractionCandidate[]): ExtractionCandidate[] {
  // Sort by word count descending so longer phrases come first
  const sorted = [...candidates].sort(
    (a, b) => b.text.split(/\s+/).length - a.text.split(/\s+/).length
  );

  const kept = new Map<string, ExtractionCandidate>();
  const consumed = new Set<string>(); // short forms absorbed by longer forms

  for (const cand of sorted) {
    const words = cand.text.split(/\s+/);

    if (words.length > 1) {
      // This is a multi-word candidate. Mark its individual words as related.
      kept.set(cand.text, cand);
      for (const word of words) {
        if (!COMMON_WORDS.has(word.toLowerCase())) {
          consumed.add(word);
          cand.relatedCandidates.push(word);
        }
      }
    }
  }

  // Now add single-word candidates that weren't consumed
  for (const cand of sorted) {
    if (cand.text.split(/\s+/).length === 1) {
      if (consumed.has(cand.text)) {
        // This word is part of a longer phrase — merge stats into the longer form
        const longerForm = [...kept.values()].find((k) =>
          k.text.includes(cand.text) && k.text !== cand.text
        );
        if (longerForm) {
          // Transfer higher occurrence count and chapter spread to the full name
          longerForm.occurrences = Math.max(longerForm.occurrences, cand.occurrences);
          longerForm.chapterSpread = Math.max(longerForm.chapterSpread, cand.chapterSpread);
          longerForm.relatedCandidates.push(cand.text);
        }
        // Always absorbed — never keep both
      } else {
        kept.set(cand.text, cand);
      }
    }
  }

  return [...kept.values()];
}
