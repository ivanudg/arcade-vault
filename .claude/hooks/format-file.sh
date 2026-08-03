#!/usr/bin/env bash
# PostToolUse hook: pasa por ESLint --fix y Prettier cualquier archivo que
# Claude cree o edite dentro del proyecto.
#
# stdin: payload JSON del hook (tool_name, tool_input.file_path, ...)
# exit 0 -> todo bien (o nada que hacer)
# exit 2 -> ESLint dejó errores que no pudo auto-corregir; el stderr vuelve a Claude
set -uo pipefail

PROJECT_DIR="${CLAUDE_PROJECT_DIR:-$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)}"

# --- 1. Extraer file_path del payload -----------------------------------------
file="$(node -e '
  let raw = "";
  process.stdin.on("data", (c) => (raw += c));
  process.stdin.on("end", () => {
    try {
      process.stdout.write(JSON.parse(raw)?.tool_input?.file_path ?? "");
    } catch {
      process.stdout.write("");
    }
  });
' 2>/dev/null)"

[ -n "$file" ] || exit 0
[ -f "$file" ] || exit 0

# --- 2. Guarda de ámbito: solo archivos dentro del proyecto -------------------
case "$file" in
  "$PROJECT_DIR"/*) ;;
  *) exit 0 ;;
esac

# --- 3. Guarda de exclusión ---------------------------------------------------
case "$file" in
  */node_modules/* | */.next/* | */references/*) exit 0 ;;
esac

cd "$PROJECT_DIR" || exit 0

ESLINT_BIN="$PROJECT_DIR/node_modules/.bin/eslint"
PRETTIER_BIN="$PROJECT_DIR/node_modules/.bin/prettier"

# --- 4. ESLint --fix (solo extensiones lintables) -----------------------------
eslint_status=0
eslint_output=""
case "$file" in
  *.js | *.jsx | *.ts | *.tsx | *.mjs | *.cjs)
    if [ -x "$ESLINT_BIN" ]; then
      eslint_output="$("$ESLINT_BIN" --fix --no-warn-ignored "$file" 2>&1)"
      eslint_status=$?
    fi
    ;;
esac

# --- 5. Prettier --write (cualquier extensión; ignora las que no entiende) ----
prettier_status=0
prettier_output=""
if [ -x "$PRETTIER_BIN" ]; then
  prettier_output="$("$PRETTIER_BIN" --write --ignore-unknown "$file" 2>&1)"
  prettier_status=$?
fi

# --- 6. Devolver errores de formato a Claude ----------------------------------
rel="${file#"$PROJECT_DIR"/}"
report=""

if [ "$eslint_status" -ne 0 ]; then
  report+="$(printf 'ESLint encontró problemas que no pudo auto-corregir en %s:\n\n%s\n' \
    "$rel" "$eslint_output")"
fi

# Prettier falla p. ej. con sintaxis inválida: sin esto el archivo se quedaría
# sin formatear en silencio.
if [ "$prettier_status" -ne 0 ]; then
  [ -n "$report" ] && report+=$'\n\n'
  report+="$(printf 'Prettier no pudo formatear %s:\n\n%s\n' "$rel" "$prettier_output")"
fi

if [ -n "$report" ]; then
  printf '%s\n' "$report" >&2
  exit 2
fi

exit 0
