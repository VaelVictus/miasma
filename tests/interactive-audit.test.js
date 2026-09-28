const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { audit } = require('./audit-interactives');
const root = path.join(__dirname, '..', 'object_data');

for (const folder of fs.readdirSync(root)) {
    const file = path.join(root, folder, 'data.json');
    if (!fs.existsSync(file)) continue;
    test(`${folder}: reachable controls, hotspots, narratives, and media remain valid`, () => {
        const result = audit(folder);
        assert.deepEqual(result.failures, [], JSON.stringify(result.failures, null, 2));
        if (/completed\s*\(/.test(fs.readFileSync(file, 'utf8'))) {
            assert.equal(result.completionReached, true, 'Archived completion must be reachable');
        }
    });
}
