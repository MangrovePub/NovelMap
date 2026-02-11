// ===========================================================================
// NovelMap — Gazetteer
// Dictionary-based entity lookup and noise filtering.
// ===========================================================================

import type { EntityType } from "./types.js";

// ─── Noise words ─────────────────────────────────────────────
// Words that commonly appear capitalized at sentence starts but
// are never real entity names.

const NOISE_WORDS = new Set([
  // Short function words
  "an", "am", "as", "at", "be", "by", "do", "go", "he", "if", "in",
  "is", "it", "me", "my", "no", "of", "on", "or", "so", "to", "up", "us", "we",
  // Common function words
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
  "whether", "either", "neither", "nor", "yet", "if", "as", "no", "yes",
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
  // Misc noise
  "emergency", "library", "cabinet", "days", "christmas", "american",
  "yeah", "welcome", "hello", "hey", "okay", "please", "thanks", "sorry",
  "conditions", "terms", "critical", "plant", "unit", "units", "mom", "dad",
  "sen", "rep", "hon", "dept", "corp", "assoc",
  "which", "kill", "phase", "congress", "ramseys",
  // Nationalities / demonyms
  "english", "chinese", "french", "russian", "german", "japanese", "korean",
  "british", "european", "african", "asian", "arab", "indian", "canadian",
  "mexican", "spanish", "italian", "brazilian", "iranian", "israeli",
  "americans", "russians", "germans", "chinese", "japanese",
  // Narrative / chapter words
  "chapter", "book", "section", "prologue", "epilogue",
  "however", "although", "finally", "suddenly", "perhaps",
  "certainly", "fortunately", "unfortunately", "apparently", "obviously",
  "meanwhile", "acknowledged", "alright", "okay",
  // Days & months
  "monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday",
  "january", "february", "march", "april", "june", "july", "august",
  "september", "october", "november", "december",
  // Common sentence starters
  "once", "since", "until", "during",
  // Additional noise from real-world testing
  "accept", "already", "agricultural", "agriculture", "industrial",
  "presidential", "international", "environmental", "technological",
  "commercial", "professional", "operational", "residential",
  "medical", "political", "financial", "economic", "strategic",
  "tactical", "technical", "structural", "cultural", "physical",
]);

// ─── Known locations ─────────────────────────────────────────
// Maps location name → confidence (0-100).

