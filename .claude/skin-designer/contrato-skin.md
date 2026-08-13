# Contrato de skin

Qué es una skin en Arcade Vault, cuáles son las tres obligatorias y las ocho reglas con las
que el agente `skin-designer` valida una paleta antes de darla por buena. **Se lee en la Fase
0, y sin él la auditoría no tiene contra qué comparar.**

Ninguna regla es una opinión: cada una sale de un archivo del repo que la impone hoy. Si algún
día ese archivo cambia —el contrato de `lib/games/engine.ts` gana un tema, `globals.css`
estrena un quinto neón—, cambia la regla, y las skins rechazadas por ella se pueden reabrir.

**Ojo con el estado del repo: el sistema de skins no existe.** No hay tipo, ni constante, ni
selector; `mount(canvas, cb)` recibe dos parámetros y ninguno es un tema. Una skin es hoy un
**diseño en papel**: una tabla de colores validada y anotada, lista para que la implemente una
spec. Ese diseño se hace igual de riguroso, porque el día que llegue la spec lo que se copie
tiene que ser mecánico.

---

## Qué es una skin

Una skin es un **mapeo completo de las ranuras de color de un motor a colores concretos**. No
es un filtro, ni un tinte global, ni un cambio de CSS: el canvas del motor no hereda nada del
tema del sitio, y cada `fillStyle` que el motor asigna sale de una constante suya.

Una **ranura** es cada elemento pintable que el motor distingue por color. Se nombra con su
identificador real del código, sea una constante (`COLOR_BODY`, `COLORS[3]`, `COLOR_MAP.r`) o
una fuga —un literal escrito directamente en la llamada, como `entities.ts:57 ENTITY_COLOR` o
el `"#000"` de fondo—. Las fugas cuentan: son ranuras igual, sólo que hoy sin nombre.

**El alfa lo pone el motor, no la skin.** `COLOR_GRID` es `rgba(0,245,255,0.1)` y el brillo de
un bloque de Tetris es `rgba(255,255,255,0.12)`; en los dos casos lo que la skin decide es el
color, y la transparencia es una decisión de dibujo que se respeta tal cual. Lo mismo con el
`globalAlpha` que Arkanoid modula según los puntos de vida del bloque.

## Las tres obligatorias

Toda máquina con entrada en `ENGINES` tiene que tener las tres. Las máquinas de `GAMES` sin
motor no se visten: no hay nada que pintar.

### `clasico` — el default

Los colores que el motor tiene **hoy** en el código, hex a hex. No es un diseño: es una
extracción. Es la que se ve si nadie elige nada, y la que garantiza que estrenar el sistema de
skins no cambie el aspecto de ninguna partida.

### `neon` — el vault

Sólo los tokens `--av-*` de `app/globals.css`. Los cuatro acentos son `#00f5ff` (cian),
`#ff006e` (magenta), `#f5ff00` (amarillo) y `#ff9d4d` (ámbar); las superficies son `#05060a`
(void), `#0a0a0f` (fondo), `#0f1119`, `#12141d` y `#15171f` (paneles); el texto son seis
niveles de `#e7ebf5` a `#545b6b`, y las líneas `#3d4350` y `#4a5160`.

**La lista la manda el archivo, no esta enumeración.** Si `globals.css` estrena un token, es
legal el día que aparezca ahí; si esta lista se queda corta, gana el archivo. Y ojo con la
confusión fácil: `GameGlow`, en `lib/games.ts`, es una unión cerrada de **tres** hex, pero eso
es el acento de la máquina en las tarjetas y la ficha, no el vocabulario de esta skin. El
ámbar no es un `glow` válido y sí es un color válido en `neon`.

Es la skin que hace que la partida y el resto del sitio se vean de la misma familia. Snake ya
está pintado así por decisión de SPEC 10, así que su `clasico` y su `neon` van a parecerse
mucho: eso no es un error, se anota y se sigue.

### `retro` — fósforo monocromo

Un monitor de fósforo verde. Cuatro valores y ni uno más:

| Escalón | Hex       | Para qué                                      |
| ------- | --------- | --------------------------------------------- |
| fondo   | `#001100` | El lienzo. Nunca lo lleva una entidad         |
| vivo    | `#33ff33` | Lo que el jugador controla o mira ahora mismo |
| medio   | `#22aa22` | Lo que amenaza o hay que esquivar             |
| tenue   | `#116611` | Fondo activo: rejillas, guías, adorno         |

**Las entidades se distinguen por brillo, no por tinte.** Es lo que la hace barata —no
necesita más colores que los que ya hay— y lo que la hace exigente: un motor que necesite
distinguir más de tres cosas a la vez no cabe, y eso se reporta en vez de inventarse un quinto
escalón.

---

## Las ocho reglas — S1 a S8

