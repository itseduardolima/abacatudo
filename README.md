# gastos-web (AbacaTudo)

Gestão de gastos pessoais (PWA, celular primeiro): cartões e contas via Open
Finance (Pluggy), separação do que é seu do que é da família, limite mensal
baseado na renda, relatório de onde o dinheiro vai e IA de apoio.

Mesmo padrão de arquitetura e segurança do [`pdv-web`](../pdv-web):
Next.js (só frontend) + NestJS + PostgreSQL com RLS, monorepo pnpm +
Turborepo, VPS própria com Docker Compose e Caddy.

> **Status:** Sprint 0 concluída (base técnica no ar, com a integração Pluggy ainda por validar).
> Estado real em [`TODO.md`](./TODO.md).

## Documentação

| Onde                                               | O quê                                                |
| -------------------------------------------------- | ---------------------------------------------------- |
| [`CLAUDE.md`](./CLAUDE.md)                         | Regras do projeto para quem (ou o quê) trabalha nele |
| [`TODO.md`](./TODO.md)                             | Checklist vivo por sprint                            |
| [`docs/specs/`](./docs/specs)                      | Visão, arquitetura, regras, segurança, operação, IA  |
| [`docs/scrum/BACKLOG.md`](./docs/scrum/BACKLOG.md) | Épicos e histórias de usuário                        |
| [`docs/scrum/SPRINTS.md`](./docs/scrum/SPRINTS.md) | Ordem das sprints e Definition of Done               |

## Estrutura (alvo)

```
apps/web        # Next.js — frontend/PWA
apps/api        # NestJS — regra de negócio, Prisma, jobs, Pluggy, IA
packages/shared # schemas Zod (contrato de API)
packages/config # tsconfig/eslint compartilhados
infra/postgres  # criação do usuário da aplicação (sem superusuário → RLS)
scripts/        # deploy-check, backup-db, disk-space-check
```

## Desenvolvimento local

```bash
pnpm install
docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d postgres   # Postgres em localhost:5433
cp apps/api/.env.example apps/api/.env
pnpm --filter api db:generate
pnpm dev        # web em :3000 e API em :3001; o web reescreve /api/* para a API (mesma origem, como em produção)
```

O Postgres de desenvolvimento usa a porta **5433** no host (a 5432 costuma estar ocupada por outro projeto
rodando na máquina, como o `pdv-web`). Verificações: `pnpm lint && pnpm typecheck && pnpm test && pnpm build`
e `pnpm --filter web cy:run` (testes de componente).

## Deploy na VPS

Checklist completo em [`docs/specs/09-operacao.md`](./docs/specs/09-operacao.md) § 5. Resumo:

1. DNS A/AAAA de `APP_DOMAIN` para a VPS; firewall 22/80/443; SSH só por chave.
2. `cp .env.example .env`, preencher com segredos reais (`openssl rand -hex 32`).
3. `./scripts/deploy-check.sh && docker compose up -d --build` (o `env-check`
   do compose já roda o `deploy-check.sh` de novo sozinho, mas rodar antes
   falha mais cedo com mensagem melhor).
4. Seed do primeiro usuário: `docker compose exec api node dist/seed/prisma/seed.js`
   (lê `SEED_USER_EMAIL`/`SEED_USER_PASSWORD`/`SEED_USER_NAME` do `.env` —
   idempotente, pode rodar de novo; a imagem final não tem `pnpm`, por isso
   é `node` direto no arquivo compilado, não `pnpm db:seed:prod`).
5. Crontab: backup diário e checagem de disco:

```cron
0 3 * * * BACKUP_AGE_RECIPIENT=age1... BACKUP_S3_BUCKET=... /opt/gastos-web/scripts/backup-db.sh
0 * * * * /opt/gastos-web/scripts/disk-space-check.sh
```

`BACKUP_AGE_RECIPIENT` é a chave **pública** (gere o par na sua máquina com
`age-keygen`; a privada nunca vai para a VPS). Credenciais do bucket **só de
escrita**; retenção por lifecycle do bucket (spec 09 § 4).

6. Uptime externo em `/api/health`. Um backup nunca restaurado não é backup:
   faça o drill de restore mensal.

Ainda não construídos (fora de escopo deste primeiro deploy): 2FA e webhook
do Pluggy — o Meu Pluggy (único conector usado hoje, spec 07) não tem
webhook, o sync é por polling/manual (`POST /banking/items/:id/sync`).
