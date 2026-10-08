# DESIGN.md — PulsoFM

Brief de diseño para prototipar en Google Stitch y Prototipa. Describe la app tal como funciona hoy, para que el prototipo refleje el producto real.

---

## 1. Producto en una frase

PulsoFM es la radio de un gimnasio. Los socios piden canciones desde su móvil, la PC de la sala las reproduce por los altavoces y el staff modera la cola en vivo.

## 2. Usuarios y contexto

| Usuario                 | Dispositivo                                            | Contexto                                                  | Lo que necesita                                                                                 |
| ----------------------- | ------------------------------------------------------ | --------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| **Socio**               | Móvil (360–430 px de ancho), casi siempre con una mano | Entre series, con sudor, con ruido alrededor              | Pedir una canción en 2 toques, saber cuándo suena, no quedarse sin pedidos sin entender por qué |
| **Staff / recepción**   | Móvil o tablet en mostrador                            | Ocupados, interrumpidos                                   | Ver la cola de un vistazo, saltar o quitar canciones sin errores, bloquear rápido               |
| **Admin**               | Escritorio o móvil                                     | Revisiones puntuales                                      | Auditoría legible                                                                               |
| **Pantalla de la sala** | PC/TV en 16:9, a 2–4 m                                 | Lectura a distancia, sin interacción salvo el primer clic | Qué suena, quién lo pidió, qué sigue                                                            |

Principios:

1. **Mobile-first de verdad.** Diseña primero a 390 × 844. Escritorio solo para el panel y la pantalla.
2. **Legible en movimiento.** Textos grandes, una acción principal por pantalla.
3. **Estado siempre visible.** El socio siempre sabe su puesto, sus límites y si la cola está en vivo.
4. **Oscuro por defecto.** Es una radio en una sala con poca luz. El modo claro existe pero no es el principal.

## 3. Marca

- **Nombre:** PulsoFM.
- **Logo:** un trazo de pulso (línea de latido) sobre un cuadrado redondeado con degradado violeta → rosa. Sirve de icono de la app.
- **Tono:** cercano, directo, sin jerga técnica. Tutea al socio.
- **Personalidad:** energía de gimnasio con calma de radio. Nada de colores chillones sin función.

## 4. Sistema de color (tokens)

Todos los colores se definen como variables; el prototipo debe usar tokens, no valores sueltos.

### Modo oscuro (por defecto)

| Token              | Valor                      | Uso                                           |
| ------------------ | -------------------------- | --------------------------------------------- |
| `--bg`             | `#0a0e1a`                  | Fondo de página                               |
| `--bg-accent`      | `#161033`                  | Halo violeta en la parte superior (muy sutil) |
| `--surface`        | `#121a2c`                  | Tarjetas, barra inferior, cabecera            |
| `--surface-2`      | `#1a2440`                  | Campos, chips, fondos secundarios             |
| `--border`         | `#26324f`                  | Bordes y separadores                          |
| `--text`           | `#e8edf7`                  | Texto principal                               |
| `--muted`          | `#8b97b3`                  | Texto secundario, metadatos                   |
| `--accent`         | `#a78bfa`                  | Estado activo, enlaces, números de orden      |
| `--accent-2`       | `#f472b6`                  | Favoritos, acentos del degradado              |
| `--accent-text`    | `#0a0e1a`                  | Texto sobre botones de acento                 |
| `--danger`         | `#fca5a5`                  | Errores, bloqueos                             |
| `--success`        | `#6ee7b7`                  | "Sonando", "En vivo", conexión OK             |
| `--gradient-brand` | `#8b5cf6 → #ec4899` (135°) | Botón principal, logo, degradados de portada  |

### Modo claro (opcional)

