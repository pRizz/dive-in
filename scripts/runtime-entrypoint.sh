#!/bin/sh
set -eu

APP_USER="deepdiver"
APP_UID="10001"
APP_GID="10001"
DOCKER_SOCKET="/var/run/docker.sock"

socket_path="/run/guest-services/extension-deep-dive.sock"
if [ "${1:-}" = "-socket" ] && [ -n "${2:-}" ]; then
  socket_path="${2}"
fi
socket_dir="$(dirname "${socket_path}")"

install -d -o "${APP_UID}" -g "${APP_GID}" -m 0755 /data/history "${socket_dir}" /home/deepdiver
export HOME="/home/deepdiver"
export USER="${APP_USER}"

if [ -S "${DOCKER_SOCKET}" ]; then
  docker_gid="$(stat -c '%g' "${DOCKER_SOCKET}")"
  docker_group="$(awk -F: -v gid="${docker_gid}" '$3 == gid { print $1; exit }' /etc/group)"
  if [ -z "${docker_group}" ]; then
    docker_group="dockersock"
    addgroup -S -g "${docker_gid}" "${docker_group}" >/dev/null 2>&1 || true
  fi
  addgroup "${APP_USER}" "${docker_group}" >/dev/null 2>&1 || true
fi

exec su-exec "${APP_USER}" /service "$@"
