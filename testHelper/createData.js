class ObjectHelper {
  static Creep(id, opts) {
    return {id, ...opts}
  }
}
class TicksCycle {
  static FirstTicks() {
    return {"0": {
      "a": ObjectHelper.Creep("a")
    }}
  }
}

export default function GetRoomHistory(roomName, setupType) {
  let ticks;
  switch (setupType) {
    case "firstTicks":
      ticks = TicksCycle.FirstTicks();
      break;
    default:
      break;
  }
  for (let i = 0; i < 100; i++) {
    ticks[i] = ticks[i] || {}
  }

  return {
    timestamp: Date.now(),
    room: roomName,
    base: 0,
    ticks
  }
}