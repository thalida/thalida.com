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
	@media (min-width: 960px) {
		.super-root.page__index {
			.scene {
				position: sticky;
				top: 10px;
			}

			.super-content-wrapper {
				display: flex;
				flex-flow: row wrap;
				max-width: var(--layout-max-width);
				margin: auto;
				align-items: start;
				justify-content: space-between;
				width: 100%;
			}

			.notion-header.page {
				display: none;
			}

			.super-content.max-width {
				padding: 0;
				flex-grow: 1;
			}
		}
	}
</style>
