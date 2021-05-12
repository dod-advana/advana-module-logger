module.exports.isSuperAdmin = (req = {}) => {
	if (!req.session || !req.session.user || !req.session.user.perms)
		return false;
		
	let perms = req.session.user.perms || [];

	for (let p of perms) {
		if (p && (p.toUpperCase() === 'WEBAPP SUPER ADMIN' || p.toUpperCase() === 'TIER 3 SUPPORT'))
			return true;
	}
	return false;
};