const LOCATIONS = new Map<string, number>([
  // Major US cities
  ...([
    "Atlanta", "Austin", "Baltimore", "Boston", "Charlotte", "Chicago",
    "Cincinnati", "Cleveland", "Columbus", "Dallas", "Denver", "Detroit",
    "Houston", "Indianapolis", "Jacksonville", "Louisville",
    "Memphis", "Miami", "Milwaukee", "Minneapolis", "Nashville",
    "Newark", "Norfolk", "Oakland", "Orlando", "Philadelphia", "Phoenix",
    "Pittsburgh", "Portland", "Sacramento", "Seattle", "Tampa",
    "Tucson", "Washington", "Honolulu", "Anchorage", "Reno",
    "Albuquerque", "Omaha", "Buffalo", "Rochester", "Richmond",
    "Savannah", "Charleston", "Lexington", "Boise", "Madison",
    "Fresno", "Bakersfield", "Tulsa", "Wichita", "Arlington",
    "Aurora", "Spokane", "Tacoma", "Durham", "Knoxville",
    "Chattanooga", "Dayton", "Akron", "Providence", "Hartford",
    "Springfield", "Yonkers", "Syracuse", "Worcester", "Flint",
    "Lansing", "Saginaw", "Midland", "Kalamazoo", "Pontiac",
    "Dearborn", "Langley", "Stanford",
  ] as const).map(c => [c, 90] as [string, number]),
  // Multi-word US cities
  ...([
    "Grand Rapids", "Fort Meade", "New York", "Los Angeles", "San Francisco",
    "San Diego", "Las Vegas", "San Antonio", "New Orleans", "Salt Lake",
    "Fort Worth", "El Paso", "St. Louis", "Ann Arbor", "Baton Rouge",
    "Kansas City", "Oklahoma City", "Virginia Beach", "Long Beach",
    "Colorado Springs", "Cape Coral", "Fort Lauderdale", "Fort Collins",
    "Little Rock", "Des Moines", "Palm Springs", "Corpus Christi",
    "West Palm Beach", "Santa Fe", "Palo Alto", "Auburn Hills",
  ] as const).map(c => [c, 95] as [string, number]),
  // World cities
  ...([
    "Shanghai", "Beijing", "Tokyo", "Seoul", "Mumbai", "Delhi", "Bangkok",
    "Singapore", "Dubai", "Istanbul", "Moscow", "London", "Paris", "Berlin",
    "Rome", "Madrid", "Amsterdam", "Vienna", "Prague", "Warsaw", "Athens",
    "Cairo", "Lagos", "Nairobi", "Johannesburg", "Sydney", "Melbourne",
    "Toronto", "Montreal", "Vancouver", "Taipei", "Kabul", "Baghdad",
    "Damascus", "Beirut", "Riyadh", "Pyongyang", "Havana", "Lima",
    "Bogota", "Caracas", "Santiago", "Helsinki", "Oslo", "Stockholm",
    "Copenhagen", "Brussels", "Lisbon", "Dublin", "Edinburgh",
    "Zurich", "Geneva", "Munich", "Hamburg", "Frankfurt", "Milan",
    "Barcelona", "Osaka", "Kyoto", "Manila", "Jakarta",
  ] as const).map(c => [c, 90] as [string, number]),
  // Multi-word world cities
  ...([
    "Hong Kong", "Tel Aviv", "Kuala Lumpur", "Ho Chi Minh",
    "New Delhi", "Addis Ababa", "Buenos Aires", "Rio de Janeiro",
    "Sao Paulo", "Mexico City",
  ] as const).map(c => [c, 95] as [string, number]),
  // Countries
  ...([
    "China", "Japan", "Korea", "India", "Russia", "Germany", "France",
    "England", "Britain", "Italy", "Spain", "Brazil", "Mexico", "Canada",
    "Australia", "Egypt", "Israel", "Iran", "Iraq", "Afghanistan",
    "Pakistan", "Vietnam", "Thailand", "Indonesia", "Philippines",
    "Taiwan", "Ukraine", "Poland", "Turkey", "Sweden", "Norway",
    "Finland", "Denmark", "Switzerland", "Austria", "Greece", "Portugal",
    "Colombia", "Argentina", "Chile", "Peru", "Venezuela", "Cuba",
    "Nigeria", "Kenya", "Ethiopia", "Somalia", "Libya", "Syria",
    "Lebanon", "Jordan", "Yemen", "Oman", "Qatar", "Bahrain", "Kuwait",
  ] as const).map(c => [c, 85] as [string, number]),
  // US states
  ...([
    "California", "Texas", "Florida", "Virginia", "Georgia", "Michigan",
    "Ohio", "Pennsylvania", "Illinois", "Minnesota", "Wisconsin",
    "Colorado", "Arizona", "Oregon", "Montana", "Alaska", "Hawaii",
    "Nevada", "Utah", "Iowa", "Alabama", "Mississippi", "Tennessee",
    "Kentucky", "Carolina", "Connecticut", "Maryland", "Massachusetts",
    "Idaho", "Wyoming", "Nebraska", "Oklahoma", "Arkansas", "Missouri",
    "Indiana", "Louisiana", "Maine", "Vermont", "Delaware",
    "Washington", "New Hampshire",
  ] as const).map(c => [c, 80] as [string, number]),
  // Regions / continents
  ...([
    "America", "Europe", "Asia", "Africa", "Pacific", "Atlantic",
    "Arctic", "Antarctic", "Siberia", "Sahara", "Himalayas",
    "Appalachia", "Midwest", "Scandinavia", "Balkans", "Caucasus",
    "Caribbean", "Mediterranean",
  ] as const).map(c => [c, 75] as [string, number]),
  // Notable landmarks / buildings that appear in fiction
  ...([
    "Pentagon", "Kremlin", "Vatican", "Buckingham",
    "Alcatraz", "Guantanamo", "Chernobyl", "Fukushima",
  ] as const).map(c => [c, 85] as [string, number]),
  // Camp David etc.
  ["Camp David", 90],
]);

