<script>
	import LiveWindow from "./components/LiveWindow.svelte";
	export let selectedPage = `/${window.location.pathname.split("/")[1]}`;
	console.log(selectedPage);
</script>

{#if selectedPage === "/"}
	<LiveWindow />
{/if}
