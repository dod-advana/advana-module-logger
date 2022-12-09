const morgan = require('morgan');

const isSuperAdmin = (req = {}) => {
	if (!req.session || !req.session.user || !req.session.user.perms)
		return false;
		
	let perms = req.session.user.perms || [];

	for (let p of perms) {
		if (p && (p.toUpperCase() === 'WEBAPP SUPER ADMIN' || p.toUpperCase() === 'TIER 3 SUPPORT'))
			return true;
	}
	return false;
};

const getUserID = (req = {}) => {
	if (!req.session || !req.session.user) {
		return 'Unknown';
	}

	return req.session?.user?.id || req.get('SSL_CLIENT_S_DN_CN');
}

const attachHttpLogging = (app) => {
	morgan.token('sessionUserId', function getId(req) {
		return req.session?.user?.id || 'userIdFallback';
	});

	app.use(
		morgan(
			':remote-addr - :sessionUserId :date[iso] ":method :url HTTP/:http-version" :req[SSL_CLIENT_S_DN_CN] :status :res[content-length] :referrer :user-agent - :response-time ms'
		)
	);
};

module.exports = { isSuperAdmin, getUserID, attachHttpLogging };