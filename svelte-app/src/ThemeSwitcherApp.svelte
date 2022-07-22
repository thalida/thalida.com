<script>
  // Original Source
  // https://codepen.io/sandeshsapkota/pen/xxVmMpe

  import { writable } from "svelte/store";

  const storedTheme = localStorage.getItem("theme");
  const initialTheme =
    typeof storedTheme !== "undefined" && storedTheme !== null
      ? storedTheme
      : "dark";
  const theme = writable(initialTheme);

  theme.subscribe((newTheme) => {
    localStorage.setItem("theme", newTheme);
    setThemeClasses(newTheme);
  });

  function handleClick() {
    theme.update((state) => (state === "dark" ? "light" : "dark"));
  }

  function setThemeClasses(theme) {
    if (theme === "light") {
      document.body.classList.add("theme-light", "light");
      document.documentElement.classList.add("theme-light", "light");
      document.body.classList.remove("theme-dark", "dark");
      document.documentElement.classList.remove("theme-dark", "dark");
    } else {
      document.body.classList.add("theme-dark", "dark");
      document.documentElement.classList.add("theme-dark", "dark");
      document.body.classList.remove("theme-light", "light");
      document.documentElement.classList.remove("theme-light", "light");
    }
  }

  setThemeClasses(initialTheme);
</script>

<div class="theme-toggle theme-toggle-js" on:click={handleClick}>
  <span class="moon" />
  <span class="sun" />
  <small class="sun__ray" />
  <small class="sun__ray" />
  <small class="sun__ray" />
  <small class="sun__ray" />
  <small class="sun__ray" />
  <small class="sun__ray" />
</div>

<style lang="scss" global>
  .theme-dark {
    --color-toggle-bg: var(--color-bg-default);
    --color-toggle-theme: #fff;
  }
  .theme-light {
    --color-toggle-theme: #eec413;
  }

  .theme-toggle {
    height: 37px;
    width: 37px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    margin: 10px 10px;
    transform: translate(0, 0) scale(0.6);

    .sun {
      background: var(--color-toggle-theme);
      width: 37px;
      height: 37px;
      border-radius: 50%;
      border: 4px solid var(--color-toggle-bg);
    }

    .sun__ray {
      width: 2px;
      background: var(--color-toggle-theme);
      display: block;
      height: 121%;
      position: absolute;
      z-index: -1;
      transition: 0.4s all, height 0.3s ease-in-out;

      $columns: 12;
      @for $i from 1 through $columns {
        &:nth-child(#{$i}) {
          transform: rotate(calc(#{$i} * calc(360deg / #{$columns})));
        }
      }
    }

    &:hover .sun__ray {
      $columns: 12;

      @for $i from 1 through $columns {
        &:nth-child(#{$i}) {
          transform: rotate(
            calc(calc(#{$i} * calc(360deg / #{$columns})) - 20deg)
          );
        }
      }
    }
  }

  .moon {
    height: 28px;
    width: 28px;
    position: absolute;
    background: var(--color-toggle-bg);
    border-radius: 50%;
    top: 0;
    right: 0;
    transform: scale(0) translate(25%, -25%);
    z-index: 9;
    transition: 0.4s transform;
    transform-origin: right;
  }

  .theme-dark {
    .theme-toggle {
      background-color: var(--color-toggle-bg);
    }

    .theme-toggle:hover {
      .moon {
        transform: scale(1) translate(-3%, -18%);
      }
    }

    .moon {
      transform: scale(1) translate(11%, -11%);
    }

    .theme-toggle .sun__ray {
      height: 0;
      transition: 0.4s, transform 0.4s, height 0.2s 0.1s;

      $columns: 12;
      @for $i from 1 through $columns {
        &:nth-child(#{$i}) {
          transform: rotate(
            calc(calc(#{$i} * calc(360deg / #{$columns})) - 45deg)
          );
        }
      }
    }
  }
</style>
