export function random(min: number = 0, max: number = 1): number {
  return Math.random() * (max - min) + min;
}

export function debounce(callback: (...args: any[]) => void, wait: number) {
  let timeoutId: number;
  return (...args: any[]) => {
    window.clearTimeout(timeoutId);
    timeoutId = window.setTimeout(() => {
      callback(...args);
    }, wait);
  };
}
