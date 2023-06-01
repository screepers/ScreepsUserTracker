import fs from "fs";
import { GetGclOfUser } from "../screepsApi.js";

let defaultActions;

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

export function getDefaultActions() {
  if (defaultActions) return defaultActions;
  if (fs.existsSync("./files/defaultActions.json")) {
    defaultActions = JSON.parse(fs.readFileSync("./files/defaultActions.json"));
    return defaultActions;
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
  getDefaultActions().forEach((defaultAction) => {
    const action = actions.find((a) => a.path === defaultAction.path);
    if (!action) {
      actions.push(defaultAction);
    }
  });

  actions.forEach((action) => {
    const defaultAction = getDefaultActions().find(
      (a) => a.path === action.path && a.action === action.action
    );
    if (!defaultAction) {
      addNewDefaultAction(action);
    }
  });

  return actions;
}

function groupBy(original, value) {
  if (!original && original !== 0) original = value
    const typeofValue = typeof value;

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
  return { original, value };
}

export function handleCombinedRoomStats(shards) {
  const defaultStats = getStats(getDefaultActions());
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

export async function GetGclObject(username) {
  const totalGCLPoints = await GetGclOfUser(username).gcl;
  if (totalGCLPoints === 0) return {};
  const level = Math.floor(((totalGCLPoints ?? 0) / 1000000) ** (1 / 2.4)) + 1;

  const previousTotal = Math.round(level > 1 ? (level - 1) ** 2.4 * 100000 : 0);
  const currentTotal = Math.round(level ** 2.4 * 100000);

  return {
    level,
    levelCap: currentTotal - previousTotal,
    progress: totalGCLPoints - previousTotal,
  };
}
