# Referência de cores (LCARS)

Fonte central: `vue-app/src/assets/css/colors.css` (`:root`). Mecanismo de tema completo
em `SST_LCARS_SPECS.md` seção 13 — este documento é só o catálogo visual/de uso, não
duplica a metodologia.

**Arquivos:** `colors.css` define toda cor (nomeada, grupos legados, semântica). Cada
tema mora no próprio arquivo em `vue-app/src/assets/css/themes/<id>.css` — inclusive
`tos.css` (redundante com o `:root`, mantido só por simetria com os outros 5). `theme.css`
define os 5 papéis (`primary/secondary/tertiary/highlight/highlight-dark` ×
`static/interactive`) que todo tema alimenta.

**Papel ≠ nome da cor (2026-07-26):** `--role-primary`, `--role-secondary`,
`--role-tertiary`, `--role-highlight`, `--role-highlight-dark` (+ os 4 `--role-*-alert`
pro estado sob Red Alert) são o **papel** de verdade — é nisso que `theme.css` e cada
`themes/<id>.css` mexem. Os 33 nomes de cor (`--pale-canary`, `--anakiwa` etc.) continuam
existindo do jeito que sempre estiveram, só que agora são **só tinta**: o papel `primary`
do TOS aponta pra `--pale-canary` (`--role-primary: var(--pale-canary)`), mas isso é só o
valor do TOS — outro tema aponta `--role-primary` pra qualquer outra cor, sem tocar em
`--pale-canary`. Antes dessa mudança, `theme.css` lia `var(--pale-canary)` direto, então
o "papel" **era** literalmente uma cor do TOS emprestada — pra pintar de outra cor, cada
tema tinha que hijackar essa cor emprestada. Motivo da mudança: seção 13.7 do specs.

## Como aplicar cor num elemento

Regra rápida — qual família usar:

| Se a cor... | Use |
|---|---|
| é só decoração, sem significado (moldura, cap, botão neutro) | **papel de tema** (`primary-interactive`, `secondary-static` etc.) |
| representa um estado (saudável/danificado/crítico/desabilitado) | **`statusColor()`** (`useLcarsColors.ts`) |
| é um destaque pontual, sem relação com papel nem status (ex.: código de setor por conteúdo) | **cor nomeada direta** (`anakiwa-fg`, `golden-tanoi-bg`) |
| é uma barra/botão **flat de peça única** (`SolidLevelBar`, `LcarsButton` sólido) | **grupo legado** `bg-{cor}-N` (`bg-green-3` etc.) |

**1. Papel de tema** — todo elemento LCARS (`LcarsCap`, `LcarsBlock`, `LcarsButton`,
`LcarsComplexButton`, `LcarsBar`, `LcarsElbow`) aceita `color`/`:color` como string de
classe. Pra decoração neutra (a maioria dos caps/botões de frame), usa um dos 5 papéis:

```vue
<LcarsComplexButton color="primary-interactive">
  <LcarsCap version="round-left" />
  <LcarsBlock label="Stardate" />
</LcarsComplexButton>
```

`-interactive` é pra controle (botão, algo clicável); `-static` é pra moldura/display
(sem `highlight-static` — esse papel só existe como `-interactive`, mesma assimetria
desde a SDK original). Cor muda sozinha com o tema ativo e com Red Alert — **não precisa
fazer nada extra pra isso funcionar**, é só escolher o papel certo. Repare que você
**nunca** escreve `--pale-canary` nem `--role-primary` no template — a classe
`primary-interactive` já é a ponte, o CSS por trás é que resolve qual `--role-*` ler e
qual cor esse papel aponta hoje. Como não há mais `randColor()` (seção 13.6 do specs),
prefira `color="..."` **estático** (sem `:`) quando o valor não muda — só usa
`:color="expressão"` quando a cor realmente depende de estado reativo (ver item 2).

Pra texto solto (sem fundo/borda), `theme.css` tem o par `-fg`-por-papel:
`text-primary`/`text-secondary`/`text-tertiary`/`text-highlight`/`text-highlight-dark`
(2026-07-26) — mesmos 5 papéis, só `color`, sem `fill`/`background-color`/`border-color`.
`text-light` (= `text-primary`) e `text-dark` (= `text-highlight`) continuam existindo
por compatibilidade (usados em código já escrito), não foram removidos.

