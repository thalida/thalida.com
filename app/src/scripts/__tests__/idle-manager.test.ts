import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createIdleManager } from "@scripts/idle-manager";

describe("createIdleManager", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("calls onIdle after timeout when tab is hidden", () => {
    const onIdle = vi.fn();
    const onActive = vi.fn();
    const manager = createIdleManager({ onIdle, onActive, timeoutMs: 5000 });

    manager.handleVisibilityChange(true); // hidden
    vi.advanceTimersByTime(5000);

    expect(onIdle).toHaveBeenCalledOnce();
    expect(onActive).not.toHaveBeenCalled();

    manager.destroy();
  });

  it("does not call onIdle if tab becomes visible before timeout", () => {
    const onIdle = vi.fn();
    const onActive = vi.fn();
    const manager = createIdleManager({ onIdle, onActive, timeoutMs: 5000 });

    manager.handleVisibilityChange(true); // hidden
    vi.advanceTimersByTime(3000);
    manager.handleVisibilityChange(false); // visible again

    vi.advanceTimersByTime(3000); // 3s into new timer, not yet 5s
    expect(onIdle).not.toHaveBeenCalled();

    manager.destroy();
  });

  it("calls onActive when tab becomes visible while idle", () => {
    const onIdle = vi.fn();
    const onActive = vi.fn();
    const manager = createIdleManager({ onIdle, onActive, timeoutMs: 5000 });

    manager.handleVisibilityChange(true); // hidden
    vi.advanceTimersByTime(5000); // triggers idle
    manager.handleVisibilityChange(false); // visible again

    expect(onActive).toHaveBeenCalledOnce();

    manager.destroy();
  });

  it("calls onActive when user interacts while idle", () => {
    const onIdle = vi.fn();
    const onActive = vi.fn();
    const manager = createIdleManager({ onIdle, onActive, timeoutMs: 5000 });

    manager.handleVisibilityChange(true); // hidden
    vi.advanceTimersByTime(5000); // triggers idle
    manager.handleActivity(); // user interaction

    expect(onActive).toHaveBeenCalledOnce();

    manager.destroy();
  });

  it("does not call onActive on interaction when not idle", () => {
    const onIdle = vi.fn();
    const onActive = vi.fn();
    const manager = createIdleManager({ onIdle, onActive, timeoutMs: 5000 });

    manager.handleActivity();

    expect(onActive).not.toHaveBeenCalled();

    manager.destroy();
  });

  it("goes idle after inactivity timeout even with tab visible", () => {
    const onIdle = vi.fn();
    const onActive = vi.fn();
    const manager = createIdleManager({ onIdle, onActive, timeoutMs: 5000 });

    // No visibility change, no user activity — just wait
    vi.advanceTimersByTime(5000);

    expect(onIdle).toHaveBeenCalledOnce();

    manager.destroy();
  });

  it("resets inactivity timer on user activity", () => {
    const onIdle = vi.fn();
    const onActive = vi.fn();
    const manager = createIdleManager({ onIdle, onActive, timeoutMs: 5000 });

    vi.advanceTimersByTime(3000);
    manager.handleActivity(); // reset timer
    vi.advanceTimersByTime(3000); // 3s after reset, not yet 5s

    expect(onIdle).not.toHaveBeenCalled();

    vi.advanceTimersByTime(2000); // now 5s after reset
    expect(onIdle).toHaveBeenCalledOnce();

    manager.destroy();
  });

  it("restarts inactivity timer when tab becomes visible", () => {
    const onIdle = vi.fn();
    const onActive = vi.fn();
    const manager = createIdleManager({ onIdle, onActive, timeoutMs: 5000 });

    manager.handleVisibilityChange(true); // hidden
    vi.advanceTimersByTime(3000);
    manager.handleVisibilityChange(false); // visible — restarts timer

    vi.advanceTimersByTime(4999);
    expect(onIdle).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1);
    expect(onIdle).toHaveBeenCalledOnce();

    manager.destroy();
  });

  it("resets idle state on reconnect so the cycle can repeat", () => {
    const onIdle = vi.fn();
    const onActive = vi.fn();
    const manager = createIdleManager({ onIdle, onActive, timeoutMs: 5000 });

    // First cycle: go idle, come back
    manager.handleVisibilityChange(true);
    vi.advanceTimersByTime(5000);
    expect(onIdle).toHaveBeenCalledOnce();

    manager.handleVisibilityChange(false); // triggers onActive
    expect(onActive).toHaveBeenCalledOnce();

    // Second cycle: go idle again
    manager.handleVisibilityChange(true);
    vi.advanceTimersByTime(5000);
    expect(onIdle).toHaveBeenCalledTimes(2);

    manager.destroy();
  });

  it("exposes isIdle state", () => {
    const onIdle = vi.fn();
    const onActive = vi.fn();
    const manager = createIdleManager({ onIdle, onActive, timeoutMs: 5000 });

    expect(manager.isIdle).toBe(false);

    manager.handleVisibilityChange(true);
    vi.advanceTimersByTime(5000);
    expect(manager.isIdle).toBe(true);

    manager.handleVisibilityChange(false);
    expect(manager.isIdle).toBe(false);

    manager.destroy();
  });
});
