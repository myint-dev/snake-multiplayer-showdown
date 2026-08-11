# Snake Serenity

Create an interactive Snake game with two modes:

- walls (you die hitting a wall)

- pass-through (you wrap around the edges)

Make it multi-user. Add

- a leaderboard showing top scores per mode

- a page to watch other players' active games

- login and signup screens

Centralize every backend call in one services layer, and create a mock

implementation of it so the whole app runs without a real backend.

Add tests.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/06ff6959-0d0b-41a3-b5f5-d8562be9513d).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

The frontend uses the FastAPI backend by default at `http://localhost:8000/api`.
Start it separately with `make backend`, then run the frontend with `make frontend`.
For a deployed backend, set `VITE_API_BASE_URL` to its API base URL (including
the `/api` path) before building the frontend.

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
