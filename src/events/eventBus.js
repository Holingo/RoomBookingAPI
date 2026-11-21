const { EventEmitter } = require("node:events");

function createEventBus() {
  const emitter = new EventEmitter();

  return {
    on(eventType, listener) {
      emitter.on(eventType, (payload, context, pending) => {
        const result = Promise.resolve()
          .then(() => listener(payload, context))
          .catch((error) => {
            console.error(`[event listener] ${eventType}`, error);
          });
        pending.push(result);
      });
    },

    async publish(eventType, payload, context) {
      const pending = [];
      emitter.emit(eventType, payload, context, pending);
      await Promise.all(pending);
    },
  };
}

module.exports = { createEventBus };
