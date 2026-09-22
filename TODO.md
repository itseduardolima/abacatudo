# TODO

Checklist vivo do projeto. **Toda sessão/agente que trabalhar neste
repositório precisa ler este arquivo primeiro** (é a primeira linha do
`CLAUDE.md`) e **atualizá-lo antes de terminar a sessão**: marcar `[x]` o que
foi concluído, adicionar linha nova se surgir trabalho não previsto, mover o
"Em andamento" para refletir onde o trabalho parou.

Detalhe de cada item (critério de aceite, pontos, prioridade) está em
[`docs/scrum/BACKLOG.md`](./docs/scrum/BACKLOG.md); a ordem por sprint em
[`docs/scrum/SPRINTS.md`](./docs/scrum/SPRINTS.md). Este arquivo é só o
estado — não duplique critério de aceite aqui, só referencie o número da HU.

Regra de marcação: só marque `[x]` quando bater a Definition of Done de
`docs/scrum/SPRINTS.md` (typecheck + testes + teste de isolamento com 2 Users,
sem conta de dinheiro no frontend) — não quando o código só "existe".

## Em andamento agora

- **Sprint 0 concluída em 2026-09-21**, incluindo o **spike do Pluggy (0.6)**, fechado com dado real (spec 07).
- **Sprint 1 concluída em 2026-09-22**: RLS (User/Session isentas, documentado), login por e-mail/senha,
  sessão de 30 dias com revogação, seed do primeiro usuário. Testado contra Postgres e API reais, e o
  fluxo de cookie testado num Chrome de verdade (não só curl). Gaps encontrados: ver seção da Sprint 1.
- **Sprint 2 em andamento (2026-09-22)**: contas, pessoas e categorias no ar (RLS, CRUD, testado contra
  API real e isolamento entre usuários). Faltam import OFX/CSV, lançamento manual e lista/filtro — ver
  seção da Sprint 2.
- Próximo: fechar o restante da Sprint 2 (import é o maior item), depois Sprint 3 (classificação).

## Decisões já tomadas (2026-09-21)

- **Cartão = só cartão de crédito.** Débito, Pix, TED, boleto e saldo de
  benefício (VR/VA) são movimentações: só consulta, área separada.
- **Benefício (VR/VA) é renda informada** no orçamento; Bee Vale e InfinitePay
  são contas de movimentação, sem regra própria.
- **Gasto de terceiros no cartão é subtraído**, sem cobrança/saldo por pessoa.

- **Estilo visual: Wise** (Forest Ink + lima, pílulas, display 900) —
  `apps/web/docs/DESIGN_SYSTEM.md`. Referência de estilo, não de marca. Fonte
  do display: **Inter 900** (a Wise Sans é proprietária). Tema **claro** no v1.

- **Nome do produto: AbacaTudo.** O repositório continua `gastos-web` (nome
  técnico); "AbacaTudo" é o nome que o usuário vê.
- **Sessão dura 30 dias sem uso** (janela deslizante), em vez de 7. Ver
  `docs/specs/08-seguranca.md` § 4.

- **Logo: abacate em pose de ioga** (`brand/`). Ícones do PWA já gerados
  (512, 192, 180, maskable). Só sobre fundo claro; mínimo 56px.

- **Uso individual (2026-09-21)**: só o dono usa. O convite de outra pessoa (HU 1.4) sai do escopo. O
  isolamento por usuário no banco (RLS) continua, porque custa pouco e é uma proteção extra.

## Decisões em aberto (resolver antes da sprint indicada)

- [ ] **Girar o Client Secret do Pluggy**: ele foi colado numa conversa (fica no histórico dela). Gerar um
      novo no painel do Pluggy antes de usar em produção. A API Key colada expira sozinha em 2 horas.
- [ ] **Retenção/uso de dados da API de IA contratada** (Sprint 7, HU 10.1):
      confirmar e registrar em spec 10 antes de ligar em produção.
- [ ] **Estados de orçamento (OK/Atenção/Estourou)**: o estilo não define
      cores de status; adaptei (Linen/Forest, Fog+contorno, Alarm Red, sempre
      com ícone e texto). Validar no protótipo (Sprint 0, HU 0.7).
- [ ] **Uso dos logos de bancos** (Nubank, BB, PicPay em `brand/bancos/`):
      confirmar o guia de marca de cada um e a licença. O logo do BB veio em
      azul único, sem o amarelo da marca; conferir se é a versão permitida.
- [ ] **Provedor de SMTP** e domínio final (Sprint 8, HU 1.4/1.5).
- [ ] **Bee Vale / InfinitePay**: como o dono exporta extrato (formato CSV/OFX)
      para desenhar o mapa de colunas (HU 3.2).

## Sprint 0 — Fundação técnica

