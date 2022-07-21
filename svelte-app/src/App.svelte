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
