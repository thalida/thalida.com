<script>
	import { movePageProperties } from "./domManipulation";
	import { currentUrlPath } from "./store";
	import LiveWindow from "./components/LiveWindow.svelte";

	import Prism from 'prismjs';
	import 'prismjs/components/prism-bash';
	import 'prismjs/components/prism-css';
	import 'prismjs/components/prism-csv';
	import 'prismjs/components/prism-docker';
	import 'prismjs/components/prism-git';
	import 'prismjs/components/prism-json';
	import 'prismjs/components/prism-jsx';
	import 'prismjs/components/prism-markdown';
	import 'prismjs/components/prism-markup';
	import 'prismjs/components/prism-mongodb';
	import 'prismjs/components/prism-python';
	import 'prismjs/components/prism-regex';
	import 'prismjs/components/prism-sql';
	import 'prismjs/components/prism-typescript';
	import 'prismjs/components/prism-yaml';

	export let selectedPage = null;
	export let windowPage = "/";

	currentUrlPath.subscribe((urlPath) => {
		movePageProperties();

		Prism.highlightAll();

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
