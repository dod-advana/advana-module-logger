'use strict';
const winston = require('winston');
const _ = require('underscore');
const os = require('os');

const logLevels = require('./constants');

const { isSuperAdmin } = require('./util');

// initialize logger as an empty object for dev env and when running tests
let logger = {};
winston.addColors(logLevels);


const DEFAULT_LOG_LEVEL = 'debug';

const getConsoleFormatter = () => {
	return winston.format.combine(
		winston.format.colorize(),
		winston.format.timestamp(),
		winston.format.printf((info) => {
			const { timestamp, level, message } = info;
			return `${timestamp} ${level} ${message}`;
		}));
};


try {
	logger = winston.createLogger({
		level: DEFAULT_LOG_LEVEL,
		levels: logLevels.levels,
		format: getConsoleFormatter(),
		transports: [
			new winston.transports.Console()
		],
		exceptionHandlers: [
			new winston.transports.Console()
		]
	});
} catch (e) {
	// mock logger for dev env and when running tests
	logger.boot = () => { };
	logger.database = () => { };
	logger.log = () => { };
	logger.info = () => { };
}

logger.error = (error, code, user) => {
	let message = '';
	message += (user) ? `${user} ` : '- ';
	message += (code) ? `${code} ` : '- ';
	logger.log('error', message + error);
};

/**
 * Logs a metrics level message to the logs.
 * @param {string} event the event to log
 * @param {string?} info optional info for event
 */
logger.metrics = (event = 'NOEVENTPASSED', info) => {
	try {
		logger.log('metrics', JSON.stringify({ event, info }));
	} catch (e) {
		logger.log('metrics', `metrics stringify err || ${event} :: ${info}`);
	}
};

logger.tracing = (function () {
	let components = {};
	let exact = false;
	const resp = (res, msg) => { res.status(200).send(`${msg}<br>Process ${process.env.pm_id || 0}<br>HOST_ID ${process.env.HOST_ID}<br>hostname ${os.hostname()}`); };

	return {
		add: (req, res) => {
			if (process.env.REACT_APP_NODE_ENV === undefined) {
				if (!isSuperAdmin(req)) return res.status(403).send({ message: 'Permisson denied' });
			}
			let component = req.query.component;
			let level = req.query.level;
			let exists = false;
			if (component === undefined || component === '') resp(res, 'Required query parameter "component" is missing');
			if (components[component] === undefined) components[component] = { levels: [] };
			if (level === undefined) return resp(res, `Added component "${component}"`);
			level = parseInt(level);
			components[component].levels.forEach(v => { if (level === v) exists = true; });
			if (exists) return resp(res, `Level ${level} already exists for component "${component}"`);
			components[component].levels.push(level);
			components[component].levels.sort((a, b) => { return a - b; });
			return resp(res, `Added level ${level} for component "${component}"`);
		},
		clear: (req, res) => {
			if (process.env.REACT_APP_NODE_ENV === undefined) {
				if (!isSuperAdmin(req)) return res.status(403).send({ message: 'Permisson denied' });
			}
			components = {};
			return resp(res, 'Cleared all components');
		},
		exact: (req, res) => {
			if (process.env.REACT_APP_NODE_ENV === undefined) {
				if (!isSuperAdmin(req)) return res.status(403).send({ message: 'Permisson denied' });
			}
			if (_.includes(['true', 'false'], req.query.value.toLowerCase())) {
				exact = (req.query.value.toLowerCase() === 'true');
				resp(res, `Value of exact set to ${req.query.value.toLowerCase()}`);
			}
		},
		list: (req, res) => {
			if (process.env.REACT_APP_NODE_ENV === undefined) {
				if (!isSuperAdmin(req)) return res.status(403).send({ message: 'Permisson denied' });
			}
			return resp(res, `Components: ${JSON.stringify(components)}`);
		},
		remove: (req, res) => {
			if (process.env.REACT_APP_NODE_ENV === undefined) {
				if (!isSuperAdmin(req)) return res.status(403).send({ message: 'Permisson denied' });
			}
			let component = req.query.component;
			let level = req.query.level;
			if (component === undefined) return resp(res, `Component must be provided`);
			if (components[component] === undefined) return resp(res, `Component "${component}" doesn't exist`);
			if (level === undefined) {
				delete components[component];
				return resp(res, `Deleted component "${component}"`);
			}
			level = parseInt(level);
			let len = components[component].levels.length;
			components[component].levels = components[component].levels.filter(v => { return v !== level; });
			if (components[component].levels.length === len) return resp(res, `Level ${level} for component "${component}" doesn't exist`);
			return resp(res, `Deleted level ${level} for component "${component}"`);
		},
		trace: (message, component, level) => {
			if (components[component] === undefined) return;
			if (level === undefined) {
				logger.info(message);
			} else if (exact) {
				components[component].levels.forEach(v => { if (v === level) logger.info(message); });
			} else {
				if (components[component].levels.length === 0 || level <= _.last(components[component].levels)) logger.info(message);
			}
		}
	};
})();

logger.trace = (message, component, level) => {
	logger.tracing.trace(message, component, level);
};

process.on('uncaughtException', function (error) {
	logger.error(`Uncaught exception has occurred ${error}`);
	logger.error(error.stack);
	console.log(`Uncaught exception has occurred ${error}`);
	console.log(error.stack);
});


module.exports = logger;