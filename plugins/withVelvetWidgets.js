const fs = require('node:fs');
const path = require('node:path');
const { withInfoPlist, withEntitlementsPlist, withDangerousMod, withXcodeProject, createRunOncePlugin } = require('expo/config-plugins');
const TARGET = 'VelvetWidgets';
const unquote = value => String(value || '').replace(/^"|"$/g, '');

function configureTarget(project, { bundleIdentifier, groupIdentifier, version, buildNumber, team }) {
  const nativeTargets = project.pbxNativeTargetSection();
  let uuid = Object.keys(nativeTargets).find(key => !key.endsWith('_comment') && unquote(nativeTargets[key].name) === TARGET);
  if (!uuid) {
    // xcode.addTarget only creates the dependency when these sections exist.
    project.hash.project.objects.PBXTargetDependency ||= {};
    project.hash.project.objects.PBXContainerItemProxy ||= {};
    const added = project.addTarget(TARGET, 'app_extension', TARGET, `${bundleIdentifier}.widgets`);
    uuid = added.uuid;
    project.addBuildPhase([], 'PBXSourcesBuildPhase', 'Sources', uuid);
    project.addBuildPhase([], 'PBXFrameworksBuildPhase', 'Frameworks', uuid);
    project.addBuildPhase([], 'PBXResourcesBuildPhase', 'Resources', uuid);
    const group = project.addPbxGroup([], TARGET, TARGET);
    project.addToPbxGroup({ fileRef: group.uuid, basename: TARGET }, project.getFirstProject().firstProject.mainGroup);
    const source = project.addSourceFile('VelvetWidgets.swift', { target: uuid }, group.uuid);
    const reference = project.pbxFileReferenceSection()[source.fileRef];
    for (const key of Object.keys(reference)) if (reference[key] === undefined) delete reference[key];
    for (const item of Object.values(project.pbxBuildFileSection())) {
      if (item && typeof item === 'object' && item.fileRef === nativeTargets[uuid].productReference) item.settings = { ATTRIBUTES: ['RemoveHeadersOnCopy'] };
    }
  }
  const target = nativeTargets[uuid];
  const configList = project.pbxXCConfigurationList()[target.buildConfigurationList];
  const configs = project.pbxXCBuildConfigurationSection();
  for (const item of configList.buildConfigurations) {
    Object.assign(configs[item.value].buildSettings, {
      PRODUCT_BUNDLE_IDENTIFIER: `"${bundleIdentifier}.widgets"`,
      PRODUCT_NAME: `"${TARGET}"`, SWIFT_VERSION: '5.0',
      IPHONEOS_DEPLOYMENT_TARGET: '16.4', TARGETED_DEVICE_FAMILY: '"1,2"',
      INFOPLIST_FILE: `"${TARGET}/Info.plist"`,
      CODE_SIGN_ENTITLEMENTS: `"${TARGET}/${TARGET}.entitlements"`,
      CODE_SIGN_STYLE: 'Automatic', APPLICATION_EXTENSION_API_ONLY: 'YES',
      MARKETING_VERSION: `"${version}"`, CURRENT_PROJECT_VERSION: `"${buildNumber}"`,
      SKIP_INSTALL: 'YES', GENERATE_INFOPLIST_FILE: 'NO',
      ...(team ? { DEVELOPMENT_TEAM: `"${team}"` } : {}),
    });
  }
  return uuid;
}
function withVelvetWidgets(config) {
  const bundleIdentifier = config.ios?.bundleIdentifier;
  if (!bundleIdentifier) throw new Error('Velvet widgets need ios.bundleIdentifier.');
  const groupIdentifier = `group.${bundleIdentifier}.music`;
  config = withInfoPlist(config, mod => { mod.modResults.VelvetAppGroup = groupIdentifier; return mod; });
  config = withEntitlementsPlist(config, mod => {
    mod.modResults['com.apple.security.application-groups'] = [...new Set([...(mod.modResults['com.apple.security.application-groups'] || []), groupIdentifier])];
    return mod;
  });
  config = withDangerousMod(config, ['ios', async mod => {
    const destination = path.join(mod.modRequest.platformProjectRoot, TARGET);
    fs.mkdirSync(destination, { recursive: true });
    fs.copyFileSync(path.join(__dirname, '../widgets/ios/VelvetWidgets.swift'), path.join(destination, 'VelvetWidgets.swift'));
    const plist = require('@expo/plist').default;
    fs.writeFileSync(path.join(destination, 'Info.plist'), plist.build({
      CFBundleDisplayName: 'Velvet', CFBundleIdentifier: '$(PRODUCT_BUNDLE_IDENTIFIER)',
      CFBundleName: '$(PRODUCT_NAME)', CFBundleExecutable: '$(EXECUTABLE_NAME)',
      CFBundlePackageType: 'XPC!', CFBundleShortVersionString: '$(MARKETING_VERSION)', CFBundleVersion: '$(CURRENT_PROJECT_VERSION)',
      VelvetAppGroup: groupIdentifier,
      NSExtension: { NSExtensionPointIdentifier: 'com.apple.widgetkit-extension' },
    }));
    fs.writeFileSync(path.join(destination, `${TARGET}.entitlements`), plist.build({ 'com.apple.security.application-groups': [groupIdentifier] }));
    return mod;
  }]);
  config = withXcodeProject(config, mod => {
    configureTarget(mod.modResults, { bundleIdentifier, groupIdentifier, version: config.version || '1.0.0', buildNumber: config.ios?.buildNumber || '1', team: config.ios?.appleTeamId });
    return mod;
  });
  // EAS can discover/sign the extension before generating the Xcode project.
  const extra = config.extra || {}, eas = extra.eas || {}, experimental = eas.build?.experimental || {};
  const extensions = (experimental.ios?.appExtensions || []).filter(extension => extension.targetName !== TARGET);
  config.extra = { ...extra, eas: { ...eas, build: { ...eas.build, experimental: { ...experimental, ios: { ...experimental.ios, appExtensions: [...extensions, {
    targetName: TARGET, bundleIdentifier: `${bundleIdentifier}.widgets`, entitlements: { 'com.apple.security.application-groups': [groupIdentifier] },
  }] } } } } };
  return config;
}
module.exports = createRunOncePlugin(withVelvetWidgets, 'velvet-widgets', '1.0.0');
module.exports.configureTarget = configureTarget;
