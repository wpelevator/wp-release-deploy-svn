import { build } from 'esbuild';

// Bundle the action and its dependencies into a single file for the GitHub Actions Node.js runtime.
await build( {
	entryPoints: [ 'src/run.ts' ],
	// Bundle the wp-release source instead of requiring its build first.
	conditions: [ 'wpelevator-source' ],
	outfile: 'dist/index.js',
	bundle: true,
	platform: 'node',
	target: 'node24',
	format: 'esm',
	// Let bundled CommonJS dependencies require Node.js built-in modules.
	banner: {
		js: "import { createRequire } from 'node:module'; const require = createRequire( import.meta.url );",
	},
	legalComments: 'linked',
	logLevel: 'info',
} );
