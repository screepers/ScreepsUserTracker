import fs from "fs";

const defaultActionsPerType = {};

export const ActionType = Object.freeze({
  Divide100: 0,
  FirstTickOnly: 1,
});

export function CreateAction(path, value, type) {
  return { path, value, type };
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

export function getDefaultActions(type) {
  const time = Date.now();
  if (defaultActionsPerType[type]) {
    const cached = defaultActionsPerType[type];
    if (time - cached.time < 60 * 1000) return cached.data;
  }

  const fileName = `./files/defaultActions.${type}.json`;
  let data = [];
  if (fs.existsSync(fileName)) data = JSON.parse(fs.readFileSync(fileName));
  else fs.writeFileSync(fileName, JSON.stringify([]));

  defaultActionsPerType[type] = { data, time };
  return data;
}

function addNewDefaultAction(action, type) {
  const fileName = `./files/defaultActions.${type}.json`;
  let file = JSON.parse(fs.readFileSync(fileName));
  file = file.filter((a) => a.path !== action.path);

  action.value = 0;
  file.push(action);
  fs.writeFileSync(fileName, JSON.stringify(file));
  defaultActionsPerType[type].data = file;
}

export function FindNewDefaultActions(actions, type) {
  const defaultActions = getDefaultActions(type);

  actions
    .filter((v, i, a) => a.findIndex((v2) => v2.path === v.path) === i)
    .forEach((action) => {
      const defaultAction = defaultActions.find(
        (a) => a.path === action.path && a.action === action.action
      );
      if (!defaultAction) {
        addNewDefaultAction(action, type);
      }
    });
}

export function ActionListDefaultValuesFiller(actions, type) {
  getDefaultActions(type).forEach((defaultAction) => {
    const action = actions.find((a) => a.path === defaultAction.path);
    if (!action) {
      actions.push(defaultAction);
    }
  });

  return actions;
}

function groupBy(original, value) {
  // eslint-disable-next-line no-param-reassign
  if (original === null) original = value;
  const typeofValue = typeof value;

  if (original !== null && value !== null) {
    if (Array.isArray(value)) {
      value.forEach((index) => {
        original[index] = groupBy(original[index], value[index]).original;
      });
    } else if (typeofValue === "object") {
      Object.keys(value).forEach((key) => {
        original[key] = groupBy(original[key], value[key]).original;
      });
    } else if (typeofValue === "number") {
      // eslint-disable-next-line no-param-reassign
      original += value;
    }
  }
  return { original, value };
}

export function handleCombinedRoomStats(shards, type) {
  const defaultStats = getStats(getDefaultActions(type));
  const stats = {};

  Object.entries(shards).forEach(([shard, rooms]) => {
    if (!stats[shard]) stats[shard] = JSON.parse(JSON.stringify(defaultStats));

    // eslint-disable-next-line no-unused-vars
    Object.entries(rooms).forEach(([_, roomStats]) => {
      stats[shard] = groupBy(stats[shard], roomStats).original;
    });
  });

  return stats;
}
