const { test } = require('node:test');
const assert = require('node:assert/strict');
const { configureBuild } = require('../config/buildProfile.cjs');
const base = {
  name: 'Velvet', slug: 'velvet-music', ios: { bundleIdentifier: 'com.test.velvet', infoPlist: { UIBackgroundModes: ['audio', 'audio'], VelvetAppGroup: 'group.com.test.velvet.music' }, entitlements: { 'com.apple.security.application-groups': ['group.com.test.velvet.music'] } },
  plugins: ['expo-audio', './plugins/withVelvetWidgets'],
  extra: { eas: { projectId: 'preserve-project', build: { experimental: { ios: { appExtensions: [{ targetName: 'VelvetWidgets' }] } } } } },
};
test('free build omits widget plugin, extension declaration and App Group while preserving audio', () => {
  const config = configureBuild(base);
  assert.deepEqual(config.plugins, ['expo-audio']);
  assert.deepEqual(config.ios.infoPlist.UIBackgroundModes, ['audio']);
  assert.equal(config.ios.infoPlist.VelvetAppGroup, undefined);
  assert.equal(config.ios.entitlements['com.apple.security.application-groups'], undefined);
  assert.deepEqual(config.extra.eas.build.experimental.ios.appExtensions, []);
  assert.equal(config.extra.eas.projectId, 'preserve-project');
  assert.equal(base.plugins.length, 2, 'source configuration is not mutated');
});
test('widget build remains explicitly opt-in and does not duplicate the plugin', () => {
  const config = configureBuild(base, true);
  assert.equal(config.plugins.filter(plugin => plugin === './plugins/withVelvetWidgets').length, 1);
});
