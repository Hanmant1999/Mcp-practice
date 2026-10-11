import { addTask, getTasks, removeTask } from './Tasks.js';
import { McpServer } from '@modelcontextprotocol/server';
import { StdioServerTransport } from '@modelcontextprotocol/server/stdio';
import * as z from 'zod/v4';


const mcpServer = new McpServer({
    name: 'MCP Demo Server',
    version: '1.0.0'
}, {
    capabilities: { tools: {} }
});

console.error("MCP Server is starting...");
mcpServer.registerTool('add_to_taskList', {
    title: 'Add to Task List',
    description: 'Use this tool ONLY when the user explicitly wants to ADD or CREATE a new task to the task list (e.g. "add a task to buy milk", "remind me to call John"). Also use this tool when the user phrases a request in an ordering/commanding style that implies adding a task, such as "order this", "get this", "buy this", "make this", "do this", or similar imperative phrasing that lists items to be done or purchased. Do NOT use this tool for removing tasks or listing existing tasks.',
    inputSchema: z.object({
        task: z.string().describe('The exact text/description of the new task to add to the task list')
    })
},
    async ({ task }) => {
        console.error(`Adding task: "${task}" to the task list...`);
        addTask(task);
        return { content: [{ type: 'text', text: `Added "${task}" to the task list` }] };
    });

mcpServer.registerTool('get_taskList', {
    title: 'Get Task List',
    description: 'Use this tool ONLY when the user wants to VIEW, LIST, or CHECK the current tasks (e.g. "what are my tasks", "show me my task list", "list my tasks"). Do NOT use this tool for adding or removing tasks. This tool takes no input.'
},
    async () => {
        console.error("Retrieving task list...");
        const tasks = getTasks();
        return { content: [{ type: 'text', text: JSON.stringify(tasks) }] };
    });
mcpServer.registerTool('remove_from_taskList', {
    title: 'Remove from Task List',
    description: 'Use this tool ONLY when the user explicitly wants to REMOVE, DELETE, or MARK AS DONE an existing task from the task list (e.g. "remove the task to buy milk", "delete the call John task", "mark buy milk as done"). Do NOT use this tool for adding new tasks or listing existing tasks.',
    inputSchema: z.object({
        task: z.string().describe('The exact text/description of the existing task to remove from the task list')
    })
},
    async ({ task }) => {
        console.error(`Removing task: "${task}" from the task list...`);
        removeTask(task);
        return { content: [{ type: 'text', text: `Removed "${task}" from the task list` }] };
    });


mcpServer.connect(new StdioServerTransport());
