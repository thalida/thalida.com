<script>
	// import "styles/notion-theme.scss";
	// export let name;
	console.log("in app script");
</script>

<div>
	<h1>Hello!</h1>
	<p>
		Visit the <a href="https://svelte.dev/tutorial">Svelte tutorial</a> to learn
		how to build Svelte apps.
	</p>
</div>

<style lang="scss">
	div {
		text-align: center;
		padding: 1em;
		max-width: 240px;
		margin: 0 auto;
	}

	h1 {
		color: #ff3e00;
		text-transform: uppercase;
		font-size: 4em;
		font-weight: 100;
	}

	@media (min-width: 640px) {
		div {
			max-width: none;
		}
	}
</style>
