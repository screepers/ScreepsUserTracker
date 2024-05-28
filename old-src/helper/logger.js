import { createLogger, format, transports } from "winston";
import "winston-daily-rotate-file";

function createCustomLogger(type) {
  return createLogger({
    level: "info",
    format: format.combine(
      format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
      format.printf(
        (info) =>
          `${info.timestamp} ${info.level}: ${info.message} ${info.stack || ""}`
      ),
      format.errors({ stack: true })
    ),
    transports: [
      new transports.DailyRotateFile({
        filename: `logs/${type}/application-%DATE%.log`,
        auditFile: `logs/${type}/audit.json`,
        datePattern: "YYYY-MM-DD",
        zippedArchive: true,
        maxSize: "20m",
        maxFiles: "14d",
      }),
    ],
  });
}

const requestLogger = createCustomLogger("request");
const socketLogger = createCustomLogger("socket");

const graphiteLogger = createCustomLogger("graphite");
const postgresLogger = createCustomLogger("postgres");

const apiLogger = createCustomLogger("api");
const cacheLogger = createCustomLogger("cache");

if (process.env.NODE_ENV !== "production") {
  cacheLogger.add(
    new transports.Console({
      format: format.combine(),
    })
  );
  requestLogger.add(
    new transports.Console({
      format: format.combine(),
    })
  );
  socketLogger.add(
    new transports.Console({
      format: format.combine(),
    })
  );
  apiLogger.add(
    new transports.Console({
      format: format.combine(),
    })
  );
  graphiteLogger.add(
    new transports.Console({
      format: format.combine(),
    })
  );
  postgresLogger.add(
    new transports.Console({
      format: format.combine(),
    })
  );
}

export { requestLogger, apiLogger, graphiteLogger, cacheLogger, socketLogger, postgresLogger };
