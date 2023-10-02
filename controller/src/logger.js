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

const ownedLogger = createCustomLogger("owned");
const apiLogger = createCustomLogger("api");
const graphiteLogger = createCustomLogger("graphite");

if (process.env.NODE_ENV !== "production") {
  ownedLogger.add(
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
}

export { ownedLogger, apiLogger, graphiteLogger };