**2. Status semântico** — quando a cor tem SIGNIFICADO (nominal/danificado/crítico/
desabilitado), nunca escreva a classe na mão (`"caribbean-green-bg"`, `"alert-bg"` etc.).
Sempre passe pelo helper, que já é theme-aware e tem `.red-alert` embutido:

```ts
const { statusColor } = useLcarsColors()
const tempColor = computed(() => {
  if (temp.value < 100) return statusColor('nominal')
  if (temp.value < 200) return statusColor('damaged')
  return statusColor('critical')
})
```

```vue
<SolidLevelBar :color="tempColor" :level="temp" />
```

Cada console mantém seu próprio limiar/direção de cálculo (o "quando" é decisão de
gameplay) — só o nome da classe de saída vem do helper.

**3. Cor nomeada direta** — pra um destaque pontual que não é nem papel de tema nem
status (ex.: cor do código LRS variando por conteúdo da célula, não por saúde de
sistema). Use com moderação — a maioria dos casos cai em (1) ou (2):

```vue
<LcarsText :text="code" :color="klingons > 0 ? 'alert-fg' : 'anakiwa-fg'" />
```

Esse exemplo específico (legenda KBS do scanner, `NavSensingConsole`/`StarChartConsole`)
é candidato a virar um helper dedicado tipo `statusColor()` (achado documentado, ainda não
implementado, ver seção 13.7 do specs) — hoje é cor fixa de propósito por decisão
consciente, mas se algum tema quiser recolori-lo no futuro vai precisar desse helper.

**4. Grupos legados `bg-{cor}-N`** — só em elemento **flat de peça única**
(`SolidLevelBar`, `LcarsButton` sólido avulso, `LcarsBlock` solto). **Nunca** num
`LcarsComplexButton` segmentado (cap+block+text+cap) nem em algo com parte transparente
(`LcarsToggleSwitch`): essas classes usam `!important` (herdado do tema padrão da LCARS
SDK) e forçam a MESMA cor em cima de qualquer filho, inclusive o que devia ficar
transparente. Nesses casos, use papel de tema ou cor nomeada (sem `!important`) — lição
já registrada 3× na migração (`useLcarsColors`/`LcarsToggleSwitch`/`SituationPanel`).

**5. Cascata dentro de `LcarsComplexButton`** — a classe de cor vai no wrapper
(`<LcarsComplexButton color="...">`), mas o CSS (`.foo-bg > *:not([class*="-bg"])`)
empurra a cor pros filhos que **não têm classe de cor própria**. Se um filho precisa de
cor diferente do resto do botão (ex.: um `LcarsBlock` de status dentro de uma linha),
dê a ele sua PRÓPRIA classe — ela sempre vence a cascata do pai.

## Cores nomeadas (`colors.css :root`)

