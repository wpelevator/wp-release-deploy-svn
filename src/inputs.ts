import { getBooleanInput, getInput } from '@actions/core';
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

	return {
		cwd: process.env.GITHUB_WORKSPACE || process.cwd(),
		sourceDir: input( 'source-dir' ),
		slug: input( 'slug' ),
		version: input( 'version' ),
		trunk: getOptionalBooleanInput( 'trunk' ),
		readmeOnly: getOptionalBooleanInput( 'readme-only' ),
		svnTag: input( 'svn-tag' ),
		gitRef: process.env.GITHUB_REF,
		assets: getOptionalBooleanInput( 'assets' ),
		assetsDir: input( 'assets-dir' ),
		readme: input( 'readme' ),
		fromZip: input( 'from-zip' ),
		distignore: 'false' === distignore ? false : distignore,
		exclude: input( 'exclude' ),
		svnUrl: input( 'svn-url' ),
		message: input( 'message' ),
		force: getOptionalBooleanInput( 'force' ),
		dryRun: getOptionalBooleanInput( 'dry-run' ),
	};
}