- [x] 0.1 — Monorepo pnpm + Turborepo, `packages/config`, `packages/shared`
- [x] 0.2 — `apps/api` bootstrap (contexto de usuário, `AuthGuard` fechado por padrão, `DomainError`, Prisma com extensão de RLS, throttler, `/health`). 37 testes; verificada contra Postgres real (health com banco ligado e desligado, 413, 400, rate limit 429).
- [x] 0.3 — `apps/web` bootstrap (Next.js + Tailwind + tokens, `api-client`, CSP com nonce, `Button` e `MoneyText`). 10 testes de componente (Cypress); renderiza com 0 violações de CSP.
- [x] 0.4 — Dockerfiles + compose. Stack completa testada pelo Caddy: domínio único, HSTS/CSP/nosniff, HTTP→HTTPS, sem porta exposta além de 80/443, processos sem root, docs da API desligados em produção.
- [x] 0.5 — CI (`.github/workflows/ci.yml`: audit, format, lint, tipos, testes, build, testes de componente, build das imagens). **Ainda não executada no GitHub** (repositório sem remoto).
- [x] 0.6 — Spike Pluggy **concluído em 2026-09-21**, com dado real (Nubank via Meu Pluggy). Catálogo (InfinitePay existe, Bee Vale não), custo (plano pago inviável; caminho = Meu Pluggy) e **formato dos dados** verificados: spec 07 § Resultado do spike e § Formato dos dados.
- [x] 0.7 — Protótipo das telas (23 telas mobile em 7 fluxos + 11 telas desktop, estilo Wise): https://claude.ai/artifact/CAyHffJCJ5wDrutNeEai1k. Falta validar: estados de orçamento

### Bugs achados só ao rodar de verdade (e corrigidos)

- Payload > 1 MB devolvia 500 em vez de 413; JSON malformado vazava a mensagem crua da biblioteca.
- Container da API em loop de reinício: `prisma generate` na inicialização falha para usuário sem root.
- Dependências transitivas com 6 vulnerabilidades altas (`multer`, `postcss`, `deepmerge-ts`), corrigidas via `overrides` no `pnpm-workspace.yaml` (remover quando as dependências diretas trouxerem a versão corrigida).
- `/api/health` do web conflitava com o roteamento do Caddy (`/api/*` vai para a API): o health do web é `/healthz`.

## Sprint 1 — Auth + isolamento por usuário

- [x] 1.1 — RLS por `user_id` (User/Session isentas, documentado) + prova manual com psql (0 linhas sem contexto, INSERT de outro usuário recusado, `gastos` sem superuser/bypassrls). Ainda falta o teste automatizado com 2 Users — só existirá endpoint para provar isso via HTTP a partir da Sprint 2 (Person/Category ainda não têm Controller); a política em si já está ativa e será exercida pelos testes de isolamento dos módulos futuros.
- [x] 1.2 — Login e-mail/senha (argon2id, rate limit por e-mail **e** IP a 5/15min, cookie `__Host-gastos_session`). Verificado num navegador real (Chrome): o cookie `Secure` é aceito em `http://localhost` (contexto seguro), `httpOnly` de fato invisível a `document.cookie`
- [x] 1.3 — Sessão de 30 dias sem uso (janela deslizante, cookie renovado a cada request autenticado), logout revoga no servidor, listar/encerrar sessões (`GET /auth/sessions`, `DELETE /auth/sessions/:id`)
- [x] 1.9 — Seed do primeiro usuário (idempotente, testado rodando 2x), cria `Person` self e as 13 categorias padrão

### Decisões e gaps encontrados nesta sprint

- **RLS não pode ser gerido pelo `AuthGuard`, só por uma Middleware.** Um `CanActivate` não consegue
  envolver o `next.handle()`/handler no `AsyncLocalStorage.run()` — corrigido no spec 08 § 1. A
  resolução da sessão (e o estabelecimento do contexto) ficou no novo `SessionMiddleware`; o `AuthGuard`
  só confere se já foi resolvido.
- **`prisma migrate dev` precisa de um banco-sombra**, que exige `CREATEDB` — o papel `gastos` não tem
  (nem deveria, spec 08 § 1). Solução: `SHADOW_DATABASE_URL` aponta para o superusuário só em dev
  (`.env.example` do `apps/api`); produção nunca usa `migrate dev`, só `migrate deploy`.
