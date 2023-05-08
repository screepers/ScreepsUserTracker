export const ActionType = Object.freeze({
    Divide100: 0,
    FirstTickOnly: 1,
    LastTickOnly: 2,
})

export function CreateAction(path, value, action) {
    return { path, value, action }
}

export function finalizeActions(actions) {
    const finalActions = []

    const actionsByPath = {}
    actions.forEach(action => {
        if (!actionsByPath[action.path]) actionsByPath[action.path] = []
        actionsByPath[action.path].push(action)
    })

    Object.entries(actionsByPath).forEach(([path, actions]) => {
        const divide100 = actions.filter(action => action.action === ActionType.Divide100)
        if (divide100.length > 0) finalActions.push(divide100.reduce((acc, action) => {
            acc.value += action.value
            return acc
        }, { path, value: 0, action: ActionType.LastTickOnly }))

        const firstTickOnly = actions.filter(action => action.action === ActionType.FirstTickOnly)[0]
        if (firstTickOnly) finalActions.push(firstTickOnly)

        const lastTickOnly = actions.find(action => action.action === ActionType.LastTickOnly)
        if (lastTickOnly) finalActions.push(lastTickOnly)
    })

    return finalActions
}

export function getStats(actions) {
    const finalActions = finalizeActions(actions)
    const stats = {}

    finalActions.forEach(action => {
        const path = action.path.split(".")
        const last = path.pop()
        let current = stats
        path.forEach(key => {
            if (!current[key]) current[key] = {}
            current = current[key]
        })
        current[last] = action.value
    })

    return stats
}