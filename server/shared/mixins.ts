
// eslint-disable-next-line @typescript-eslint/ban-types
export type Constructor<T = {}> = new (...args: any[]) => T

export function applyMixin(
	target: Constructor,
	mixin: Constructor,
	includeConstructor = false,
): void {
	// Figure out the inheritance chain of the mixin
	const inheritanceChain: Constructor[] = [mixin]
	// eslint-disable-next-line no-constant-condition
	while (true) {
		const current = inheritanceChain[0]
		const base = Object.getPrototypeOf(current)
		if (base?.prototype) {
			inheritanceChain.unshift(base)
		} else {
			break
		}
	}
	for (const ctor of inheritanceChain) {
		for (const prop of Object.getOwnPropertyNames(ctor.prototype)) {
			// Do not override the constructor
			if (includeConstructor || prop !== 'constructor') {
				Object.defineProperty(
					target.prototype,
					prop,
					Object.getOwnPropertyDescriptor(ctor.prototype, prop) ??
						Object.create(null),
				)
			}
		}
	}
}
