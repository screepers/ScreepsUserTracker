import { createLogger, format, transports } from "winston";

const { simple, combine, timestamp, prettyPrint, colorize, errors } = format;

const baseFormat = () =>
  combine(
    errors({ stack: true }), // <-- use errors format
    colorize(),
    timestamp(),
    prettyPrint()
  );

const _mainLogger = createLogger({
  level: "info",
  format: baseFormat(),
  transports: [
    new transports.File({ filename: "logs/error.log", level: "error" }),
    new transports.File({ filename: "logs/combined.log" }),
  ],
});

if (process.env.NODE_ENV !== "production") {
  _mainLogger.add(
    new transports.Console({
      format: simple(),
    })
  );
}

const _apiLogger = createLogger({
  level: "info",
  format: baseFormat(),
  transports: [
    new transports.File({ filename: "logs/api/error.log", level: "error" }),
    new transports.File({ filename: "logs/api/combined.log" }),
  ],
});

if (process.env.NODE_ENV !== "production") {
  _apiLogger.add(
    new transports.Console({
      format: simple(),
    })
  );
}

const _graphiteLogger = createLogger({
  level: "info",
  format: baseFormat(),
  transports: [new transports.File({ filename: "logs/graphite.log" })],
});

if (process.env.NODE_ENV !== "production") {
  _graphiteLogger.add(
    new transports.Console({
      format: simple(),
    })
  );
}

export const mainLogger = {
  info(log) {
    _mainLogger.info(log);
  },
  error(log) {
    _mainLogger.error(log);
  },
};

export const apiLogger = {
  info(log) {
    _apiLogger.info(JSON.stringify(log));
  },
  error(log) {
    _apiLogger.error(JSON.stringify(log));
  },
  debug(log) {
    _apiLogger.debug(JSON.stringify(log));
  },
};

export const graphiteLogger = {
  info(log) {
    _graphiteLogger.info(log);
  },
  error(log) {
    _graphiteLogger.error(log);
  },
};
