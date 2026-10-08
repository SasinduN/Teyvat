# Image delivery optimization — 2026-10-08

Problem → fixed credited JPEG thumbnails and original downloads waste mobile bytes. Root cause → TravelImage only generated srcset for Unsplash.

Files: shared/responsive-image.ts, shared/optimized-photos.json, TravelImage.tsx, server/pages.ts, scripts/optimize-photos.py, responsive-image.test.ts.

Shared candidates request 480/768/1280 Wikimedia thumbnails of the exact same photo. Credited originals use the same candidates, including Jaffna, preserving CMS URLs/mapping. Unsplash preserves photo/crop with auto=format/q80 and 480/768/1280/1920 candidates. Existing responsive sizes/lazy cards/eager first and page heroes/fallback retries/credits/object positions remain. No photo substitutions, label edits or database writes.

One Home hero preload matches the real image's srcset/sizes. Later slides never receive high-priority preload. The actual LCP element is NOT VERIFIED; preload addresses the source discovery dependency.

## Modern-format pipeline and limitations

`python scripts/optimize-photos.py` fetches credited originals and uses installed Pillow to create quality-85 WebP variants at 480/768/1280/1920, capped to source width. Hashed public/assets filenames enable immutable caching; manifest publishes only after all downloads succeed. Commit generated files and shared/optimized-photos.json together and build. Existing credits/licenses remain. Visual quality requires review.

Outbound downloads are BLOCKED: Python WinError 10013 and curl connection failure. No WebP/AVIF assets generated or measured image savings; optimized-photos.json intentionally empty. Python compilation PASS; end-to-end download/encode NOT TESTED. Current Wikimedia remains responsive JPEG. Unsplash format negotiation depends on provider support. Custom/R2 images lack an automatic resize service.

At 1920px, current Wikimedia upper candidate remains 1280px; full-resolution modern variants remain blocked. Do not upscale thumbnails merely to satisfy a breakpoint. External thumbnail availability, quality, decode and cropping NEEDS MANUAL VERIFICATION. Existing source/original retries remain for failed candidates.

Shared renderer covers Home/page heroes, destination/tour/experience/article cards, galleries and photo stories using TravelImage. Existing content/photo identity preserved; every external image's geography and decoding could not be independently verified. Raw Lighthouse/network report is needed to attribute screenshot savings to individual files.

Verification: three candidate tests and four existing retry/mapper tests PASS; production preload HTML PASS. No 2.1 MiB saving or all-image decoding claim.