// ─── Known organizations ────────────────────────────────────
// Maps org name → confidence.

const ORGANIZATIONS = new Map<string, number>([
  // US government agencies
  ...([
    "CIA", "FBI", "NSA", "NSC", "DHS", "DOJ", "DOD", "DOE",
    "EPA", "FAA", "FCC", "FDA", "FEMA", "IRS", "SEC", "TSA",
    "ATF", "DEA", "ICE", "CBP", "USDA", "USPS", "NASA", "DARPA",
    "NIST", "NOAA", "NIH", "CDC", "OSHA", "NRC",
  ] as const).map(c => [c, 95] as [string, number]),
  // Military
  ...([
    "NATO", "SOCOM", "JSOC", "CENTCOM", "EUCOM", "PACOM",
    "SEAL", "SWAT",
  ] as const).map(c => [c, 90] as [string, number]),
  // International orgs
  ...([
    "IAEA", "OPEC", "ASEAN", "BRICS", "INTERPOL", "UNESCO",
    "UNICEF", "WHO",
  ] as const).map(c => [c, 90] as [string, number]),
  // Intelligence agencies
  ...([
    "MSS", "FSB", "GRU", "GCHQ", "BND", "DGSE", "ASIS", "CSIS", "RAW",
  ] as const).map(c => [c, 90] as [string, number]),
  // Tech acronyms used as orgs
  ...([
    "SCADA", "EMP", "CERT",
  ] as const).map(c => [c, 70] as [string, number]),
  // Named organizations
  ...([
    "Congress", "Senate", "Parliament", "Politburo",
    "Pentagon", "Interpol",
  ] as const).map(c => [c, 80] as [string, number]),
]);

// ─── Location name keywords ─────────────────────────────────
// Last word of a multi-word phrase → location.

const LOCATION_SUFFIXES = new Set([
  "plaza", "room", "building", "tower", "bridge", "park", "center", "centre",
  "hall", "base", "compound", "embassy", "station", "hospital", "airport",
  "harbor", "harbour", "port", "dam", "lake", "river", "mountain", "valley",
  "bay", "island", "islands", "peninsula", "falls", "springs", "creek", "ridge",
  "heights", "hills", "woods", "forest", "beach", "coast", "cape", "county",
  "canyon", "mesa", "pass", "crossing", "junction", "point", "terrace",
]);

// ─── Organization name keywords ─────────────────────────────
// Last word of a multi-word phrase → organization.

const ORG_SUFFIXES = new Set([
  "festival", "foundation", "corporation", "association", "institute",
  "university", "college", "academy", "agency", "bureau", "department",
  "ministry", "group", "corp", "inc", "ltd", "council", "commission",
  "authority", "alliance", "coalition", "consortium", "syndicate",
  "network", "initiative", "program", "service", "services",
  "committee", "senate", "board", "division",
  "party", "league", "union", "federation", "society", "club",
]);

// ─── Street-address suffixes ────────────────────────────────
// Phrases ending with these are too granular for entity extraction.

const STREET_SUFFIXES = new Set([
  "street", "road", "avenue", "boulevard", "drive", "lane", "court",
  "highway", "way", "route", "freeway", "turnpike", "parkway", "alley",
]);

// ─── All-caps words that aren't acronyms ────────────────────
// Emphasized dialogue text, not real organizations.

const CAPS_NOT_ACRONYMS = new Set([
  "HELLO", "READ", "STOP", "HELP", "MOVE", "WAIT",
  "COME", "LOOK", "HERE", "THERE", "WHAT", "WHERE", "WHEN", "FIRE",
  "DOWN", "BACK", "OPEN", "SHUT", "HOLD", "STAY", "KILL", "DEAD",
  "LOVE", "HOME", "GONE", "DAMN", "JUST", "YEAH", "OKAY", "CALL",
  "PLEASE", "SORRY", "NEVER", "LEAVE", "TAKE", "GIVE", "MAKE",
  "TELL", "KNOW", "THINK", "WANT", "NEED", "FEEL",
]);

