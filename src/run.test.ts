import { test } from 'node:test';
import type { TestContext } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import {
	mkdirSync,
	mkdtempSync,
	readFileSync,
	rmSync,
	writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { execute, Logger } from '@wpelevator/wp-release';
import { withEnv } from './test-env.ts';

const hasSvn = [ 'svn', 'svnadmin' ].every(
	( binary ) => 0 === spawnSync( binary, [ '--version' ] ).status
);

/**
 * Read an output written by the action, including multiline values.
 *
 * @param path GitHub output file.
 * @param name Output name.
 * @return Output value.
 */
function output( path: string, name: string ): string {
	const match = readFileSync( path, 'utf8' ).match(
		new RegExp( `^${ name }<<([^\\n]+)\\n([\\s\\S]*?)\\n\\1$`, 'm' )
	);
	assert.ok( match, `The action should set ${ name }.` );
	return match[ 2 ] ?? '';
}

/**
 * Create a configured plugin and two local SVN repositories for action tests.
 *
 * @param t       Test context for cleanup.
 * @param version Plugin version to deploy.
 * @return Fixture paths, CLI and action runners.
 */
function fixture( t: TestContext, version = '1.2.0' ) {
	const cwd = mkdtempSync( join( tmpdir(), 'wp-release-svn-action-' ) );
	const config = join( cwd, 'release', 'config.mjs' );
	const outputs = join( cwd, 'outputs' );
	const svn = ( ...args: string[] ) =>
		execFileSync( 'svn', args, { encoding: 'utf8' } ).trim();
	const urls = [ 'one', 'two' ].map( ( name ) => {
		const path = join( cwd, name );
		execFileSync( 'svnadmin', [ 'create', path ] );
		const url = pathToFileURL( path ).href;
		svn(
			'mkdir',
			'--message',
			'Initialize',
			`${ url }/trunk`,
			`${ url }/tags`
		);
		return url;
	} );
	t.after( () => rmSync( cwd, { recursive: true, force: true } ) );
	mkdirSync( join( cwd, 'release' ) );
	mkdirSync( join( cwd, 'plugins', 'alpha', 'tests' ), { recursive: true } );
	writeFileSync(
		join( cwd, 'plugins', 'alpha', 'alpha.php' ),
		`<?php\n/*\nPlugin Name: Alpha\nVersion: ${ version }\n*/\n`
	);
	writeFileSync(
		join( cwd, 'plugins', 'alpha', 'readme.txt' ),
		`=== Alpha ===\nStable tag: ${ version }\n`
	);
	writeFileSync(
		join( cwd, 'plugins', 'alpha', 'tests', 'private.txt' ),
		'excluded'
	);
	writeFileSync(
		config,
		`export default {
		root: 'plugins',
		packages: [ {
			glob: '*',
			version: { from: { kind: 'wordpress-plugin-header' }, to: [ { kind: 'wordpress-plugin-header' } ] },
			files: { distignore: false, exclude: [ '/tests/' ] },
			deploy: { svn: ${ JSON.stringify(
				urls.map( ( url ) => ( { slug: 'alpha', url } ) )
			) } },
		} ],
	};`
	);
	execFileSync( 'git', [ 'init', '--quiet', '--initial-branch=main' ], {
		cwd,
	} );
	execFileSync(
		'git',
		[
			'-c',
			'user.name=Action Test',
			'-c',
			'user.email=action@example.test',
			'commit',
			'--allow-empty',
			'--quiet',
			'--message',
			'Initialize',
		],
		{ cwd }
	);
	writeFileSync( outputs, '' );
	const run = ( inputs: Record< string, string > = {} ) =>
		withEnv(
			{
				GITHUB_WORKSPACE: cwd,
				GITHUB_OUTPUT: outputs,
				GITHUB_STEP_SUMMARY: join( cwd, 'summary' ),
				'INPUT_RELEASE-REF': `refs/tags/alpha/${ version }`,
				INPUT_CONFIG: 'release/config.mjs',
				INPUT_SLUG: 'repository-default',
				INPUT_README: 'readme.txt',
				'INPUT_SVN-USERNAME': 'test',
				'INPUT_SVN-PASSWORD': 'throwaway',
				...inputs,
			},
			() =>
				spawnSync(
					process.execPath,
					[ fileURLToPath( new URL( './run.ts', import.meta.url ) ) ],
					{ cwd, env: process.env, encoding: 'utf8' }
				)
		);
	return { cwd, config, outputs, urls, svn, run };
}

test(
	'configured list matches the CLI plan with custom config and tag format',
	{ skip: ! hasSvn },
	async ( t ) => {
		const { cwd, outputs, run } = fixture( t );
		const result = run( {
			'INPUT_RELEASE-REF': 'refs/tags/alpha@1.2.0',
			'INPUT_TAG-FORMAT': '{name}@{version}',
			INPUT_PACKAGE: 'alpha',
			INPUT_LIST: 'true',
		} );
		assert.equal( result.status, 0, result.stdout + result.stderr );
		const cli = await execute(
			'deploy svn',
			[
				'--release-ref',
				'refs/tags/alpha@1.2.0',
				'--config',
				'release/config.mjs',
				'--tag-format',
				'{name}@{version}',
				'--package',
				'alpha',
				'--list',
			],
			{ cwd, logger: new Logger( { quiet: true } ) }
		);
		assert.deepEqual(
			JSON.parse( output( outputs, 'result' ) ),
			cli.result,
			'The action and CLI should resolve exactly the same configured plan.'
		);
		assert.ok(
			'packages' in cli.result,
			'The CLI should return a package plan for list.'
		);
		assert.deepEqual(
			JSON.parse( output( outputs, 'packages' ) ),
			cli.result.packages,
			'The packages output should be directly usable as a CI matrix.'
		);
		assert.deepEqual(
			JSON.parse( output( outputs, 'deploys' ) ),
			[],
			'A plan should not report completed deploys.'
		);
	}
);

test(
	'deploys configured files to every SVN target',
	{ skip: ! hasSvn },
	( t ) => {
		const { outputs, urls, svn, run } = fixture( t );
		const result = run();
		assert.equal( result.status, 0, result.stdout + result.stderr );
		const deploys = JSON.parse( output( outputs, 'deploys' ) );
		assert.equal(
			deploys.length,
			2,
			'Every configured SVN target should be deployed.'
		);
		for ( const url of urls ) {
			assert.equal(
				svn( 'cat', `${ url }/tags/1.2.0/alpha.php` ).includes(
					'Version: 1.2.0'
				),
				true,
				'Each target should receive the release version.'
			);
			assert.equal(
				svn( 'list', '--recursive', `${ url }/trunk` ).includes(
					'tests/'
				),
				false,
				'The configured file exclusions should apply to every target.'
			);
		}
		assert.ok(
			deploys.every(
				( item: { result: { committed: boolean } } ) =>
					item.result.committed
			),
			'Each deploy outcome should report its commit.'
		);
		assert.equal(
			output( outputs, 'slug' ),
			'',
			'Single-plugin outputs should be empty for a configured multi-target deploy.'
		);
	}
);

test(
	'pre-release dry runs leave trunk and SVN tags unchanged',
	{ skip: ! hasSvn },
	( t ) => {
		const { outputs, urls, svn, run } = fixture( t, '1.2.0-rc.1' );
		const result = run( { 'INPUT_DRY-RUN': 'true' } );
		assert.equal( result.status, 0, result.stdout + result.stderr );
		const deploys = JSON.parse( output( outputs, 'deploys' ) );
		assert.ok(
			deploys.every(
				( item: { result: { committed: boolean } } ) =>
					! item.result.committed
			),
			'Dry-run outcomes should report no commits.'
		);
		for ( const url of urls ) {
			assert.equal(
				svn( 'list', '--recursive', url ),
				'tags/\ntrunk/',
				'A pre-release dry run should leave the remote repository unchanged.'
			);
		}
	}
);

test(
	'rejects single-plugin writes in configured mode',
	{ skip: ! hasSvn },
	( t ) => {
		const { urls, svn, run } = fixture( t );
		const result = run( { INPUT_TRUNK: 'true' } );
		assert.equal(
			result.status,
			1,
			'A CLI option conflict should fail the action.'
		);
		assert.ok(
			result.stderr.includes( "can't be combined with --trunk" ),
			'The CLI should report the conflicting action input.'
		);
		assert.equal(
			svn( 'list', '--recursive', urls[ 0 ] ?? '' ),
			'tags/\ntrunk/',
			'Conflicting inputs should cause no remote writes.'
		);
		const invalidList = run( {
			'INPUT_RELEASE-REF': '',
			INPUT_LIST: 'true',
		} );
		assert.equal(
			invalidList.status,
			1,
			'List without a release ref should fail instead of silently running a single deploy.'
		);
	}
);

test(
	'reports a failed target and continues deploying the other target',
	{ skip: ! hasSvn },
	( t ) => {
		const { config, cwd, outputs, urls, svn, run } = fixture( t );
		writeFileSync(
			config,
			readFileSync( config, 'utf8' ).replace(
				urls[ 0 ] ?? '',
				pathToFileURL( join( cwd, 'missing' ) ).href
			)
		);
		const result = run();
		assert.equal(
			result.status,
			1,
			'A failed configured target should make the action fail.'
		);
		const deploys = JSON.parse( output( outputs, 'deploys' ) );
		assert.equal(
			typeof deploys[ 0 ].error,
			'string',
			'The failed target should be included in the deployment outcomes.'
		);
		assert.equal(
			deploys[ 1 ].result.committed,
			true,
			'A failed target should not prevent a later target from deploying.'
		);
		assert.ok(
			svn( 'cat', `${ urls[ 1 ] }/tags/1.2.0/alpha.php` ).includes(
				'Version: 1.2.0'
			),
			'The later target should contain the release files.'
		);
	}
);

test(
	'preserves legacy single-plugin deployment outputs',
	{ skip: ! hasSvn },
	( t ) => {
		const { outputs, urls, run } = fixture( t );
		const result = run( {
			'INPUT_RELEASE-REF': '',
			INPUT_SLUG: 'alpha',
			'INPUT_SOURCE-DIR': 'plugins/alpha',
			'INPUT_SVN-URL': urls[ 0 ] ?? '',
			INPUT_TRUNK: 'true',
			'INPUT_SVN-TAG': '1.2.0',
		} );
		assert.equal( result.status, 0, result.stdout + result.stderr );
		assert.equal(
			output( outputs, 'slug' ),
			'alpha',
			'The existing slug output should remain available.'
		);
		assert.equal(
			output( outputs, 'version' ),
			'1.2.0',
			'The existing version output should remain available.'
		);
		assert.equal(
			output( outputs, 'committed' ),
			'true',
			'The existing committed output should report the SVN commit.'
		);
		assert.equal(
			output( outputs, 'revision' ),
			'2',
			'The existing revision output should report the SVN revision.'
		);
		assert.deepEqual(
			JSON.parse( output( outputs, 'deploys' ) ),
			[],
			'Single-plugin deploys should not report configured outcomes.'
		);
	}
);

test(
	'the shared command uses the injected SVN runner in both modes',
	{ skip: ! hasSvn },
	async ( t ) => {
		const { cwd, urls } = fixture( t );
		const args = [ '--config', 'release/config.mjs', '--dry-run' ];
		const logger = new Logger( { quiet: true } );
		const failure = new Error( 'Injected SVN command runner' );
		let calls = 0;
		const svnRunner = async () => {
			calls++;
			throw failure;
		};

		await assert.rejects(
			execute(
				'deploy svn',
				[
					...args,
					'--source-dir',
					'plugins/alpha',
					'--slug',
					'alpha',
					'--trunk',
					'--svn-url',
					urls[ 0 ] ?? '',
				],
				{ cwd, logger, svnRunner }
			),
			( error ) => error === failure,
			'A single-plugin command should run the supplied SVN runner.'
		);
		const configured = await execute(
			'deploy svn',
			[ ...args, '--release-ref', 'refs/tags/alpha/1.2.0' ],
			{ cwd, logger, svnRunner }
		);
		assert.equal(
			configured.exitCode,
			1,
			'Configured deployment should report the injected runner failure.'
		);
		assert.equal(
			calls,
			3,
			'The injected runner should be called by the single deploy and each configured target.'
		);
	}
);