| Token         | Valor     |
| ------------- | --------- |
| `--bg`        | `#f5f7fb` |
| `--bg-accent` | `#ece8ff` |
| `--surface`   | `#ffffff` |
| `--surface-2` | `#f1f4fa` |
| `--border`    | `#dde3ef` |
| `--text`      | `#111827` |
| `--muted`     | `#5b6478` |
| `--accent`    | `#6d28d9` |
| `--accent-2`  | `#db2777` |
| `--danger`    | `#b91c1c` |
| `--success`   | `#047857` |

**Reglas de contraste:** texto normal ≥ 4.5:1, texto grande y componentes ≥ 3:1. Verifica especialmente `--muted` sobre `--surface-2`.

## 5. Tipografía

- **Familia:** pila del sistema (`ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto`). Sin fuentes externas: la app funciona offline y carga rápido. Si Stitch necesita una, usa Inter como sustituto visual.
- **Escala (móvil):**

| Nivel               | Tamaño                              | Peso    | Uso                                   |
| ------------------- | ----------------------------------- | ------- | ------------------------------------- |
| Título de pantalla  | 30 px (text-3xl)                    | 700     | "Buscar", "Cola de la radio"          |
| Saludo              | 30 px                               | 700     | "Hola, María López"                   |
| Título de tarjeta   | 18 px                               | 700     | Canción que suena en la cola          |
| Cuerpo              | 16 px                               | 400–600 | Títulos de canción, campos            |
| Metadatos           | 14 px                               | 400     | Artista · quién pidió                 |
| Etiqueta de sección | 14 px, mayúsculas, espaciado 0.05em | 600     | "SIGUIENTES", "ANTERIORES"            |
| Insignia            | 12 px                               | 600     | "Sonando ahora", "En cola · puesto 3" |

- **Pantalla del gimnasio (16:9):** título de canción 40–56 px, artista 20 px, siguientes 18 px.

## 6. Espaciado, forma y tamaños

- **Unidad:** 4 px. Márgenes laterales de página: **16 px**. Separación entre secciones: 24 px.
- **Radios:** campos y botones 12 px; tarjetas 16 px; paneles de hoja y tarjetas grandes 24 px; píldoras completas.
- **Área táctil mínima:** 44 × 44 px (botones pequeños), 48–56 px para acciones principales.
- **Sombras:** muy suaves. En oscuro, un borde sutil cuenta más que la sombra.
- **Portadas:** cuadradas, esquinas 12 px. Sin imagen, degradado de color fijo por título (ver §8.4).
- **Barra inferior:** 64 px de alto + zona segura del sistema.
- **Cabecera:** 64 px, pegajosa, con desenfoque de fondo.

## 7. Navegación

**Socio y staff:** barra inferior de 5 destinos, siempre visible:

| Destino    | Icono          | Ruta               | Notas                              |
| ---------- | -------------- | ------------------ | ---------------------------------- |
| Inicio     | casa           | `/`                | Saludo, canción que suena, accesos |
| Buscar     | lupa           | `/search`          |                                    |
| Cola       | lista con nota | `/cola`            | Lista en vivo                      |
| Biblioteca | corazón        | `/biblioteca`      | Favoritos y playlists              |
| Pedidos    | reloj          | `/mis-solicitudes` | Estado de mis pedidos              |

- El destino activo se marca con color de acento y etiqueta visible (no solo color).
- **Staff:** un icono de panel en la cabecera lleva a `/panel`. No ocupa un quinto destino.
- **Cabecera:** logo a la izquierda, a la derecha icono de panel (si aplica), iniciales del socio y "Salir".

**Sin barra:** login y pantalla del gimnasio.

## 8. Componentes

### 8.1 Botones

- **Primario:** degradado de marca, texto `--accent-text`, 48 px, esquinas 12 px. Una sola acción primaria por pantalla.
- **Secundario:** fondo `--surface-2`, borde `--border`.
- **Fantasma:** solo texto en `--accent`.
- **Peligro:** borde y texto en `--danger`. Para quitar, bloquear, borrar.
- **Deshabilitado:** 45 % de opacidad. Explica por qué si no es obvio.

