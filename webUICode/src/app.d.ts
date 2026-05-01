// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
declare global {
	namespace App {
		interface Platform {
            env: {
                KV: KVNamespace;
                MY_DURABLE_OBJECT:DurableObjectNamespace
            }
            cf: CfProperties
            ctx: ExecutionContext
        }
		// interface Error {}
		// interface Locals {}
		// interface PageData {}
		// interface PageState {}
		// interface Platform {}
	}
}

export {};
