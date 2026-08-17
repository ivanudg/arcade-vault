# Máquinas implementadas

Las cinco máquinas jugables de Arcade Vault, en el orden en que se pintan.

**Fuente de verdad: `public.games`, en Supabase.** Desde SPEC 17 el catálogo vive en la
base de datos y se edita desde el panel, sin desplegar. Esta tabla es una copia a mano
para no tener que abrirlo, así que **puede quedar desfasada**: si lo que dice aquí no
coincide con lo que se ve en el sitio, manda la base de datos.

Lo que sigue viviendo en el código es lo que no cabe en una fila: el motor
(`lib/games/<id>/` y su línea en `ENGINES`), el mando (`ENGINE_KEYS` y `ENGINE_PAD`, en
`components/game-pad.tsx`), la miniatura (el `switch` de `lib/preview-art.ts`) y las
pieles (`skins.ts` de cada máquina). Por eso `GameId` es una unión cerrada de literales
en `lib/games.ts`: **editar** una máquina no necesita desplegar, **añadirla** sí.

| Id          | Título    | Categoría  | Color     | Descripción breve                                       |
| ----------- | --------- | ---------- | --------- | ------------------------------------------------------- |
| `asteroids` | ASTEROIDS | `DISPAROS` | `#f5ff00` | Pulveriza el campo de asteroides y sobrevive.           |
| `tetris`    | TETRIS    | `PUZZLE`   | `#00f5ff` | Encaja las piezas, limpia lineas y no llegues al techo. |
| `arkanoid`  | ARKANOID  | `ARCADE`   | `#ff006e` | Rompe todos los bloques sin dejar caer la bola.         |
| `snake`     | SNAKE     | `CLASICOS` | `#00f5ff` | Come fruta, crece y no te muerdas la cola.              |
| `frogger`   | FROGGER   | `REFLEJOS` | `#ff006e` | Cruza el trafico y el rio y llena las casas.            |

Para verla al día, la consulta es ésta:

```sql
select id, title, cat, glow, playable, sort_order, tagline from public.games order by sort_order, id;
```

## Qué se puede tocar desde el panel y qué no

| Columna                                | Se toca | Qué pasa                                                            |
| -------------------------------------- | ------- | -------------------------------------------------------------------- |
| `title`, `tagline`, `blurb`, `controls` | Sí      | Cambia en el sitio al recargar. `title` va en MAYUSCULAS ASCII       |
| `cat`, `glow`                          | Sí      | Los dos tienen `check`: sólo los seis valores y los tres hex        |
| `playable`                             | Sí      | `false` retira la máquina. Es la vía de retirada                    |
| `sort_order`                           | Sí      | Cambia el orden de la rejilla y de las pestañas del salón           |
| `id`                                   | **No**  | Es la llave del motor, del mando y de la miniatura. La máquina se iría del catálogo en silencio y sus rutas darían 404 |

Y **borrar una fila no es la vía de retirada**: `scores.game_id` es `on delete cascade`,
así que se lleva por delante todas las marcas de esa máquina, sin confirmación y sin
vuelta atrás. Para retirar una máquina, `playable = false`.
