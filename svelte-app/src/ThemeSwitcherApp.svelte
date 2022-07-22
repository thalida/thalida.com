<script>
  // Original Source
  // https://codepen.io/sandeshsapkota/pen/xxVmMpe

  let isDarkMode =
    document.body.classList.contains("theme-dark") ||
    document.documentElement.classList.contains("theme-dark");

  function setThemeClasses() {
    if (isDarkMode) {
      document.body.classList.add("theme-dark", "dark");
      document.documentElement.classList.add("theme-dark", "dark");
      document.body.classList.remove("theme-light", "light");
      document.documentElement.classList.remove("theme-light", "light");
    } else {
      document.body.classList.remove("theme-dark", "dark");
      document.documentElement.classList.remove("theme-dark", "dark");
      document.body.classList.add("theme-light", "light");
      document.documentElement.classList.add("theme-light", "light");
    }
  }

  function handleClick() {
    isDarkMode = !isDarkMode;
    setThemeClasses();
  }

  setThemeClasses();
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
  .theme-toggle {
    height: 37px;
    width: 37px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    margin: 10px 10px;
    transform: translate(0, 0);
    .sun {
      background: var(--color-secondary);
      width: 37px;
      height: 37px;
      border-radius: 50%;
      border: 4px solid var(--color-primary);
    }

    .sun__ray {
      width: 2px;
      background: var(--color-secondary);
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
    background: var(--color-primary);
    border-radius: 50%;
    top: 0;
    right: 0;
    transform: scale(0) translate(25%, -25%);
    z-index: 9;
    transition: 0.4s transform;
    transform-origin: right;
  }

  .theme--dark {
    .theme-toggle {
      background-color: var(--color-primary);
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
