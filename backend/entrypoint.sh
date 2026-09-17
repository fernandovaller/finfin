#!/bin/sh
# Boot do backend no Docker.
# O volume finfin-data chega owned root (criado pelo Docker): ajusta o dono
# e derruba privilégios para o user `node` antes de subir o Nest.
# Fail-closed: nunca sobe como root — sem ferramenta de drop, aborta.
set -e
if [ "$(id -u)" = "0" ]; then
  chown -R node:node /app/data 2>/dev/null || true
  if command -v gosu >/dev/null 2>&1; then
    exec gosu node "$@"
  fi
  if command -v runuser >/dev/null 2>&1; then
    exec runuser -u node -- "$@"
  fi
  if command -v su >/dev/null 2>&1; then
    exec su node -s /bin/sh -c 'exec "$@"' -- sh "$@"
  fi
  if command -v setpriv >/dev/null 2>&1; then
    exec setpriv --reuid node --regid node --clear-groups -- "$@"
  fi
  echo "[entrypoint] nenhuma ferramenta de drop (gosu/runuser/su/setpriv) — recusa subir como root" >&2
  exit 1
fi
exec "$@"
