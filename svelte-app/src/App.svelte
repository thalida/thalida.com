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

<style lang="scss">
	@import "./styles/notion-theme/variables/mixins.scss";
	.container {
		@include site-padding;
		width: 100%;
		max-width: 1270px;
		margin-left: auto;
		margin-right: auto;
	}

	header {
		position: relative;
		display: flex;
		flex-flow: row nowrap;
		align-items: center;
		justify-content: space-between;
		margin: 0;
		padding: 32px 0;
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

		.nav-btn {
			position: relative;
			display: none;
			padding: 0;
			border: 0;
			background: transparent;
			width: 24px;
			height: 24px;

			.middle-bar {
				margin: 4px 0;
			}

			.middle-bar,
			&:before,
			&:after {
				display: block;
				width: 100%;
				height: 2px;
				background: var(--color-text-default);
			}

			&:before,
			&:after {
				content: "";
				transform: rotate(0);
				transform-origin: center;
				transition: all 200ms ease-in-out;
			}

			&.is-open {
				.middle-bar {
					display: none;
				}

				&:before,
				&:after {
					position: absolute;
					top: 50%;
				}

				&:before {
					transform: rotate(-45deg);
				}
				&:after {
					transform: rotate(45deg);
				}
			}

			@media (max-width: 500px) {
				display: block;
			}
		}

		nav {
			display: flex;
			flex-flow: row nowrap;
			align-items: center;
			justify-content: flex-end;
			transform: translate(0);

			a {
				margin: 0 8px;
				&:hover {
					opacity: 1;
				}
			}

			@media (max-width: 500px) {
				display: flex;
				position: absolute;
				flex-flow: column nowrap;
				position: absolute;
				justify-content: center;
				align-items: flex-start;
				top: 64px;
				left: 0;
				width: 100%;
				height: 0;
				padding: 0;
				overflow: hidden;
				visibility: hidden;
				transition: all 200ms ease-in-out;
				background: var(--color-bg-default);
				box-shadow: 0 5px 30px var(--color-bg-default);
				font-size: 24px;

				&.is-open {
					visibility: visible;
					height: calc(95vh - 64px);
					padding: 32px 0;
				}

				a {
					margin: 16px 32px;
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
