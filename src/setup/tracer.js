import dd from 'dd-trace';

let tracer = null;
if (!tracer && process.env.NODE_ENV !== 'production') {
  tracer = dd.init({
    profiling: true,
    analytics: true,
  });
}

export function startSpan(name,) {
  if (tracer) {
    return tracer.startSpan(name);
  }

  return null;
}

export function finish(span) {
  if (!span) return;
  span.finish();
}