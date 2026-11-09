export const LogLevel = Object.freeze({ DEBUG: 'DEBUG', INFO: 'INFO', WARNING: 'WARNING', ERROR: 'ERROR' });

const sink = { DEBUG: 'debug', INFO: 'info', WARNING: 'warn', ERROR: 'error' };

// Usage: LOG(LogLevel.INFO, 'Login successful', 'UserController')
export function LOG(level, message, tag = '') {
  const time = new Date().toISOString().replace('T', ' ').slice(0, 19);
  console[sink[level] || 'log'](`[${time}] [${level}]${tag ? ` [${tag}]` : ''} ${message}`);
}
