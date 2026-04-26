# PizzaERP

Sistema de gestión para pizzerías — monorepo pnpm workspaces.

## Stack

| App | Tecnología |
|-----|------------|
| `apps/desktop` | Electron + React 19 + Vite (Electron Forge) |
| `apps/api` | Node.js + Fastify v5 + Prisma + PostgreSQL |
| `packages/shared` | Tipos Zod compartidos |

## Requisitos

- Node.js >= 20
- pnpm >= 9
- PostgreSQL >= 15

## Instalación

```bash
pnpm install
```

## Desarrollo

```bash
# Solo el API
pnpm api

# Solo el desktop
pnpm desktop

# Ambos en paralelo
pnpm dev
```

## Build

```bash
pnpm build
```

## Typecheck

```bash
pnpm typecheck
```

## Variables de entorno

Copiar `apps/api/.env.example` a `apps/api/.env` y completar:

```bash
cp apps/api/.env.example apps/api/.env
```

| Variable | Descripción |
|----------|-------------|
| `PORT` | Puerto del API (default: 3000) |
| `DATABASE_URL` | Connection string PostgreSQL |
| `JWT_SECRET` | Secreto para firmar tokens JWT |
