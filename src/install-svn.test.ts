import { test } from 'node:test';
import assert from 'node:assert/strict';
import { installSvn } from './install-svn.ts';

function createRunner( hasSvn: boolean ) {
	const calls: string[] = [];
	const run = async ( command: string, args: string[] ) => {
		calls.push( [ command, ...args ].join( ' ' ) );

		if ( 'svn' === command && ! hasSvn ) {
			throw new Error( 'spawn svn ENOENT' );
		}
	};

	return { calls, run };
}

test( 'does nothing when svn is installed', async () => {
	const { calls, run } = createRunner( true );

	await installSvn( { run, platform: 'linux' } );

	assert.deepEqual(
		calls,
		[ 'svn --version --quiet' ],
		'Only the version check should run.'
	);
} );

test( 'installs Subversion with apt-get on Linux', async () => {
	const { calls, run } = createRunner( false );

	await installSvn( { run, platform: 'linux', isRoot: false } );

	assert.deepEqual(
		calls.slice( 1 ),
		[
			'sudo apt-get update --quiet',
			'sudo apt-get install --yes --quiet --no-install-recommends subversion',
		],
		'Non-root runners should install with sudo.'
	);

	const root = createRunner( false );

	await installSvn( { run: root.run, platform: 'linux', isRoot: true } );

	assert.equal(
		root.calls[ 1 ],
		'apt-get update --quiet',
		'Root containers should run apt-get without sudo.'
	);
} );

test( 'fails with a clear message on other systems', async () => {
	const { run } = createRunner( false );

	await assert.rejects(
		installSvn( { run, platform: 'darwin' } ),
		/Install Subversion on the darwin runner/,
		'Runners without apt-get should explain how to get svn.'
	);
} );