Se responden con «sí» o «no». **Un solo «no» deja la skin en `sin-disenar`**, con el motivo
citando la regla (`S1: falta el fondo de index.ts:393`).

### S1 · Cobertura

La skin nombra **todas** las ranuras del motor, incluidas las que hoy son literales sueltos
fuera de `constants.ts`. Pasa si la tabla de la paleta tiene tantas filas como ranuras
inventariadas en la Fase 4 y ninguna celda vacía.

Falla si queda una sin color. Una ranura sin cubrir no es un detalle pendiente: es una entidad
que se pinta con el color de la skin anterior, o que no se pinta.

### S2 · `clasico` se extrae, no se diseña

Pasa si cada hex de la columna `clasico` se puede señalar en el código, con archivo y línea.
Falla si hay uno «mejorado», normalizado o redondeado.

Es la regla que hace verificable el resto: `clasico` es la única columna que se puede
comprobar con un `Grep`, y es la que prueba que el inventario de ranuras está bien hecho. Ojo
con Arkanoid, que guarda nombres de color CSS (`"red"`, `"hotpink"`) y no hex: se copian tal
cual, porque son válidos y son lo que hay. Convertirlos a hex es un rediseño.

### S3 · Distinción

Pasa si dos entidades que el jugador tiene que separar **en el mismo frame** no comparten
color. En `retro` se separan por escalón; con tres escalones vivos, un motor que necesite más
de tres distinciones simultáneas **no cabe, y es un hallazgo que se reporta**, no un problema
que se resuelve inventando tonos.

El caso previsible son los siete tetrominós de `COLORS[]`: no caben en tres escalones de
fósforo y tampoco en los cuatro acentos del vault. Es una decisión de spec —repetir color
entre piezas, distinguirlas por borde, o dejar Tetris con dos skins y decirlo—, y el agente la
plantea sin elegirla por su cuenta.

Falla si dos entidades vivas a la vez acaban del mismo color sin que nadie lo haya decidido.

### S4 · Contraste contra su propio fondo

Cada color de entidad se compara con el fondo **de su misma skin**, no con el del vault. Pasa
si todos despegan del fondo con holgura; falla si hay vivo sobre vivo, o un tenue sobre un
fondo casi igual de claro.

La trampa está en `neon`: `#0a0a0f` es casi negro y casi todo contrasta, así que la regla
apenas muerde ahí y en cambio decide `retro` entera —`#116611` sobre `#001100` es legible;
sobre un fondo más claro, no—.

### S5 · `neon` no inventa hex

Pasa si cada color de la columna se puede señalar en `app/globals.css`, que es la lista
completa y la única que manda. Falla si aparece uno intermedio, aclarado u oscurecido «para
que se vea mejor».

Los tokens del tema son una lista corta y deliberada. Un neón nuevo es un cambio de
`app/globals.css` que merece su propia decisión escrita, no un valor colado en una paleta.

### S6 · `retro` no admite tintes

Pasa si cada color es uno de los cuatro escalones de la rampa. Falla con cualquier otro tono,
incluido otro verde.

Un solo tono ajeno rompe justo lo que la skin dice ser. Si la rampa se queda corta, la salida
es S3 —reportarlo—, no ampliarla.

### S7 · Una skin no pide assets

Pasa si la skin se pinta con lo que el motor ya dibuja. Falla si necesita un archivo nuevo, un
recorte distinto de un atlas o un filtro de composición.

El caso real es Snake: sus 22 frutas salen de `public/snake/fruits.png`, y las coordenadas de
`lib/games/snake/sprites.ts` son copia literal del material de origen. **El atlas no se
recolorea.** En `neon` y en `retro`, la fruta cae al color plano de `COLOR_FRUIT_FALLBACK`, que
es el camino que el motor ya tiene escrito para cuando la imagen no carga. Se documenta como
excepción explícita de la máquina, no como pérdida silenciosa.

### S8 · La ranura se nombra con su identificador del código

Pasa si cada fila de la tabla se puede llevar al código sin buscar nada: una constante
existente por su nombre, o una fuga con su archivo y su línea. Falla con nombres inventados
—«el enemigo», «el borde»— que obligarían a releer el motor entero al implementar.

---

## Cómo se presenta

Se imprime **la tabla de cobertura entera** —una fila por máquina, una columna por skin, las
doce celdas con su estado— aunque la mayoría estén sin diseñar. Es la respuesta directa a la
pregunta que dispara este agente.

Y luego **una tabla de paleta por máquina**, con todas sus ranuras, incluidas las columnas que
ya estaban resueltas. Una paleta a medias no se puede revisar: lo que se juzga es el conjunto.

Las skins que fallan una regla se presentan igual, con la regla que fallan y qué haría falta
para desbloquearlas. Un `S3` sin resolver es una decisión pendiente para un humano, y esconderla
sólo la retrasa.