### 8.2 Campos

- Altura 48 px, esquinas 12 px, fondo `--surface-2`, borde `--border`; foco con borde `--accent`.
- Etiqueta visible encima del campo (no solo placeholder).
- Búsqueda: altura 56 px, lupa dentro, esquinas 16 px.

### 8.3 Tarjetas y listas

- Tarjeta: fondo `--surface`, borde `--border`, radio 16 px.
- Filas de canción: portada 44–52 px, título en una línea (con elipsis), artista · metadato debajo, acción a la derecha.
- Listas agrupadas: una tarjeta con filas separadas por líneas finas.

### 8.4 Portada

- Con imagen: cuadrada, `object-cover`.
- Sin imagen: degradado de dos tonos derivado del título (matiz fijo por título, saturación 70 %, luminosidad 55 % → 40 %) con un icono de nota blanco translúcido.

### 8.5 Insignias

Píldora pequeña. Tonos: acento (en cola), éxito (sonando, en vivo), peligro (bloqueada), neutro (reproducida, saltada).

### 8.6 Chips de estado de límites

Cinco barras horizontales finas bajo el texto "Te quedan N de 5 solicitudes cada 30 min". Las barras usadas llevan degradado de marca; las libres, `--surface-2`.

### 8.7 Hoja de acciones (Guardar canción)

- Sube desde abajo, ocupa hasta 85 % de la altura, esquinas superiores de 24 px, asa visual arriba.
- Fondo oscuro difuminado detrás.
- Contenido: botón de favorito (corazón), lista de playlists con ✓ / +, campo "Nueva playlist" con botón Crear.

### 8.8 Barra de progreso

Altura 8 px, esquinas completas, relleno con degradado de marca. Tiempos transcurrido y total debajo.

### 8.9 Mensajes

- **Error de página o acción:** bloque con fondo `--danger` al 10 %, texto `--danger`, esquinas 12 px, anuncio para lectores de pantalla.
- **Vacío:** borde punteado `--border`, texto `--muted` centrado, con una frase que dice qué hacer.

## 9. Pantallas

Cada pantalla: primero la **acción principal**, después el **contexto**.

### 9.1 Login (`/login`)

- Selector de idioma ES / EN arriba a la derecha (píldora de dos opciones).
- Logo grande centrado, nombre "PulsoFM", frase "La radio de tu gimnasio, en tu bolsillo".
- Tarjeta de formulario: título "Inicia sesión", subtítulo "Usa tu usuario y contraseña del gimnasio.", campos Usuario y Contraseña, botón "Entrar" a todo el ancho.
- Error: bloque de error debajo del botón. Ejemplos: "Usuario o contraseña incorrectos.", "Tu cuenta no está activa. Contacta a recepción."

### 9.2 Inicio (`/`)

1. Saludo: "¿Qué suena hoy?" (pequeño) y "Hola, {nombre}" (grande).
2. **Tarjeta "Sonando ahora"** (toda la tarjeta es un enlace a Cola): portada 64 px, insignia "Sonando ahora", título y artista. Sin canción: "Nada suena ahora. ¡Pide la primera canción!".
3. Cuadrícula 2 × 2 de accesos: **Buscar canciones** (primaria, degradado), Mi biblioteca, Mis pedidos, Cola en vivo. Cada uno con título y pista corta.
4. Solo staff: sección "STAFF" con tarjeta "Panel de staff".

### 9.3 Buscar (`/search`)

- Título "Buscar" y una línea: "Busca por título o artista y pide la canción que quieres escuchar."
- Campo de búsqueda grande con lupa. Búsqueda tras 350 ms de pausa, desde 2 letras.
- Aviso mientras escribes una letra: "Escribe al menos 2 letras."
- Resultados: filas con portada, título, "Artista · 3:29" y botón **Pedir** (secundario pequeño). Tras pedir, el botón se convierte en insignia "#4" (su número de orden).
- Estados: buscando ("Buscando…"), sin resultados ("No encontramos canciones disponibles para esa búsqueda."), cuota agotada, error.

