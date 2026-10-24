import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, statSync } from 'node:fs';
import { resolve } from 'node:path';

const readJson = (path) => JSON.parse(readFileSync(path, 'utf8'));
const manifest = readJson('manifest.json');
const pkg = readJson('package.json');
const lock = readJson('package-lock.json');
const versions = readJson('versions.json');
assert.match(manifest.version, /^\d+\.\d+\.\d+$/, 'Version must be x.y.z without a v prefix');
assert.equal(manifest.id, 'aiwxedit', 'The existing plugin ID must remain stable');
assert.equal(pkg.version, manifest.version, 'package.json version mismatch');
assert.equal(lock.version, manifest.version, 'Lockfile version mismatch');
assert.equal(lock.packages[''].version, manifest.version, 'Lockfile root version mismatch');
assert.equal(versions[manifest.version], manifest.minAppVersion, 'versions.json compatibility mismatch');
assert.ok(manifest.description.length <= 250 && manifest.description.endsWith('.'));
assert.equal(typeof manifest.isDesktopOnly, 'boolean');
if (process.env.GITHUB_REF_TYPE === 'tag') {
    assert.equal(process.env.GITHUB_REF_NAME, manifest.version, 'Release tag must equal manifest.version');
}
for (const path of ['README.md', 'LICENSE']) assert.ok(statSync(path).size > 0);

if (process.argv.includes('--metadata-only')) {
    console.log(`Release metadata valid: ${manifest.version}`);
    process.exit(0);
}

const compareIndex = process.argv.indexOf('--compare-dir');
const compareDir = compareIndex < 0 ? null : process.argv[compareIndex + 1];
if (compareIndex >= 0) assert.ok(compareDir, '--compare-dir requires a directory');
const assets = ['main.js', 'manifest.json', 'styles.css'].map((name) => {
    const bytes = readFileSync(name);
    assert.ok(bytes.length > 0, `${name} is empty`);
    if (compareDir) assert.ok(bytes.equals(readFileSync(resolve(compareDir, name))), `${name} differs from release`);
    if (name === 'main.js') {
        assert.ok(!bytes.includes(Buffer.from('sourceMappingURL=data:')), 'Release contains an inline source map');
    }
    return { name, bytes: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex') };
});
console.log(JSON.stringify({ version: manifest.version, assets }, null, 2));
