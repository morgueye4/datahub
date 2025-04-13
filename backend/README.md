# DataHub Backend

This is the backend server for the DataHub platform, built with Deno and Hono.js.

## Features

- RESTful API for interacting with the DataHub platform
- Integration with Filecoin blockchain via smart contracts
- Lighthouse storage integration for decentralized file storage
- Token faucet for testing
- Task, submission, and review management

## Prerequisites

- [Deno](https://deno.land/)
- Access to Filecoin Calibration testnet
- Lighthouse API key

## Installation

2. Set up environment variables
```bash
cp .env.example .env
```

3. Edit the `.env` file with your configuration

## Running the Server

```bash
deno run --allow-net --allow-read --allow-env --allow-write --unstable-kv main.ts
```

The server will start on http://localhost:8000 by default.

## API Endpoints

### Faucet
- `POST /faucet/request` - Request tokens from the faucet

### Tasks
- `GET /tasks` - Get all tasks
- `GET /tasks/:id` - Get a specific task
- `POST /tasks` - Create a new task

### Submissions
- `GET /submissions` - Get all submissions
- `GET /submissions/:id` - Get a specific submission
- `POST /submissions` - Create a new submission

### Reviews
- `GET /reviews` - Get all reviews
- `GET /reviews/:id` - Get a specific review
- `POST /reviews` - Create a new review

## Development

The backend uses Deno KV for data storage, which is a lightweight key-value store built into Den and also deployable via Deno Deploy.

