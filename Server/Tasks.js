

const tasks = [];


export function addTask(task) {
    tasks.push(task);
}

export function getTasks() {
    return tasks;
}

export function removeTask(task) {
    const index = tasks.indexOf(task);
    if (index > -1) {
        tasks.splice(index, 1);
    }
}