### 9.4 Cola en vivo (`/cola`)

- Título "Cola de la radio" y, a la derecha, insignia **En vivo** (verde) o **Reconectando…** (neutra).
- **Sonando ahora:** tarjeta destacada con borde de acento, portada 72 px, título grande, "Artista · quién la pidió", y botón secundario de ancho completo **Guardar canción**. Si la radio está en pausa, insignia "En pausa".
- **Siguientes:** tarjeta con filas numeradas 1, 2, 3… (número a la izquierda en color muted).
- **Anteriores:** tarjeta con menor opacidad, numeración −1, −2… (la más reciente primero).
- Vacío: "No hay nada sonando." / "La cola está vacía. ¡Pide la primera canción!"

### 9.5 Mis pedidos (`/mis-solicitudes`)

- Tarjeta de límites arriba (ver §8.6). Si quedan 0: "Podrás pedir otra en N min".
- Lista de pedidos: portada, título, artista, insignia de estado:
  - En cola: "En cola · puesto N" (acento)
  - Sonando: "Sonando ahora" (éxito)
  - Reproducida / Saltada: neutra
  - Eliminada: peligro
  - Bloqueada: peligro + motivo en texto debajo (ej. "Letra explícita")

### 9.6 Biblioteca (`/biblioteca`)

- Sección **Playlists**: tarjeta con filas (nombre a la izquierda, "N canciones" a la derecha). Debajo, campo "Nueva playlist" + botón Crear. Límite de 20.
- Sección **Favoritos**: filas con portada, título, artista y corazón rosa para quitar.
- Vacíos: "Aún no tienes playlists." / "Aún no tienes favoritos."

### 9.7 Detalle de playlist (`/biblioteca/:id`)

- Enlace "← Biblioteca".
- Campo de nombre editable (guarda al salir del campo) y botón de peligro "Borrar" con confirmación.
- Lista de canciones con botón ✕ para quitar. Vacío: "La playlist está vacía. Guarda canciones desde la cola."

### 9.8 Panel de staff (`/panel`) — solo staff y admin

Página larga con cuatro bloques en orden:

1. **Cola:** botones **Saltar** (primario pequeño) y **Pausar/Reanudar**. Tarjeta de canción que suena con insignia "Sonando". Lista de siguientes con cada fila: portada, título, "Artista · pedida por Nombre Completo", y botones **↑ ↓ Quitar** (Quitar en peligro).
2. **Blocklist:** selector de tres opciones (Canción · Artista · Palabra clave) como botones de radio, campos Valor y Motivo, botón **Bloquear**. Lista de reglas con botón Quitar.
3. **Socios:** campo de búsqueda. Tarjetas por socio: nombre, @usuario · estado. Si está bloqueado: insignia "Bloqueado" y **Desbloquear**. Si no: campo Motivo (mín. 3 letras) y dos botones, **Bloquear 1 h** (secundario) y **Bloquear siempre** (peligro).

- Enlace "Auditoría →" arriba a la derecha (solo admin).

### 9.9 Auditoría (`/panel/auditoria`) — solo admin

- Enlace "← Panel de staff" y título "Auditoría".
- Tarjeta con filas: acción en negrita ("Canción saltada", "Socio bloqueado"…), actor · fecha y hora, detalle en monoespaciada pequeña.

### 9.10 Pantalla del gimnasio (`/display`) — formato 16:9 para PC/TV

Pensada para leerse a 2–4 m. **Diseña primero en 1920 × 1080.**

