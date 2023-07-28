import { createLogger, format, transports } from "winston";
import 'winston-daily-rotate-file';


function createCustomLogger(type) {
  return createLogger({
    level: 'info',
    format: format.combine(
      format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
      format.printf(info => `${info.timestamp} ${info.level}: ${info.message} ${info.stack || ''}`),
      format.errors({ stack: true })
    ),
    transports: [
      new transports.DailyRotateFile({
        filename: `logs/${type}/application-%DATE%.log`,
        auditFile: `logs/${type}/audit.json`,
        datePattern: 'YYYY-MM-DD',
        zippedArchive: true,
        maxSize: '20m',
        maxFiles: '14d'
      })
    ],
  });
}

const mainLogger = createCustomLogger('main');
const apiLogger = createCustomLogger('api');
const dataRequestBroker = createCustomLogger('dataRequestBroker');
const backlogLogger = createCustomLogger('backlog');

if (process.env.NODE_ENV !== 'production') {
  mainLogger.add(new transports.Console({
    format: format.combine(
    )
  }));
  apiLogger.add(new transports.Console({
    format: format.combine(
    )
  }));
  dataRequestBroker.add(new transports.Console({
    format: format.combine(
    )
  }));
  backlogLogger.add(new transports.Console({
    format: format.combine(
    )
  }));
}

export { mainLogger, apiLogger, dataRequestBroker, backlogLogger };