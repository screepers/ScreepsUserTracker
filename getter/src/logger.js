import { createLogger, format, transports } from "winston";

const { simple, combine, timestamp, prettyPrint, colorize, errors } = format;

const baseFormat = () =>
  combine(
    errors({ stack: true }), // <-- use errors format
    colorize(),
    timestamp(),
    prettyPrint()
  );

const _apiLogger = createLogger({
  level: "info",
  format: baseFormat(),
  transports: [
    new transports.File({
      filename: "logs/api/error.log",
      level: "error",
    }),
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

const _dataRequestBroker = createLogger({
  level: "info",
  format: baseFormat(),
  transports: [
    new transports.File({ filename: "logs/error.log", level: "error" }),
    new transports.File({ filename: "logs/combined.log" }),
  ],
});
if (process.env.NODE_ENV !== "production") {
  _dataRequestBroker.add(
    new transports.Console({
      format: simple(),
    })
  );
}

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

const _backlogLogger = createLogger({
  level: "info",
  format: baseFormat(),
  transports: [new transports.File({ filename: "logs/backlog.log" })],
});
if (process.env.NODE_ENV !== "production") {
  _backlogLogger.add(
    new transports.Console({
      format: simple(),
    })
  );
}

export const apiLogger = {
  info(log) {
    _apiLogger.info(log);
  },
  error(log) {
    _apiLogger.error(log);
  },
  debug(log) {
    _apiLogger.debug(log);
  },
};
export const dataRequestBroker = {
  info(log) {
    _dataRequestBroker.info(log);
  },
  error(log) {
    _dataRequestBroker.error(log);
  },
  debug(log) {
    _dataRequestBroker.debug(log);
  },
};

export const mainLogger = {
  info(log) {
    _mainLogger.info(log);
  },
  error(log) {
    _mainLogger.error(log);
  },
};
export const backlogLogger = {
  info(log) {
    _backlogLogger.info(log);
  },
  error(log) {
    _backlogLogger.error(log);
  },
};
