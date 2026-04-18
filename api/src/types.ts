// ── Data Types ──────────────────────────────────────────────────────

export interface MessageContext {
  path: string;
}

export interface ChatMessage {
  type: "message";
  id: string;
  clientId: string;
  username: string;
  text: string;
  timestamp: number;
  context?: MessageContext;
}

export interface ConnectionInfo {
  clientId: string;
  username: string;
  isOwner: boolean;
  warnings: number;
  isBlocked: boolean;
}

// ── Client → Server ─────────────────────────────────────────────────

export const CLIENT_MESSAGE_TYPE = {
  JOIN: "join",
  RENAME: "rename",
  MESSAGE: "message",
  DELETE: "delete",
  FLAG: "flag",
  DELETE_BY_USER: "delete_by_user",
  UNBLOCK: "unblock",
} as const;

export interface ClientJoinData {
  token?: string;
  clientId?: string;
  clientToken?: string;
}

export interface ClientChatData {
  text: string;
  context?: MessageContext;
}

export interface ClientDeleteData {
  id: string;
}

export interface ClientFlagData {
  id: string;
}

export interface ClientDeleteByUserData {
  clientId: string;
}

export interface ClientUnblockData {
  clientId: string;
}

export interface ClientRenameData {
  username: string;
}

// ── Server → Client ─────────────────────────────────────────────────

export const SERVER_MESSAGE_TYPE = {
  ERROR: "error",
  WARNING: "warning",
  BLOCKED: "blocked",
  UNBLOCKED: "unblocked",
  HELP: "help",
  FLAGGED: "flagged",
  BLOCKED_LIST: "blocked_list",
  ONLINE_LIST: "online_list",
  JOINED: "joined",
  STATUS: "status",
  HISTORY: "history",
  REMOVE: "remove",
  CLEAR: "clear",
  MESSAGE: "message",
  RENAME: "rename",
} as const;

export type ServerMessageType = (typeof SERVER_MESSAGE_TYPE)[keyof typeof SERVER_MESSAGE_TYPE];

// Error Responses — sent to a specific client in response to invalid input or violations.

export type ServerErrorResponseType =
  | typeof SERVER_MESSAGE_TYPE.ERROR
  | typeof SERVER_MESSAGE_TYPE.WARNING
  | typeof SERVER_MESSAGE_TYPE.BLOCKED;

export const SERVER_ERROR_CODE = {
  INVALID_MESSAGE: "invalid_message",
  INVALID_USERNAME: "invalid_username",
  RESERVED_USERNAME: "reserved_username",
  TAKEN_USERNAME: "taken_username",
  EXPIRED_USERNAME: "expired_username",
  MODERATION_WARNING: "moderation_warning",
  MODERATION_BLOCKED: "moderation_blocked",
  UNAUTHORIZED: "unauthorized",
  UNBLOCKED: "unblocked",
} as const;

export type ServerErrorCode = (typeof SERVER_ERROR_CODE)[keyof typeof SERVER_ERROR_CODE];

export interface ServerErrorResponse {
  type: ServerErrorResponseType;
  code: ServerErrorCode;
  message: string;
}

// ── Server → Client: State Broadcasts ───────────────────────────────
// Server-initiated state updates pushed to clients.

export interface ServerBroadcastStatusMessage {
  type: "status";
  isOwnerOnline: boolean;
  userCount: number;
  onlineUsernames: string[];
}

export interface ServerBroadcastHistoryMessage {
  type: "history";
  messages: ChatMessage[];
}

export interface ServerBroadcastRemoveMessage {
  type: "remove";
  id: string;
}

export interface ServerBroadcastClearMessage {
  type: "clear";
}

export type ServerBroadcast =
  | ServerBroadcastStatusMessage
  | ServerBroadcastHistoryMessage
  | ServerBroadcastRemoveMessage
  | ServerBroadcastClearMessage;

// ── Server → Client: Join Acknowledgment ─────────────────────────────

export interface ServerJoinedMessage {
  type: "joined";
  isOwner: boolean;
  username: string;
  isBlocked: boolean;
  clientId?: string;
  clientToken?: string;
}

// ── Server → Client: Admin Responses ─────────────────────────────────

export interface ServerUnblockedMessage {
  type: "unblocked";
  clientId: string;
}

export interface ServerHelpMessage {
  type: "help";
  commands: Array<{ name: string; description: string }>;
}

export interface ServerFlaggedMessage {
  type: "flagged";
  username: string;
  clientId: string;
  messageId: string;
}

export interface ServerRenameMessage {
  type: "rename";
  oldUsername: string;
  newUsername: string;
}

export interface BlockedEntry {
  clientId: string;
  username: string;
  blockedAt: number;
}

export interface ServerBlockedListMessage {
  type: "blocked_list";
  entries: BlockedEntry[];
}

export interface ServerOnlineListMessage {
  type: "online_list";
  users: Array<{ clientId: string; username: string }>;
}

// ── Combined Server Message ─────────────────────────────────────────

export type ServerMessage =
  | ServerErrorResponse
  | ServerBroadcast
  | ServerJoinedMessage
  | ServerUnblockedMessage
  | ServerHelpMessage
  | ServerFlaggedMessage
  | ServerRenameMessage
  | ServerBlockedListMessage
  | ServerOnlineListMessage
  | ChatMessage;

// ── API Types ───────────────────────────────────────────────────────

export interface Env {
  CHAT_ROOM: DurableObjectNamespace;
  ADMIN_PASSWORD: string;
  SIGNING_SECRET: string;
  ALLOWED_ORIGIN: string;
  ADMIN_USERNAME?: string;
  OPENAI_API_KEY?: string;
  IPREGISTRY_KEY?: string;
  OPENWEATHER_KEY?: string;
}

export interface AuthRequest {
  token?: string;
}

export interface ApiConfigResponse {
  adminUsername: string;
}
