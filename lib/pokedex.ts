/**
 * La Pokédex Nacional como fuente del contador de `/contador`.
 *
 * Es isomorfo y sin directiva de cliente —TypeScript puro, sin React y sin
 * DOM—, igual que `lib/password.ts` y `lib/storage.ts`: quien lo consume es un
 * componente de cliente, así que aquí no puede entrar nada de servidor.
 *
 * Los datos salen de PokeAPI (https://pokeapi.co), que no pide clave ni cuota,
 * así que no hay variable de entorno nueva que documentar en `.env.example`.
 */

/** La primera entrada de la Pokédex. */
export const POKEDEX_MIN = 1;

/** La última entrada de la Pokédex Nacional a día de hoy. */
export const POKEDEX_MAX = 1025;

/** Los dieciocho tipos, tal y como los nombra PokeAPI. */
export type PokeType =
  | "normal"
  | "fire"
  | "water"
  | "electric"
  | "grass"
  | "ice"
  | "fighting"
  | "poison"
  | "ground"
  | "flying"
  | "psychic"
  | "bug"
  | "rock"
  | "ghost"
  | "dragon"
  | "dark"
  | "steel"
  | "fairy";

/** Una entrada ya traducida a lo que la pantalla necesita pintar. */
export type PokedexEntry = {
  /** El número nacional, que es también el valor del contador. */
  readonly id: number;
  /** En mayúsculas, sin guiones y sin diacríticos: lo pinta Press Start 2P. */
  readonly name: string;
  /** Uno o dos; el primero manda el acento de la pantalla. */
  readonly types: readonly PokeType[];
  /** El artwork oficial, o `null` si esa entrada no tiene ninguno. */
  readonly art: string | null;
  /** En metros; PokeAPI lo da en decímetros. */
  readonly height: number;
  /** En kilos; PokeAPI lo da en hectogramos. */
  readonly weight: number;
  /** La descripción de la Pokédex en español, o `null` si no la hay. */
  readonly flavor: string | null;
};

/**
 * El color de cada tipo, subido de luminosidad para que aguante el `#0a0a0f`
 * del vault: los canónicos de `poison`, `dragon` y `dark` se hunden en el fondo.
 * Es el único color de esta pantalla que no sale de los tokens `--av-*`, y por
 * eso viaja siempre en `style` y nunca en un nombre de clase —Tailwind sólo ve
 * las cadenas escritas enteras—.
 */
export const TYPE_COLOR: Record<PokeType, string> = {
  normal: "#c6c6a8",
  fire: "#ff7a3d",
  water: "#4d9cff",
  electric: "#ffd93d",
  grass: "#5cdb6a",
  ice: "#7fe8e8",
  fighting: "#ff5c4d",
  poison: "#d670ff",
  ground: "#e6c05c",
  flying: "#a3a8ff",
  psychic: "#ff5c9e",
  bug: "#b8d13d",
  rock: "#c9b478",
  ghost: "#8a7dff",
  dragon: "#7a6bff",
  dark: "#9b8578",
  steel: "#b8c4d6",
  fairy: "#ff9ad6",
};

/** Los rótulos de tipo, en mayúsculas y sin tildes: van en Press Start 2P. */
export const TYPE_LABEL: Record<PokeType, string> = {
  normal: "NORMAL",
  fire: "FUEGO",
  water: "AGUA",
  electric: "ELECTRICO",
  grass: "PLANTA",
  ice: "HIELO",
  fighting: "LUCHA",
  poison: "VENENO",
  ground: "TIERRA",
  flying: "VOLADOR",
  psychic: "PSIQUICO",
  bug: "BICHO",
  rock: "ROCA",
  ghost: "FANTASMA",
  dragon: "DRAGON",
  dark: "SINIESTRO",
  steel: "ACERO",
  fairy: "HADA",
};

/** El acento cuando todavía no se sabe de qué tipo es: el cian de la casa. */
export const NEUTRAL_ACCENT = "#00f5ff";

/** `25` -> `"0025"`. El display del contador siempre tiene cuatro dígitos. */
export function padId(id: number) {
  return String(id).padStart(4, "0");
}

/** El acento de una entrada: su tipo primario, o el cian mientras no hay. */
export function accentOf(entry: PokedexEntry | null) {
  const primary = entry?.types[0];
  return primary ? TYPE_COLOR[primary] : NEUTRAL_ACCENT;
}

/**
 * A mayúsculas, sin guiones y **sin diacríticos**.
 *
 * Lo segundo no es cosmético: el nombre se pinta en Press Start 2P, que no
 * tiene glifos acentuados, así que un `flabébé` sin normalizar saldría con la
 * `é` sustituida por otra fuente y hecha una mota al lado de un avance de 20px.
 */
function displayName(raw: string) {
  return raw
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, " ")
    .trim()
    .toUpperCase();
}

/** La descripción de la Pokédex viene con saltos de página del cartucho. */
function cleanFlavor(raw: string) {
  return raw
    .replace(/[\f\n\r\u00ad]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

type ApiPokemon = {
  id: number;
  name: string;
  height: number;
  weight: number;
  types: { type: { name: string } }[];
  sprites: {
    front_default: string | null;
    other?: { ["official-artwork"]?: { front_default: string | null } };
  };
};

type ApiSpecies = {
  flavor_text_entries: { flavor_text: string; language: { name: string } }[];
};

const API = "https://pokeapi.co/api/v2";

/**
 * Pide una entrada. **Lanza** si no se pudo traer: quien llama decide qué
 * pintar, y aquí no hay un vacío legítimo que confundir con un fallo —al
 * contrario que en `lib/leaderboard.ts`, donde el marcador vacío es el estado
 * del día uno—.
 *
 * Son dos peticiones y no una porque la descripción vive en `pokemon-species`,
 * un recurso aparte. Van en paralelo y la segunda es opcional: si falla, la
 * ficha se queda sin texto en vez de quedarse sin Pokémon.
 */
export async function fetchEntry(id: number, signal?: AbortSignal): Promise<PokedexEntry> {
  const [pokemon, species] = await Promise.all([
    fetch(`${API}/pokemon/${id}`, { signal }).then((r) => {
      if (!r.ok) throw new Error(`pokemon ${id}: ${r.status}`);
      return r.json() as Promise<ApiPokemon>;
    }),
    fetch(`${API}/pokemon-species/${id}`, { signal })
      .then((r) => (r.ok ? (r.json() as Promise<ApiSpecies>) : null))
      .catch(() => null),
  ]);

  const spanish = species?.flavor_text_entries.find((f) => f.language.name === "es");
  const english = species?.flavor_text_entries.find((f) => f.language.name === "en");
  const flavor = spanish ?? english;

  return {
    id: pokemon.id,
    name: displayName(pokemon.name),
    types: pokemon.types.map((t) => t.type.name as PokeType),
    art:
      pokemon.sprites.other?.["official-artwork"]?.front_default ?? pokemon.sprites.front_default,
    height: pokemon.height / 10,
    weight: pokemon.weight / 10,
    flavor: flavor ? cleanFlavor(flavor.flavor_text) : null,
  };
}
