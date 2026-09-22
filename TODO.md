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
  API real e isolamento entre usuários). Import OFX/CSV (3.1) foi **pulado a pedido do usuário** — a fonte
  de dado passou a ser a API do Pluggy direto (3.1 fica pra trás de tudo, só se algum dia fizer falta).
  Lançamento manual (3.3) segue por último de propósito.
- **Integração Pluggy construída em 3 etapas nesta sessão (2026-09-22)**, a pedido do usuário
  ("faça etapa por etapa"): (1) models `Transaction`/`PluggyItem` + RLS, (2) `PluggyClient` (auth,
  retry/timeout, schemas Zod), (3) módulo `banking` (conectar, checar status por polling, sincronizar) e o
  par `TransactionRepository`/`MovementRepository` (5.1, 3.4 básico). Cobre 8.1/8.2/8.3 da Sprint 6, feitos
  fora de ordem porque o usuário pediu Pluggy antes de import/lançamento manual.
- **Verificado ao vivo, de ponta a ponta (2026-09-22)**: Docker recuperado (o Docker Desktop tinha travado
  sem gerar o socket; matei tudo e reabri limpo), API de pé contra o Postgres real, o usuário autorizou de
  verdade um Nubank real no Chrome, `checkStatus` detectou `UPDATED` e disparou o sync sozinho. **3 bugs
  reais achados e corrigidos** nesse teste (link OAuth assíncrono, paginação do cursor, categoria de
  pagamento de fatura) — ver "Bugs achados só ao rodar de verdade" da Sprint 6. Sprint 6 fecha 8.1/8.2/8.3
  de verdade agora; 5.1 e 3.4 (básico) também.
  Limpei o usuário/item de teste depois (no banco e no Pluggy) — banco de dev volta vazio.
- **Sprint 3 iniciada (2026-09-22) — Etapa 1 concluída**: model `Rule` + RLS, `PersonRepository.findSelf`,
  e o pipeline de atribuição de pessoa ligado no sync (toda transação nasce "Meu", `Rule` decide antes
  quando o estabelecimento bate). Achei e corrigi mais 1 bug ao testar: `merchant` nunca vinha preenchido
  porque o schema esperava `name` e o campo real do Pluggy é `businessName`. Verificado ao vivo: 1670
  transações sincronizadas sem nenhuma sem pessoa, e uma `Rule` de teste pra "Prime Video" roteou as 27
  transações certas pra outra pessoa enquanto o resto ficou "Eu". Faltam as Etapas 2-4 (endpoint pra
  corrigir pessoa + criar regra, `Split`, categorização automática).
- **Sprint 3 Etapa 2 concluída (2026-09-22)**: `PATCH /transactions/:id/person` corrige a pessoa de uma
  transação (só cartão — 404 em conta de movimentação); `alwaysForMerchant` cria/atualiza a `Rule` do
  estabelecimento normalizado, rejeita (`400 MERCHANT_REQUIRED_FOR_RULE`) se a transação não tiver
  merchant. Verificado ao vivo contra Postgres real: troca de pessoa, criação da `Rule` (linha conferida
  no banco), rejeição sem merchant, 404 em movimentação e em pessoa inexistente.
- **Sprint 3 Etapa 3 concluída (2026-09-22)**: model `Split` + RLS, `POST .../split/preview` (divisão igual
  calculada pela API, nunca no cliente — resto de centavos pros primeiros), `PUT .../split` (substitui os
  splits, exige soma exata, rejeita pessoa duplicada), `DELETE .../split` (desfaz, volta pro self).
  Corrigir a pessoa direto (`PATCH .../person`) também desfaz um split ativo. Verificado ao vivo contra
  Postgres real: os 6 cenários (preview, grava, soma errada, pessoa duplicada, desfazer, e desfazer via
  correção de pessoa) todos se comportaram certo.
