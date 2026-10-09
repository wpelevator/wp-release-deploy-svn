import { info, setFailed, setOutput } from '@actions/core';
import {
	Logger,
	SvnDeploy,
	resolveDeployOptions,
} from '@wpelevator/wp-release';
import { getDeployInput } from './inputs.ts';
import { installSvn } from './install-svn.ts';

const logger = new Logger( { ci: true } );

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
	setFailed( error instanceof Error ? error.message : String( error ) );
}
