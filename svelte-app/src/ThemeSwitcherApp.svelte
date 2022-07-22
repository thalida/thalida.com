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
  <span class="sun-moon" />
  <small class="sun__ray" />
  <small class="sun__ray" />
  <small class="sun__ray" />
  <small class="sun__ray" />
</div>

<style lang="scss" global>
  $num_rays: 4;

  .theme-dark {
    --color-moon-cutout-color: var(--color-bg-default);
    --color-sun-moon: #fff;
    --color-sun-ray: var(--color-sun-moon);
  }
  .theme-light {
    --color-moon-cutout-color: var(--color-bg-default);
    --color-sun-moon: #eec413;
    --color-sun-ray: var(--color-sun-moon);
  }

  .theme-toggle {
    height: 20px;
    width: 20px;
    margin: 4px 16px 4px 4px;
    position: relative;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transform: translate(0, 0);

    .sun-moon {
      background: var(--color-sun-moon);
      width: 100%;
      height: 100%;
      border-radius: 50%;
      transform: scale(0.7);
      transition: 0.4s transform;

      &:before {
        content: "";
        display: block;
        position: absolute;
        width: 75%;
        height: 75%;
        top: 0;
        right: 0;
        background: var(--color-moon-cutout-color);
        border-radius: 100%;
        transform: scale(0) translate(0, 0);
        transition: 0.4s transform;
        transform-origin: right;
      }
    }

    .sun__ray {
      width: 2px;
      background: var(--color-sun-ray);
      display: block;
      height: 120%;
      position: absolute;
      z-index: -1;
      transition: 0.4s all, height 0.3s ease-in-out;
      border-radius: 4px;

      @for $i from 1 through $num_rays {
        &:nth-child(#{$i + 1}) {
          transform: rotate(calc(#{$i} * (180deg / #{$num_rays})));
        }
      }
    }

    &:hover .sun__ray {
      @for $i from 1 through $num_rays {
        &:nth-child(#{$i + 1}) {
          transform: rotate(
            calc((#{$i} * (180deg / #{$num_rays})) - (180deg / #{$num_rays}))
          );
        }
      }
    }
  }

  .theme-dark .theme-toggle {
    .sun-moon {
      transform: scale(1);
      &:before {
        transform: scale(1) translate(5%, -10%);
      }
    }

    &:hover .sun-moon:before {
      transform: scale(1) translate(-10%, -15%);
    }

    .sun__ray {
      height: 0;
      background: transparent;

      @for $i from 1 through $num_rays {
        &:nth-child(#{$i + 1}) {
          transform: rotate(
            calc((#{$i} * (180deg / #{$num_rays})) - (180deg / #{$num_rays}))
          );
        }
      }
    }
  }
</style>
