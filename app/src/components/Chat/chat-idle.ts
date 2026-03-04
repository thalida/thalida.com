interface IdleManagerOptions {
  onIdle: () => void;
  onActive: () => void;
  timeoutMs: number;
}

interface IdleManager {
  isIdle: boolean;
  handleVisibilityChange: (hidden: boolean) => void;
  handleActivity: () => void;
  destroy: () => void;
}

export function createIdleManager(options: IdleManagerOptions): IdleManager {
  const { onIdle, onActive, timeoutMs } = options;
  let idle = false;
  let timer: ReturnType<typeof setTimeout> | null = null;

  function clearIdleTimer(): void {
    if (timer !== null) {
      clearTimeout(timer);
      timer = null;
    }
  }

  function startIdleTimer(): void {
    clearIdleTimer();
    timer = setTimeout(() => {
      timer = null;
      idle = true;
      onIdle();
    }, timeoutMs);
  }

  function wake(): void {
    if (idle) {
      idle = false;
      onActive();
    }
  }

  const manager: IdleManager = {
    get isIdle() {
      return idle;
    },

    handleVisibilityChange(hidden: boolean) {
      if (hidden) {
        startIdleTimer();
      } else {
        clearIdleTimer();
        wake();
      }
    },

    handleActivity() {
      wake();
    },

    destroy() {
      clearIdleTimer();
    },
  };

  return manager;
}
