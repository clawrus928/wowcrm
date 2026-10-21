#!/usr/bin/env bash
set -euo pipefail

# Called only by the manually approved production job. The host's existing
# /srv/apps/wowcrm/.env is never copied, replaced, or printed.
fail() { printf '::error::%s\n' "$1" >&2; exit 1; }
test "${GITHUB_REF:-}" = refs/heads/master || fail 'Deploy requires master'
test "${EC2_HOST:-}" = 43.160.242.177 || fail 'EC2_HOST does not match the approved host'
[[ ${EC2_USER:-} =~ ^[a-z_][a-z0-9_-]*$ ]] || fail 'EC2_USER must be a Linux account name'
[[ ${GITHUB_SHA:-} =~ ^[0-9a-f]{40}$ ]] || fail 'GITHUB_SHA is invalid'
[[ ${WOWCRM_IMAGE:-} =~ ^ghcr\.io/clawrus928/wowcrm@sha256:[0-9a-f]{64}$ ]] || fail 'WOWCRM_IMAGE must be an immutable WOW CRM digest'
test -n "${EC2_SSH_KEY:-}" || fail 'EC2_SSH_KEY is missing'
test -n "${WOWCRM_SSH_KNOWN_HOSTS:-}" || fail 'WOWCRM_SSH_KNOWN_HOSTS is missing'

umask 077
ssh_dir=$(mktemp -d "${RUNNER_TEMP:-/tmp}/wowcrm-ssh.XXXXXX")
trap 'rm -rf -- "$ssh_dir"' EXIT
printf '%s\n' "$EC2_SSH_KEY" > "$ssh_dir/key"
printf '%s\n' "$WOWCRM_SSH_KNOWN_HOSTS" > "$ssh_dir/known_hosts"
unset EC2_SSH_KEY WOWCRM_SSH_KNOWN_HOSTS
ssh-keygen -F "$EC2_HOST" -f "$ssh_dir/known_hosts" >/dev/null 2>&1 || fail 'WOWCRM_SSH_KNOWN_HOSTS has no entry for the approved host'
options=(-i "$ssh_dir/key" -o BatchMode=yes -o IdentitiesOnly=yes
  -o StrictHostKeyChecking=yes -o "UserKnownHostsFile=$ssh_dir/known_hosts"
  -o ConnectTimeout=10 -o ForwardAgent=no -o ClearAllForwardings=yes)
target="$EC2_USER@$EC2_HOST"
release="/srv/apps/wowcrm/releases/$GITHUB_SHA"

# Read-only first: no mkdir or pull before the existing data mount is verified.
ssh "${options[@]}" "$target" \
  "python3 - --check '$WOWCRM_IMAGE' '$GITHUB_SHA'" < scripts/deploy.py
ssh "${options[@]}" "$target" "umask 077; mkdir -p '$release'"
scp "${options[@]}" docker-compose.yml scripts/deploy.py "$target:$release/"
ssh "${options[@]}" "$target" \
  "python3 '$release/deploy.py' --deploy '$WOWCRM_IMAGE' '$GITHUB_SHA'"
