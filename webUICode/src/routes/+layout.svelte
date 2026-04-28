<script lang="ts">
	import favicon from '$lib/assets/favicon.svg';

	let { children } = $props();
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>
<svelte:window  ontouchend={(e)=>{
	//e.preventDefault()
}} ontouchstart={(e)=>{
	//e.preventDefault()
}} ontouchmove={(e)=>{
	//e.preventDefault()
}} /> 
{@render children()}
