#!/usr/bin/env bash
# PreToolUse hook: impide que Claude toque el proyecto de PRODUCCION de Supabase.
#
# El repo tiene dos proyectos. El de desarrollo esta escrito en `.mcp.json` y es el
# unico que Claude puede consultar. El de produccion se toca a mano, siguiendo
# `docs/produccion/runbook.md`, y este hook lo hace cumplir.
#
# stdin: payload JSON del hook (tool_name, tool_input, ...)
# exit 0 -> adelante
# exit 2 -> abortado; el stderr vuelve a Claude explicando por que
set -uo pipefail

PROJECT_DIR="${CLAUDE_PROJECT_DIR:-$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)}"

# El unico ref permitido. Cualquier otro ref de Supabase que aparezca en la llamada
# corta la ejecucion: es una lista blanca, no una lista negra.
DEV_REF="nlfwqnmidfdohuyhklqp"

# Opcional: el ref de produccion, para bloquearlo tambien por nombre. El archivo lo
# ignora git a proposito.
PROD_REF=""
if [ -f "$PROJECT_DIR/.claude/prod-ref.txt" ]; then
  PROD_REF="$(tr -d '[:space:]' < "$PROJECT_DIR/.claude/prod-ref.txt")"
fi

reason="$(DEV_REF="$DEV_REF" PROD_REF="$PROD_REF" node -e '
  let raw = "";
  process.stdin.on("data", (c) => (raw += c));
  process.stdin.on("end", () => {
    const dev = process.env.DEV_REF;
    const prod = process.env.PROD_REF;

    let payload;
    try {
      payload = JSON.parse(raw);
    } catch {
      process.stdout.write("");   // sin payload no hay nada que juzgar
      return;
    }

    const tool = payload?.tool_name ?? "";
    const input = payload?.tool_input ?? {};
    const text = JSON.stringify(input);
    const out = (msg) => process.stdout.write(msg);

    // 1. El ref de produccion, si esta declarado, no aparece en ninguna llamada.
    if (prod && text.includes(prod)) {
      return out("la llamada nombra el proyecto de PRODUCCION");
    }

    // Escribir un comando dentro de un heredoc no es ejecutarlo: `docs/produccion/`
    // esta lleno de `supabase db push` y de refs de ejemplo, y sin esto el hook se
    // bloquearia a si mismo al redactarlos. La regla 1 sigue mirando el texto entero:
    // el ref real de produccion no debe acabar escrito en ningun sitio.
    const sinHeredocs = (s) =>
      s.replace(/<<-?\s*(["\x27]?)([A-Za-z_][A-Za-z0-9_]*)\1[\s\S]*?^\2$/gm, "<<HEREDOC");

    const vivo = tool === "Bash" ? sinHeredocs(String(input?.command ?? "")) : text;

    // 2. Cualquier ref de Supabase que no sea el de desarrollo.
    const refs = new Set();
    for (const m of vivo.matchAll(/([a-z]{20})\.supabase\.(?:co|com)/g)) refs.add(m[1]);
    for (const m of vivo.matchAll(/project_(?:ref|id)["\s:=]+([a-z]{20})/g)) refs.add(m[1]);
    for (const m of vivo.matchAll(/--project-ref[\s="]+([a-z]{20})/g)) refs.add(m[1]);
    for (const m of vivo.matchAll(/postgres\.([a-z]{20})[:@]/g)) refs.add(m[1]);
    for (const ref of refs) {
      if (ref !== dev) return out(`la llamada apunta al proyecto ${ref}, que no es el de desarrollo`);
    }

    // 3. Los verbos del runbook son del usuario, no de Claude.
    if (tool === "Bash") {
      const cmd = vivo;
      const prohibidos = [
        [/\bsupabase\s+link\b/, "supabase link"],
        [/\bsupabase\s+db\s+push\b/, "supabase db push"],
        [/\bsupabase\s+db\s+reset\b/, "supabase db reset"],
        [/\bsupabase\s+config\s+push\b/, "supabase config push"],
        [/\bsupabase\s+projects?\s+(create|delete)\b/, "supabase projects create/delete"],
        [/\bpsql\b/, "psql"],
        [/\bpg_dump(all)?\b/, "pg_dump"],
        [/\bpg_restore\b/, "pg_restore"],
      ];
      for (const [re, nombre] of prohibidos) {
        if (re.test(cmd)) return out(`\`${nombre}\` lo ejecuta el usuario a mano`);
      }
    }

    out("");
  });
' 2>/dev/null)"

[ -n "$reason" ] || exit 0

cat >&2 <<MSG
Bloqueado por .claude/hooks/guard-prod.sh: $reason.

Este repo tiene dos proyectos de Supabase y tu solo puedes tocar el de desarrollo
($DEV_REF), que es el que declara .mcp.json. Produccion la migra y la administra el
usuario a mano, siguiendo docs/produccion/runbook.md.

Si hace falta correr uno de esos comandos, escribelo para que lo ejecute el usuario
—en la sesion, con el prefijo "! "— en vez de intentarlo tu.
MSG
exit 2
