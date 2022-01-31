<script>
	export const selectedPage = `/${window.location.pathname.split("/")[0]}`;
	export const links = [
		{ path: "/kit", label: "Kit" },
		{ path: "/ref", label: "Ref" },
		{ path: "/meta", label: "Meta" },
		{ path: "/about", label: "About" },
	];
</script>

<header>
	<a class="notion-link link" class:active={selectedPage == "/"} href="/">
		thalida.
	</a>
	<nav>
		{#each links as link}
			<a
				class="notion-link link"
				class:active={selectedPage == link.url}
				href={link.path}
			>
				{link.label}
			</a>
		{/each}
	</nav>
</header>

<style lang="scss">
	header {
		display: flex;
		flex-flow: row nowrap;
		align-items: center;
		justify-content: space-between;
		margin: 20px 20px 0;
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
	}
</style>
