import winston from 'winston';

import {LOG_LEVEL} from './config';

const loadLevel = (): winston.level => {
  let level: winston.level = 'info';

  if (LOG_LEVEL === 'debug') level = 'debug';
  if (LOG_LEVEL === 'warn') level = 'warn';
  if (LOG_LEVEL === 'error') level = 'error';

  return level;
};

export const logger = winston.createLogger({
  level: loadLevel(),
  transports: [new winston.transports.Console({})],
});
