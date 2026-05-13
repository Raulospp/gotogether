import { createWriteStream } from 'fs';

const LEVELS = { error: 0, warn: 1, info: 2, debug: 3 };
const LEVEL  = LEVELS[process.env.LOG_LEVEL] ?? (process.env.NODE_ENV === 'production' ? LEVELS.info : LEVELS.debug);
const IS_PROD = process.env.NODE_ENV === 'production';

function buildEntry(level, message, meta) {
  const entry = { timestamp: new Date().toISOString(), level, message };
  if (meta && Object.keys(meta).length) entry.meta = meta;
  return entry;
}

function write(level, message, meta = {}) {
  if (LEVELS[level] > LEVEL) return;

  const entry = buildEntry(level, message, meta);

  if (IS_PROD) {
    // Producción → JSON por línea a stdout/stderr
    const stream = level === 'error' ? process.stderr : process.stdout;
    stream.write(JSON.stringify(entry) + '\n');
  } else {
    // Desarrollo → legible en consola
    const colors = { error: '\x1b[31m', warn: '\x1b[33m', info: '\x1b[36m', debug: '\x1b[90m' };
    const reset  = '\x1b[0m';
    const metaStr = Object.keys(meta).length ? ' ' + JSON.stringify(meta) : '';
    const prefix = `${colors[level]}[${level.toUpperCase()}]${reset}`;
    const out = level === 'error' ? console.error : console.log;
    out(`${prefix} ${entry.timestamp} ${message}${metaStr}`);
  }
}

export const logger = {
  error: (message, meta)  => write('error', message, meta),
  warn:  (message, meta)  => write('warn',  message, meta),
  info:  (message, meta)  => write('info',  message, meta),
  debug: (message, meta)  => write('debug', message, meta),

  /** Middleware de request logging — no loguea rutas de health check */
  httpMiddleware: (req, _res, next) => {
    if (req.path !== '/health') {
      write('info', `${req.method} ${req.path}`, { ip: req.ip });
    }
    next();
  },
};
