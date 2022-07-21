<script>
	import LiveWindow from "./components/LiveWindow.svelte";
	export let selectedPage = `/${window.location.pathname.split("/")[1]}`;
	console.log(selectedPage);

	window.addEventListener("popstate", function (event) {
		// Log the state data to the console
		console.log(event.state);
	});
</script>

{#if selectedPage === "/"}
	<LiveWindow />
{/if}
