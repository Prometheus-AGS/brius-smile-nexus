import pino from '../../$node_modules/pino/pino.js';

const isProduction = process.env['NODE_ENV'] === 'production';

export const logger = pino({
  level: isProduction ? 'info' : 'debug',
  transport: {
    target: 'pino-pretty',
    options: {
      colorize: true,
    },
  },
});
