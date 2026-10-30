/*
 * Bundles the theme stylesheets into public/theme/chase/theme.css (every page)
 * and public/theme/chase/vc.css (pages with a map or site plan).
 *
 * Relative url()s are rewritten for the new location, rules whose selectors
 * need a class no page uses are dropped, and the result is minified.
 *
 * Generate the static site first, then run:
 *   node scripts/build-theme-css.mjs storage/app/static
 */
import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { transform } from 'lightningcss';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const theme = join(root, 'public/theme');
const outDir = join(theme, 'chase');

const bundles = {
	'theme.css': [
		'kose/css/reset.css',
		'kose/css/foundation.css',
		'kose/style.css',
		'kose/css/kose-responsive.css',
		'wp-includes/blocks/paragraph/style.min.css',
		'chase/site.css',
	],
	'vc.css': [
		'js_composer/assets/css/js_composer.min.css',
	],
};

// Classes that only exist once site.js has run.
const scriptClasses = [
	'js', 'no-js', 'js_active', 'vc_desktop', 'vc_mobile', 'vc_transform',
	'rotated', 'expanded', 'selected', 'hidden-content', 'has-dropdown', 'dropdown',
	'safari-fix', 'sf-js-enabled', 'sf-arrows', 'caroufredsel_wrapper',
	'nicescroll-rails', 'chase-scroll', 'blank',
];

const htmlDir = process.argv[2];

if (!htmlDir) {
	console.error('Usage: node scripts/build-theme-css.mjs <generated-site-dir>');
	process.exit(1);
}

const usedClasses = new Set(scriptClasses);

(function collect(dir) {
	for (const name of readdirSync(dir)) {
		const path = join(dir, name);

		if (statSync(path).isDirectory()) {
			collect(path);
		} else if (name.endsWith('.html')) {
			for (const [, list] of readFileSync(path, 'utf8').matchAll(/class=["']([^"']*)["']/g)) {
				list.split(/\s+/).filter(Boolean).forEach((name) => usedClasses.add(name));
			}
		}
	}
})(resolve(root, htmlDir));

// A selector can match only if every class in it (outside :not() and the like) is used.
const selectorCanMatch = (selector) => selector.every((part) => part.type !== 'class' || usedClasses.has(part.name));

for (const [output, sources] of Object.entries(bundles)) {
	const css = sources.map((source) => {
		const file = join(theme, source);

		const { code } = transform({
			filename: file,
			code: readFileSync(file),
			errorRecovery: true,
			visitor: {
				Url(url) {
					if (/^(data:|https?:|\/|#)/.test(url.url)) return url;

					const [path, suffix = ''] = url.url.split(/(?=[?#])/);
					url.url = relative(outDir, resolve(dirname(file), path)) + suffix;

					return url;
				},
				Rule: {
					style(rule) {
						const selectors = rule.value.selectors.filter(selectorCanMatch);

						if (!selectors.length) return [];

						rule.value.selectors = selectors;

						return rule;
					},
				},
			},
		});

		return code.toString();
	}).join('\n');

	const { code } = transform({ filename: output, code: Buffer.from(css), minify: true, errorRecovery: true });

	writeFileSync(join(outDir, output), code);
	console.log(`${output}: ${(code.length / 1024).toFixed(1)} KiB`);
}
