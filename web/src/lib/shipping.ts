// Country/region matching for the checkout shipping picker.
//
// Sellers describe shipping zones with free-text region names — "United
// Kingdom", "Europe", "EU", "Worldwide", etc. The buyer types their country.
// We need to figure out which seller zones cover that country so we can
// pre-select the cheapest applicable option. Strict equality handles only
// "United Kingdom" → "United Kingdom"; matching "Germany" → "Europe" needs
// a country-list per region.
//
// This is a heuristic, not a contract: the dropdown stays editable so the
// buyer can correct any miss. Sellers using exotic region names like
// "EMEA" / "Schengen" / "EU + UK" won't match — that's fine, the buyer
// picks manually.

const CATCH_ALL = new Set(['worldwide', 'international', 'global', 'anywhere'])

// EU member states (27 as of 2026)
const EU = new Set([
  'austria', 'belgium', 'bulgaria', 'croatia', 'cyprus', 'czechia',
  'czech republic', 'denmark', 'estonia', 'finland', 'france', 'germany',
  'greece', 'hungary', 'ireland', 'italy', 'latvia', 'lithuania',
  'luxembourg', 'malta', 'netherlands', 'poland', 'portugal', 'romania',
  'slovakia', 'slovenia', 'spain', 'sweden',
])

// EU + Iceland, Liechtenstein, Norway
const EEA = new Set([...EU, 'iceland', 'liechtenstein', 'norway'])

// Geographic Europe — broader than the EU, includes UK, Switzerland, Russia,
// Turkey, Balkans, microstates, and major Crown Dependencies.
const EUROPE = new Set([
  ...EEA,
  'albania', 'andorra', 'belarus', 'bosnia and herzegovina', 'gibraltar',
  'guernsey', 'isle of man', 'jersey', 'kosovo', 'moldova', 'monaco',
  'montenegro', 'north macedonia', 'russia', 'san marino', 'serbia',
  'switzerland', 'turkey', 'ukraine', 'united kingdom', 'vatican city',
])

const NORTH_AMERICA = new Set([
  'canada', 'mexico', 'united states', 'usa',
])

const SOUTH_AMERICA = new Set([
  'argentina', 'bolivia', 'brazil', 'chile', 'colombia', 'ecuador',
  'french guiana', 'guyana', 'paraguay', 'peru', 'suriname', 'uruguay',
  'venezuela',
])

const LATIN_AMERICA = new Set([
  ...SOUTH_AMERICA, 'belize', 'costa rica', 'cuba', 'dominican republic',
  'el salvador', 'guatemala', 'haiti', 'honduras', 'mexico', 'nicaragua',
  'panama', 'puerto rico',
])

const ASIA = new Set([
  'afghanistan', 'bangladesh', 'bhutan', 'brunei', 'cambodia', 'china',
  'india', 'indonesia', 'japan', 'kazakhstan', 'kyrgyzstan', 'laos',
  'malaysia', 'maldives', 'mongolia', 'myanmar', 'nepal', 'north korea',
  'pakistan', 'philippines', 'singapore', 'south korea', 'sri lanka',
  'taiwan', 'tajikistan', 'thailand', 'timor-leste', 'turkmenistan',
  'uzbekistan', 'vietnam',
])

const MIDDLE_EAST = new Set([
  'bahrain', 'iran', 'iraq', 'israel', 'jordan', 'kuwait', 'lebanon', 'oman',
  'palestine', 'qatar', 'saudi arabia', 'syria', 'turkey',
  'united arab emirates', 'uae', 'yemen',
])

const AFRICA = new Set([
  'algeria', 'angola', 'benin', 'botswana', 'burkina faso', 'burundi',
  'cameroon', 'cape verde', 'central african republic', 'chad', 'comoros',
  'democratic republic of the congo', 'djibouti', 'egypt', 'equatorial guinea',
  'eritrea', 'eswatini', 'ethiopia', 'gabon', 'gambia', 'ghana', 'guinea',
  'guinea-bissau', 'ivory coast', 'kenya', 'lesotho', 'liberia', 'libya',
  'madagascar', 'malawi', 'mali', 'mauritania', 'mauritius', 'morocco',
  'mozambique', 'namibia', 'niger', 'nigeria', 'rwanda', 'senegal',
  'seychelles', 'sierra leone', 'somalia', 'south africa', 'south sudan',
  'sudan', 'tanzania', 'togo', 'tunisia', 'uganda', 'zambia', 'zimbabwe',
])

const OCEANIA = new Set([
  'australia', 'fiji', 'kiribati', 'marshall islands', 'micronesia',
  'nauru', 'new zealand', 'palau', 'papua new guinea', 'samoa',
  'solomon islands', 'tonga', 'tuvalu', 'vanuatu',
])

const ASIA_PACIFIC = new Set([...ASIA, ...OCEANIA])

const REGION_GROUPS: Record<string, Set<string>> = {
  africa: AFRICA,
  apac: ASIA_PACIFIC,
  asia: ASIA,
  'asia pacific': ASIA_PACIFIC,
  'asia-pacific': ASIA_PACIFIC,
  eea: EEA,
  eu: EU,
  europe: EUROPE,
  'european economic area': EEA,
  'european union': EU,
  'latin america': LATIN_AMERICA,
  'middle east': MIDDLE_EAST,
  'north america': NORTH_AMERICA,
  oceania: OCEANIA,
  'south america': SOUTH_AMERICA,
}

// Common synonyms for country names. Buyers may type any of these; we
// canonicalise to the country names used in the region sets above.
const COUNTRY_ALIASES: Record<string, string> = {
  america: 'united states',
  britain: 'united kingdom',
  deutschland: 'germany',
  england: 'united kingdom',
  españa: 'spain',
  espana: 'spain',
  france: 'france',
  'great britain': 'united kingdom',
  holland: 'netherlands',
  italia: 'italy',
  'northern ireland': 'united kingdom',
  scotland: 'united kingdom',
  uae: 'united arab emirates',
  uk: 'united kingdom',
  us: 'united states',
  usa: 'united states',
  wales: 'united kingdom',
}

function normalise(s: string): string {
  return s.trim().toLowerCase()
}

function canonicalCountry(country: string): string {
  const c = normalise(country)
  return COUNTRY_ALIASES[c] ?? c
}

// True if the buyer's country is covered by the seller's region. The match
// is case-insensitive and handles exact match, catch-all regions, and the
// region-group lookup table above.
export function countryInRegion(country: string, region: string): boolean {
  const c = canonicalCountry(country)
  const r = normalise(region)
  if (!c || !r) return false
  if (c === r) return true
  if (CATCH_ALL.has(r)) return true
  return REGION_GROUPS[r]?.has(c) ?? false
}
