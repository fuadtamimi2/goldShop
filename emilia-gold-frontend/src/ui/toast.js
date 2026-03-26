let listeners = new Set();

export function emitToast(toast) {
  listeners.forEach((fn) => fn(toast));
}

export function subscribeToasts(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
