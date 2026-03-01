import { describe, it, expect, vi, beforeEach } from "vitest";
import { truncateMiddle, formatMessageTime, renderNotice } from "@components/Chat/chat-render";

// -- truncateMiddle ----------------------------------------------------------

describe("truncateMiddle", () => {
  it("returns short paths unchanged", () => {
    expect(truncateMiddle("/about", 25)).toBe("/about");
  });

  it("returns paths at exactly maxLen unchanged", () => {
    const path = "/a".repeat(12) + "/b";
    expect(truncateMiddle(path, path.length)).toBe(path);
  });

  it("truncates long paths with ellipsis in the middle", () => {
    const result = truncateMiddle("/projects/some-really-long-project/deeply/nested/page", 25);
    expect(result).toContain("/\u2026/");
    expect(result.length).toBeLessThanOrEqual(25);
  });

  it("preserves leading slash", () => {
    const result = truncateMiddle("/very/long/deeply/nested/path/to/page", 20);
    expect(result.startsWith("/")).toBe(true);
  });

  it("preserves trailing segment when possible", () => {
    const result = truncateMiddle("/a/b/c/d/e/page", 20);
    expect(result).toContain("page");
  });

  it("handles root path", () => {
    expect(truncateMiddle("/", 25)).toBe("/");
  });

  it("handles single-segment paths", () => {
    expect(truncateMiddle("/about", 3)).toContain("/\u2026/");
  });
});

// -- formatMessageTime -------------------------------------------------------

describe("formatMessageTime", () => {
  it("returns time only for messages within 24 hours", () => {
    const now = Date.now();
    const result = formatMessageTime(now);
    // Should NOT contain a month abbreviation
    expect(result).not.toMatch(/Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec/);
  });

  it("includes date for messages older than 24 hours", () => {
    const overADay = Date.now() - 25 * 60 * 60 * 1000;
    const result = formatMessageTime(overADay);
    // Should contain a month abbreviation
    expect(result).toMatch(/Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec/);
  });
});

// -- renderNotice ------------------------------------------------------------

function createNoticeTemplate(): HTMLTemplateElement {
  const tpl = document.createElement("template");
  tpl.innerHTML = `
    <div class="mb-2">
      <div class="flex items-baseline gap-1.5 text-xs leading-tight">
        <span class="font-semibold text-muted">system</span>
        <span class="ml-auto opacity-40" data-chat="notice-time"></span>
      </div>
      <div data-chat="notice-text" class="mt-0.5 text-muted whitespace-pre-line"></div>
      <div data-chat="notice-actions" hidden class="mt-0.5 flex items-baseline gap-1.5 text-muted"></div>
    </div>
  `;
  return tpl;
}

describe("renderNotice", () => {
  let tpl: HTMLTemplateElement;

  beforeEach(() => {
    tpl = createNoticeTemplate();
  });

  it("sets the notice text", () => {
    const el = renderNotice(tpl, "Hello world");
    const textEl = el.querySelector('[data-chat="notice-text"]') as HTMLElement;
    expect(textEl.textContent).toBe("Hello world");
  });

  it("sets the time", () => {
    const el = renderNotice(tpl, "test");
    const timeEl = el.querySelector('[data-chat="notice-time"]') as HTMLElement;
    expect(timeEl.textContent).not.toBe("");
  });

  it("hides actions container when no actions provided", () => {
    const el = renderNotice(tpl, "test");
    const actionsEl = el.querySelector('[data-chat="notice-actions"]') as HTMLElement;
    expect(actionsEl.hidden).toBe(true);
  });

  it("shows actions container when actions are provided", () => {
    const el = renderNotice(tpl, "test", [{ label: "ok", action: () => {} }]);
    const actionsEl = el.querySelector('[data-chat="notice-actions"]') as HTMLElement;
    expect(actionsEl.hidden).toBe(false);
  });

  it("renders action labels in brackets", () => {
    const el = renderNotice(tpl, "test", [
      { label: "unblock", action: () => {} },
      { label: "ignore", action: () => {} },
    ]);
    const actionsEl = el.querySelector('[data-chat="notice-actions"]') as HTMLElement;
    const spans = actionsEl.querySelectorAll("span");
    expect(spans[0].textContent).toBe("[unblock]");
    expect(spans[1].textContent).toBe("[ignore]");
  });

  it("calls the action callback when an action button is clicked", () => {
    const callback = vi.fn();
    const el = renderNotice(tpl, "Blocked user", [{ label: "unblock", action: callback }]);

    const actionSpan = el.querySelector('[data-chat="notice-actions"] span') as HTMLSpanElement;
    actionSpan.click();

    expect(callback).toHaveBeenCalledOnce();
  });

  it("calls the correct callback when multiple actions exist", () => {
    const first = vi.fn();
    const second = vi.fn();
    const third = vi.fn();
    const el = renderNotice(tpl, "Delete messages?", [
      { label: "all", action: first },
      { label: "this one", action: second },
      { label: "none", action: third },
    ]);

    const spans = el.querySelectorAll('[data-chat="notice-actions"] span');
    (spans[1] as HTMLSpanElement).click();

    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledOnce();
    expect(third).not.toHaveBeenCalled();
  });

  it("hides actions and updates text after clicking an action", () => {
    const el = renderNotice(tpl, "Blocked user", [{ label: "unblock", action: () => {} }]);

    const actionsEl = el.querySelector('[data-chat="notice-actions"]') as HTMLElement;
    const textEl = el.querySelector('[data-chat="notice-text"]') as HTMLElement;
    const actionSpan = actionsEl.querySelector("span") as HTMLSpanElement;

    actionSpan.click();

    expect(actionsEl.hidden).toBe(true);
    expect(textEl.textContent).toBe("Blocked user — unblock");
  });

  it("adds separators between multiple actions", () => {
    const el = renderNotice(tpl, "test", [
      { label: "a", action: () => {} },
      { label: "b", action: () => {} },
    ]);
    const actionsEl = el.querySelector('[data-chat="notice-actions"]') as HTMLElement;
    expect(actionsEl.textContent).toContain(" · ");
  });
});
