# Picture Hanger Height Helper

A tiny static web app that helps you place a nail so the center of your picture frame sits exactly 5' (60") from the floor. Enter your frame height and the distance from the top edge to the hanger hardware (all in inches), and the calculator will tell you how high to drive the nail. It also shows a quick diagram of where the top, center, bottom, and anchor fall relative to the floor.

## Getting started

Open `index.html` in your browser (or host the repository with GitHub Pages) and enter your frame measurements. Results update instantly and are displayed in fractional inches for easy marking on the wall.

## Deployment & cache busting

When updating `styles.css` or `script.js`, bump the `?v=` query parameter on those tags in `index.html` (for example, `styles.css?v=3` and `script.js?v=3`) so browsers and CDN caches immediately fetch the new assets instead of serving stale cached files.
