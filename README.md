# PairWise Ranking Web App

This repository contains a lightweight, client-side web application that helps you rank a list of ideas using the pairwise comparison technique.

## Getting started

1. Open [`index.html`](index.html) in your browser.
2. Paste a list of items (one per line or separated with commas).
3. Step through the comparisons by picking the option you prefer each time.
4. Review the final ordered list generated from your choices.

The app performs an insertion sort guided by your selections, minimizing the total number of comparisons needed to produce the final ranking.

## Development notes

No build step or server is required—the project uses plain HTML, CSS, and vanilla JavaScript. To iterate quickly, open `index.html` with a live-reload capable development server such as `npx serve` or `python -m http.server`.
