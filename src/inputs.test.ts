import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getDeployInput } from './inputs.ts';
import { withEnv } from './test-env.ts';

test( 'reads write flags from inputs', () => {
	const input = withEnv(
		{
			INPUT_TRUNK: 'true',
			INPUT_ASSETS: 'false',
			'INPUT_SVN-TAG': 'v1.2.0',
		},
		getDeployInput
	);

	assert.equal( input.trunk, true, 'The trunk input should be a boolean.' );
	assert.equal(
		input.assets,
		false,
		'The assets input should be a boolean.'
	);
	assert.equal(
		input.svnTag,
		'v1.2.0',
		'The svn-tag input should be passed through for wp-release to normalize.'
	);
} );

test( 'reads the SVN credentials from inputs', () => {
	const input = withEnv(
		{ 'INPUT_SVN-USERNAME': 'me', 'INPUT_SVN-PASSWORD': 's3cret' },
		getDeployInput
	);

	assert.equal(
		input.svnUsername,
		'me',
		'The svn-username input should map to svnUsername.'
	);
	assert.equal(
		input.svnPassword,
		's3cret',
		'The svn-password input should map to svnPassword.'
	);
	assert.equal(
		withEnv( {}, getDeployInput ).svnPassword,
		undefined,
		'An empty password input should leave the SVN_PASSWORD env var in charge.'
	);
} );

test( 'rejects malformed boolean inputs', () => {
	assert.throws(
		() => withEnv( { 'INPUT_DRY-RUN': 'ture' }, getDeployInput ),
		/dry-run/,
		'A typo in a boolean input should fail instead of becoming false.'
	);
} );

test( 'leaves empty inputs to the wp-release defaults', () => {
	const input = withEnv( {}, getDeployInput );

	assert.equal(
		input.assets,
		undefined,
		'An empty assets input should fall back to the wp-release default.'
	);
	assert.equal(
		input.dryRun,
		undefined,
		'An empty dry-run input should fall back to the wp-release default.'
	);
	assert.equal(
		withEnv( { INPUT_ASSETS: 'false' }, getDeployInput ).assets,
		false,
		'An explicit false should turn off the assets sync.'
	);
} );

test( 'ignores the 10up environment variables', () => {
	const input = withEnv(
		{ SLUG: 'other', BUILD_DIR: 'build', VERSION: '9.9.9' },
		getDeployInput
	);

	assert.equal(
		input.slug,
		undefined,
		'The SLUG env var should not be read.'
	);
	assert.equal(
		input.sourceDir,
		undefined,
		'The BUILD_DIR env var should not be read.'
	);
	assert.equal(
		input.version,
		undefined,
		'The VERSION env var should not be read.'
	);
} );

test( 'reads the file selection inputs', () => {
	const input = withEnv(
		{ INPUT_DISTIGNORE: 'false', INPUT_EXCLUDE: 'build/,assets/*' },
		getDeployInput
	);

	assert.equal(
		input.distignore,
		false,
		'A "false" distignore input should disable the ignore file.'
	);
	assert.equal(
		input.exclude,
		'build/,assets/*',
		'The exclude input should be passed through for wp-release to parse.'
	);
	assert.equal(
		withEnv( { INPUT_DISTIGNORE: '.release-ignore' }, getDeployInput )
			.distignore,
		'.release-ignore',
		'Other distignore values should be passed through as a path.'
	);
} );
