<script>
	import LiveWindow from "./components/LiveWindow.svelte";
	let scrollY = 0;

	export let mobileNavOpen = false;
	export let isHeaderSticky = false;
	export const selectedPage = `/${window.location.pathname.split("/")[1]}`;
	export const links = [
		{ path: "/projects", label: "Projects" },
		{ path: "/links", label: "Links" },
		{ path: "/rubber-duck", label: "Rubber Duck" },
		{ path: "/about", label: "About" },
	];

	function updateHeader(node) {
		const rect = node.getBoundingClientRect();
		return {
			update(scrollY) {
				isHeaderSticky = scrollY > rect.top + 10;
			},
		};
	}
</script>

<svelte:window bind:scrollY />

<header use:updateHeader={scrollY} class:is-sticky={isHeaderSticky}>
	<div class="container">
		<a class="notion-link link" class:active={selectedPage == "/"} href="/">
			thalida.
		</a>

		<button
			class="nav-btn"
			class:is-open={mobileNavOpen}
			on:click={() => (mobileNavOpen = !mobileNavOpen)}
		>
			<div class="middle-bar" />
		</button>

		<nav class:is-open={mobileNavOpen}>
			{#each links as link}
				<a class="notion-link link" href={link.path}>
					{link.label}
				</a>
			{/each}
		</nav>
	</div>
</header>

{#if selectedPage === "/"}
	<LiveWindow />
{/if}

<style lang="scss"></style>
