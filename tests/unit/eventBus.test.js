const { createEventBus } = require("../../src/events/eventBus");

test("still calls other listeners when a listener throws or rejects", async () => {
  const eventBus = createEventBus();
  const syncError = new Error("Synchronous listener failed");
  const asyncError = new Error("Asynchronous listener failed");
  const success = jest.fn();
  const log = jest.spyOn(console, "error").mockImplementation(() => {});

  try {
    eventBus.on("reservation.created", () => { throw syncError; });
    eventBus.on("reservation.created", async () => { throw asyncError; });
    eventBus.on("reservation.created", success);

    const payload = { reservationId: 1 };
    await expect(eventBus.publish("reservation.created", payload)).resolves.toBeUndefined();

    expect(success).toHaveBeenCalledWith(payload, undefined);
    expect(log).toHaveBeenCalledTimes(2);
    expect(log).toHaveBeenCalledWith("[event listener] reservation.created", syncError);
    expect(log).toHaveBeenCalledWith("[event listener] reservation.created", asyncError);
  } finally {
    log.mockRestore();
  }
});
