// Marks (Sword & Shield, Scarlet & Violet): a shiny's `mark` is the mark id, icon in marks/{id}.png.
// Lists per game from Serebii (swordshield/marks.shtml, scarletviolet/marks.shtml). HOME keeps every
// mark, since marked Pokémon move there from either game. Other games have no marks.
// [id, name, title]; the title is what the game adds after the Pokémon's name ("the Recluse").
const ALL = [
  ["lunchtime", "Lunchtime Mark", "the Peckish"], ["sleepy-time", "Sleepy-Time Mark", "the Sleepy"],
  ["dusk", "Dusk Mark", "the Dozy"], ["dawn", "Dawn Mark", "the Early Riser"],
  ["cloudy", "Cloudy Mark", "the Cloud Watcher"], ["rainy", "Rainy Mark", "the Sodden"],
  ["stormy", "Stormy Mark", "the Thunderstruck"], ["snowy", "Snowy Mark", "the Snow Frolicker"],
  ["blizzard", "Blizzard Mark", "the Shivering"], ["dry", "Dry Mark", "the Parched"],
  ["sandstorm", "Sandstorm Mark", "the Sandswept"], ["misty", "Misty Mark", "the Mist Drifter"],
  ["destiny", "Destiny Mark", "the Chosen One"], ["fishing", "Fishing Mark", "the Catch of the Day"],
  ["curry", "Curry Mark", "the Curry Connoisseur"], ["rare", "Rare Mark", "the Recluse"],
  ["uncommon", "Uncommon Mark", "the Sociable"],
  ["rowdy", "Rowdy Mark", "the Rowdy"], ["absent-minded", "Absent-Minded Mark", "the Spacey"],
  ["jittery", "Jittery Mark", "the Anxious"], ["excited", "Excited Mark", "the Giddy"],
  ["charismatic", "Charismatic Mark", "the Radiant"], ["calmness", "Calmness Mark", "the Serene"],
  ["intense", "Intense Mark", "the Feisty"], ["zoned-out", "Zoned-Out Mark", "the Daydreamer"],
  ["joyful", "Joyful Mark", "the Joyful"], ["angry", "Angry Mark", "the Furious"],
  ["smiley", "Smiley Mark", "the Beaming"], ["teary", "Teary Mark", "the Teary-Eyed"],
  ["upbeat", "Upbeat Mark", "the Chipper"], ["peeved", "Peeved Mark", "the Grumpy"],
  ["intellectual", "Intellectual Mark", "the Scholar"], ["ferocious", "Ferocious Mark", "the Rampaging"],
  ["crafty", "Crafty Mark", "the Opportunist"], ["scowling", "Scowling Mark", "the Stern"],
  ["kindly", "Kindly Mark", "the Kindhearted"], ["flustered", "Flustered Mark", "the Easily Flustered"],
  ["pumped-up", "Pumped-Up Mark", "the Driven"], ["zeroenergy", "Zero Energy Mark", "the Apathetic"],
  ["prideful", "Prideful Mark", "the Arrogant"], ["unsure", "Unsure Mark", "the Reluctant"],
  ["humble", "Humble Mark", "the Humble"], ["thorny", "Thorny Mark", "the Pompous"],
  ["vigor", "Vigor Mark", "the Lively"], ["slump", "Slump Mark", "the Worn-Out"],
  // New in Scarlet & Violet.
  ["itemfinder", "Itemfinder Mark", "the Treasure Hunter"], ["gourmand", "Gourmand Mark", "the Gourmet"],
  ["jumbo", "Jumbo Mark", "the Great"], ["mini", "Mini Mark", "the Teeny"],
  ["partner", "Partner Mark", "the Reliable Partner"], ["mightiest", "Mightiest Mark", "the Unrivaled"],
  ["titan", "Titan Mark", "the Former Titan"], ["alpha", "Alpha Mark", "the Former Alpha"],
].map(([id, n, title]) => ({ id, n, title, icon: `marks/${id}.png` }));

const SV_NEW = ["itemfinder", "gourmand", "jumbo", "mini", "partner", "mightiest", "titan", "alpha"];
const NOT_IN = { swsh: SV_NEW, sv: ["dry", "fishing", "curry"] };
const BY_GAME = {
  swsh: ALL.filter(k => !NOT_IN.swsh.includes(k.id)),
  sv: ALL.filter(k => !NOT_IN.sv.includes(k.id)),
  home: ALL,
};

export const marksFor = g => BY_GAME[g] || [];
export const markOf = id => (id && ALL.find(k => k.id === id)) || null;
