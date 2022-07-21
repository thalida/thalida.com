<script>
	import { currentRoute } from "./store";
	import LiveWindow from "./components/LiveWindow.svelte";
	export let selectedPage = `/${window.location.pathname.split("/")[1]}`;
	console.log(selectedPage);

	window.addEventListener("popstate", function (event) {
		// Log the state data to the console
		console.log(event.state);
	});
	window.addEventListener("hashchange", function (event) {
		// Log the state data to the console
		console.log(event.state);
	});
	window.addEventListener("locationchange", function (event) {
		console.log(event.state);
	});

	currentRoute.subscribe((newRoute) => {
		console.log(newRoute);
	});
</script>

{#if selectedPage === "/"}
	<LiveWindow />
{/if}
