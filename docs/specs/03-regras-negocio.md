# Regras de Negócio

Fonte da verdade de comportamento. Toda feature nova precisa ser consistente
com este arquivo ou atualizá-lo junto. Todo valor em **centavos inteiros**;
todo "mês" e "dia" em `America/Sao_Paulo`.

## Escopo: o que o sistema gerencia (leia primeiro)

Decisão de produto: **só compra no cartão de crédito é gerenciada.** Débito,
Pix, TED, boleto, saque, saldo de benefício (VR/VA) e demais movimentações
de conta **podem ser exibidos, mas em telas e funcionalidades separadas**, e
nunca se misturam com a gestão.

| Vale só para compra no cartão de crédito           | Vale para débito, Pix, benefício e contas ("Movimentações") |
| -------------------------------------------------- | ----------------------------------------------------------- |
| Categoria, regras, IA de categoria                 | Lista/extrato, filtros e busca                              |
| Pessoa (meu x não é meu), divisão, "a classificar" | Totais de entrada e saída do mês (só informativos)          |
| Fatura "só a minha parte"                          | Rótulo de transferência entre contas próprias               |
| Orçamento, envelopes, alertas, ritmo, parcelas     | Nota opcional por lançamento                                |
| Relatórios, assinaturas, "onde economizar"         | —                                                           |
| Resumo e chat da IA                                | —                                                           |

- **Cartão = cartão de crédito.** O que decide é o **tipo da conta**
  (`Account.type = CREDIT_CARD`), sem heurística por lançamento: toda
  transação de uma conta de cartão de crédito é gerenciada, e toda transação
  de qualquer outra conta é movimentação. Não existe "na dúvida", nem campo
  de canal por lançamento.
- **Benefício (VR/VA) é tratado como renda**: o User informa o valor mensal
  no orçamento (ver "Orçamento mensal"). Os saldos e Pix da Bee Vale e da
  InfinitePay são contas comuns de movimentação; mover o dinheiro entre elas
  e para outros bancos (Bee Vale → InfinitePay → Nubank) não afeta nada de
  gestão.
- **Consequência assumida**: gasto no débito, no Pix ou no saldo do benefício
  **não entra** no orçamento nem nos relatórios. Por isso renda, benefício e
  gastos fixos são **informados por você** (ver "Orçamento mensal"), em vez de
  detectados nas movimentações.
- A API rejeita (`422 NOT_A_CARD_TRANSACTION`) categoria, pessoa, split ou
  regra em lançamento de conta que não é `CREDIT_CARD`.
- `TransactionRepository` só devolve lançamentos de contas `CREDIT_CARD`;
  `MovementRepository` só devolve os das demais — uma tela ou relatório não
  consegue misturar os dois por acidente.

## Usuários e acesso

- **User** é quem faz login. Só existe um papel (o dono dos próprios dados) —
  não há admin, não há visão de outro User.
- **Cadastro só por convite.** O primeiro User nasce pelo seed
  (`SEED_USER_*`). Um User logado pode gerar **um convite por vez** (token de
  32 bytes aleatórios, o banco guarda só o SHA-256, uso único, validade 72h,
  emitir novo invalida o anterior) e envia por e-mail. Quem aceita define a
  própria senha. Não existe rota de cadastro aberto.
- **Dados de um User nunca são visíveis a outro**, nem para quem convidou.
  Convidar não cria vínculo de dados.
- **Ações sensíveis exigem senha de novo** (reautenticação, válida 5 min):
  conectar/desconectar banco, exportar dados, excluir conta, desligar 2FA.
- **Excluir conta** apaga tudo do User (dados locais + revoga os Items no
  Pluggy) — irreversível, com confirmação explícita. Ver 08 § 13.

## Autenticação

- E-mail + senha (mínimo 12 caracteres, verificada contra lista de senhas
  comuns). Hash argon2id.
