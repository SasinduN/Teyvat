# The brand's originals

`logo.svg` and `logo1.svg` are the client's logo as exported from Canva (22 Nov 2026). Each is
a wrapper around one 1024 x 1024 RGB PNG and a 1024 x 1024 luminance mask, applied with an
SVG `<mask>`. `logo.svg` shows the whole picture (the emblem and the lettering); `logo1.svg`
draws the same picture clipped to the emblem.

They never ship (about 710 KB each). `npm run brand:assets` makes every file the site uses,
in `public/brand/`, from these two, and fails if any is over its budget
(`shared/brand-files.ts`). Run it after changing a file here, and commit the output.

The plan: `docs/plans/brand-themes.md`.
