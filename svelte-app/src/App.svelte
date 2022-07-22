<script>
	import { currentUrlPath } from "./store";
	import LiveWindow from "./components/LiveWindow.svelte";
	export let selectedPage = null;
	export let windowPage = "/";

	if (document.body.classList.contains("theme-dark") === false) {
		document.body.classList.add("theme-dark");
	}

	if (document.documentElement.classList.contains("theme-dark") === false) {
		document.documentElement.classList.add("theme-dark");
	}

	currentUrlPath.subscribe((urlPath) => {
		selectedPage = `/${urlPath.split("/")[1]}`;

		if (selectedPage === windowPage) {
			document.body.classList.add("has-window");
		} else {
			document.body.classList.remove("has-window");
		}

		Array.from(
			document.querySelectorAll(".notion-link.super-navbar__item")
		).forEach((el) => {
			el.classList.remove("active");

			const href = el.getAttribute("href");
			if (selectedPage.startsWith(href)) {
				el.classList.add("active");
			}
		});
	});
</script>

{#if selectedPage === windowPage}
	<LiveWindow />
{/if}

<style lang="scss" global>
	@media (min-width: 950px) {
		.has-window {
			.scene {
				position: sticky;
				top: calc(var(--navbar-height) * 2);
			}

			.super-content-wrapper {
				display: flex;
				flex-flow: row wrap;
				max-width: var(--layout-max-width);
				margin: auto;
				align-items: start;
				justify-content: space-between;
				width: 100%;
				padding-left: var(--padding-left);
				padding-right: var(--padding-right);
			}

			.super-content {
				padding: 0 64px;
				flex-grow: 1;
				margin: calc(var(--navbar-height) - 1rem) 0 !important;
			}
		}
	}
</style>
