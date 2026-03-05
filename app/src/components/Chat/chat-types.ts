export const CLIENT_MESSAGE_TYPE = {
  JOIN: "join",
  RENAME: "rename",
  MESSAGE: "message",
  DELETE: "delete",
  FLAG: "flag",
  DELETE_BY_USER: "delete_by_user",
  UNBLOCK: "unblock",
} as const;

export const SERVER_MESSAGE_TYPE = {
  ERROR: "error",
  WARNING: "warning",
  BLOCKED: "blocked",
  UNBLOCKED: "unblocked",
  HELP: "help",
  FLAGGED: "flagged",
  BLOCKED_LIST: "blocked_list",
  JOINED: "joined",
  STATUS: "status",
  HISTORY: "history",
  REMOVE: "remove",
  MESSAGE: "message",
  RENAME: "rename",
} as const;

export interface MessageContext {
  path: string;
}

export type ServerMessage =
  | { type: "history"; messages: ChatMessage[] }
  | {
      type: "message";
      id: string;
      clientId?: string;
      isOwn?: boolean;
      username: string;
      text: string;
      timestamp: number;
      context?: MessageContext;
    }
  | { type: "joined"; isOwner: boolean; username: string; isBlocked: boolean }
  | { type: "status"; isOwnerOnline: boolean; userCount: number; onlineUsernames: string[] }
  | { type: "error"; code: string; message: string }
  | { type: "remove"; id: string }
  | { type: "warning"; code: string; message: string }
  | { type: "blocked"; code: string; message: string }
  | { type: "unblocked"; clientId: string }
  | { type: "help"; commands: Array<{ name: string; description: string }> }
  | { type: "flagged"; username: string; clientId: string; messageId: string }
  | { type: "blocked_list"; entries: Array<{ clientId: string; username: string; blockedAt: number }> }
  | { type: "rename"; oldUsername: string; newUsername: string };

export interface ChatMessage {
  id: string;
  clientId?: string;
  isOwn?: boolean;
  username: string;
  text: string;
  timestamp: number;
  context?: MessageContext;
}

export type ClientModAction =
  | { type: typeof CLIENT_MESSAGE_TYPE.DELETE; data: { id: string } }
  | { type: typeof CLIENT_MESSAGE_TYPE.FLAG; data: { id: string } }
  | { type: typeof CLIENT_MESSAGE_TYPE.DELETE_BY_USER; data: { clientId: string } }
  | { type: typeof CLIENT_MESSAGE_TYPE.UNBLOCK; data: { clientId: string } };