- **2FA por TOTP**: opcional em v1, mas o app pede na primeira semana e
  mostra aviso enquanto estiver desligado. Com 2FA ligado, gera 10 códigos
  de recuperação de uso único (guardados como hash).
- Rate limit de login: 5 tentativas / 15 min por e-mail **e** por IP.
  Mensagem sempre genérica ("E-mail ou senha incorretos").
- Sessão em cookie `httpOnly`, expira após 30 dias **sem uso** (janela
  deslizante); logout invalida no servidor (`Session` com `revokedAt`).
  Trocar senha revoga todas as outras sessões.
- Redefinir senha: link de uso único, 1h, resposta `204` sempre (não
  confirma se o e-mail existe).

## Pessoas (Person)

- Todo User tem uma Person `isSelf = true`, criada junto com a conta, não
  removível.
- O User cadastra familiares como Person (`name`, cor opcional). Person não
  faz login e não é User.
- Person com transações não pode ser apagada; pode ser **arquivada** (some
  das listas de escolha, o histórico fica).
- Nome de Person é dado pessoal de terceiro: guardado só como rótulo, sem
  CPF, telefone ou qualquer outro dado (ver 08 § 13).

## Contas (Account)

- Tipos: `CREDIT_CARD` (a única gerenciada), `CHECKING` (conta corrente,
  débito, carteira de benefício — qualquer conta que não seja cartão de
  crédito) e `CASH`. O tipo decide o escopo (ver "Escopo"); no import manual
  o User escolhe o tipo da conta.
- Origem (`source`): `PLUGGY` (sincronizada), `IMPORT` (OFX/CSV) ou
  `MANUAL`. Uma conta tem uma origem só.
- Conta `PLUGGY` é somente leitura: o User não edita valor/data de uma
  transação vinda do banco — só classifica (categoria, pessoa, divisão,
  observação). Conta `MANUAL`/`IMPORT` aceita edição completa.
- Cartão de crédito guarda `closingDay`, `dueDay` e `creditLimitCents` (do
  banco quando disponível, senão informado).
