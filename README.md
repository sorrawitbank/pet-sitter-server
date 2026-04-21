# Pet Sitter Server

Main backend API for the Pet Sitter platform. This service handles authentication, pet owner and sitter workflows, bookings, chat, payment, review, reporting, and admin operations.

<div align="center">

[![Pet Sitter App](https://img.shields.io/badge/github-pet--sitter--app-ff7037?logo=github&logoColor=white&style=flat-square)](https://github.com/visneeb/pet-sitter-app)
[![Pet Sitter Server](https://img.shields.io/badge/github-pet--sitter--server-1ccd83?logo=github&logoColor=white&style=flat-square)](https://github.com/sorrawitbank/pet-sitter-server)
[![Pet Sitter RAG](https://img.shields.io/badge/github-pet--sitter--rag-76c0fc?logo=github&logoColor=white&style=flat-square)](https://github.com/sorrawitbank/pet-sitter-rag)

</div>

## Role In Ecosystem

This repository is the core API in the Pet Sitter system:

- `pet-sitter-app`: frontend application for users.
- `pet-sitter-server` (this repo): main backend API and business logic.
- `pet-sitter-rag`: retrieval and generation service used by chatbot/recommendation flows.

## Tech Stack

- Node.js + TypeScript
- Express
- PostgreSQL + Drizzle ORM
- Supabase (storage/auth-related integrations)
- Stripe (payments/webhooks)
- Gemini API and Dialogflow integrations
- Socket.IO

## Prerequisites

- Node.js 20+ (recommended)
- npm
- PostgreSQL database
- Supabase project credentials
- Stripe keys and webhook secret
- Gemini and Dialogflow credentials

## Project Structure

- `src/server.ts` - service entry point used in development
- `src` - routes, controllers, services, middleware, and integrations
- `docs/api/README.md` - full API contract

## Getting Started

### 1) Clone and install dependencies

```bash
git clone <your-repo-url>
cd pet-sitter-server
npm install
```

### 2) Configure environment variables

Copy `.env.example` to `.env` and set values.

Required groups include:

- Database: `DATABASE_URL`
- Supabase: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
- AI/RAG: `GEMINI_API_KEY`, `RAG_SERVICE_URL`
- Dialogflow: `DIALOGFLOW_PRIVATE_KEY_ID`, `DIALOGFLOW_PRIVATE_KEY`
- Stripe: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`

### 3) Run in development

```bash
npm run dev
```

Default API base URL is usually:

- `http://localhost:4000` (or the value from `PORT`)

## Scripts

- `npm run dev` - run server with nodemon (`src/server.ts`)
- `npm run build` - compile TypeScript to `dist`
- `npm run start` - start compiled server (`dist/server.js`)
- `npm run drizzle:pull` - pull database schema metadata using Drizzle Kit

## API Documentation

Detailed API reference is available at:

- `docs/api/README.md`

This document includes endpoint groups, auth rules, request/response examples, and error conventions.

## Notes

- Some routes are public, while others require Bearer token auth and role checks.
- Stripe webhook endpoint requires `STRIPE_WEBHOOK_SECRET` and raw JSON body validation.
- RAG/chatbot flows depend on `RAG_SERVICE_URL` and `GEMINI_API_KEY`.

## License

This project is licensed under the MIT License. See `LICENSE` for details.
