#!/usr/bin/env bash
#
# Build a Release build of the app and install it onto a physically connected
# iPhone and its paired Apple Watch.
#
# Why this exists: `expo run:ios` builds correctly but hangs on its own install
# step on newer Xcode ("Unexpected devicectl JSON version output"). This script
# builds with xcodebuild and installs/launches with `devicectl` directly, which
# is reliable, and it installs the embedded watchOS app too (which `expo run:ios`
# never does).
#
# Usage:
#   scripts/deploy-ios.sh [options]
#
# Options:
#   --no-build      Skip the build; install the most recent Release product.
#   --clean         Clean before building.
#   --no-watch      Do not install/launch the watch app.
#   --no-launch     Install only; do not launch the apps.
#   --launch-only   Just (re)launch the already-installed apps (implies --no-build).
#   -h, --help      Show this help.
#
# Environment overrides (auto-discovered when unset):
#   IOS_DEVICE_ID    devicectl identifier of the iPhone.
#   WATCH_DEVICE_ID  devicectl identifier of the Apple Watch.
#   APP_PATH         path to a prebuilt QuranTracker.app to install.
#
set -euo pipefail

# --- Configuration ----------------------------------------------------------
WORKSPACE="ios/QuranTracker.xcworkspace"
SCHEME="QuranTracker"
CONFIGURATION="Release"
DERIVED_DATA="ios/build"
APP_BUNDLE_ID="com.imabtech.memory-app"
WATCH_BUNDLE_ID="com.imabtech.memory-app.watchkitapp"

# --- Options ----------------------------------------------------------------
DO_BUILD=1
DO_CLEAN=0
DO_WATCH=1
DO_LAUNCH=1
LAUNCH_ONLY=0

# --- Output helpers ---------------------------------------------------------
# Use colors only when stdout is a terminal AND tput works. Each capability is
# guarded with `|| true` so a terminal lacking one (e.g. `dim` on xterm-color)
# cannot trip `set -e`.
if [[ -t 1 ]] && tput setaf 1 >/dev/null 2>&1; then
  BOLD="$(tput bold 2>/dev/null || true)"; RED="$(tput setaf 1 2>/dev/null || true)"
  GREEN="$(tput setaf 2 2>/dev/null || true)"; YELLOW="$(tput setaf 3 2>/dev/null || true)"
  BLUE="$(tput setaf 4 2>/dev/null || true)"; RESET="$(tput sgr0 2>/dev/null || true)"
else
  BOLD=""; RED=""; GREEN=""; YELLOW=""; BLUE=""; RESET=""
fi
step() { echo "${BOLD}${BLUE}==>${RESET} ${BOLD}$*${RESET}"; }
info() { echo "    $*"; }
ok()   { echo "${GREEN}    ✓ $*${RESET}"; }
warn() { echo "${YELLOW}    ! $*${RESET}"; }
die()  { echo "${RED}${BOLD}error:${RESET} $*" >&2; exit 1; }

# Print the leading comment block (everything after the shebang up to the first
# line of code) as help text.
usage() {
  awk 'NR==1 { next } /^#/ { sub(/^# ?/, ""); print; next } { exit }' "$0"
  exit 0
}

# --- Parse arguments --------------------------------------------------------
while [[ $# -gt 0 ]]; do
  case "$1" in
    --no-build)    DO_BUILD=0 ;;
    --clean)       DO_CLEAN=1 ;;
    --no-watch)    DO_WATCH=0 ;;
    --no-launch)   DO_LAUNCH=0 ;;
    --launch-only) LAUNCH_ONLY=1; DO_BUILD=0 ;;
    -h|--help)     usage ;;
    *)             die "unknown option: $1 (try --help)" ;;
  esac
  shift
done

# Always run from the repository root (one level up from scripts/).
cd "$(dirname "$0")/.."

command -v xcrun >/dev/null 2>&1 || die "xcrun not found — install Xcode command line tools."