- **Cartão adicional / virtual**: `CardHolderHint` mapeia os 4 últimos
  dígitos de um cartão a uma Person — toda transação daquele cartão já chega
  com a pessoa preenchida (a forma mais limpa de separar, ver "Atribuição de
  pessoa").

## Transações (Transaction)

Campos de negócio: `accountId`, `amountCents` (sempre positivo),
`direction` (`OUT` | `IN`), `occurredAt`, `description` (original do banco,
imutável), `merchant`
(normalizado), `kind`, `installment?` (`{number, total}`), `externalId`
(idempotência), `note?`. **Só em conta `CREDIT_CARD`**: `categoryId?`,
`personId?` e splits.

`kind`: `EXPENSE`, `REFUND`, `INCOME`, `CARD_PAYMENT` (a linha de pagamento
da fatura, dos dois lados) e `TRANSFER` (entre contas do próprio User, só
rótulo em Movimentações).

- **Idempotência**: `(accountId, externalId)` é único. Sincronizar de novo
  nunca duplica.
- **Pendente vs. lançada**: transação `PENDING` do banco pode mudar de valor
  ou sumir; quando vira lançada, atualiza a mesma linha (mesmo `externalId`
  ou reconciliação por valor+data+merchant), preservando a classificação do
  User.
- **Classificação do User nunca é sobrescrita por sincronização.** Sync só
  atualiza campos de origem (valor, data, descrição, status).
- `REFUND` reduz o gasto da categoria/pessoa da compra original quando
  vinculado; sem vínculo, entra como devolução na própria categoria.

### O que o Pluggy entrega e como vira regra (verificado com dado real)

Detalhe e números em [07-integracao-bancaria](./07-integracao-bancaria.md) § Formato dos dados.

- **Cartão de crédito**: compra = `DEBIT` (valor positivo); pagamento de fatura e estorno = `CREDIT` (negativo).
  A regra vale pelo **tipo**, nunca pelo sinal.
- **Parcelas futuras**: transação com `date` depois de hoje é **parcela futura** (vem `PENDING`): fica fora do
  mês corrente e dos totais, e só aparece em "parcelas futuras".
- **Fatura**: agrupa por `billId`; as pendentes (sem `billId`) pertencem à fatura aberta.
- **Cartão adicional**: o final do cartão de cada transação (`cardNumber`) já resolve a pessoa via
  `CardHolderHint`, antes de qualquer classificação manual.

## Atribuição de pessoa ("meu" x "não é meu")

Ordem do pipeline, parando no primeiro que decidir:

1. **Já confirmada pelo User** → nunca muda sozinha.
2. **Cartão adicional/virtual** (`CardHolderHint`).
3. **Regra do User** (`Rule` com `personId`): por estabelecimento, por conta,
   por faixa de valor, ou combinação.
4. **Mesmo estabelecimento já confirmado** para uma Person em >= 3
   ocorrências consecutivas sem exceção → sugere (não aplica) a mesma
   Person.
5. **Sem decisão** → `personId = null`, entra na caixa **"A classificar"**.

Regras:

- **Padrão é "a classificar", não "meu".** Transação sem pessoa **não**
  entra no orçamento; aparece em faixa de aviso ("R$ X ainda sem dono")
  para evitar falsa sensação de folga. (Configurável depois; v1 fixo.)
- Classificar em 1 toque: `Meu`, uma Person, ou `Dividir`. Ao classificar,
  o app oferece **"sempre que for este estabelecimento"** (cria `Rule`).
- Classificar em lote: selecionar várias e aplicar uma pessoa.
- **Divisão (`Split`)**: uma transação pode ser dividida entre Persons com
  valores em centavos; a soma dos splits **tem que ser igual** ao total (a
  API rejeita se não fechar). "Dividir igualmente" distribui o resto de
  centavos determinísticamente (primeiro os primeiros). Cada split conta
  para a Person dele, na categoria da transação.
- Compra parcelada mantém a pessoa nas parcelas futuras (a regra vale para
  o grupo de parcelas).

## Categorias e regras

- Categorias padrão vêm do seed (Mercado, Alimentação fora, Combustível,
  Transporte, Moradia, Contas fixas, Saúde, Lazer, Assinaturas, Educação,
  Compras, Viagem, Outros). O User cria/renomeia/arquiva as dele.
- Pipeline de categoria, parando no primeiro que decidir:
  1. Confirmada pelo User → intocável.
  2. `Rule` do User (prioridade por especificidade, depois mais recente).
  3. Mesmo `merchant` normalizado já confirmado pelo User.
  4. **Sugestão da IA** (se ligada, ver [10-ia](./10-ia.md)): entra como
     `categorySuggested` com confiança; só vira categoria efetiva se
     confiança >= limiar **ou** o User aceitar. Abaixo do limiar fica
     "sem categoria".
  5. Sem categoria.
- Corrigir uma categoria pergunta se vale para "todas deste estabelecimento"
  (cria/atualiza `Rule` e reaplica retroativamente só nas ainda não
  confirmadas).
- `Rule` é do User (RLS). Não existe regra global compartilhada entre Users.

## Movimentações (Pix e contas) — área separada

Tudo que **não** é compra no cartão de crédito (débito, Pix, TED, boleto,
saque, benefício). É consulta, não gestão: telas próprias,
endpoints próprios (`/movements`), módulo próprio (`movement`).

- **O que existe**: lista/extrato de todas as contas, com filtro por conta,
  direção (entrada/saída), mês e busca por contraparte/descrição; **totais
  de entrada e saída do mês**, rotulados como "não entram no orçamento"; nota
  opcional por lançamento.
- **O que NÃO existe aqui**: categoria, pessoa, divisão, regra, envelope,
  alerta, relatório de economia, "a classificar" e IA. Nada de Movimentações
  alimenta o orçamento ou os relatórios do cartão.
- **Rótulos informativos (P2)**: lançamento que casa com outro em **conta
  própria** (mesmo valor, sentidos opostos, <= 2 dias) recebe o rótulo
  "transferência entre suas contas" (`kind = TRANSFER`) para não parecer
  gasto no extrato — caso real: Bee Vale → InfinitePay → Nubank. Se houver
  mais de um candidato, **não rotula** (ambíguo). O saldo de pagamento de
  fatura na conta corrente recebe o rótulo `CARD_PAYMENT`. Esses rótulos não
  mudam nenhum total do orçamento (que já ignora tudo o que não é cartão).
- **Pagamento de fatura nunca vira gasto em dobro por construção**: as
  compras entram uma a uma pelo cartão; o pagamento fica em Movimentações
  (conta corrente) e a linha `CARD_PAYMENT` do lado do cartão é excluída do
  gasto.
- **Dado de terceiros**: Pix traz nome do favorecido/pagador. Fica só nesta
  área — não vai para relatório, insight nem IA (ver 08 § 13 e 10-ia).
- **Benefício (VR/VA)**: a recarga aparece aqui como entrada, só
  informativa. O valor mensal do benefício que vale para o orçamento é o que
  o User **informa** (ver "Orçamento mensal").

## Só a minha parte (gasto de terceiros no meu cartão)

Decisão de produto: **o sistema não controla dívida nem cobrança da
família.** Não existe "valor a receber", abatimento nem saldo por pessoa. O
que o User quer é enxergar **só o que é dele**.

- Gasto atribuído a uma Person que **não é self** é simplesmente
  **subtraído** da visão do User: não entra no orçamento, no total "meu
  gasto do mês" nem nos relatórios de categoria/estabelecimento (que são
  sempre "meus").
