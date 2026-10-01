#!/usr/bin/env python3
# Builds data/forms.js and sprites/forms/ from PokeAPI: per data/pokedex.js entry its cosmetic forms, forms that
# can be changed in-game and visible gender differences. Run from anywhere: python3 scripts/gen-forms.py
# Existing sprites are kept; delete sprites/forms/ to fetch them all again. The app reads only
# data/forms.js, so new forms (or a new game's forms) show up everywhere after running this again.
import json, os, re, subprocess, concurrent.futures as cf

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
GQL = "https://beta.pokeapi.co/graphql/v1beta"
HOME = "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/home/shiny/"

def curl(*args):
  return subprocess.check_output(["curl", "-s", *args])

def gql(query):
  return json.loads(curl("-X", "POST", GQL, "-H", "Content-Type: application/json", "-d", json.dumps({"query": query})))["data"]

spec = gql("""{ pokemon_v2_pokemonspecies(order_by:{id:asc}) { id has_gender_differences
  pokemon_v2_pokemons { id name is_default pokemon_v2_pokemonforms { name form_name is_battle_only is_mega form_order } } } }""")["pokemon_v2_pokemonspecies"]
names = {f["name"]: (f["pokemon_v2_pokemonformnames"] or [{"name": ""}])[0]["name"] for f in gql(
  """{ pokemon_v2_pokemonform { name pokemon_v2_pokemonformnames(where:{language_id:{_eq:9}}) { name } } }""")["pokemon_v2_pokemonform"]}
dex = json.loads(subprocess.check_output(["node", "-e",
  f'global.window={{}};require({json.dumps(REPO + "/data/pokedex.js")});console.log(JSON.stringify(window.DEX.filter(x=>x.name)))']))

# Left out: never shiny in the tracked games (Arceus, Silvally and Genesect held-item forms, Magearna Original,
# Zarude Dada, Ogerpon, Keldeo, Zygarde, Hoopa, Bloodmoon Ursaluna), fusions (Kyurem, Necrozma, Calyrex),
# battle/ride forms (Eternamax, Koraidon, Miraidon), and forms that look the same (Scatterbug, Spewpa, Mothim,
# Own Tempo Rockruff, Battle Bond Greninja, Gimmighoul, and Minior: every shiny core looks the same).
SKIP_SPECIES = {493, 773, 649, 801, 893, 1017, 647, 718, 720, 901, 646, 800, 898, 890, 1007, 1008, 664, 665, 414, 744, 658, 999,
                774}
# Regional forms are their own entries in data/pokedex.js; cap and cosplay Pikachu, Partner Pikachu/Eevee, Spiky-eared
# Pichu and Eternal Floette are shiny-locked; totems and Minior's Meteor Form aren't catchable forms.
SKIP_FORM = re.compile(r"(-alola$|-galar|-hisui|^wooper-paldea|basculin-white-striped|-totem|-cap$|-cosplay|-rock-star|-belle"
                       r"|-pop-star|-phd|-libre|-starter|pichu-spiky|floette-eternal|minior-red-meteor)")
ENTRY = {128: "tauros-1"}
REGION = {"Alolan": "alola", "Galarian": "galar", "Hisuian": "hisui", "Paldean": "paldea"}  # Paldean Tauros breeds go on the Paldean entry

def label(form, fallback):
  n = names.get(form) or fallback
  n = re.sub(r"^Paldean Form \((.*)\)$", r"\1", n)
  return re.sub(r" Forme?$", "", n)

