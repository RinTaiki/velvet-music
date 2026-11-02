const { configureBuild } = require('./config/buildProfile.cjs');
// Personal/free signing is the default. Widgets/App Groups are opt-in only.
module.exports = ({ config }) => configureBuild(config, process.env.VELVET_WIDGETS === '1');
