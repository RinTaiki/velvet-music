function configureBuild(config, widgets = false) {
  const next = JSON.parse(JSON.stringify(config));
  next.ios ||= {};
  next.ios.infoPlist ||= {};
  next.ios.infoPlist.UIBackgroundModes = [...new Set([...(next.ios.infoPlist.UIBackgroundModes || []), 'audio'])];
  next.plugins = (next.plugins || []).filter(plugin => (Array.isArray(plugin) ? plugin[0] : plugin) !== './plugins/withVelvetWidgets');
  if (widgets) next.plugins.push('./plugins/withVelvetWidgets');
  else {
    delete next.ios.infoPlist.VelvetAppGroup;
    const groups = next.ios.entitlements?.['com.apple.security.application-groups'];
    if (groups) {
      const remaining = groups.filter(group => group !== `group.${next.ios.bundleIdentifier}.music`);
      if (remaining.length) next.ios.entitlements['com.apple.security.application-groups'] = remaining;
      else delete next.ios.entitlements['com.apple.security.application-groups'];
    }
    const extensions = next.extra?.eas?.build?.experimental?.ios?.appExtensions;
    if (extensions) next.extra.eas.build.experimental.ios.appExtensions = extensions.filter(extension => extension.targetName !== 'VelvetWidgets');
  }
  return next;
}
module.exports = { configureBuild };
