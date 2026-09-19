# builds

Drop a `<name>.contraptions.json` here and it ships with the site: Vite finds
it when the app is served or built (`apps/rube/src/builder/discover.ts`), it
is validated and compiled at startup like any other build, and from then on
it has a chip under **Builds** in Machine's panel, a band on the catalog, a
place on the Builder's bench, and a link: `/?world=<name>`.

The folder ships empty on purpose, so the front door is the four stock
worlds until someone adds to it. Files come from the Builder's **Export**
(`/builder/`); the format is described in the README under *Builder*, and
defined by `apps/rube/src/builder/spec.ts`.

`npm run check:builder` validates and plays every file here.
