/**
 * Run a callback with only the given action inputs and GitHub variables set,
 * since @actions/core reads them from process.env.
 *
 * @param vars     Environment variables to set.
 * @param callback Callback to run.
 * @return Callback result.
 */
export function withEnv< T >(
	vars: Record< string, string >,
	callback: () => T
): T {
	const original = { ...process.env };

	Object.keys( process.env )
		.filter( ( key ) => /^(INPUT_|GITHUB_)/.test( key ) )
		.forEach( ( key ) => delete process.env[ key ] );
	Object.assign( process.env, vars );

	try {
		return callback();
	} finally {
		Object.keys( process.env ).forEach(
			( key ) => delete process.env[ key ]
		);
		Object.assign( process.env, original );
	}
}
