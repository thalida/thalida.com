export interface ChatElements {
  usernameInput: HTMLInputElement;
  usernameRow: HTMLLabelElement;
  messages: HTMLDivElement;
  input: HTMLInputElement;
  sendBtn: HTMLButtonElement;
  statusDot: HTMLSpanElement;
  ownerStatus: HTMLSpanElement;
  ownerWrap: HTMLSpanElement;
  userCount: HTMLSpanElement;
  msgTpl: HTMLTemplateElement;
  noticeTpl: HTMLTemplateElement;
}

export function queryChatElements(): ChatElements | null {
  const el = (selector: string) => document.querySelector(selector);
  const messages = el('[data-chat="messages"]');
  if (!messages) return null;

  return {
    usernameInput: el('[data-chat="username-input"]') as HTMLInputElement,
    usernameRow: el('[data-chat="username-row"]') as HTMLLabelElement,
    messages: messages as HTMLDivElement,
    input: el('[data-chat="input"]') as HTMLInputElement,
    sendBtn: el('[data-chat="send"]') as HTMLButtonElement,
    statusDot: el('[data-chat="owner-status-dot"]') as HTMLSpanElement,
    ownerStatus: el('[data-chat="owner-status"]') as HTMLSpanElement,
    ownerWrap: el('[data-chat="owner-wrap"]') as HTMLSpanElement,
    userCount: el('[data-chat="user-count"]') as HTMLSpanElement,
    msgTpl: el('[data-chat="msg-tpl"]') as HTMLTemplateElement,
    noticeTpl: el('[data-chat="notice-tpl"]') as HTMLTemplateElement,
  };
}