// ─── Character title words ──────────────────────────────────
// Used for context-based character classification.

export const CHARACTER_TITLES = [
  "mr", "mrs", "ms", "dr", "professor", "colonel", "general", "agent",
  "captain", "lieutenant", "sergeant", "officer", "detective", "inspector",
  "president", "director", "commander", "major", "admiral", "senator",
  "governor", "ambassador", "minister", "secretary", "chief",
] as const;

// ─── Character action signals ───────────────────────────────
// Verbs that typically follow or precede character names.

export const CHARACTER_SIGNALS = [
  "said", "asked", "replied", "whispered", "shouted", "yelled",
  "nodded", "shook", "looked", "walked", "ran", "turned", "smiled",
  "frowned", "laughed", "sighed", "thought", "felt", "knew", "wanted",
  "told", "watched", "stood", "sat", "leaned", "paused", "continued",
  "shrugged", "muttered", "snapped", "glanced", "stared", "grabbed",
] as const;

// ─── Location prepositions ──────────────────────────────────

export const LOCATION_PREPOSITIONS = [
  "in", "to", "from", "at", "near", "outside", "across", "toward",
  "towards", "through", "around", "beyond",
] as const;

// ─── Lookup functions ───────────────────────────────────────

export interface GazetteerHit {
  type: EntityType;
  confidence: number;
}

/**
 * Check if a word is noise (common word, not an entity).
 */
export function isNoise(name: string): boolean {
  return NOISE_WORDS.has(name.toLowerCase());
}

/**
 * Check if an all-caps word is a false acronym (emphasized text).
 */
export function isCapsNoise(name: string): boolean {
  if (CAPS_NOT_ACRONYMS.has(name)) return true;
  // 4+ letter all-caps words that are common English words
  if (name.length >= 4 && /^[A-Z]+$/.test(name) && NOISE_WORDS.has(name.toLowerCase())) return true;
  return false;
}

/**
 * Check if a multi-word phrase is a street address (too granular).
 */
export function isStreetAddress(name: string): boolean {
  const words = name.split(/\s+/);
  if (words.length < 2) return false;
  return STREET_SUFFIXES.has(words[words.length - 1].toLowerCase());
}

/**
 * Look up a name in the gazetteer. Returns type + confidence if found.
 */
export function lookup(name: string): GazetteerHit | null {
  // Check known locations (exact match)
  const locConf = LOCATIONS.get(name);
  if (locConf !== undefined) return { type: "location", confidence: locConf };

  // Check known organizations (exact match)
  const orgConf = ORGANIZATIONS.get(name);
  if (orgConf !== undefined) return { type: "organization", confidence: orgConf };

  // Check multi-word suffix patterns
  const words = name.split(/\s+/);
  if (words.length >= 2) {
    const lastWord = words[words.length - 1].toLowerCase();
    if (LOCATION_SUFFIXES.has(lastWord)) return { type: "location", confidence: 80 };
    if (ORG_SUFFIXES.has(lastWord)) return { type: "organization", confidence: 80 };
  }

  return null;
}

/**
 * Get the full noise word set (for use in the regex scanner's
 * leading-word stripping and candidate filtering).
 */
export function getNoiseWords(): Set<string> {
  return NOISE_WORDS;
}

/**
 * Check if name is a common acronym skip (for scanner use).
 */
export function isAcronymSkip(acr: string): boolean {
  const SKIP = [
    "OK", "AM", "PM", "TV", "US", "UK", "EU", "UN", "ID", "IT",
    "OR", "AN", "AT", "AS", "IF", "IS", "IN", "ON", "SO", "TO",
    "UP", "NO", "OF", "IV", "IP", "AI", "AD", "DC", "AC", "DO",
    "GO", "ER", "DR", "MR", "MS", "VS", "RE", "EM", "AG",
  ];
  return SKIP.includes(acr);
}
