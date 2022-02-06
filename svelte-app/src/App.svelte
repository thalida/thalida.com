<script>
	let scrollY = 0;

	export let isHeaderSticky = false;
	export const selectedPage = `/${window.location.pathname.split("/")[1]}`;
	export const links = [
		{ path: "/kit", label: "Kit" },
		{ path: "/ref", label: "Ref" },
		{ path: "/meta", label: "Meta" },
		{ path: "/about", label: "About" },
	];

	function updateHeader(node) {
		const rect = node.getBoundingClientRect();
		return {
			update(scrollY) {
				isHeaderSticky = scrollY > rect.bottom;
			},
		};
	}
</script>

<svelte:window bind:scrollY />

<header
	use:updateHeader={scrollY}
	class="container"
	class:is-sticky={isHeaderSticky}
>
	<a class="notion-link link" class:active={selectedPage == "/"} href="/">
		thalida.
	</a>
	<nav>
		{#each links as link}
			<a
				class="notion-link link"
				class:active={selectedPage == link.path}
				href={link.path}
			>
				{link.label}
			</a>
		{/each}
	</nav>
</header>

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
		margin: 20px 0 0;
		padding: 8px 16px;
		font-size: 16px;

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
		}
	}
</style>
