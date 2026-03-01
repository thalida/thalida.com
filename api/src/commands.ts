import type { ChatRoom } from "./chat-room";
import { SERVER_MESSAGE_TYPE, SERVER_ERROR_CODE } from "./types";

interface Command {
  name: string;
  description: string;
  handler: (ws: WebSocket, args: string, chatRoom: ChatRoom) => void;
}

const commands: Command[] = [];

function register(command: Command): void {
  commands.push(command);
}

register({
  name: "help",
  description: "Show this help message",
  handler: (ws, _args, chatRoom) => {
    chatRoom.sendToSocket(ws, {
      type: SERVER_MESSAGE_TYPE.HELP,
      commands: commands.map(({ name, description }) => ({ name, description })),
    });
  },
});

register({
  name: "unblock",
  description: "Unblock a user by IP address — /unblock <ip>",
  handler: (ws, args, chatRoom) => {
    if (!args) {
      chatRoom.sendToSocket(ws, {
        type: SERVER_MESSAGE_TYPE.ERROR,
        code: SERVER_ERROR_CODE.INVALID_MESSAGE,
        message: "Usage: /unblock <ip>",
      });
      return;
    }
    chatRoom.handleUnblockCommand(ws, args);
  },
});

export function dispatch(text: string, ws: WebSocket, chatRoom: ChatRoom): boolean {
  const match = text.match(/^\/(\S+)\s*(.*)$/);
  if (!match) return false;

  const [, name, args] = match;
  const command = commands.find((c) => c.name === name);
  if (!command) return false;

  command.handler(ws, args.trim(), chatRoom);
  return true;
}
