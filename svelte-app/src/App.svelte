<script>
	import { currentUrlPath } from "./store";
	import LiveWindow from "./components/LiveWindow.svelte";
	export let selectedPage = null;

	currentUrlPath.subscribe((urlPath) => {
		selectedPage = `/${urlPath.split("/")[1]}`;

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

{#if selectedPage === "/"}
	<LiveWindow />
{/if}

<style lang="scss" global>
	@media (min-width: 950px) {
		.super-root.page__index {
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
				margin: calc(var(--navbar-height) - 1rem) 0;
			}
		}
	}
</style>
