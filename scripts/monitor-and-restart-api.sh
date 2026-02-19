#!/bin/bash
# Monitora a API Prime Camp e reinicia via PM2 quando der erro ou travar.
#
# Uso:
#   Uma vez:     ./scripts/monitor-and-restart-api.sh
#   Loop 2 min:  ./scripts/monitor-and-restart-api.sh --loop
#   Cron (2 em 2 min): */2 * * * * /bin/bash /caminho/primecamp/scripts/monitor-and-restart-api.sh >> /var/log/primecamp-monitor.log 2>&1
#
# Variáveis (opcional): PM2_APP_NAME, API_HEALTH_URL, HEALTH_TIMEOUT_SEC, RESTART_COOLDOWN_SEC

set -e

APP_NAME="${PM2_APP_NAME:-primecamp-api}"
HEALTH_URL="${API_HEALTH_URL:-http://127.0.0.1:3000/api/health}"
HEALTH_TIMEOUT="${HEALTH_TIMEOUT_SEC:-15}"
COOLDOWN_SEC="${RESTART_COOLDOWN_SEC:-120}"
COOLDOWN_FILE="/tmp/primecamp-api-restart-cooldown"
LOOP_INTERVAL="${LOOP_INTERVAL_SEC:-120}"

log() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*"; }

if [ "${1:-}" = "--loop" ]; then
  log "Modo loop: verificando a cada ${LOOP_INTERVAL}s (Ctrl+C para parar)."
  while true; do
    "$0"  # executa uma verificação
    sleep "$LOOP_INTERVAL"
  done
  exit 0
fi

# Evitar restart em loop: só reinicia se passou o cooldown
if [ -f "$COOLDOWN_FILE" ]; then
  last=$(cat "$COOLDOWN_FILE")
  now=$(date +%s)
  if [ $((now - last)) -lt "$COOLDOWN_SEC" ]; then
    log "Cooldown ativo. Próximo restart permitido em $((COOLDOWN_SEC - (now - last)))s."
    exit 0
  fi
fi

need_restart=0
reason=""

# 1) Status PM2: errored ou stopped
if command -v pm2 >/dev/null 2>&1; then
  status=$(pm2 describe "$APP_NAME" 2>/dev/null | grep -E "^\s*status\s*:" | head -1 | sed 's/.*status\s*:\s*//' | tr -d ' \r') || status="unknown"
  if [ -z "$status" ]; then status="missing"; fi
  # Normalizar: PM2 retorna "errored", "stopped", "online" etc
  if [ "$status" = "errored" ] || [ "$status" = "stopped" ] || [ "$status" = "missing" ] || [ "$status" = "unknown" ]; then
    need_restart=1
    reason="PM2 status: $status"
  fi
else
  log "PM2 não encontrado. Verificando apenas health HTTP."
  status="n/a"
fi

# 2) Health HTTP (detecta travamento se não responder no tempo)
if [ $need_restart -eq 0 ]; then
  code=$(curl -s -o /dev/null -w "%{http_code}" --connect-timeout 5 --max-time "$HEALTH_TIMEOUT" "$HEALTH_URL" 2>/dev/null) || code="000"
  if [ "$code" != "200" ]; then
    need_restart=1
    reason="Health check falhou (HTTP $code ou timeout ${HEALTH_TIMEOUT}s)"
  fi
fi

if [ $need_restart -eq 1 ]; then
  log "Reiniciando API: $reason"
  if command -v pm2 >/dev/null 2>&1; then
    pm2 restart "$APP_NAME" || { log "Falha no pm2 restart $APP_NAME"; exit 1; }
    echo "$(date +%s)" > "$COOLDOWN_FILE"
    log "API reiniciada. Cooldown de ${COOLDOWN_SEC}s ativado."
  else
    log "PM2 não disponível. Não foi possível reiniciar."
    exit 1
  fi
else
  log "API OK (health $code, PM2 $status). Nenhuma ação."
fi
