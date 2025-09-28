#!/bin/bash
VOLUME_INFORMATION="./owasp-zap/reports" #donde queires montar los volumenes
SERVICE_HOST="http://localhost:8000" #La IP de donde corre el servicio a escanear
docker run --rm  --network="host"  -v "$VOLUME_INFORMATION:/zap/wrk:rw" zaproxy/zap-stable zap-baseline.py -t "$SERVICE_HOST" -r scan-report.html#!/usr/bin/env bash
# run_zap_scan.sh
# Script para lanzar zap-baseline.py adaptándose al entorno (WSL2 / Git Bash (Windows) / macOS / Linux)
# Uso: ./run_zap_scan.sh [HOST_REPORT_DIR] [TARGET_URL_OR_PORT]
# Ejemplo: ./run_zap_scan.sh ./owasp-zap/reports http://localhost:8000
# Si se pasa solo un puerto: ./run_zap_scan.sh ./owasp-zap/reports 8000

set -euo pipefail

# ---------- Config defaults ----------
DEFAULT_REPORT_DIR="./owasp-zap/reports"
DEFAULT_TARGET="http://localhost:8000"
IMAGE="zaproxy/zap-stable"
CONTAINER_REPORT_PATH="scan-report.html"
ZAP_CMD="zap-baseline.py"

# ---------- Arguments ----------
HOST_REPORT_DIR="${1:-$DEFAULT_REPORT_DIR}"
ARG2="${2:-}"   # puede ser URL o puerto
if [[ -n "${ARG2}" ]]; then
  # si es solo un número, asumir puerto y construir URL
  if [[ "${ARG2}" =~ ^[0-9]+$ ]]; then
    TARGET_URL="http://localhost:${ARG2}"
  else
    TARGET_URL="${ARG2}"
  fi
else
  TARGET_URL="$DEFAULT_TARGET"
fi

# ---------- Detección de entorno ----------
IS_WSL=false
IS_MSYS=false
IS_DARWIN=false
IS_LINUX=false

uname_s="$(uname -s || true)"
if grep -qi microsoft /proc/version 2>/dev/null || grep -qi microsoft /proc/sys/kernel/osrelease 2>/dev/null; then
  IS_WSL=true
elif [[ "${OSTYPE:-}" == "msys"* || "${OSTYPE:-}" == "cygwin"* || -n "${MSYSTEM:-}" ]]; then
  IS_MSYS=true
elif [[ "${uname_s}" == "Darwin" ]]; then
  IS_DARWIN=true
else
  IS_LINUX=true
fi

# ---------- Decide red y URL desde contenedor ----------
# - En WSL2 y Linux nativo usaremos --network host (el contenedor puede ver localhost)
# - En Docker Desktop (Windows Git Bash / macOS) usaremos host.docker.internal
USE_NETWORK_HOST=false
USE_HOST_DOCKER_INTERNAL=false

if $IS_WSL || $IS_LINUX; then
  USE_NETWORK_HOST=true
else
  # Windows Git Bash / Cygwin / MSYS or macOS -> Docker Desktop: usar host.docker.internal
  USE_HOST_DOCKER_INTERNAL=true
fi

