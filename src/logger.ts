type Level = "DEBUG" | "INFO" | "WARN" | "ERROR";

const LEVELS: Record<Level, number> = { DEBUG: 0, INFO: 1, WARN: 2, ERROR: 3 };

const configured = (process.env.LOG_LEVEL ?? "INFO").toUpperCase() as Level;
const minLevel = LEVELS[configured] ?? LEVELS.INFO;

function write(level: Level, msg: string, meta?: Record<string, unknown>) {
  if (LEVELS[level] < minLevel) return;
  const entry: Record<string, unknown> = {
    ts: new Date().toISOString(),
    level,
    msg,
    ...meta,
  };
  process.stderr.write(JSON.stringify(entry) + "\n");
}

export const log = {
  debug: (msg: string, meta?: Record<string, unknown>) => write("DEBUG", msg, meta),
  info:  (msg: string, meta?: Record<string, unknown>) => write("INFO",  msg, meta),
  warn:  (msg: string, meta?: Record<string, unknown>) => write("WARN",  msg, meta),
  error: (msg: string, meta?: Record<string, unknown>) => write("ERROR", msg, meta),
};
