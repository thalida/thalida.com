<script>
	import { currentRoute } from "./store";
	import LiveWindow from "./components/LiveWindow.svelte";
	export let selectedPage = `/${window.location.pathname.split("/")[1]}`;

	currentRoute.subscribe((newRoute) => {
		console.log(newRoute);
	});
</script>

{#if selectedPage === "/"}
	<LiveWindow />
{/if}