| Nome | Hex | Usada em |
|---|---|---|
| `anakiwa` | `#9cf` | Fonte de `--role-tertiary` no **Século XXIII**, `--role-primary` no **Nemesis**; `anakiwa-fg` direto em `NavSensingConsole`/`StarChartConsole` (código LRS de base aliada) |
| `atomic-tangerine` | `#f90` | Sem uso hoje |
| `bahama-blue` | `#069` | Sem uso hoje (disponível pro pool decorativo) |
| `bourbon` | `#b62` | Fonte de `--role-highlight-dark` no **First Contact** |
| `blue-bell` | `#99c` | Sem uso hoje |
| `caribbean-green` | `#0c9` | Fonte de `--status-nominal` (status "nominal"/"UP" em qualquer tema, ver cores semânticas abaixo) e de `--role-highlight-dark` no **Século XXIX** |
| `chestnut-rose` | `#c66` | Fonte de `--role-highlight` no **Enterprise (NX-01)** (quase idêntica ao swatch original, dist. ~5) |
| `cosmic` | `#746` | Sem uso hoje |
| `danub` | `#68c` | Sem uso hoje (era usada no rascunho antigo do Nemesis, substituído) |
| `dodger-pale` | `#59f` | Fonte de `--role-secondary` no **Nemesis** |
| `dodger-soft` | `#36f` | Fonte de `--role-highlight` no **Nemesis** |
| `eggplant` | `#646` | Sem uso hoje |
| `golden-tanoi` | `#fc6` | Fonte de `--role-secondary` no **TOS** (padrão); reaproveitada sem troca no **Século XXIII** (fica igual ao default) e como `--role-primary` no **Século XXIX**; fonte de `--status-damaged` |
| `hopbush` | `#c69` | Sem uso hoje |
| `husk` | `#ba5` | Fonte de `--role-secondary` no **First Contact**, `--role-tertiary` no **Nemesis**, `--role-highlight` no **Século XXIX** |
| `indigo` | `#45b` | Sem uso hoje (era usada no rascunho antigo do Nemesis) |
| `lavender-purple` | `#97a` | Sem uso hoje |
| `lilac` | `#c9c` | Fonte de `--role-tertiary` no **TOS** (padrão) e no **First Contact** (sem troca); reaproveitada como `--role-secondary` no **Século XXIX** |
| `mariner` | `#36c` | Sem uso hoje (era usada no rascunho antigo do Nemesis) |
| `medium-carmine` | `#a53` | Fonte de `--role-highlight-dark` no **TOS** (padrão) — nome não tem relação com o papel, é só a cor que o TOS escolheu pra ele |
| `melrose` | `#99f` | Sem uso hoje |
| `navy-blue` | `#008` | Sem uso hoje |
| `near-blue` | `#01e` | Sem uso hoje |
| `neon-carrot` | `#f93` | Sem uso hoje |
| `orange-peel` | `#f96` | Sem uso hoje |
| `pale-canary` | `#ff9` | Fonte de `--role-primary` no **TOS** (padrão); `pale-canary-bg` direto (fixo, não muda de tema) no scanner "animated" de `HelmConsole`/`NavSensingConsole`/`StarChartConsole`/`ShieldConsole` |
| `periwinkle` | `#cdf` | Fonte de `--role-tertiary` no **Enterprise (NX-01)** |
| `alert` | `#e10` | Fonte de `--role-primary-alert` no **TOS**; `alert-fg` direto (fixo) na legenda KBS do scanner (`NavSensingConsole`/`StarChartConsole`, achado fora de escopo — ver seção 13.7) |
| `red-damask` | `#d64` | Fonte de `--role-highlight-alert` no **TOS**; cor de `--status-damaged-alert` do **TOS** sob Red Alert |
| `rust` | `#b41` | Fonte de `--role-highlight` no **TOS** (padrão); reaproveitada como `--role-highlight-dark` no **Nemesis** |
| `sandy-brown` | `#e95` | Sem uso hoje |
| `tamarillo` | `#821` | Fonte de `--role-tertiary-alert` no **TOS**; `--role-tertiary-alert` é reaproveitada de propósito também pro `.red-alert` de `highlight-dark` em **todo tema** (ver 13.2/13.7) |
| `warning` | `#b11` | Fonte de `--role-secondary-alert` no **TOS**; cor de `--status-critical` do **TOS** (normal e sob Red Alert, sem variação) |
| `tanoi` | `#fc9` | Sem uso hoje (a doc anterior citava uso em `NavSensingConsole`/`StarChartConsole` — não confirmado no código atual) |
| `black` | `#000` | Cor base (`text-black`, fundos) |
| `white` | `#fff` | Fonte de `--role-primary` no **Enterprise (NX-01)** |

## Cores exclusivas de tema (sem correspondente próximo, criadas pra imagem de referência)

| Nome | Hex | Usada em |
|---|---|---|
| `fawn` | `#b28452` | Fonte de `--role-highlight` no **First Contact** |
| `scuba` | `#31c9f4` | Fonte de `--role-tertiary` no **Século XXIX** |
| `pear` | `#99ff66` | Fonte de `--role-primary` no **Século XXIII** |
| `cerulean` | `#66ccff` | Fonte de `--role-highlight` no **Século XXIII** |
| `vermillion` | `#ff8c78` | Fonte de `--status-nominal-alert` no **TOS** sob Red Alert (mais claro dos 3, ver seção de cores semânticas) |
| `teal-nx` | `#009ece` | Fonte de `--role-highlight-dark` no **Enterprise (NX-01)** |
| `cobalt` | `#6666ff` | Fonte de `--role-highlight-dark` no **Século XXIII** |

