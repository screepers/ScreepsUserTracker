import fs from "fs";

export const BaseShards = ["shard0", "shard1", "shard2", "shard3"];

export const ActionType = Object.freeze({
  Divide100: 0,
  FirstTickOnly: 1,
});

export function CreateAction(path, value, action) {
  return { path, value, action };
}

export function finalizeActions(actions) {
  const finalActions = [];

  const actionsByPath = {};
  actions.forEach((action) => {
    if (!actionsByPath[action.path]) actionsByPath[action.path] = [];
    actionsByPath[action.path].push(action);
  });

  Object.entries(actionsByPath).forEach(([path, _actions]) => {
    const divide100 = _actions.filter(
      (action) => action.action === ActionType.Divide100
    );
    if (divide100.length > 0) {
      const action = divide100.reduce(
        (acc, a) => {
          acc.value += a.value;
          return acc;
        },
        { path, value: 0 }
      );
      if (action.value > 0) action.value /= 100;
      finalActions.push(action);
    }

    const firstTickOnly = _actions.filter(
      (action) => action.action === ActionType.FirstTickOnly
    )[0];
    if (firstTickOnly) finalActions.push(firstTickOnly);
  });

  return finalActions;
}

export function getStats(actions) {
  const finalActions = finalizeActions(actions);
  const stats = {};

  finalActions.forEach((action) => {
    const path = action.path.split(".");
    const last = path.pop();
    let current = stats;
    path.forEach((key) => {
      if (!current[key]) current[key] = {};
      current = current[key];
    });
    current[last] = action.value;
  });

  return stats;
}

function getDefaultActions() {
  if (fs.existsSync("./files/defaultActions.json")) {
    return JSON.parse(fs.readFileSync("./files/defaultActions.json"));
  }
  fs.writeFileSync("./files/defaultActions.json", JSON.stringify([]));
  return [];
}

function addNewDefaultAction(action) {
  let file = JSON.parse(fs.readFileSync("./files/defaultActions.json"));
  file = file.filter((a) => a.path !== action.path);

  action.value = 0;
  file.push(action);
  fs.writeFileSync("./files/defaultActions.json", JSON.stringify(file));
}

export function ActionListDefaultValuesFiller(actions) {
  const defaultActions = getDefaultActions();

  defaultActions.forEach((defaultAction) => {
    const action = actions.find((a) => a.path === defaultAction.path);
    if (!action) {
      actions.push(defaultAction);
    }
  });

  actions.forEach((action) => {
    const defaultAction = defaultActions.find(
      (a) => a.path === action.path && a.action === action.action
    );
    if (!defaultAction) {
      addNewDefaultAction(action);
    }
  });

  return actions;
}

function groupBy(original, value) {
    const typeofValue = typeof value
    if (Array.isArray(value)) {
        for (const element of value) {
          original[element] = groupBy(original[element], value[element]).original;
        }
    } else if (typeofValue === 'object') {
        for (const key of Object.keys(value)) {
          original[key] = groupBy(original[key], value[key]).original;
        }
    }
    else if (typeofValue === 'number') {
        original += value;
    }
    return { original, value }
}

export function handleCombinedRoomStats(shards) {
  const stats = {};
  BaseShards.forEach((shard) => {
    stats[shard] = getStats(getDefaultActions());
  })

  Object.entries(shards).forEach(([shard, rooms]) => {
    Object.entries(rooms).forEach(([room, roomStats]) => {
      stats[shard] = groupBy(stats[shard], roomStats).original;
    })
  })

  return stats
}