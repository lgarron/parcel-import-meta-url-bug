# Parcel `import.meta.url` bug

## Repro

Run any of these:

| Command                                                                     | URL                          |
| --------------------------------------------------------------------------- | ---------------------------- |
| `npx serve` (or any static file server)                                     | <http://localhost:3000/src/> |
| `npx vite`                                                                  | <http://localhost:3000/src/> |
| `npx wmr`                                                                   | <http://localhost:8080/src/> |
| `npx esbuild src/index.js --format=esm --bundle --splitting --servedir=src` | <http://localhost:8000/src/> |

### Expected

If you open the appropriate URL for the commands above, you'll end up with `Received message: 4` in the JS console.

### Bug

However, if you run `npx parcel src/index.html` and open <http://localhost:1234/> then it fails with:

```
Not allowed to load local resource: file:///src/worker.js
```

## Explanation

It is [very difficult](https://github.com/lgarron/web-worker-compat-problems/) to write a library using web workers that will correctly run in `node` and on the web (in particular, when hosted on a CDN) _and_ won't be mangled by bundlers. This repo demonstrates a bug or assumption in Parcel that breaks semantics, which is otherwise be a good cross-compatible solution for module workers.

Note that it's possible work around this by trying other methods as fallbacks, but that is still pretty difficult to maintain in a library because people will still run that library through various toolchains. I would like to advocate that there should be at least one solution that has the proper semantics in ESM _and_ won't be broken by bundlers.

The fundamental challenge is that this does not always work:

```js
const worker = new Worker("./worker-entry.js", { type: "module" });
```

1. Some bundlers do not pick up `"./worker-entry.js"` as an entry path (i.e. don't treat it like a dynamic import) and therefore do not preserve the semantics without plugins or hacks.
2. This code does _not_ work when served from a CDN, because the browser will try to construct the worker with the CDN's origin and then deny this due to security restrictions. So we have to use a [trampoline](https://github.com/lgarron/web-worker-compat-problems/#problem-7-web-workers-cannot-be-instantiated-cross-origin):

```js
const workerURL = "https://cdn.cubing.net/worker.js";
const blob = new Blob([`import "${workerURL}";`], { type: "text/javascript" });
new Worker(URL.createObjectURL(blob), { type: "module" });
```

It's possible to instantiate the worker using a trampoline if you can get its URL, but that URL will often be rewritten by bundlers. An obvious approach would be to compute the URL using `new URL("./worker-entry.js", import.meta.url)`, but many bundlers do not preserve the semantics of this either (because there could be lots of reasons to construct a relative URL, not just for code).

However, most bundlers actually preserve the semantic meaning a _dynamic import_ as a form of code splitting. And thanks to `import.meta.url`, it's possible to ask a worker file for its own file URL, which can be used for instantiation:

```js
// index.js
const workerURL = (await import("./worker.js")).WORKER_ENTRY_FILE_URL;
const blob = new Blob([`import "${workerURL}";`], { type: "text/javascript" });
new Worker(URL.createObjectURL(blob), { type: "module" });

// worker.js
export const WORKER_ENTRY_FILE_URL = import.meta.url;
```

This has very well-defined semantics in ESM, and most bundlers seem to preserve it.
Unfortunately, Parcel seems to rewrite the `import.meta.url` calculation to `'file:///worker.js` instead of preserving the runtime semantics.

I'd like to ask the Parcel team for some way to preserve the semantics so that it also works in Parcel without any custom hacks.
