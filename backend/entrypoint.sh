#!/bin/sh
# Boot do backend no Docker.
# O volume finfin-data chega owned root (criado pelo Docker): ajusta o dono
# e derruba privilégios para o user `node` antes de subir o Nest.
# Sem `runuser` (improvável no Debian slim), segue como root com aviso.
set -e
if [ "$(id -u)" = "0" ]; then
  chown -R node:node /app/data 2>/dev/null || true
  if command -v runuser >/dev/null 2>&1; then
    exec runuser -u node -- "$@"
  fi
  echo "[entrypoint] runuser ausente — subindo como root (não ideal)" >&2
fi
exec "$@"
