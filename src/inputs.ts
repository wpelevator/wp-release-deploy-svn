import { getBooleanInput, getInput, setSecret } from '@actions/core';
import type { DeployInput } from '@wpelevator/wp-release';

/**
 * Read an optional boolean input. Empty means "not set", while anything other
 * than true or false fails instead of being treated as false, so that a typo
 * like "dry-run: ture" can't turn into a real deploy.
 *
 * @param name Input name as defined in action.yml.
 * @return Input value, undefined when empty.
 */
export function getOptionalBooleanInput( name: string ): boolean | undefined {
	return getInput( name ) ? getBooleanInput( name ) : undefined;
}

/**
 * Map action inputs to wp-release deploy options. Empty inputs are left
 * undefined so that the wp-release defaults apply.
 *
 * @return Options for resolveDeployOptions().
 */
export function getDeployInput(): DeployInput {
	const input = ( name: string ) => getInput( name ) || undefined;
	const distignore = input( 'distignore' );
	const svnPassword = input( 'svn-password' );

	if ( svnPassword ) {
		setSecret( svnPassword );
	}

	return {
		cwd: process.env.GITHUB_WORKSPACE || process.cwd(),
		sourceDir: input( 'source-dir' ),
		slug: input( 'slug' ),
		version: input( 'version' ),
		trunk: getOptionalBooleanInput( 'trunk' ),
		readmeOnly: getOptionalBooleanInput( 'readme-only' ),
		svnTag: input( 'svn-tag' ),
		assets: getOptionalBooleanInput( 'assets' ),
		assetsDir: input( 'assets-dir' ),
		readme: input( 'readme' ),
		fromZip: input( 'from-zip' ),
		distignore: 'false' === distignore ? false : distignore,
		exclude: input( 'exclude' ),
		excludeGitattributes: getOptionalBooleanInput(
			'exclude-gitattributes'
		),
		svnUrl: input( 'svn-url' ),
		svnUsername: input( 'svn-username' ),
		svnPassword,
		message: input( 'message' ),
		force: getOptionalBooleanInput( 'force' ),
		dryRun: getOptionalBooleanInput( 'dry-run' ),
	};
}

/**
 * Map the single-plugin and configured deployment inputs to CLI flags.
 * The repository slug and default readme belong only to single-plugin mode.
 *
 * @param input Single-plugin options and credentials.
 * @return Arguments after deploy svn.
 */
export function getDeployArgs(
	input: DeployInput = getDeployInput()
): string[] {
	const ref = getInput( 'release-ref' );
	const args: string[] = [];
	const values: Array< [ string, string | undefined ] > = [
		[ 'release-ref', ref ],
		[ 'config', getInput( 'config' ) ],
		[ 'tag-format', getInput( 'tag-format' ) ],
		[ 'source-dir', input.sourceDir ],
		[ 'slug', ref ? undefined : input.slug ],
		[ 'version', input.version ],
		[ 'svn-tag', input.svnTag ],
		[ 'assets-dir', input.assetsDir ],
		[
			'readme',
			ref && 'readme.txt' === input.readme ? undefined : input.readme,
		],
		[ 'from-zip', input.fromZip ],
		[
			'distignore',
			false === input.distignore ? undefined : input.distignore,
		],
		[
			'exclude',
			Array.isArray( input.exclude )
				? input.exclude.join( '\n' )
				: input.exclude,
		],
		[ 'svn-url', input.svnUrl ],
		[ 'svn-username', input.svnUsername ],
		[ 'message', input.message ],
	];
	const flags: Array< [ string, boolean | undefined ] > = [
		[ 'trunk', input.trunk ],
		[ 'readme-only', input.readmeOnly ],
		[ 'no-assets', false === input.assets ],
		[ 'no-distignore', false === input.distignore ],
		[ 'exclude-gitattributes', input.excludeGitattributes ],
		[ 'force', input.force ],
		[ 'dry-run', input.dryRun ],
		[ 'list', getOptionalBooleanInput( 'list' ) ],
	];

	values.forEach( ( [ name, value ] ) => {
		if ( value ) {
			args.push( `--${ name }`, value );
		}
	} );
	flags.forEach( ( [ name, enabled ] ) => {
		if ( enabled ) {
			args.push( `--${ name }` );
		}
	} );
	getInput( 'package' )
		.split( '\n' )
		.map( ( name ) => name.trim() )
		.filter( Boolean )
		.forEach( ( name ) => args.push( '--package', name ) );

	return args;
}
