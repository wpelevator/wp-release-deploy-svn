import { getInput, info, setOutput } from '@actions/core';
import {
	GitHubActionsWriter,
	Logger,
	execute,
	logError,
	resolveDeployOptions,
} from '@wpelevator/wp-release';
import { getDeployArgs, getDeployInput } from './inputs.ts';
import { createActionSvnRunner } from './install-svn.ts';

const logger = new Logger( { writer: new GitHubActionsWriter() } );

try {
	const input = getDeployInput();
	const configured = Boolean( getInput( 'release-ref' ) );
	const options = configured ? undefined : resolveDeployOptions( input );

	if ( input.svnPassword ) {
		process.env.SVN_PASSWORD = input.svnPassword;
	}

	const { result, exitCode } = await execute(
		'deploy svn',
		getDeployArgs( input ),
		{
			cwd: input.cwd ?? process.cwd(),
			logger,
			svnRunner: createActionSvnRunner( { log: info } ),
		}
	);

	setOutput( 'slug', options?.slug ?? '' );
	setOutput( 'version', 'version' in result ? result.version ?? '' : '' );
	setOutput( 'committed', 'committed' in result ? result.committed : '' );
	setOutput( 'revision', 'revision' in result ? result.revision ?? '' : '' );
	setOutput( 'result', result );
	setOutput( 'packages', 'packages' in result ? result.packages : [] );
	setOutput( 'deploys', 'deploys' in result ? result.deploys : [] );
	process.exitCode = exitCode;
} catch ( error ) {
	logError( logger, error, 'WP Release Deploy SVN' );
	process.exitCode = 1;
}
