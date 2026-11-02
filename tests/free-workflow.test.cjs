const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const yaml = require('js-yaml');
test('free build is manual, public-repository only, and has no paid runner or artifact-cache step', () => {
  const source = fs.readFileSync('.github/workflows/ios-free-sideload.yml', 'utf8');
  const workflow = yaml.load(source);
  assert.deepEqual(Object.keys(workflow.on), ['workflow_dispatch']);
  assert.equal(workflow.on.workflow_dispatch.inputs.confirm_public_release.default, false);
  assert.match(workflow.jobs.build.if, /repository.private == false/);
  assert.match(workflow.jobs.build.if, /confirm_public_release/);
  assert.equal(workflow.jobs.build['runs-on'], 'xcode-27');
  assert.ok(!source.includes('upload-artifact@'));
  assert.ok(!source.includes('actions/cache@'));
  assert.ok(!source.includes('secrets.'));
  assert.equal(workflow.jobs.build.env.VELVET_WIDGETS, '0');
});
