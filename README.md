# WealthLog ⚖️💹

> **A modular, full‑stack wealth‑management platform built with Next.js 15, Express + Prisma, PostgreSQL 15, and TurboRepo.**

---

## 📂 Monorepo Layout

| Path                | Role                        | Main Tech                          |
| :------------------ | :-------------------------- | :--------------------------------- |
| **apps/backend**    | REST API & Auth, DB access  | Express 5 · Prisma ORM             |
| **apps/web**        | Universal web UI            | Next.js 15 · React 18 · TypeScript |
| **packages/common** | Shared types, helpers, i18n | TypeScript                         |

> This structure lets every package stay **isolated yet tightly integrated** through workspaces and TurboRepo’s incremental builds.

---

## 🔧 Requirements

| Tool           | Version | Why                                       |
| :------------- | :------ | :---------------------------------------- |
| **Node.js**    | 20 LTS  | modern `Promise` features, turbo speed    |
| **npm**        |  ≥ 8    | comes with Node 20                        |
| **PostgreSQL** |  ≥ 15   | rich SQL & JSON, free logical replication |
| **Git**        | latest  | version control & CI hooks                |

<details>
<summary>Quick install guides (macOS • Ubuntu)</summary>

### macOS

```bash
brew install nvm postgresql@15 git
nvm install 20 && nvm use 20
brew services start postgresql@15
createdb wealthlog
```

### Ubuntu 22+

```bash
sudo apt update && sudo apt install -y curl git postgresql-15
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
nvm install 20 && nvm use 20
sudo -u postgres createdb wealthlog
```

</details>

---

## 🚀 Quick Start

```bash
# 1  Clone
$ git clone https://github.com/wealthlog/wealthlog.git && cd wealthlog

# 2  Install every workspace (Turbo handles caching)
$ npm run bootstrap    # ⇢ "npm ci --workspaces --include-workspace-root"

# 3  Copy secrets template & fill in your own
$ cp apps/backend/.env.example apps/backend/.env
#    ➜  edit DATABASE_URL, JWT_SECRET, etc.

# 4  Spin everything up (hot‑reload)
$ npm run dev
#    🌐  Web UI  → http://localhost:3000
#    🔌  API     → http://localhost:5000
```

---

## 🛠 Useful Scripts

| Command                                                                        | What it does                                                 |
| :----------------------------------------------------------------------------- | :----------------------------------------------------------- |
| `npm run dev`                                                                  | Hot‑reload **web + API** concurrently                        |
| `npm run build`                                                                | Full production build (Next static export + compiled server) |
| `npx turbo run build --filter=@wealthlog/web...`                               | Build web only                                               |
| `npx turbo run build --filter=@wealthlog/backend...`                           | Build API only                                               |
| `npm exec --workspace=@wealthlog/backend -- prisma studio`                     | Open interactive DB UI                                       |
| `npm exec --workspace=@wealthlog/backend -- prisma migrate dev --name "add_X"` | Generate migration                                           |
| `npm exec --workspace=@wealthlog/backend -- prisma migrate deploy`             | Apply migrations                                             |

> **Tip:** run `npm run build` locally **before pushing** to catch missing imports & TS errors that CI would reject later.

---

## 🧩 Adding Dependencies

| Need                     | Example command                                  | Ends up in                  |
| :----------------------- | :----------------------------------------------- | :-------------------------- |
| **Backend‑only runtime** | `npm add multer --workspace=@wealthlog/backend`  | `apps/backend/package.json` |
| **Web‑only runtime**     | `npm add react-icons --workspace=@wealthlog/web` | `apps/web/package.json`     |
| **Shared util / types**  | add file(s) → bump version                       | `packages/common`           |
| **Tooling / dev**        | `npm add -D eslint`                              | *root* `package.json`       |

> ✅ **Rule of thumb**: if it runs in **production**, put it in `dependencies`; otherwise, `devDependencies`.

---

## 🗄️ Database 101 (Educational)

* **PostgreSQL roles vs. databases**: create a dedicated role with limited rights for the app (`CREATE ROLE wl_app LOGIN PASSWORD '…'`).
* Enable the **`uuid-ossp`** extension if you want UUID primary keys: `CREATE EXTENSION IF NOT EXISTS "uuid-ossp";` then use `@default(uuid_generate_v4())` in Prisma schema.
* Use `EXPLAIN ANALYZE` to profile slow queries—Prisma’s `queryRaw` allows raw SQL when needed.

---

## 🏗 CI / Deploy

| Platform   | Flow                                                                                                  |
| :--------- | :---------------------------------------------------------------------------------------------------- |
| **Vercel** | `vercel.json` triggers a Turbo build → outputs `apps/web/.next`                                       |
| **Render** | `npm ci && turbo build backend && prisma generate && prisma migrate deploy` then `node dist/index.js` |

> **Good practice**: keep 🚀 deploy scripts inside `package.json` so local & CI stay identical.

---

## ✨ Contributing

1. **Fork & branch** from `main`.
2. Follow [Conventional Commits](https://www.conventionalcommits.org) (`feat:`, `fix:`, `chore:`…).
3. `npm run lint && npm test` before pushing.
4. Open a PR – CI checks must pass.

---

## 📚 Further Reading

* [TurboRepo docs](https://turbo.build/repo/docs) – caching & build filters.
* [Prisma best practices](https://www.prisma.io/docs/) – migrations, relations, performance.
* [Next.js 15](https://nextjs.org/blog/next-15) – React Server Components & streaming.

---

## 📝 License

Distributed under the MIT License – see `LICENSE` for details.
