import { info, setOutput } from '@actions/core';
import {
	GitHubActionsWriter,
	Logger,
	SvnDeploy,
	logError,
	resolveDeployOptions,
} from '@wpelevator/wp-release';
import { getDeployInput } from './inputs.ts';
import { installSvn } from './install-svn.ts';

const logger = new Logger( { writer: new GitHubActionsWriter() } );

try {
	const options = resolveDeployOptions( getDeployInput() );
	const deploy = new SvnDeploy( options, logger );

	logger.info(
		`Deploying plugin "${ options.slug }" to ${ options.svnUrl }`
	);

	setOutput( 'slug', options.slug );

	if ( deploy.hasWrites() ) {
		await installSvn( { log: info } );
	}

	const result = await deploy.run();

	setOutput( 'version', result.version ?? '' );
	setOutput( 'committed', result.committed );
	setOutput( 'revision', result.revision ?? '' );
} catch ( error ) {
	// Logs each version mismatch as an annotation on its file and line.
	logError( logger, error, 'WP Release Deploy SVN' );
	process.exitCode = 1;
}
