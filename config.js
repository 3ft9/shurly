exports.config = {
	siteDomain : 'shur.ly',
	// Which module from ./dataProviders should be used
	dataProvider : 'mongo',
	// Everything that module needs to do its job
	dataParams : {
		host : '127.0.0.1',
		port : 27017,
		db : 'shurly',
		// The characters allowed in a short URL
		// NB: changing these will probably break any existing short URLs!!
		allowedChars : 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789',
	},
	// HTTP server configuration
	http : {
		ip : '0.0.0.0',
		port : 8000,
	},
};