- **Antes de empezar:** botón central enorme **Iniciar radio** (degradado, 80 px de alto). Es el único control.
- **Reproduciendo:** izquierda, portada grande (≈ 480 px) con halo de marca difuminado detrás; derecha, título de 56 px, artista 20 px, "Pedida por …", barra de progreso con tiempos y la lista **Siguientes** (las 5 próximas, numeradas, con quién la pidió).
- Cabecera mínima: nombre de la app y estado de conexión (insignia verde "Conectada" / roja "Sin conexión").
- **En pausa:** insignia "En pausa" junto a la portada; el resto no cambia.
- **Sin canciones:** "Nada suena ahora. Pide la primera canción desde el móvil." en el centro, grande.
- Sin barras de desplazamiento; todo cabe en una pantalla.

### 9.11 Hoja Guardar canción

Ver §8.7. Se abre desde Cola → Guardar canción.

## 10. Estados y microinteracciones

| Estado              | Cómo se muestra                                                                  |
| ------------------- | -------------------------------------------------------------------------------- |
| Cargando            | Texto "Cargando…" o "Buscando…" en `--muted`. Sin spinners de pantalla completa. |
| Vacío               | Borde punteado + frase accionable (ver §8.9).                                    |
| Error               | Bloque de error con texto claro y, si aplica, cuánto esperar.                    |
| Cooldown            | "Espera 4 min para pedir otra canción." en el lugar del botón.                   |
| Bloqueado           | Insignia peligro + motivo.                                                       |
| Sin conexión (cola) | Insignia "Reconectando…" en neutro; la cola se actualiza sola al volver.         |
| Tiempo real         | La canción que suena cambia sin recargar; nada parpadea.                         |

- **Movimiento:** transiciones de 150–300 ms. Respeta `prefers-reduced-motion` (sin animaciones).
- **Pulsación:** feedback inmediato (opacidad o escala 0.98) en todo elemento tocable.

## 11. Accesibilidad

- Contraste AA mínimo en todos los textos y componentes.
- Foco visible en todo elemento interactivo (contorno de acento de 2 px, offset 2 px).
- Áreas táctiles ≥ 44 px.
- No depender solo del color: la insignia tiene texto, el destino activo tiene etiqueta.
- Iconos decorativos ocultos a lectores de pantalla; los botones solo-icono llevan etiqueta.
- Zonas seguras: respeta la muesca y la barra del sistema (padding inferior de la barra con `env(safe-area-inset-bottom)`).

## 12. Textos de referencia (es)

- "Hola, María López" · "¿Qué suena hoy?"
- "Sonando ahora" · "En cola · puesto 3" · "Reproducida" · "Saltada" · "Bloqueada"
- "Te quedan 3 de 5 solicitudes cada 30 min" · "Podrás pedir otra en 4 min"
- "Pedir" · "Pidiendo…" · "Guardar canción" · "Crear" · "Quitar" · "Saltar" · "Pausar" · "Reanudar"
- "Iniciar radio" · "En pausa" · "Nada suena ahora. Pide la primera canción desde el móvil."
- "Usuario o contraseña incorrectos." · "Tu cuenta no está activa. Contacta a recepción."

## 13. Lo que el prototipo debe mostrar

Prioridad (si el tiempo es poco):

1. Inicio, Buscar con resultados, Cola en vivo — el recorrido principal del socio.
2. Pantalla del gimnasio 16:9 en reproducción.
3. Panel de staff (cola + blocklist).
4. Login, Mis pedidos, Biblioteca, Hoja Guardar canción.
5. Versión clara de Inicio y Cola (para comprobar que los tokens se adaptan).

Entregables sugeridos: un frame por pantalla a 390 × 844, dos frames de la pantalla del gimnasio a 1920 × 1080 (antes y durante reproducción), y el componente de fila de canción en sus variantes (normal, sonando, bloqueada, con botón Pedir, con número).

## 14. Fuera de alcance por ahora

- Pantallas de administración de sedes (la app todavía es de una sede).
- Notificaciones push.
- Votación de canciones y listas por horario.
- Idiomas distintos de español e inglés.
