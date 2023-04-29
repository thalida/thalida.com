<script>
	import { currentUrlPath } from "./store";
	import LiveWindow from "./components/LiveWindow.svelte";
	export let selectedPage = null;
	export let windowPage = "/";

	currentUrlPath.subscribe((urlPath) => {
		selectedPage = `/${urlPath.split("/")[1]}`;

		if (selectedPage === windowPage) {
			document.body.classList.add("has-window");
		} else {
			document.body.classList.remove("has-window");
		}
	});
</script>

{#if selectedPage === windowPage}
	<LiveWindow />
{/if}

<style lang="scss" global>
	.theme-dark {
		--window-color: var(--color-bg-default);
		--window-clock-bg: var(--window-color);
		--window-sky-color-default: var(--color-bg-default-darker);
	}
	.theme-light {
		--window-color: #3e1300;
		--window-clock-bg: #0e121b;
		--window-sky-color-default: var(--color-bg-default-darker);
	}

	.has-window {
		.super-content.max-width {
			margin-top: 100px;
		}
	}

	// @media (min-width: 980px) {
	// 	.has-window {
	// 		.scene {
	// 			position: sticky;
	// 			top: calc(var(--navbar-height) * 2);
	// 		}

	// 		.super-content-wrapper {
	// 			display: flex;
	// 			flex-flow: row wrap;
	// 			max-width: var(--layout-max-width);
	// 			margin: auto;
	// 			align-items: start;
	// 			justify-content: space-between;
	// 			width: 100%;
	// 			padding-left: var(--padding-left);
	// 			padding-right: var(--padding-right);
	// 		}

	// 		.super-content {
	// 			padding: 0 64px;
	// 			flex-grow: 1;
	// 			margin: calc(var(--navbar-height) - 1rem) 0 !important;
	// 		}
	// 	}
	// }
</style>
