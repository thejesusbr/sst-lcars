# Referência de cores (LCARS)

Fonte central: `vue-app/src/assets/css/colors.css` (`:root`). Mecanismo de tema completo
em `SST_LCARS_SPECS.md` seção 13 — este documento é só o catálogo visual/de uso, não
duplica a metodologia.

## Cores nomeadas (`colors.css :root`)

| Nome | Hex | Usada em |
|---|---|---|
| `anakiwa` | `#9cf` | Papel `tertiary` do tema **Século XXIII**, `primary` do **Nemesis**; `anakiwa-fg` direto em `NavSensingConsole`/`ShieldConsole`/`StarChartConsole` (status "UP", código LRS de base aliada) |
| `atomic-tangerine` | `#f90` | `atomic-tangerine-bg` direto — cor do `LcarsToggleSwitch` de Red Alert (`SituationPanel`) |
| `bahama-blue` | `#069` | Sem uso hoje (disponível pro pool decorativo) |
| `bourbon` | `#b62` | Papel `highlight-dark` do **First Contact** |
| `blue-bell` | `#99c` | Sem uso hoje |
| `caribbean-green` | `#0c9` | Fonte de `--status-nominal` (ver cores semânticas abaixo); papel `highlight-dark` do **Século XXIX** |
| `chestnut-rose` | `#c66` | Papel `highlight` do tema **Enterprise (NX-01)** (quase idêntica ao swatch original, dist. ~5) |
| `cosmic` | `#746` | Sem uso hoje |
| `danub` | `#68c` | Sem uso hoje (era usada no rascunho antigo do Nemesis, substituído) |
| `dodger-pale` | `#59f` | Papel `secondary` do **Nemesis** |
| `dodger-soft` | `#36f` | Papel `highlight` do **Nemesis** |
| `eggplant` | `#646` | Sem uso hoje |
| `golden-tanoi` | `#fc6` | Papel `secondary` do **TOS** (padrão); reaproveitada como `secondary` (sem troca) no **Século XXIII** e como `primary` (hex literal) no **Século XXIX**; fonte de `--status-damaged` |
| `hopbush` | `#c69` | Sem uso hoje |
| `husk` | `#ba5` | Papel `secondary` do **First Contact**, `tertiary` do **Nemesis**, `highlight` do **Século XXIX** |
| `indigo` | `#45b` | Sem uso hoje (era usada no rascunho antigo do Nemesis) |
| `lavender-purple` | `#97a` | Sem uso hoje |
| `lilac` | `#c9c` | Papel `tertiary` do **TOS** (padrão) e do **First Contact** (sem troca); reaproveitada (hex literal) como `secondary` no **Século XXIX** |
| `mariner` | `#36c` | Sem uso hoje (era usada no rascunho antigo do Nemesis) |
| `medium-carmine` | `#a53` | Nome do slot do 5º papel `highlight-dark` (mesma convenção dos outros 4); cor de **TOS** (padrão) nesse papel |
| `melrose` | `#99f` | Sem uso hoje |
| `navy-blue` | `#008` | Sem uso hoje |
| `near-blue` | `#01e` | Sem uso hoje |
| `neon-carrot` | `#f93` | Sem uso hoje |
| `orange-peel` | `#f96` | Sem uso hoje |
| `pale-canary` | `#ff9` | Papel `primary` do **TOS** (padrão); `pale-canary-fg`/`-bg` direto em `HelmConsole`/`NavSensingConsole`/`StarChartConsole` |
| `periwinkle` | `#cdf` | Papel `tertiary` do **Enterprise (NX-01)** |
| `alert` | `#e10` | Papel de alerta `primary` (`--alert`) do **TOS**; `alert-bg`/`-fg` direto em vários consoles (status crítico/offline) |
| `red-damask` | `#d64` | Papel de alerta `highlight` (`--red-damask`) do **TOS**; cor de `--status-damaged-alert` do **TOS** sob Red Alert |
| `rust` | `#b41` | Papel `highlight` do **TOS** (padrão); reaproveitada (hex literal) como `highlight-dark` do **Nemesis** |
| `sandy-brown` | `#e95` | Sem uso hoje |
| `tamarillo` | `#821` | Papel de alerta `tertiary` (`--tamarillo`) do **TOS**; reaproveitada de propósito também pro `.red-alert` de `highlight-dark` em **todo tema** (ver 13.2) |
| `warning` | `#b11` | Papel de alerta `secondary` (`--warning`) do **TOS**; cor de `--status-critical` do **TOS** (normal e sob Red Alert, sem variação) |
| `tanoi` | `#fc9` | `tanoi-fg`/`-bg` direto em `NavSensingConsole`/`StarChartConsole` |
| `black` | `#000` | Cor base (`text-black`, fundos) |
| `white` | `#fff` | Papel `primary` do **Enterprise (NX-01)** |

