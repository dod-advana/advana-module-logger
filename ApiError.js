'use strict'

const logger = require('./index');

const { isSuperAdmin } = require('./util');

module.exports = {
	logAndThrow(e, hashCode, data) {
		if (e.logged) {
			// error was already logged by the function that caught it, we can re-throw is as-is
			throwError(e);
		} else {
			// this error being caught for the first time, we must log it
			hashCode = e.hashCode ? e.hashCode : hashCode;
			logger.error(e, hashCode);
			throwError({ data, hashCode, logged: true, message: e.message, statusCode: e.statusCode, userMessage: e.userMessage });
		}
	},

	sendError(req, res, e, hashCode) {
		let respObj = {
			hashCode: e.hashCode ? e.hashCode : hashCode,
			message: isSuperAdmin(req) || e.statusCode === 403 ? e.message : 'An error occurred in the application API',
			statusCode: e.statusCode ? e.statusCode : 500
		};

		if (e.userMessage) {
			respObj.userMessage = e.userMessage;
		}

		if (!e.logged && req.session) {
			logger.error(e, respObj.hashCode, req.session.user.id);
		}

		res.status(respObj.statusCode).send(respObj);
	},

	throw400(message, hashCode, userMessage) {
		throwError({ hashCode, message, statusCode: 400, userMessage });
	},

	throw403(userMessage, hashCode) {
		let message = 'Permission denied';
		throwError({ hashCode, message, statusCode: 403, userMessage });
	},

	throw500(message, hashCode, userMessage) {
		throwError({ hashCode, message, statusCode: 500, userMessage });
	}
}

const throwError = ({ data, hashCode, logged, message, statusCode, userMessage }) => {
	let error = new Error(message);

	if (data) error.data = data;
	if (hashCode) error.hashCode = hashCode;
	if (logged) error.logged = logged;
	if (statusCode) error.statusCode = statusCode;
	if (userMessage) error.userMessage = userMessage;

	throw error;
}