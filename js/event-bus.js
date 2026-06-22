/**
 * Simple pub/sub event bus for cross-component communication.
 * All events are namespaced to avoid collisions.
 */

const EventBus = {
  _listeners: {},

  on(event, fn) {
    (this._listeners[event] || (this._listeners[event] = [])).push(fn);
    return () => this.off(event, fn);
  },

  off(event, fn) {
    const arr = this._listeners[event];
    if (arr) {
      const i = arr.indexOf(fn);
      if (i > -1) arr.splice(i, 1);
    }
  },

  emit(event, data) {
    const arr = this._listeners[event];
    if (arr) arr.forEach(fn => { try { fn(data); } catch (e) { console.error(`[EventBus] ${event} handler error:`, e); } });
  },

  once(event, fn) {
    const wrapper = (data) => { fn(data); this.off(event, wrapper); };
    this.on(event, wrapper);
  }
};

export default EventBus;