out = {}
for s in spec:
  sid = s["id"]
  base = [m for m in dex if int(m["dex"]) == sid]
  if sid in SKIP_SPECIES or not base: continue
  entry = ENTRY.get(sid) or next((m for m in base if m["form"] in ("", "Original")), base[0])["key"]
  forms = []
  for p in s["pokemon_v2_pokemons"]:
    for f in sorted(p["pokemon_v2_pokemonforms"], key=lambda f: f["form_order"]):
      if f["is_battle_only"] or f["is_mega"] or "gmax" in f["name"] or SKIP_FORM.search(f["name"]): continue
      if sid == 128 and "paldea" not in f["name"]: continue
      forms.append((p["name"], f))
  # Shiny Alcremie has the same cream whatever its flavor, so only the 7 sweets look different (Bulbapedia).
  if sid == 869:
    forms = [(p, {**f, "name": "alcremie-" + f["name"].split("-cream-")[-1], "form_name": f["form_name"]})
             for p, f in forms if f["name"].startswith("alcremie-vanilla-cream")]
  items = []
  if len(forms) > 1:
    for pname, f in forms:
      slug = f["name"].split("-")[2] if sid == 128 else f["name"].split("-", 1)[1] if "-" in f["name"] else "normal"
      # Sprite candidates: the form's own HOME sprite, the variety's (Rotom-Wash etc.), the species'.
      urls = ([f"{HOME}{sid}-{f['form_name']}.png"] if f["form_name"] else []) + [("pokemon", pname), f"{HOME}{sid}.png"]
      n = label(f["name"], slug.title())
      if sid == 869: n = slug.replace("-", " ").title()
      items.append({"id": slug, "n": n, "urls": urls})
  elif s["has_gender_differences"]:
    items = [{"id": "male", "n": "Male", "urls": []}, {"id": "female", "n": "Female", "urls": [f"{HOME}female/{sid}.png"]}]
  if len(items) > 1: out[entry] = items
  # Regional forms with their own gender difference (Hisuian Sneasel): a female HOME sprite of that variety.
  if s["has_gender_differences"]:
    for m in base:
      region = REGION.get(m["form"])
      p = region and next((p for p in s["pokemon_v2_pokemons"] if p["name"].endswith("-" + region)), None)
      if p and subprocess.run(["curl", "-sfI", "-o", "/dev/null", f"{HOME}female/{p['id']}.png"]).returncode == 0:
        out[m["key"]] = [{"id": "male", "n": "Male", "urls": []},
                         {"id": "female", "n": "Female", "urls": [f"{HOME}female/{p['id']}.png"]}]

os.makedirs(f"{REPO}/sprites/forms", exist_ok=True)
def fetch(entry, it):
  if not it["urls"]: return None  # male: the entry's own sprite
  dst = f"sprites/forms/{entry}-{it['id']}.png"
  full = f"{REPO}/{dst}"
  if os.path.exists(full) and os.path.getsize(full) > 0:
    it["s"] = dst
    return None
  for u in it["urls"]:
    if isinstance(u, tuple):
      d = json.loads(curl(f"https://pokeapi.co/api/v2/pokemon/{u[1]}") or b"{}")
      u = ((d.get("sprites") or {}).get("other") or {}).get("home", {}).get("front_shiny")
      if not u: continue
    if subprocess.run(["curl", "-sfL", "-o", full, u]).returncode == 0:
      subprocess.run(["sips", "-Z", "128", full], capture_output=True)  # macOS; same size as sprites/
      it["s"] = dst
      return None
  return f"no sprite: {entry} {it['id']}"

with cf.ThreadPoolExecutor(16) as ex:
  for r in ex.map(lambda a: fetch(*a), [(e, i) for e, l in out.items() for i in l]):
    if r: print(r)

# Forms of one entry with the very same sprite are almost always a failed download (the species' sprite came
# back instead); the few that really look alike are listed here.
SAME_LOOK = {"sinistea", "polteageist", "poltchageist", "sinistcha"}  # authentic/phony: only a hidden mark differs
for e, l in out.items():
  seen = {}
  for i in l:
    if i.get("s"): seen.setdefault(open(f"{REPO}/{i['s']}", "rb").read(), []).append(i["id"])
  for ids in seen.values():
    if len(ids) > 1 and e not in SAME_LOOK: print(f"same sprite: {e} {', '.join(ids)} (delete them and run again)")

res = {e: [{k: v for k, v in i.items() if k in ("id", "n", "s")} for i in l] for e, l in out.items()}
body = ",\n".join(f"  {json.dumps(k, ensure_ascii=False)}: {json.dumps(v, ensure_ascii=False)}" for k, v in res.items())
with open(f"{REPO}/data/forms.js", "w") as fh:
  fh.write("// Alternate forms per entry (keyword from data/pokedex.js): cosmetic forms, forms that can be changed in-game\n"
           "// and visible gender differences. A shiny's `alt` holds the form id (shinies without one: form not set).\n"
           "// Generated by scripts/gen-forms.py from PokeAPI; shiny-locked and battle-only forms are left out.\n"
           "window.FORMS = {\n" + body + "\n};\n")
print(len(res), "entries,", sum(len(v) for v in res.values()), "forms")