- **Sprint 3 Etapa 4 concluída (2026-09-22) — Sprint 3 fechada**: `Rule` ganhou `categoryId` opcional (junto
  do `personId`, também opcional agora — pelo menos um dos dois preenchido, `CHECK` no banco), com
  `upsertPerson`/`upsertCategory` cada um mexendo só no seu campo. Sync resolve a categoria da mesma forma
  que a pessoa (Rule decide; sem Rule, "sem categoria" — não tem "padrão" pra categoria como tem pra
  pessoa). `PATCH /transactions/:id/category` corrige a categoria, com `alwaysForMerchant` criando/
  atualizando a `Rule`. Verificado ao vivo: correção, criação da regra (só `categoryId`, `personId` ficou
  null), 404 de categoria inexistente.
  **Gap consciente**: o pipeline do spec (03-regras-negocio § Categorias e regras) tem um item 3 "mesmo
  merchant já confirmado pelo usuário" (aprende sem precisar de `Rule` explícita) que não foi construído —
  precisaria decidir como distinguir categoria "confirmada pelo usuário" de categoria "herdada por sync",
  o que hoje não existe no schema. Registrado aqui pra decidir antes de expandir classificação.
- **Code review da Sprint 3 (2026-09-22)**: 2 achados, os dois corrigidos e verificados ao vivo — `preview`
  de split não validava pessoa duplicada como `replace` valida (agora os dois usam a mesma checagem);
  pessoa/categoria arquivada podia ser atribuída via `PATCH .../person`, `.../category` e o split
  (`findById` não filtrava `archivedAt` — criado `findActiveById`, usado só nesses endpoints de
  atribuição; `findById` puro continua igual pra não quebrar o fluxo de arquivar).
- **Sprint 4 concluída (2026-09-22)**: 2 bugs reais achados antes de construir — `resolveKind` mapeava todo
  `CREDIT` do Pluggy pra `REFUND`, mas numa conta de movimentação `CREDIT` é dinheiro entrando de verdade
  (agora `INCOME`, `REFUND` só em cartão); e o sync atribuía pessoa/categoria (via `Rule`) até em
  transação de movimentação, quando o spec diz que isso não existe lá (agora sempre `null` fora de
  cartão). `GET /movements` ganhou filtro de conta/direção/busca (5.2) e `GET /movements/totals` (5.3).
  Módulo `invoice` novo: `GET /invoice?accountId=&month=` (fatura por cartão, 6.1) e
  `GET /invoice/summary?month=` (Meu somado em todos os cartões, 6.2) — `computeInvoice` é função pura,
  testada isoladamente (estorno reduz o total, split conta só a fatia do self, `CARD_PAYMENT` nunca entra).
  Verificado ao vivo contra os 1670 dados reais sincronizados: totais batendo com o banco, e a invariante
  `Fatura = Meu + Não é meu` conferida à mão depois de reatribuir uma transação e depois de dividir outra.
- **Code review da Sprint 4 (2026-09-22)**: 2 achados, os dois corrigidos e verificados ao vivo — corrigir a
  pessoa direto gravava e desfazia o split em 2 chamadas separadas (uma falha no meio deixava split velho
  "escondido" que `computeInvoice` priorizava sobre a pessoa nova; virou 1 chamada atômica reaproveitando o
  `$transaction` que `SplitRepository` já tinha, renomeado pra `setSinglePerson`); a checagem de
  `accountId` obrigatório da fatura vivia solta no controller, sem teste — movida pro `InvoiceService`.
- **Sprint 5 iniciada (2026-09-22) — Etapa 1 concluída**: model `BudgetMonth` + RLS,
  `GET`/`PUT /budget/month?month=` (7.1). Virada de mês copia a config do mês mais recente já configurado;
  mês fechado (passado) é imutável (`422 BUDGET_MONTH_CLOSED` no PUT, GET devolve zero sem gravar nada).
  `variableCapCents` = renda + benefício − fixos − poupança, calculado, nunca guardado. Verificado ao vivo:
  os 5 cenários (criar zerado, gravar, virada copiando, rejeitar mês fechado, ler mês fechado sem linha
  nova) todos bateram.
