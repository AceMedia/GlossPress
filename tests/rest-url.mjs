import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
globalThis.window = { location: { href: 'https://example.test/wp-admin/' } };
const source = await readFile(new URL('../src/rest-url.js', import.meta.url), 'utf8');
const { buildRestUrl } = await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);
for (const root of ['https://example.test/wp-json/', 'https://example.test/index.php?rest_route=/']) {
    const url = new URL(buildRestUrl('/wp/v2/tags?per_page=10&search=moon%20spoon', root));
    assert.equal(url.searchParams.get('per_page'), '10');
    assert.equal(url.searchParams.get('search'), 'moon spoon');
    assert.equal(url.searchParams.has('rest_route') ? url.searchParams.get('rest_route') : url.pathname, root.includes('rest_route') ? '/wp/v2/tags' : '/wp-json/wp/v2/tags');
}
const subsite = new URL(buildRestUrl('wp/v2/glossary', 'https://example.test/verse/index.php?rest_route=%2F'));
assert.equal(subsite.pathname, '/verse/index.php');
assert.equal(subsite.searchParams.get('rest_route'), '/wp/v2/glossary');
console.log('8 REST URL assertions passed');
