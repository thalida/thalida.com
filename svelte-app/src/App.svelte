<script>
	import LiveWindow from "./components/LiveWindow.svelte";
	export const selectedPage = `/${window.location.pathname.split("/")[1]}`;
</script>

{#if selectedPage === "/"}
	<LiveWindow />
{/if}