- **Fatura do cartão mostra a conta inteira e o desconto**, sempre nesta
  ordem:

  ```
  Fatura            R$ 2.000,00   (o que o banco cobra)
  − Não é meu       R$   700,00   (soma das Persons não-self + splits delas)
  − A classificar   R$   150,00   (aviso: ainda sem dono)
  = Meu             R$ 1.150,00   (o número que vale para o orçamento)
  ```

  O valor de destaque é **"Meu"**. "A classificar" nunca é escondido dentro
  de "Meu" nem de "Não é meu": aparece à parte até ser resolvido, para o
  total não parecer menor do que é.

- Invariante testada: `Fatura = Meu + Não é meu + A classificar`, para
  qualquer fatura e qualquer combinação de splits (centavo a centavo).
- **Split** entre self e outras Persons conta para o "Meu" só a fatia do
  self.
- `Person` continua existindo só como **rótulo de quem gastou** (para
  classificar, dividir e responder "quanto foi da fulana este mês" de forma
  meramente informativa). Sem saldo, sem marcar pago/em aberto, sem cobrança.
- O gasto de terceiros continua **visível** (lista de lançamentos filtrada
  por pessoa, e o "Não é meu" da fatura), mas fora de todos os totais "meus".
- Reembolso que a família fizer por Pix aparece em Movimentações como
  qualquer entrada; **não abate nada** (não há saldo) e não afeta o "Meu".

## Orçamento mensal

Definido pelo User em `BudgetSettings` (mensal):

```
teto variável = renda mensal (fixa + benefícios)
              − gastos fixos previstos
              − meta de poupança
```

- **Renda e benefício são informados pelo User** (salário mensal e valor
  mensal de VR/VA), não detectados: como Pix e contas estão fora da gestão,
  o sistema não tem como saber o que é renda. VR/VA soma na renda porque o
  User move o valor livremente entre contas.
- **Gastos fixos previstos** (aluguel, contas pagas por Pix/boleto) também são
  informados: o sistema não os enxerga como compra no cartão.
- **Envelopes**: o teto variável é dividido em envelopes por categoria
  (valor em centavos ou percentual). Sobra não alocada fica em "Livre".
