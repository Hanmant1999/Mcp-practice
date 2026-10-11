import { Client } from '@modelcontextprotocol/client';
import { StdioClientTransport } from '@modelcontextprotocol/client/stdio';
import * as readline from 'readline';
import OpenAI from 'openai';
// const readline = require('readline');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

const name = await new Promise((resolve) => {
    rl.question('What is your name? ', (name) => {
        resolve(name);
        // rl.close();
    });
});
console.log(`Hello, ${name}!`);

const client = new Client({
    name: 'MCP Demo Client',
    version: '1.0.0'
});
await client.connect(new StdioClientTransport({ command: "node", args: ["../Server/Server.js"] }));
const openaiClient = new OpenAI({ baseURL: "http://localhost:11434/v1", apiKey: "ollama" });

// 2. Discover tools (this is what an LLM would be shown)
const { tools } = await client.listTools();
console.log("Tools:", tools.map((t) => t.name));

// OpenAI expects tools in the "function calling" format, not the raw MCP format.
// Each tool must be wrapped as { type: "function", function: { name, description, parameters } }
const openaiTools = tools.map((t) => ({
    type: "function",
    function: {
        name: t.name,
        description: t.description,
        parameters: t.inputSchema
    }
}));

// Runs the full tool-calling round trip: keeps sending messages back to the model
// until it stops requesting tools, executing each requested tool via MCP along the way.
async function runConversation(messages) {
    const executedTools = [];

    // Cap iterations so a misbehaving model can't loop forever.
    for (let round = 0; round < 5; round++) {
        const response = await openaiClient.chat.completions.create({
            model: 'llama3.2',
            messages,
            tools: openaiTools
        });

        const message = response.choices[0].message;
        messages.push(message);

        if (!message.tool_calls || message.tool_calls.length === 0) {
            return { finalMessage: message.content, executedTools };
        }

        for (const toolCall of message.tool_calls) {
            const args = JSON.parse(toolCall.function.arguments || '{}');
            console.log(`Calling ${toolCall.function.name} tool with args:`, args);

            const toolResponse = await client.callTool({ name: toolCall.function.name, arguments: args });
            const resultText = toolResponse.content[0].text;
            console.log(`Tool "${toolCall.function.name}" result:`, resultText);

            executedTools.push({ name: toolCall.function.name, args, result: resultText });

            messages.push({
                role: 'tool',
                tool_call_id: toolCall.id,
                content: resultText
            });
        }
    }

    return { finalMessage: '(stopped after too many tool-call rounds)', executedTools };
}

let isitEndCommand = '';
while (isitEndCommand !== 'end') {
    const task = await new Promise((resolve) => {
        rl.question('How can I help you with your task management \nI can add tasks, remove tasks, or list tasks? \nTo end the conversation, type "end".\nYour command: ', (task) => {
            resolve(task);
        });
    });
    isitEndCommand = task;

    if (task === 'end') {
        break;
    }

    const { finalMessage, executedTools } = await runConversation([
        { role: 'user', content: `${task}` }
    ]);

    console.log('\n--- Tools executed ---');
    if (executedTools.length === 0) {
        console.log('(none)');
    } else {
        executedTools.forEach((t, i) => console.log(`${i + 1}. ${t.name}(${JSON.stringify(t.args)}) -> ${t.result}`));
    }

    console.log('\n--- Final AI response ---');
    console.log(finalMessage);
    console.log('----------------------\n');
}

console.log("Calling get_taskList tool...");
const getResponse = await client.callTool({ name: 'get_taskList', arguments: {} });
console.log("Current task list:", getResponse.content[0].text);

rl.close();
process.exit(0);