import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, mkdirSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { parseArgs } from 'node:util';
import {
	commands,
	getDeployInputFromArgs,
	resolveDeployOptions,
} from '@wpelevator/wp-release';
import { getDeployInput } from './inputs.ts';
import { withEnv } from './test-env.ts';

/**
 * Read the input defaults from action.yml, which the runner passes as
 * INPUT_* variables when a workflow doesn't set an input. Expressions like
 * the repository name are left out.
 *
 * @return Default values keyed by INPUT_* variable name.
 */
function getActionDefaults(): Record< string, string > {
	const lines = readFileSync(
		new URL( '../action.yml', import.meta.url ),
		'utf8'
	).split( '\n' );
	const defaults: Record< string, string > = {};
	let name = '';

	lines.forEach( ( line ) => {
		const input = /^ {2}([a-z-]+):$/.exec( line )?.[ 1 ];
		const value = /^ {4}default: '?([^']*)'?$/.exec( line )?.[ 1 ];

		name = input ?? name;

		if ( undefined !== value && ! value.includes( '${{' ) ) {
			defaults[ `INPUT_${ name.toUpperCase() }` ] = value;
		}
	} );

	return defaults;
}

function resolveCli( args: string[], cwd: string ) {
	const command = commands.find( ( { name } ) => 'deploy-svn' === name );
	const { values, positionals } = parseArgs( {
		args,
		options: command?.options,
		allowPositionals: true,
	} );

	return resolveDeployOptions(
		getDeployInputFromArgs( { values, positionals, cwd } )
	);
}

function resolveAction( inputs: Record< string, string >, cwd: string ) {
	return withEnv(
		{ ...getActionDefaults(), ...inputs, GITHUB_WORKSPACE: cwd },
		() => resolveDeployOptions( getDeployInput() )
	);
}

const cases: Array< {
	name: string;
	cli: string[];
	action: Record< string, string >;
} > = [
	{
		name: 'a tagged deploy with assets',
		cli: [
			'dist',
			'--slug',
			'my-plugin',
			'--trunk',
			'--svn-tag',
			'v1.2.0',
			'--assets-dir',
			'.wordpress-org',
		],
		action: {
			INPUT_SLUG: 'my-plugin',
			'INPUT_SOURCE-DIR': 'dist',
			INPUT_TRUNK: 'true',
			'INPUT_SVN-TAG': 'v1.2.0',
			'INPUT_ASSETS-DIR': '.wordpress-org',
		},
	},
	{
		name: 'a readme-only dry run with file selection',
		cli: [
			'--source-dir',
			'dist',
			'--slug',
			'my-plugin',
			'--readme-only',
			'--readme',
			'readme.md',
			'--no-distignore',
			'--exclude',
			'build/,tests/',
			'--dry-run',
		],
		action: {
			INPUT_SLUG: 'my-plugin',
			'INPUT_SOURCE-DIR': 'dist',
			'INPUT_README-ONLY': 'true',
			INPUT_README: 'readme.md',
			INPUT_DISTIGNORE: 'false',
			INPUT_EXCLUDE: 'build/,tests/',
			'INPUT_DRY-RUN': 'true',
		},
	},
	{
		name: 'a deploy from a ZIP with assets turned off',
		cli: [
			'--slug',
			'my-plugin',
			'--trunk',
			'--version',
			'1.2.0',
			'--from-zip',
			'my-plugin.zip',
			'--assets-dir',
			'.wordpress-org',
			'--no-assets',
			'--svn-url',
			'file:///tmp/{slug}',
			'--message',
			'Deploy',
			'--force',
		],
		action: {
			INPUT_SLUG: 'my-plugin',
			INPUT_TRUNK: 'true',
			INPUT_VERSION: '1.2.0',
			'INPUT_FROM-ZIP': 'my-plugin.zip',
			'INPUT_ASSETS-DIR': '.wordpress-org',
			INPUT_ASSETS: 'false',
			'INPUT_SVN-URL': 'file:///tmp/{slug}',
			INPUT_MESSAGE: 'Deploy',
			INPUT_FORCE: 'true',
		},
	},
];

test( 'the CLI flags and action inputs resolve to the same options', () => {
	const cwd = mkdtempSync( join( tmpdir(), 'wp-release-contract-' ) );

	mkdirSync( join( cwd, '.wordpress-org' ) );

	cases.forEach( ( { name, cli, action } ) => {
		assert.deepEqual(
			resolveAction( action, cwd ),
			withEnv( {}, () => resolveCli( cli, cwd ) ),
			`The CLI and the action should deploy the same way for ${ name }.`
		);
	} );
} );
