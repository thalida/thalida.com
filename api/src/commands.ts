import type { ChatRoom } from "./chat-room";
import { SERVER_MESSAGE_TYPE } from "./types";

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
  name: "blocked",
  description: "List all blocked users",
  handler: (ws, _args, chatRoom) => {
    chatRoom.sendToSocket(ws, {
      type: SERVER_MESSAGE_TYPE.BLOCKED_LIST,
      entries: chatRoom.getBlockedEntries(),
    });
  },
});

register({
  name: "online",
  description: "List all online users",
  handler: (ws, _args, chatRoom) => {
    chatRoom.sendToSocket(ws, {
      type: SERVER_MESSAGE_TYPE.ONLINE_LIST,
      users: chatRoom.getOnlineUsers(),
    });
  },
});

register({
  name: "clear",
  description: "Clear all chat messages (keeps users & blocked list)",
  handler: (_ws, _args, chatRoom) => {
    chatRoom.clearMessages();
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