## Cores exclusivas de tema (sem correspondente próximo, criadas pra imagem de referência)

| Nome | Hex | Usada em |
|---|---|---|
| `fawn` | `#b28452` | Papel `highlight` do **First Contact** |
| `scuba` | `#31c9f4` | Papel `tertiary` do **Século XXIX** |
| `pear` | `#99ff66` | Papel `primary` do **Século XXIII** |
| `cerulean` | `#66ccff` | Papel `highlight` do **Século XXIII** |
| `vermillion` | `#ff8c78` | `--status-nominal-alert` do **TOS** sob Red Alert (mais claro dos 3, ver seção de cores semânticas) |
| `teal-nx` | `#009ece` | Papel `highlight-dark` do **Enterprise (NX-01)** |
| `cobalt` | `#6666ff` | Papel `highlight-dark` do **Século XXIII** |

## Pool de alerta oficial (grupo "RED ALERT COLORS" do Okudagrams v4.1)

Usado só pelos 5 temas novos — **TOS mantém seu próprio `--alert`/`--warning`/
`--tamarillo`/`--red-damask` original**, nunca usa este pool.

| Nome | Hex | Usada em |
|---|---|---|
| `ra-vivid-red` | `#f5173c` | Papel de alerta mais claro de cada tema (varia por tema, ver tabela de papéis abaixo) |
| `ra-crimson` | `#bf2042` | idem |
| `ra-dark-red` | `#a30e24` | idem |
| `ra-maroon` | `#330512` | Papel de alerta mais escuro de quase todo tema |

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
**independentes** dos 4 papéis interativos (que já usam esses mesmos 4 vermelhos pra
outra coisa) — só dava pra ter essa independência com slots próprios, sobrescritos
explicitamente por tema.

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

`theme.css` define 5 papéis fixos — `primary`/`secondary`/`tertiary` (frames + botões),
`highlight` (destaque) e `highlight-dark` (2º acento, adicionado 2026-07-25 — não precisa
ser variação de brilho da mesma cor de `highlight`, pode ser cor totalmente diferente) —
cada tema só diz qual cor cada papel usa:

| Tema | primary | secondary | tertiary | highlight | highlight-dark |
|---|---|---|---|---|---|
| TOS (padrão) | pale-canary | golden-tanoi | lilac | rust | medium-carmine |
| First Contact | bg-purple-2 | husk | lilac | fawn | bourbon |
| Nemesis | anakiwa | dodger-pale | husk | dodger-soft | rust |
| Enterprise (NX-01) | white | bg-orange-1 | periwinkle | chestnut-rose | teal-nx |
| Século XXIX | golden-tanoi | lilac | scuba | husk | caribbean-green |
| Século XXIII | pear | golden-tanoi | anakiwa | cerulean | cobalt |

E o `.red-alert` de cada um (qual vermelho do pool cada papel usa sob alerta — TOS usa
vermelhos próprios, não o pool). `highlight-dark` sempre reusa o mesmo vermelho de
`tertiary` (`--tamarillo`) de propósito — ver nota em `tamarillo` na tabela de cores
nomeadas, evita precisar de um 5º vermelho só pra esse papel:

| Tema | primary (`--alert`) | secondary (`--warning`) | tertiary (`--tamarillo`) | highlight (`--red-damask`) | highlight-dark |
|---|---|---|---|---|---|
| TOS (padrão) | alert | warning | tamarillo | red-damask | tamarillo (= tertiary) |
| First Contact | ra-vivid-red | ra-dark-red | ra-crimson | ra-maroon | ra-crimson (= tertiary) |
| Nemesis | ra-vivid-red | ra-dark-red | ra-crimson | ra-maroon | ra-crimson (= tertiary) |
| Enterprise (NX-01) | ra-vivid-red | ra-dark-red | ra-crimson | ra-maroon | ra-crimson (= tertiary) |
| Século XXIX | ra-vivid-red | ra-crimson | ra-maroon | ra-dark-red | ra-maroon (= tertiary) |
| Século XXIII | ra-crimson | ra-vivid-red | ra-dark-red | ra-maroon | ra-dark-red (= tertiary) |
