const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const xcode = require('xcode');
const withWidgets = require('../plugins/withVelvetWidgets');
const { compileModsAsync } = require('expo/config-plugins');
const plist = require('@expo/plist').default;

test('widget plugin declares a signable extension and is idempotent', () => {
  const config = withWidgets({ name: 'Velvet', slug: 'velvet', ios: { bundleIdentifier: 'com.test.velvet' } });
  const extensions = config.extra.eas.build.experimental.ios.appExtensions;
  assert.equal(extensions.length, 1);
  assert.equal(extensions[0].bundleIdentifier, 'com.test.velvet.widgets');
  assert.deepEqual(extensions[0].entitlements['com.apple.security.application-groups'], ['group.com.test.velvet.music']);
});
test('widget target is embedded, depends on its sources, and survives a second prebuild pass', () => {
  const directory = path.resolve('.tmp/widget-test');
  fs.mkdirSync(directory, { recursive: true });
  const template = path.resolve('node_modules/expo/template.tgz');
  const file = path.join(directory, 'project.pbxproj');
  fs.writeFileSync(file, execFileSync('tar', ['-xOf', template, 'package/ios/HelloWorld.xcodeproj/project.pbxproj']));
  const project = xcode.project(file).parseSync();
  const options = { bundleIdentifier: 'com.test.velvet', groupIdentifier: 'group.com.test.velvet.music', version: '1.0.0', buildNumber: '3' };
  const uuid = withWidgets.configureTarget(project, options);
  assert.equal(withWidgets.configureTarget(project, options), uuid);
  const targets = project.pbxNativeTargetSection();
  assert.equal(Object.values(targets).filter(t => typeof t === 'object' && t.name === '"VelvetWidgets"').length, 1);
  const dependencies = project.getFirstTarget().firstTarget.dependencies;
  assert.ok(dependencies.some(d => project.hash.project.objects.PBXTargetDependency[d.value]?.target === uuid));
  const files = Object.values(project.pbxSourcesBuildPhaseObj(uuid).files);
  assert.equal(files.length, 1);
  const settings = project.pbxXCBuildConfigurationSection();
  const configs = project.pbxXCConfigurationList()[targets[uuid].buildConfigurationList].buildConfigurations;
  for (const config of configs) {
    assert.equal(settings[config.value].buildSettings.APPLICATION_EXTENSION_API_ONLY, 'YES');
    assert.equal(settings[config.value].buildSettings.CODE_SIGN_ENTITLEMENTS, '"VelvetWidgets/VelvetWidgets.entitlements"');
  }
  fs.writeFileSync(file, project.writeSync());
  assert.doesNotThrow(() => xcode.project(file).parseSync());
});
test('widget mods generate matching app/extension App Groups and copy the WidgetKit source', async () => {
  const directory = path.resolve('.tmp/widget-mods');
  fs.mkdirSync(directory, { recursive: true });
  execFileSync('tar', ['-xf', path.resolve('node_modules/expo/template.tgz'), '-C', directory, '--strip-components=1', 'package/ios']);
  const config = withWidgets({ name: 'HelloWorld', slug: 'velvet-test', version: '1.0.0', ios: { bundleIdentifier: 'com.test.velvet' } });
  await compileModsAsync(config, { projectRoot: directory, platforms: ['ios'], introspect: false });
  const folder = path.join(directory, 'ios/VelvetWidgets');
  const extensionInfo = plist.parse(fs.readFileSync(path.join(folder, 'Info.plist'), 'utf8'));
  const extensionEntitlements = plist.parse(fs.readFileSync(path.join(folder, 'VelvetWidgets.entitlements'), 'utf8'));
  const appInfo = plist.parse(fs.readFileSync(path.join(directory, 'ios/HelloWorld/Info.plist'), 'utf8'));
  const appFolder = path.join(directory, 'ios/HelloWorld');
  const entitlementsFile = fs.readdirSync(appFolder).find(file => file.endsWith('.entitlements'));
  const appEntitlements = plist.parse(fs.readFileSync(path.join(appFolder, entitlementsFile), 'utf8'));
  assert.equal(extensionInfo.NSExtension.NSExtensionPointIdentifier, 'com.apple.widgetkit-extension');
  assert.equal(appInfo.VelvetAppGroup, extensionInfo.VelvetAppGroup);
  assert.deepEqual(extensionEntitlements['com.apple.security.application-groups'], ['group.com.test.velvet.music']);
  assert.deepEqual(appEntitlements['com.apple.security.application-groups'], extensionEntitlements['com.apple.security.application-groups']);
  assert.ok(fs.readFileSync(path.join(folder, 'VelvetWidgets.swift'), 'utf8').includes('VelvetWidgetBundle'));
});