# --- Device discovery -------------------------------------------------------
# Populates IOS_DEVICE_ID / WATCH_DEVICE_ID (and *_NAME) from connected devices,
# unless already provided via the environment. Matches by platform so it keeps
# working across reconnects and UDID changes.
discover_devices() {
  step "Discovering connected devices"
  local json; json="$(mktemp -t devicectl).json"
  xcrun devicectl list devices --json-output "$json" >/dev/null 2>&1 \
    || die "could not list devices (is a device connected and trusted?)"

  # Emit "iOS|<id>|<name>" and "watchOS|<id>|<name>" lines, preferring connected
  # devices over idle ones.
  local parsed; parsed="$(
    node -e '
      const j = require(process.argv[1]);
      const ds = (j.result && j.result.devices) || [];
      const rank = (d) => {
        const t = (d.connectionProperties && d.connectionProperties.tunnelState) || "";
        return t === "connected" ? 0 : 1;
      };
      const pick = (platform) => ds
        .filter((d) => (d.hardwareProperties || {}).platform === platform)
        .sort((a, b) => rank(a) - rank(b))[0];
      for (const platform of ["iOS", "watchOS"]) {
        const d = pick(platform);
        if (d) console.log([platform, d.identifier, (d.deviceProperties || {}).name || ""].join("|"));
      }
    ' "$json"
  )"
  rm -f "$json"

  local ios_line watch_line
  ios_line="$(grep '^iOS|' <<<"$parsed" || true)"
  watch_line="$(grep '^watchOS|' <<<"$parsed" || true)"

  IOS_DEVICE_ID="${IOS_DEVICE_ID:-$(cut -d'|' -f2 <<<"$ios_line")}"
  IOS_DEVICE_NAME="$(cut -d'|' -f3 <<<"$ios_line")"
  WATCH_DEVICE_ID="${WATCH_DEVICE_ID:-$(cut -d'|' -f2 <<<"$watch_line")}"
  WATCH_DEVICE_NAME="$(cut -d'|' -f3 <<<"$watch_line")"

  [[ -n "${IOS_DEVICE_ID:-}" ]] || die "no iPhone found — connect and trust the device, then retry."
  ok "iPhone: ${IOS_DEVICE_NAME:-?} (${IOS_DEVICE_ID})"
  if [[ "$DO_WATCH" -eq 1 ]]; then
    if [[ -n "${WATCH_DEVICE_ID:-}" ]]; then
      ok "Watch:  ${WATCH_DEVICE_NAME:-?} (${WATCH_DEVICE_ID})"
    else
      warn "no paired Apple Watch found — skipping watch install."
      DO_WATCH=0
    fi
  fi
}

# --- Build ------------------------------------------------------------------
build() {
  [[ -d "$WORKSPACE" ]] || die "$WORKSPACE not found — run 'npx expo prebuild -p ios' first."
  step "Building ${SCHEME} (${CONFIGURATION})"
  info "This bundles the JS, builds the app, and embeds the watch app. Takes a few minutes."
  local actions=(build)
  [[ "$DO_CLEAN" -eq 1 ]] && actions=(clean build)
  xcrun xcodebuild \
    -workspace "$WORKSPACE" \
    -scheme "$SCHEME" \
    -configuration "$CONFIGURATION" \
    -destination "generic/platform=iOS" \
    -derivedDataPath "$DERIVED_DATA" \
    -allowProvisioningUpdates \
    -quiet \
    "${actions[@]}"
  ok "Build succeeded"
}

# --- Locate the built app ---------------------------------------------------
resolve_app() {
  if [[ -n "${APP_PATH:-}" ]]; then
    [[ -d "$APP_PATH" ]] || die "APP_PATH does not exist: $APP_PATH"
    APP="$APP_PATH"
  elif [[ -d "$DERIVED_DATA/Build/Products/${CONFIGURATION}-iphoneos/QuranTracker.app" ]]; then
    APP="$DERIVED_DATA/Build/Products/${CONFIGURATION}-iphoneos/QuranTracker.app"
  else
    # Fall back to the most recent Release device build anywhere in DerivedData
    # (e.g. one produced earlier by `expo run:ios`).
    APP="$(find "$HOME/Library/Developer/Xcode/DerivedData" \
            -path "*${CONFIGURATION}-iphoneos/QuranTracker.app" -maxdepth 8 -type d 2>/dev/null \
          | xargs -I{} stat -f '%m %N' {} 2>/dev/null | sort -rn | head -1 | cut -d' ' -f2-)"
  fi
  [[ -n "${APP:-}" && -d "$APP" ]] || die "could not find a built QuranTracker.app — build first or set APP_PATH."
  WATCH_APP="$APP/Watch/QuranTrackerWatch.app"
  ok "App: $APP"
  if [[ "$DO_WATCH" -eq 1 && ! -d "$WATCH_APP" ]]; then
    warn "no embedded watch app at $WATCH_APP — skipping watch install."
    DO_WATCH=0
  fi
}

