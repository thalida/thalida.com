// ── Data Types ──────────────────────────────────────────────────────

export interface ChatMessage {
  type: "message";
  id: string;
  username: string;
  text: string;
  timestamp: number;
}

export interface ConnectionInfo {
  ip: string;
  username: string;
  isOwner: boolean;
  warnings: number;
  isBlocked: boolean;
}

// ── Client → Server ─────────────────────────────────────────────────

export const CLIENT_MESSAGE_TYPE = {
  JOIN: "join",
  MESSAGE: "message",
} as const;

export type ClientMessageType = (typeof CLIENT_MESSAGE_TYPE)[keyof typeof CLIENT_MESSAGE_TYPE];

export interface ClientJoinData {
  username: string;
  token?: string;
}

export interface ClientChatData {
  text: string;
}

export type ClientMessage = { type: "join"; data: ClientJoinData } | { type: "message"; data: ClientChatData };

// ── Server → Client ─────────────────────────────────────────────────

export const SERVER_MESSAGE_TYPE = {
  ERROR: "error",
  WARNING: "warning",
  BLOCKED: "blocked",
  UNBLOCKED: "unblocked",
  JOINED: "joined",
  STATUS: "status",
  HISTORY: "history",
  REMOVE: "remove",
  MESSAGE: "message",
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
  MODERATION_WARNING: "moderation_warning",
  MODERATION_BLOCKED: "moderation_blocked",
  UNAUTHORIZED: "unauthorized",
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
}

export interface ServerBroadcastHistoryMessage {
  type: "history";
  messages: ChatMessage[];
}

export interface ServerBroadcastRemoveMessage {
  type: "remove";
  id: string;
}

export type ServerBroadcast =
  | ServerBroadcastStatusMessage
  | ServerBroadcastHistoryMessage
  | ServerBroadcastRemoveMessage;

// ── Server → Client: Join Acknowledgment ─────────────────────────────

export interface ServerJoinedMessage {
  type: "joined";
  isOwner: boolean;
  username: string;
}

// ── Server → Client: Admin Responses ─────────────────────────────────

export interface ServerUnblockedMessage {
  type: "unblocked";
  ip: string;
}

// ── Combined Server Message ─────────────────────────────────────────

export type ServerMessage =
  | ServerErrorResponse
  | ServerBroadcast
  | ServerJoinedMessage
  | ServerUnblockedMessage
  | ChatMessage;

// ── API Types ───────────────────────────────────────────────────────

export interface Env {
  CHAT_ROOM: DurableObjectNamespace;
  ADMIN_SECRET: string;
  ALLOWED_ORIGIN: string;
  OPENAI_API_KEY: string;
}

export interface AuthRequest {
  token?: string;
}

export interface ApiResponse {
  ok: boolean;
}

export interface ApiErrorResponse extends ApiResponse {
  ok: false;
  error: string;
}

export interface ApiConfigResponse extends ApiResponse {
  ok: true;
  reservedNames: string[];
}
