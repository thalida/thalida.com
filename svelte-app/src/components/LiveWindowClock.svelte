<script>
  import { onDestroy } from "svelte";
  export const time = {
    hour: 0,
    minute: 0,
  };

  const updateTimeInterval = setInterval(() => {
    const today = new Date();
    time.hour = today.getHours();
    time.minute = today.getMinutes();
  }, 100);

  onDestroy(() => {
    clearInterval(updateTimeInterval);
  });
</script>

<div class="clock">
  <span>{time.hour < 10 ? "0" : ""}{time.hour}</span>
  <span class="seperator">:</span>
  <span>{time.minute < 10 ? "0" : ""}{time.minute}</span>
</div>

<style lang="scss">
  .clock {
    position: absolute;
    display: flex;
    flex-flow: row nowrap;
    justify-content: center;
    align-items: center;
    bottom: -2px;
    right: 20%;
    z-index: 2;
    width: 90px;
    height: 40px;
    border-radius: 8px;
    font-size: 24px;
    font-family: "Squada One";
    color: var(--color-text-red);
    background: var(--color-bg-default);

    &:before {
      content: "";
      position: absolute;
      top: -3px;
      height: 3px;
      width: 40%;
      border-radius: 3px 3px 0 0;
      background: var(--color-bg-default);
    }

    .seperator {
      animation: 0.8s infinite alternate flash;

      @keyframes flash {
        from {
          opacity: 1;
        }

        to {
          opacity: 0.2;
        }
      }
    }
  }
</style>