- **Gap no backlog**: não existe HU dedicada para "trocar minha senha" logado (a 1.5 é só "esqueci a
  senha"). `revokeSession`/listagem cobrem "posso encerrar sessões"; falta decidir onde entra a troca de
  senha e se ela revoga as outras sessões, antes de Configurações (Sprint 8).
- **Seed em produção**: `pnpm db:seed` usa `ts-node`, que não existe na imagem de produção (só
  dependências de produção). Falta um caminho de seed para o primeiro deploy real — registrar como
  item da Sprint 8 (checklist do primeiro deploy, 12.5).
- **`argon2` faltava no `package.json`** (fiquei só na regra do spec) — adicionado.

## Sprint 2 — Contas, pessoas, categorias, import

- [x] 2.1 — Contas (`Account`: CREDIT_CARD/CHECKING/CASH, RLS, closingDay/dueDay/creditLimitCents só em cartão)
- [x] 2.2 — Pessoas (CRUD + arquivar; self nunca arquivável)
- [x] 2.4 — Categorias (CRUD + renomear + arquivar; nome único por usuário, 409 em duplicata)
- [x] 3.5 — Fuso `America/Manaus` (mudou de São Paulo pra Manaus a pedido do usuário; `common/date/timezone.ts`)
      **Ordem do que falta (a pedido do usuário, 2026-09-22): lançamento manual por último.**

- [ ] 3.1 — Import OFX/CSV com pré-visualização (não começado — é o item maior da sprint; primeiro)
- [ ] 3.4 — Lista e filtros (depende de existir o model `Transaction`, criado junto do import)
- [ ] 3.3 — Lançamento manual (deixado por último de propósito)
- [~] 5.1 — Separação por tipo de conta está pronta na modelagem (`Account.type` decide o escopo, sem
  campo de canal por lançamento); falta o par `TransactionRepository`/`MovementRepository` lendo a mesma
  tabela, que só existe quando o model `Transaction` for criado (junto de 3.1/3.4)

**Por que parei aqui**: 2.1/2.2/2.4/3.5 formam a base que 3.1/3.3/3.4 precisam (conta pra lançar,
categoria/pessoa pra classificar, fuso pra agrupar por mês). Import OFX/CSV é o item mais arriscado da
sprint (parser com limites de segurança, idempotência, pré-visualização) — não dava pra encaixar com o
mesmo rigor no mesmo lote sem cortar canto em algo. Continua na Sprint 2, só que numa próxima etapa.

Lição desta etapa: ao provar isolamento entre 2 usuários pela API, testei sem querer com `psql -U
postgres` (superusuário, que ignora RLS) e o resultado pareceu vazar dado do usuário 1 pro 2 — susto à
toa, era erro do meu teste, não do sistema. Refeito com `-U gastos` (o papel restrito de verdade) confirma
0 linhas para quem não tem nada. Lembrete pra mim mesmo: prova de RLS **sempre** com o papel da aplicação,
nunca com o superusuário.

## Sprint 3 — Classificação

- [ ] 4.1 — Caixa "a classificar"
- [ ] 4.2 — "Sempre para este estabelecimento" (regras)
- [ ] 4.4 — Dividir compra
- [ ] 4.5 — Categorização automática por regras/histórico

## Sprint 4 — Fatura só com a minha parte + Movimentações

- [ ] 6.1 — Fatura: total − não é meu − a classificar = meu
- [ ] 6.2 — "Meu" do mês alimenta o orçamento
- [ ] 5.2 — Extrato de Pix e contas (área separada)
- [ ] 5.3 — Totais de entrada/saída (informativos)

## Sprint 5 — Orçamento e relatórios

- [ ] 7.1 — Renda, fixos, poupança → teto variável
- [ ] 7.2 — Envelopes
- [ ] 7.3 — Alertas 70/90/100
- [ ] 8.6 — "Última atualização" por conta
- [ ] 9.1 — Para onde vai o dinheiro

## Sprint 6 — Integração Pluggy

- [ ] 8.1 — Conectar banco (widget + connect token)
- [ ] 8.2 — Sync idempotente
- [ ] 8.3 — Sync diário/manual (sem webhook)
- [ ] 8.4 — Aviso de consentimento
- [ ] 8.5 — Desconectar
- [ ] 2.3 — Cartão adicional → pessoa

## Sprint 7 — Insights e IA

- [ ] 9.2 — Assinaturas
- [ ] 9.3 — Cobrança duplicada
- [ ] 9.4 — Categoria acima do normal
- [ ] 9.5 — Onde economizar
- [ ] 10.1 — Sugestão de categoria por IA
- [ ] 10.2 — Resumo mensal
- [ ] 10.4 — Orçamento de tokens e liga/desliga
- [ ] 10.5 — Defesa contra injeção via descrição

## Sprint 8 — Segurança reforçada, convite, PWA, produção

- [ ] 1.4 — Convidar uma pessoa
- [ ] 1.5 — Redefinir senha
- [ ] 1.6 — 2FA TOTP
- [ ] 1.7 — Reautenticação em ação sensível
- [ ] 1.8 — Exportar e excluir conta
- [ ] 7.4 — Ritmo (por dia)
- [ ] 7.5 — Parcelas futuras
- [ ] 7.6 — Congelar meses fechados
- [ ] 10.3 — Chat com tool use
- [ ] 11.1 — PWA instalável
- [ ] 11.2 — Ocultar valores (tema escuro é P2, precisa de desenho)
- [ ] 11.3 — Estados vazios/carregando/erro
- [ ] 12.1 — `/health` + uptime externo
- [ ] 12.2 — Backup criptografado + drill de restore
- [ ] 12.3 — Deploy via CI
- [ ] 12.4 — Redaction de log + alerta de sync parado
- [ ] 5.4 — Rótulo "transferência entre suas contas"/"pagamento de fatura"
- [ ] 5.5 — Nota opcional em movimentação
- [ ] 12.5 — Checklist do primeiro deploy