# Si usamos host.docker.internal, reescribimos target para que el contenedor apunte correctamente
if $USE_HOST_DOCKER_INTERNAL; then
  # Si el target fue localhost, cambiar a host.docker.internal manteniendo puerto si existe
  if [[ "$TARGET_URL" =~ ^http://localhost(:([0-9]+))?$ ]]; then
    port="${BASH_REMATCH[2]:-8000}"
    TARGET_URL="http://host.docker.internal:${port}"
  elif [[ "$TARGET_URL" =~ ^https://localhost(:([0-9]+))?$ ]]; then
    port="${BASH_REMATCH[2]:-443}"
    TARGET_URL="https://host.docker.internal:${port}"
  fi
fi

# ---------- Prepara carpeta de reportes en host ----------
mkdir -p "$HOST_REPORT_DIR"

# ---------- Convierte la ruta del host para montar en docker si es Windows -->
DOCKER_VOLUME_SRC="$HOST_REPORT_DIR"

# En Git Bash / MSYS / Cygwin convertimos la ruta a formato Windows (C:\...) si cygpath está disponible
if $IS_MSYS; then
  if command -v cygpath >/dev/null 2>&1; then
    # cygpath -w convierte a C:\... ; docker en Windows suele aceptar ese formato
    DOCKER_VOLUME_SRC="$(cygpath -w "$HOST_REPORT_DIR")"
    # Reemplaza backslashes por forward slashes (Docker acepta ambos, pero normalizamos)
    DOCKER_VOLUME_SRC="${DOCKER_VOLUME_SRC//\\//}"
  else
    # Fallback simple: si la ruta empieza con /c/ transformarla a C:/...
    if [[ "$HOST_REPORT_DIR" =~ ^/([a-zA-Z])/(.*) ]]; then
      drive="${BASH_REMATCH[1]}"
      rest="${BASH_REMATCH[2]}"
      DOCKER_VOLUME_SRC="${drive}:/${rest}"
    fi
  fi
fi

# En WSL, si Docker engine es Docker Desktop con backend WSL2 podría requerirse ruta Windows:
# Pero en la mayoría de setups WSL2 + Docker (integrado) montar la ruta WSL funciona directamente.
if $IS_WSL; then
  # dejar DOCKER_VOLUME_SRC como la ruta Linux (WSL) -> docker engine en WSL2 entiende /home/...
  DOCKER_VOLUME_SRC="$HOST_REPORT_DIR"
fi

# En macOS y Linux no necesitamos conversión
if $IS_DARWIN || $IS_LINUX; then
  DOCKER_VOLUME_SRC="$HOST_REPORT_DIR"
fi

# ---------- Montaje y opciones de red ----------
DOCKER_VOLUME_OPTION="${DOCKER_VOLUME_SRC}:/zap/wrk:rw"
DOCKER_NETWORK_OPTION=""
if $USE_NETWORK_HOST; then
  DOCKER_NETWORK_OPTION="--network="host""
fi

# Mensajes
echo "Entorno detectado:"
echo "  uname: $uname_s"
echo "  WSL: $IS_WSL, MSYS: $IS_MSYS, DARWIN: $IS_DARWIN, LINUX: $IS_LINUX"
echo
echo "Opciones elegidas:"
if $USE_NETWORK_HOST; then
  echo "  Usando --network host (el contenedor alcanzará localhost del host)."
else
  echo "  Usando host.docker.internal (el contenedor alcanzará el host mediante DNS especial)."
fi
echo "  Target URL para ZAP: $TARGET_URL"
echo "  Carpeta host -> contenedor: $DOCKER_VOLUME_OPTION"
echo

# ---------- Comando docker final ----------
DOCKER_RUN_CMD=(docker run --rm)
# añadir network si aplica
if [[ -n "${DOCKER_NETWORK_OPTION}" ]]; then
  DOCKER_RUN_CMD+=("${DOCKER_NETWORK_OPTION}")
fi
DOCKER_RUN_CMD+=(-v "$DOCKER_VOLUME_OPTION" "$IMAGE" "$ZAP_CMD" -t "$TARGET_URL" -r "$CONTAINER_REPORT_PATH")

# Mostrar comando (para debug) y ejecutarlo
echo "Ejecutando:"
printf '  %q ' "${DOCKER_RUN_CMD[@]}"
echo
echo

# Run
"${DOCKER_RUN_CMD[@]}"

# Resultado
# Mostrar ubicación del reporte en host (intenta dar la ruta Windows para WSL o MSYS)
if $IS_WSL; then
  # indicar ruta en WSL y en Windows (si es posible)
  echo
  echo "Reporte creado en WSL: $HOST_REPORT_DIR/scan-report.html"
  # si existe wslpath, convertir a windows path para facilitar apertura
  if command -v wslpath >/dev/null 2>&1; then
    windows_path="$(wslpath -w "$HOST_REPORT_DIR")\\scan-report.html"
    echo "Ruta Windows accesible vía \\wsl\\$: $windows_path"
  fi
elif $IS_MSYS; then
  # MSYS/Git Bash: DOCKER_VOLUME_SRC se normalizó a algo tipo C:/...
  echo
  echo "Reporte creado en host Windows: $DOCKER_VOLUME_SRC/scan-report.html"
else
  echo
  echo "Reporte creado en: $HOST_REPORT_DIR/scan-report.html"
fi

echo "Abre el HTML con tu navegador para ver el informe."