## Pool de alerta oficial (grupo "RED ALERT COLORS" do Okudagrams v4.1)

Usado só pelos 5 temas novos como fonte dos `--role-*-alert` — **TOS mantém `--alert`/
`--warning`/`--tamarillo`/`--red-damask` (suas próprias cores) como fonte**, nunca usa
este pool.

| Nome | Hex | Usada em |
|---|---|---|
| `ra-vivid-red` | `#f5173c` | Fonte do papel de alerta mais claro de cada tema (varia por tema, ver tabela de papéis abaixo) |
| `ra-crimson` | `#bf2042` | idem |
| `ra-dark-red` | `#a30e24` | idem |
| `ra-maroon` | `#330512` | Fonte do papel de alerta mais escuro de quase todo tema |

## Cores semânticas de status (nominal/danificado/crítico/desabilitado)

Independentes da cor decorativa do tema — ver `statusColor()` em `useLcarsColors.ts`.
`disabled` (2026-07-25) é neutro/cinza, igual em todo tema, sem variante `.red-alert`
(mesmo precedente do grupo `bg-grey-*`). `nominal`/`damaged`/`critical` sob Red Alert
seguem uma progressão de brilho decrescente (mais claro → mais escuro) validada em todos
os 6 temas — ver tabela abaixo.

| Var | Normal (sempre) | Sob `.red-alert` |
|---|---|---|
| `--status-nominal` | `caribbean-green` (`#0c9`) — igual em todo tema | `--status-nominal-alert`, o mais claro dos 3, varia por tema |
| `--status-damaged` | `golden-tanoi` (`#fc6`) — igual em todo tema | `--status-damaged-alert`, o médio, varia por tema |
| `--status-critical` | `warning` (`#b11`) no TOS | `--status-critical`, o mais escuro, varia por tema (mesma var, sem regra `.red-alert` separada — ver nota técnica) |
| `--status-disabled` | `bg-grey-3` (`#777`) — igual em todo tema, sem variante | — |

Progressão de brilho sob Red Alert, por tema (nominal > damaged > critical):

| Tema | nominal-alert | damaged-alert | critical |
|---|---|---|---|
| TOS (padrão) | `vermillion` (novo) | `red-damask` | `warning` |
| First Contact | `ra-vivid-red` | `ra-dark-red` | `ra-maroon` |
| Nemesis | `ra-vivid-red` | `ra-dark-red` | `ra-maroon` |
| Enterprise (NX-01) | `ra-vivid-red` | `ra-dark-red` | `ra-maroon` |
| Século XXIX | `ra-vivid-red` | `ra-dark-red` | `ra-maroon` |
| Século XXIII | `ra-vivid-red` | `ra-dark-red` | `ra-maroon` |

Os 5 temas novos usam sempre os mesmos 3 (do pool oficial de vermelhos), independente de
como os 4 papéis interativos daquele tema já usam esse mesmo pool — reordenação/reuso
puro, sem cor nova. **Só o TOS precisou de 1 cor nova** (`vermillion`): antes desse ajuste,
`nominal` sob alerta e `critical` usavam a mesma cor (`--alert`) — bug relatado pelo
usuário, corrigido trocando `critical` pra `warning` e dando um vermelho próprio e mais
claro pra `nominal`.

**Nota técnica (2ª vez que esse gotcha aparece, ver seção 13.2 do specs):** as 3 vars
acima são **slots dedicados** que cada tema sobrescreve direto no próprio bloco
`[data-theme=x].red-alert` — não um alias tipo `--status-nominal-alert: var(--alert)`.
Uma 1ª tentativa (nesta mesma sessão) tentou resolver isso fazendo a regra CSS ler
`var(--alert)` direto em vez de um alias — funcionou pro caso de 1 var lida por 1 regra,
mas quebrou de novo aqui porque `nominal`/`damaged`/`critical` precisam de 3 valores
**independentes** dos papéis interativos (`--role-*-alert`, que já usam esses mesmos
vermelhos pra outra coisa) — só dava pra ter essa independência com slots próprios,
sobrescritos explicitamente por tema.

## Grupos legados `bg-{cor}-{1-5}` (paleta original da LCARS SDK)