# --- devicectl with tunnel retry --------------------------------------------
# Runs an `xcrun devicectl …` command, retrying when the device tunnel is not
# yet ready (a common transient failure for the Apple Watch). On return, RC
# holds the exit code and OUT holds the combined output.
devicectl_try() { # <max-attempts> <devicectl-args...>
  local max="$1"; shift
  local attempt
  for ((attempt = 1; attempt <= max; attempt++)); do
    if OUT="$(xcrun "$@" 2>&1)"; then RC=0; return 0; fi
    RC=$?
    if [[ "$attempt" -lt "$max" ]] \
       && grep -qiE "tunnel|could not be established|RemotePairingError|error 4000" <<<"$OUT"; then
      warn "device tunnel not ready (attempt ${attempt}/${max}) — retrying in $((attempt * 3))s…"
      sleep "$((attempt * 3))"
      continue
    fi
    return "$RC"
  done
  return "$RC"
}

# --- Install ----------------------------------------------------------------
install_app() { # <device-id> <app-path> <label>  → 0 on success, 1 on failure
  local device="$1" app="$2" label="$3"
  step "Installing on $label"
  if devicectl_try 3 devicectl device install app --device "$device" "$app"; then
    ok "Installed on $label"
    return 0
  fi
  warn "could not install on $label:"
  grep -iE "error|tunnel|Timed out|Locked|RecoverySuggestion" <<<"$OUT" | sed 's/^/      /' | head -4
  return 1
}

# --- Launch -----------------------------------------------------------------
launch_app() { # <device-id> <bundle-id> <label>  → 0 on success, 1 on failure
  local device="$1" bundle="$2" label="$3"
  step "Launching on $label"
  if devicectl_try 3 devicectl device process launch --device "$device" \
       --terminate-existing "$bundle"; then
    ok "Launched on $label"
    return 0
  fi
  if grep -qi "Locked" <<<"$OUT"; then
    warn "$label is locked — unlock it and re-run: scripts/deploy-ios.sh --launch-only"
  else
    warn "could not launch on $label:"
    grep -iE "error|tunnel|Timed out|RecoverySuggestion" <<<"$OUT" | sed 's/^/      /' | head -4
  fi
  return 1
}

# --- Main -------------------------------------------------------------------
discover_devices

if [[ "$LAUNCH_ONLY" -eq 1 ]]; then
  launch_app "$IOS_DEVICE_ID" "$APP_BUNDLE_ID" "iPhone (${IOS_DEVICE_NAME:-iPhone})" || true
  [[ "$DO_WATCH" -eq 1 ]] \
    && { launch_app "$WATCH_DEVICE_ID" "$WATCH_BUNDLE_ID" "Watch (${WATCH_DEVICE_NAME:-Watch})" || true; }
  echo; ok "Done."
  exit 0
fi

[[ "$DO_BUILD" -eq 1 ]] && build
resolve_app

# The iPhone install is required; a watch failure (usually a cold tunnel) is not.
install_app "$IOS_DEVICE_ID" "$APP" "iPhone (${IOS_DEVICE_NAME:-iPhone})" \
  || die "failed to install on the iPhone (see above)."

WATCH_INSTALLED=0
if [[ "$DO_WATCH" -eq 1 ]]; then
  if install_app "$WATCH_DEVICE_ID" "$WATCH_APP" "Watch (${WATCH_DEVICE_NAME:-Watch})"; then
    WATCH_INSTALLED=1
  else
    warn "watch app not updated (tunnel issue) — the iPhone app is fine; re-run to retry the watch."
  fi
fi

if [[ "$DO_LAUNCH" -eq 1 ]]; then
  launch_app "$IOS_DEVICE_ID" "$APP_BUNDLE_ID" "iPhone (${IOS_DEVICE_NAME:-iPhone})" || true
  [[ "$DO_WATCH" -eq 1 && "$WATCH_INSTALLED" -eq 1 ]] \
    && { launch_app "$WATCH_DEVICE_ID" "$WATCH_BUNDLE_ID" "Watch (${WATCH_DEVICE_NAME:-Watch})" || true; }
fi

echo
ok "${BOLD}Deploy complete.${RESET}"
info "Note: free Apple team signing expires ~7 days after the build; re-run to refresh."
