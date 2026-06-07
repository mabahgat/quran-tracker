const { withXcodeProject } = require('expo/config-plugins');

/**
 * Sets ENABLE_USER_SCRIPT_SANDBOXING = NO on every build configuration of the
 * given parsed Xcode project. Returns the number of configurations changed.
 *
 * Xcode 16+/Expo's prebuild template enables user-script sandboxing, which makes
 * the CocoaPods "[CP] Copy Pods Resources" run-script phase fail with
 * "Operation not permitted" when it writes resources-to-copy-*.txt. Disabling it
 * restores a working build. Exported separately so it can be unit-tested.
 */
function disableScriptSandboxing(xcodeProject) {
  const configurations = xcodeProject.pbxXCBuildConfigurationSection();
  let changed = 0;
  for (const key of Object.keys(configurations)) {
    const entry = configurations[key];
    // Skip the comment entries (`<uuid>_comment`) that node-xcode interleaves.
    if (!entry || typeof entry !== 'object' || !entry.buildSettings) {
      continue;
    }
    entry.buildSettings.ENABLE_USER_SCRIPT_SANDBOXING = 'NO';
    changed += 1;
  }
  return changed;
}

/**
 * Expo config plugin that keeps user-script sandboxing disabled across prebuilds
 * (the ios/ project and Podfile are regenerated, so this can't be a manual edit).
 */
const withDisableScriptSandboxing = (config) =>
  withXcodeProject(config, (cfg) => {
    disableScriptSandboxing(cfg.modResults);
    return cfg;
  });

module.exports = withDisableScriptSandboxing;
module.exports.disableScriptSandboxing = disableScriptSandboxing;
