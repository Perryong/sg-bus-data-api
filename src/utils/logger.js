class Logger {
  constructor(context = 'App') {
    this.context = context;
  }

  _formatMessage(level, message, ...args) {
    const timestamp = new Date().toISOString();
    const prefix = `[${timestamp}] [${level}] [${this.context}]`;
    return args.length > 0 
      ? `${prefix} ${message} ${args.map(arg => typeof arg === 'object' ? JSON.stringify(arg) : arg).join(' ')}`
      : `${prefix} ${message}`;
  }

  info(message, ...args) {
    console.log(this._formatMessage('INFO', message, ...args));
  }

  success(message, ...args) {
    console.log(`✅ ${this._formatMessage('SUCCESS', message, ...args)}`);
  }

  warn(message, ...args) {
    console.warn(`⚠️ ${this._formatMessage('WARN', message, ...args)}`);
  }

  error(message, ...args) {
    console.error(`❌ ${this._formatMessage('ERROR', message, ...args)}`);
  }

  debug(message, ...args) {
    if (process.env.DEBUG) {
      console.log(`🐛 ${this._formatMessage('DEBUG', message, ...args)}`);
    }
  }
}

module.exports = Logger;
