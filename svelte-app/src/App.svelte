<script>
	import { movePageProperties } from "./domManipulation";
	import { currentUrlPath } from "./store";
	import LiveWindow from "./components/LiveWindow.svelte";
	export let selectedPage = null;
	export let windowPage = "/";

	currentUrlPath.subscribe((urlPath) => {
		movePageProperties();

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
	html.theme-dark {
		--window-color: var(--color-bg-default);
		--window-clock-bg: var(--window-color);
		--window-sky-color-default: var(--color-bg-default-darker);
	}
	html.theme-light {
		--window-color: #3e1300;
		--window-clock-bg: #0e121b;
		--window-sky-color-default: var(--color-bg-default-darker);
	}

	.has-window {
		.super-content.max-width {
			margin-top: 100px;
		}
	}
</style>