Não fazem parte dos 5 papéis de tema — servem de moldura/frame decorativo via
`lcarsColors.pool`/`primary`/`secondary`/`tertiary`/`custom` (`bracketColoring` dos
consoles). `randColor()` foi removido (2026-07-25) — cor decorativa de botão/cap hoje é
fixa por posição, cicla os 5 papéis interativos em ordem, ver seção 13.6 do specs. Dos
grupos legados, só 2 são reaproveitados diretamente por um tema: `bg-purple-2` (`primary` do
**First Contact**) e `bg-orange-1` (`secondary` do **Enterprise NX-01**). Cada grupo tem
5 tons (1=mais claro…5=mais escuro) e variação `.red-alert` própria, exceto `red`/`grey`
(já são vermelho/neutro, sem variação):

| Grupo | Tons (hex) |
|---|---|
| `bg-green` | `#33ffff` `#33ffcc` `#00cc99` `#009999` `#006666` |
| `bg-blue` | `#99ccff` `#88aacc` `#3399cc` `#006699` `#003366` |
| `bg-purple` | `#cc99cc` `#ccbbff` `#aa99ee` `#6677bb` `#666699` |
| `bg-orange` | `#ccddbb` `#bbbb77` `#ddbb77` `#dd8844` `#cc6600` |
| `bg-red` | `#ff0000` `#cc0000` `#990000` `#660000` `#330000` |
| `bg-grey` | `#cccccc` `#999999` `#777777` `#555555` `#333333` |

## Papéis de tema (referência rápida)

`theme.css` define 5 papéis fixos — `--role-primary`/`--role-secondary`/`--role-tertiary`
(frames + botões, classes `primary-interactive` etc.), `--role-highlight` (destaque) e
`--role-highlight-dark` (2º acento, adicionado 2026-07-25 — não precisa ser variação de
brilho da mesma cor de `highlight`, pode ser cor totalmente diferente). Cada tema só diz
**pra qual cor cada papel aponta** — a coluna abaixo é a cor, não o papel; o papel é
sempre o mesmo nome em todo tema (`--role-primary` etc), só o valor muda:

| Tema | `--role-primary` aponta pra | `--role-secondary` | `--role-tertiary` | `--role-highlight` | `--role-highlight-dark` |
|---|---|---|---|---|---|
| TOS (padrão) | pale-canary | golden-tanoi | lilac | rust | medium-carmine |
| First Contact | bg-purple-2 | husk | lilac | fawn | bourbon |
| Nemesis | anakiwa | dodger-pale | husk | dodger-soft | rust |
| Enterprise (NX-01) | white | bg-orange-1 | periwinkle | chestnut-rose | teal-nx |
| Século XXIX | golden-tanoi | lilac | scuba | husk | caribbean-green |
| Século XXIII | pear | golden-tanoi | anakiwa | cerulean | cobalt |

E o `.red-alert` de cada um (pra qual vermelho do pool cada `--role-*-alert` aponta sob
alerta — TOS aponta pras próprias cores, não usa o pool). `--role-highlight-dark`'s
`.red-alert` sempre reusa o mesmo vermelho de `--role-tertiary-alert` de propósito — ver
nota em `tamarillo` na tabela de cores nomeadas, evita precisar de um 5º vermelho só pra
esse papel:

| Tema | `--role-primary-alert` | `--role-secondary-alert` | `--role-tertiary-alert` | `--role-highlight-alert` | `--role-highlight-dark`.red-alert |
|---|---|---|---|---|---|
| TOS (padrão) | alert | warning | tamarillo | red-damask | tamarillo (= tertiary) |
| First Contact | ra-vivid-red | ra-dark-red | ra-crimson | ra-maroon | ra-crimson (= tertiary) |
| Nemesis | ra-vivid-red | ra-dark-red | ra-crimson | ra-maroon | ra-crimson (= tertiary) |
| Enterprise (NX-01) | ra-vivid-red | ra-dark-red | ra-crimson | ra-maroon | ra-crimson (= tertiary) |
| Século XXIX | ra-vivid-red | ra-crimson | ra-maroon | ra-dark-red | ra-maroon (= tertiary) |
| Século XXIII | ra-crimson | ra-vivid-red | ra-dark-red | ra-maroon | ra-dark-red (= tertiary) |