- Só entra no orçamento: **compra no cartão de crédito** (conta `CREDIT_CARD`,
  `kind = EXPENSE`), com `personId` = self (ou split de self), no mês de
  `occurredAt`. Não entram: nada que não seja cartão de crédito (débito, Pix etc.), a linha
  `CARD_PAYMENT`, gastos de outras Persons e "a classificar".
- **Alertas**: 70%, 90% e 100% do envelope e do teto total. Cada limiar
  dispara **uma vez** por mês por envelope (não repete a cada sync).
- **Ritmo**: para cada envelope, `restante ÷ dias restantes` = valor por
  dia; se o gasto acumulado passa do esperado linear do mês, sinaliza. Vale
  especialmente para Mercado e Combustível (gastos frequentes).
- **Compras parceladas**: cada parcela conta no mês em que o banco a lança.
  O total de parcelas futuras já comprometidas é mostrado à parte ("já
  comprometido nos próximos meses"); não é somado ao mês corrente.
- Virada de mês: novo `BudgetMonth` copia as configurações do anterior;
  meses fechados são **imutáveis** para o orçamento (editar renda de hoje
  não reescreve o passado).

## Relatórios e insights (determinísticos)

Todos calculados em código, testados, sem LLM ([10-ia](./10-ia.md) só narra),
e **só sobre compras no cartão** (Pix e contas ficam de fora):

- **Por categoria / por estabelecimento / por pessoa**, mês a mês, com
  variação vs. mês anterior e vs. média dos 3 meses anteriores.
- **Assinaturas e recorrências**: mesmo `merchant` normalizado, valor
  semelhante (±10%), intervalo ~30 dias (±4), >= 3 ocorrências. Lista com
  total mensal e total anual.
- **Cobrança duplicada**: mesmo `merchant` + valor em janela de 24h.
- **Categoria acima do normal**: gasto do mês > 140% da média dos 3 meses
  anteriores (mínimo de 3 meses de histórico).
- **Parcelas futuras**: soma por mês dos `installment` restantes.
- **Onde economizar**: ranking por potencial = variação para cima +
  recorrências candidatas a cancelar + categorias acima do envelope; cada
  item traz o cálculo por trás (nunca só um texto).

## Sincronização bancária

- Sync **diário automático + "atualizar agora"** (limite: 1 por conta a cada 15 min). Sem webhook: o
  caminho gratuito (Meu Pluggy) não oferece (ver 07).
- **Consentimento**: não tem validade fixa de 12 meses (só expira em alguns bancos, ou se o usuário
  revogar no app do banco). Se o item tiver data de expiração, avisar com 30 e 7 dias de antecedência
  (in-app + e-mail). **Dado que vem vazio de repente é "reconectar", nunca "sem gastos"**. Item com
  erro/expirado/revogado não apaga dados já importados.
- Desconectar um banco: revoga o Item no Pluggy; as transações já
  importadas **permanecem** (histórico), marcadas como conta desconectada.
- Falha de sync nunca mostra número parcial como se fosse completo: o
  dashboard indica "última atualização" por conta.

## Import OFX/CSV e lançamento manual

- Import aceita `.ofx` e `.csv` até 5 MB; mostra **pré-visualização**
  (quantas novas, quantas já existentes, quantas parecem transferência)
  antes de gravar.
- Idempotência do import: `externalId` do OFX (`FITID`) quando existe; senão
  hash de `(data, valor, descrição, ordem no arquivo)`.
- Lançamento manual: valor, data, conta, descrição, categoria, pessoa. Vale
  só para contas `MANUAL`/`IMPORT`.

## Exportação e privacidade

- O User exporta os próprios dados (CSV/JSON) — exige reautenticação. Todo
  campo de texto do CSV exportado é neutralizado contra injeção de fórmula
  (prefixo `'` em valores que começam com `=`, `+`, `-`, `@`).
- Ver 08 § 13 (LGPD) para exclusão de conta e dado de terceiros.