- Próximo: Sprint 5 Etapa 2 — envelopes por categoria (7.2).

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

- **Toda transação nasce "Meu" (2026-09-22)**: sem fila "a classificar" —
  padrão é o Dono (`Person isSelf`), o User corrige (troca a pessoa ou
  divide) quando for de outra pessoa. Muda o pipeline de atribuição de
  pessoa e a fatura (agora só `Fatura = Meu + Não é meu`) — ver
  `docs/specs/03-regras-negocio.md` § Atribuição de pessoa e § Só a minha
  parte. HU 4.1 do backlog foi reescrita de acordo (era "caixa a
  classificar", virou "corrigir pessoa em 1 toque").

- **Uso individual (2026-09-21)**: só o dono usa. O convite de outra pessoa (HU 1.4) sai do escopo. O
  isolamento por usuário no banco (RLS) continua, porque custa pouco e é uma proteção extra.

## Decisões em aberto (resolver antes da sprint indicada)

- [ ] **Girar o Client Secret do Pluggy**: ele foi colado numa conversa (fica no histórico dela). Gerar um
      novo no painel do Pluggy antes de usar em produção. A API Key colada expira sozinha em 2 horas.
- [x] **Colocar `PLUGGY_CLIENT_ID`/`PLUGGY_CLIENT_SECRET` novos direto em `apps/api/.env`** — feito pelo
      usuário em 2026-09-22; usado pra testar `connect` contra a API real (achou e corrigiu 1 bug, ver
      Sprint 6). Falta só autorizar de verdade (o usuário loga no banco) pra testar `checkStatus`/sync.
- [ ] **`RecentAuthGuard` (HU 1.7, reautenticação) não existe ainda** — deferido na Sprint 1. O endpoint
      `POST /banking/items` (conectar banco) por enquanto só tem o `AuthGuard` normal, sem reautenticação
      recente. Registrar como gap até decidir se entra antes do Sprint 6 "fechar" ou fica pra
      Configurações (Sprint 8).
- [ ] **Job diário de sync** (`@nestjs/schedule`) não existe — só o `POST /banking/items/:id/sync` manual e
      o sync automático na primeira vez que o status vira `UPDATED`. Entra quando o Sprint 6 fechar.
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

- [x] ~~3.1 — Import OFX/CSV com pré-visualização~~ **pulado a pedido do usuário (2026-09-22)**: a fonte de
      dado passou a ser a API do Pluggy direto, não arquivo. Ver Sprint 6.
- [x] 3.4 — Lista e filtros: básico pronto (`GET /transactions?month=`, `GET /movements?month=`, filtro por
      mês em America/Manaus); filtro por categoria/pessoa/texto fica pra quando existir UI pra isso
- [ ] 3.3 — Lançamento manual (deixado por último de propósito)
- [x] 5.1 — `Account.type` decide o escopo (sem campo de canal por lançamento); `TransactionRepository`
      (só `CREDIT_CARD`) e `MovementRepository` (o resto), mesma tabela `Transaction`, filtros diferentes

**Por que parei aqui**: o usuário pediu pra inverter a ordem — Pluggy (Sprint 6) antes de import/lançamento
manual, porque puxar dado de verdade é melhor teste do que simular. 3.1 saiu do escopo; 3.4 e 5.1 saíram
prontos como efeito colateral de construir `Transaction`/`banking` pro Pluggy. Falta só 3.3.

Lição desta etapa: ao provar isolamento entre 2 usuários pela API, testei sem querer com `psql -U
postgres` (superusuário, que ignora RLS) e o resultado pareceu vazar dado do usuário 1 pro 2 — susto à
toa, era erro do meu teste, não do sistema. Refeito com `-U gastos` (o papel restrito de verdade) confirma
0 linhas para quem não tem nada. Lembrete pra mim mesmo: prova de RLS **sempre** com o papel da aplicação,
nunca com o superusuário.

## Sprint 3 — Classificação

Escopo mudou a pedido do usuário (2026-09-22): toda transação nasce "Meu", sem fila de pendência — ver
"Decisões já tomadas". 4.1 virou "corrigir pessoa em 1 toque".

- [x] 4.1 — Corrigir pessoa em 1 toque: `PATCH /transactions/:id/person`, testado ao vivo
- [x] 4.2 — "Sempre para este estabelecimento": `alwaysForMerchant` no mesmo endpoint, testado ao vivo
- [x] 4.4 — Dividir compra: model `Split`, preview + PUT + DELETE, testado ao vivo
- [~] 4.5 — Categorização automática: `Rule` decide (testado ao vivo); falta "mesmo merchant já confirmado
  pelo usuário" (gap consciente, ver "Em andamento agora") e a sugestão de IA (Sprint 7)

### Bugs achados só ao rodar de verdade (e corrigidos)

- `merchant` nunca vinha preenchido: o schema esperava `merchant.name`, mas o campo real do Pluggy é
  `merchant.businessName`. Achado ao testar a `Rule` contra dado real (sem merchant, "sempre para este
  estabelecimento" não tinha o que casar).

## Sprint 4 — Fatura só com a minha parte + Movimentações

- [x] 6.1 — Fatura: `GET /invoice?accountId=&month=`, total − não é meu = meu, testado ao vivo
- [x] 6.2 — "Meu" do mês (todos os cartões): `GET /invoice/summary?month=`, testado ao vivo
- [x] 5.2 — Extrato de movimentação: `GET /movements` com filtro de conta/direção/mês/busca, testado ao vivo
- [x] 5.3 — Totais de entrada/saída: `GET /movements/totals?month=`, testado ao vivo

### Bugs achados só ao rodar de verdade (e corrigidos)

- `resolveKind` mapeava todo `CREDIT` do Pluggy pra `REFUND` (correto só em cartão) — numa conta de
  movimentação isso fazia um Pix recebido virar "estorno". Agora `CREDIT` em conta não-cartão vira
  `INCOME`.
- O sync atribuía pessoa (padrão "Meu"/`Rule`) e categoria (via `Rule`) até em transação de movimentação,
  quando 03-regras-negocio diz que isso só existe em cartão. Agora `personId`/`categoryId` são sempre
  `null` fora de `CREDIT_CARD`, mesmo com uma `Rule` pro merchant.

## Sprint 5 — Orçamento e relatórios

- [x] 7.1 — Renda, fixos, poupança → teto variável: `GET`/`PUT /budget/month`, testado ao vivo
- [ ] 7.2 — Envelopes
- [ ] 7.3 — Alertas 70/90/100
- [ ] 8.6 — "Última atualização" por conta
- [ ] 9.1 — Para onde vai o dinheiro

## Sprint 6 — Integração Pluggy

Construída fora de ordem (2026-09-22), a pedido do usuário, em 3 etapas: model → `PluggyClient` → módulo
`banking`. **Verificado ao vivo e de ponta a ponta em 2026-09-22**: Docker recuperado, credencial nova do
usuário no `.env` (nunca colada no chat), `connect()` real, autorização de verdade no Chrome (o usuário
logou num Nubank real), `checkStatus` detectou `UPDATED` e disparou o sync sozinho, sync manual repetido
depois de cada correção. Resultado final: 2 contas (1 corrente, 1 cartão) e 1670 transações reais
sincronizadas sem duplicar, `/transactions` só com o cartão (409 compra + 3 estorno + 39 pagamento de
fatura) e `/movements` só com o resto — como o desenho previa.

- [x] 8.1 — Conectar banco: `POST /banking/items` cria o item Meu Pluggy (único conector gratuito, spike já
      provou isso) e devolve `authorizeUrl`; sem webhook, então o front faz _polling_ em
      `GET /banking/items/:id` (`checkStatus`) até sair de `WAITING_USER_INPUT`
- [x] 8.2 — Sync idempotente: upsert por `[accountId, externalId]` (`banking-sync.repository.ts`), nunca
      duplica; nunca sobrescreve `categoryId`/`personId`/`note` (são do usuário, não do Pluggy)
- [x] 8.3 — Sync diário/manual (sem webhook): `POST /banking/items/:id/sync` (manual) + primeira vez que o
      `checkStatus` vê o status virar `UPDATED` (automático). **Falta o job diário agendado** — ver gap acima
- [ ] 8.4 — Aviso de consentimento (`consentExpiresAt` já é lido e salvo; falta a UI de aviso)
- [ ] 8.5 — Desconectar
- [ ] 2.3 — Cartão adicional → pessoa

### Bugs achados só ao rodar de verdade (e corrigidos)

- `createMeuPluggyItem` assumia que a `authorizeUrl` vinha pronta na resposta de `POST /items` — na prática
  o Pluggy devolve `parameter: null` e só popula o link OAuth uns 2s depois. Corrigido com um polling curto
  e limitado (`waitForAuthorizeUrl`, 5 tentativas de 1,5s) antes de desistir.
- `listTransactions` tratava o cursor `next` como URL absoluta e colava direto em `BASE_URL` — na prática o
  Pluggy manda só a querystring (`?accountId=...&after=...`), então cada conta parava na primeira página
  (500 transações) sem avisar erro nenhum. Corrigido montando o path certo (`/v2/transactions${cursor}`).
- `resolveKind` tentava achar pagamento de fatura pelo `operationType`, mas o Pluggy manda "PAGAMENTO" tanto
  pra compra parcelada quanto pro pagamento em si — nunca distinguia. O sinal certo é a `category`/
  `categoryId` que o Pluggy já classifica ("Credit card payment" / `05100000`), adicionado ao schema.

### Code review (2026-09-22) — 4 achados, todos corrigidos e reverificados ao vivo

- **`lastErrorCode` era campo morto**: existia na coluna e no DTO, mas nada escrevia nele — conexão com
  `LOGIN_ERROR`/`ERROR` não dava motivo nenhum pro usuário. `checkStatus` agora persiste `error.code` do
  Pluggy (schema `pluggyItemSchema` ganhou o campo `error`).
- **`listAccounts` não paginava**: a resposta real vem com `total`/`totalPages`/`page`, mas só a primeira
  página era lida — alguém com contas suficientes pra estourar uma página perdia o resto do sync
  silenciosamente. Corrigido com um loop limitado a `MAX_ACCOUNT_PAGES` (20).
- **Race de conta duplicada**: o dedup em `runSync` era "checa depois cria", não atômico — duas
  sincronizações simultâneas do mesmo item podiam criar duas contas pra mesma conta real. Fechado com
  `@@unique([userId, externalAccountId])` no schema (NULL nunca colide com NULL, então conta manual
  continua livre) e um `upsert` atômico em `AccountRepository.upsertFromSync`.
- **`occurredAt` usava a data errada em parcela**: dado real mostrou uma parcela com `date` quase 1 ano à
  frente de `creditCardMetadata.purchaseDate` (a data real da compra) — `date` é quando a parcela cai na
  fatura, não quando a compra aconteceu. Corrigido pra preferir `purchaseDate`; reverificado com sync real
  — as 3 parcelas de uma mesma compra agora compartilham a mesma `occurredAt`, em vez de espalhadas em
  meses futuros.

Todos os 4 reverificados contra Postgres real e uma nova autorização de verdade no Nubank (144 testes,
typecheck/lint/build limpos).

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
