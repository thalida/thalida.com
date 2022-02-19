<script>
	import LiveWindow from "./components/LiveWindow.svelte";
	let scrollY = 0;

	export let isHeaderSticky = false;
	export const selectedPage = `/${window.location.pathname.split("/")[1]}`;
	export const links = [
		{ path: "/projects", label: "Projects" },
		{ path: "/links", label: "Links" },
		{ path: "/wiki", label: "Wiki" },
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
		<nav>
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

<style lang="scss">
	.container {
		width: 100%;
		max-width: 1270px;
		padding-left: calc(env(safe-area-inset-left) + 96px);
		padding-right: calc(env(safe-area-inset-right) + 96px);
		margin-left: auto;
		margin-right: auto;

		@media (max-width: 546px) {
			padding-left: calc(env(safe-area-inset-left) + 24px);
			padding-right: calc(env(safe-area-inset-right) + 24px);
		}
	}

	header {
		display: flex;
		flex-flow: row nowrap;
		align-items: center;
		justify-content: space-between;
		margin: 0;
		padding: 32px 0 16px;
		font-size: 16px;
		width: 100%;
		z-index: 50;

		.container {
			display: flex;
			flex-flow: row nowrap;
			align-items: center;
			justify-content: space-between;
		}

		a {
			text-decoration: none;
			font-weight: bold;
		}

		nav {
			display: flex;
			flex-flow: row nowrap;
			align-items: center;
			justify-content: flex-end;

			a {
				margin: 0 8px;
				&:hover {
					opacity: 1;
				}
			}
		}

		.notion-link.active:after {
			height: 100%;
			z-index: -1;
			transform: skewY(-2deg);
		}

		&.is-sticky {
			position: fixed;
			top: 0;
			z-index: 50;
			box-shadow: 0 0 30px var(--color-bg-default);
			background-color: var(--color-bg-default);
		}
	}
</style>
