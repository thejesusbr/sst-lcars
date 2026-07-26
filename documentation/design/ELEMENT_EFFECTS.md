# Efeitos de elemento (LCARS SDK)

Classes CSS aplicáveis a qualquer elemento com `class`/`version` do `LcarsBlock`,
`LcarsCap`, `LcarsBlock` tipo `bar`, `LcarsButton` — funcionam tanto soltos
(`.block`/`.cap`/`.bar`/`.button`) quanto dentro de `LcarsComplexButton`
(seletor `.complexButton :not(.text)`, texto nunca é afetado).

Fonte: `vue-app/src/assets/css/lcars-sdk.css`, `module.css`, `default-bracket.css`.

| Classe | Arquivo:linha | Ciclo | Efeito |
|---|---|---|---|
| `blink` | `lcars-sdk.css:2477` | 1.25s step | pisca pra transparente (bg/texto/borda somem no meio do ciclo) |
| `white-flash` | `lcars-sdk.css:2543` | 1.25s step | pisca pra branco (bg/texto viram `#fff` no meio do ciclo) |
| `red-dark-light` | `lcars-sdk.css:2509` | 1.5s step, `!important` | alterna vermelho escuro (`#990000`) ↔ vermelho vivo (`#ff0000`) |
| `red-dark-blink` | `lcars-sdk.css:2573` | 2.5s step, `!important` | alterna vermelho escuro ↔ transparente |
| `dark-light` | `module.css:104` | 1s linear, `!important` | `filter:brightness` oscila 1.25 → none → 0.75 (efeito "respirando", sem trocar cor) |
| `animated` | `default-bracket.css:76` | 5s linear | só dentro de `DefaultBracket`, prop `coloring.animated`; barra vertical sobe/desce altura aleatória (efeito "scanner" do enquadramento) |
| `fade` | `lcars-sdk.css:2625` | transição 0.25s, não-loop | `opacity:0` com transition — some suave sob controle programático, não pisca sozinho |
| `hidden` | `lcars-sdk.css:2611` | estático | `visibility:hidden` + mata animação/transição + `pointer-events:none` |
| `no-event` | `lcars-sdk.css:2631` | estático | só `pointer-events:none`, mantém visível |
| `no-transition` | `lcars-sdk.css:2635` | estático | mata toda animação/transição (própria e dos filhos) |
| `.text.off` | `module.css:86` | estático | `filter:brightness(0.5)` — "apagado" sem animação |

## Hover/active embutidos (não são classes, comportamento padrão)

`module.css:68-84` — todo `.button`/`.elbow`/`.complexButton`:
- hover: cancela animação em andamento, `filter:brightness(1.25)`
- active: `filter:brightness(1.75)`, também cancela animação

## Em uso hoje (2026-07-25)

- `blink` — subsistema/equipe offline (`EngineeringConsole`), alerta breach (`SituationPanel`), casco crítico (`ShieldConsole`/`EnterpriseShieldSvg`), aba ativa (`TacticalConsole`), unload de torpedo (`WeaponsConsole`)
- `red-dark-light` — Probe Offline (`NavSensingConsole`)
- `white-flash`, `red-dark-blink`, `dark-light` — existem no CSS, **nenhum console usa ainda**
