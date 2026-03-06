import { queryChatElements } from "./chat-dom";
import { createChatClient } from "./chat-connection";

const els = queryChatElements();
if (els) {
  const wsUrl =
    document.querySelector<HTMLMetaElement>('meta[name="chat-ws-url"]')?.content?.trim() || "ws://localhost:8787/ws";
  createChatClient(els, wsUrl);
}
