# Facade de iluminação inteligente (WLED first) reagindo ao Red Alert

## Contexto

Ideia do usuário: conectar o app a controladores de luz (WLED, Hyperion, etc.) pra
que luzes físicas da sala acompanhem o estado do jogo — luzes vermelhas durante Red
Alert é o caso de uso motivador. O Captain's Lounge já é o painel de configurações
gerais do app (hoje um stub, comentário em `CptLoungeConsole.vue:12-14` aponta pra
SST_LCARS_SPECS.md seção 7.4 como trabalho futuro) — lugar certo pra essa configuração.

Decisões já tomadas com o usuário:
- **Sem hardware agora** (chega em ~1 semana) → construir a base (config UI + facade +
  provider WLED) sem poder testar contra dispositivo real ainda. Testável via UI
  (validação, tratamento de erro de rede) até lá.
- **App final roda em Electron** → o provider precisa ficar isolado num módulo próprio
  (seam), não porque WLED precise disso agora (ver pesquisa abaixo), mas pra deixar
  fácil migrar pra IPC/main-process quando algum provider futuro exigir socket
  cru (Hyperion TCP, LIFX/Art-Net UDP, MQTT). **Não** criar scaffold de Electron
  agora — fora de escopo, feature própria.
- **WLED só na v1** (recomendado). Facade genérica, mas só 1 implementação concreta.
- **Gatilho**: reaproveitar o sinal global já existente (`document.body.classList`
  `red-alert`, ligado hoje em `SituationPanel.vue:71-73`) via `MutationObserver`,
  mesmo padrão que `useTheme.ts:58-70` já usa pra `dataset.theme`. Nenhum store novo.

## Pesquisa (via Perplexity, resumo aplicável)

- **WLED**: HTTP JSON API (`POST /json/state`), CORS já permissivo por padrão no
  firmware — `fetch()` direto do browser funciona hoje, sem precisar de Electron
  main-process. Sem autenticação (rede confiável assumida). Payload mínimo:
  `{"on":true,"seg":[{"col":[[255,0,0]]}]}`; `{"on":false}` desliga.
- Demais protocolos (Hyperion TCP/JSON-RPC, Home Assistant REST+token, Hue
  pairing+xy color, LIFX UDP binário, MQTT-based) exigem mais fricção (auth,
  conversão de cor, ou socket cru só possível em Electron main process) — confirma
  WLED como o MVP certo e adia os outros.
- Recomendação da pesquisa: facade com uma interface mínima por provider
  (`setColor`/`off`), não modelar semântica rica (discover/capabilities) até um
  segundo provider existir de verdade.

## Arquivos a criar

- **`vue-app/src/lighting/wled.ts`** (novo) — provider WLED puro:
  ```ts
  export async function setColor(host: string, rgb: [number, number, number]): Promise<void>
  export async function turnOff(host: string): Promise<void>
  ```
  Implementado com `fetch` simples pro `http://${host}/json/state`. Erros de rede
  propagam (deixa quem chama decidir status ok/erro) — não engolir silenciosamente.

- **`vue-app/src/composables/useLighting.ts`** (novo) — espelha a estrutura de
  `useTheme.ts` (composable singleton, `reactive`/`ref` em módulo, persistência em
  `localStorage`):
  - `LightingConfig { enabled: boolean; provider: 'wled'; host: string }`, chave
    `sst-lcars:lighting` (mesmo prefixo de `sst-lcars:theme`).
  - Registro simples `{ wled }` mapeando `provider` pro módulo — facade real, mas
    sem interface `LightingProvider` formal ainda (YAGNI até 2º provider existir;
    os dois métodos exportados por `wled.ts` já bastam como "contrato" implícito).
  - `MutationObserver` em `document.body` (`attributeFilter: ['class']`), setado uma
    vez em nível de módulo (igual ao `watch` de `useTheme.ts`): se `enabled` e host
    preenchido, `red-alert` presente → `setColor(host, [255,0,0])`; ausente →
    `turnOff(host)`. Falhas de rede só atualizam `status.value = 'error'`, nunca
    lançam pro chamador nem quebram o toggle de Red Alert.
  - `status: Ref<'idle' | 'ok' | 'error'>` pra UI mostrar resultado da última chamada.
  - `testFlash()`: dispara `setColor` (vermelho) seguido de `turnOff` após ~400ms,
    exposto pro botão "Test Flash" nas configurações — única forma de validar o
    caminho de rede/erro antes do hardware chegar.
  - Simplificação deliberada: alerta desligando sempre manda `turnOff` (não restaura
    a cor/efeito anterior do WLED) — documentar como limitação conhecida, não
    resolver agora (exigiria ler e guardar o estado anterior do device).

## Arquivo a modificar

- **`vue-app/src/components/modules/CptLoungeConsole.vue`**: nova seção "Smart
  Lights" (mesmo estilo visual das seções existentes — título + controles, sem modal):
  - `LcarsToggleSwitch` (já usado em `SituationPanel.vue`) pro `enabled`.
  - Um `<input>` simples estilizado (dark bg, borda laranja, fonte mono — mesma
    linha do `.log-content` já existente neste arquivo) pro campo host/IP. Não criar
    um novo elemento SDK (`LcarsTextInput`) só pra este único uso — nenhum outro
    console precisa de text input hoje; YAGNI.
  - Texto de status (`Connected`/`Error`/`Not tested`) refletindo `status`.
  - Botão "Test Flash" chamando `testFlash()`.
  - Atualizar o comentário do stub (linha 12-14) removendo a implicação de que
    tudo ali é só tema+catálogo.

## Fora de escopo (documentar, não construir)

- Scaffold de Electron no `vue-app/` (main process, preload/IPC) — feature própria,
  não pedida agora. Quando outro provider precisar de socket cru, revisitar.
- Hyperion, Home Assistant, Hue, LIFX, MQTT — adicionar como módulos irmãos de
  `wled.ts` quando houver demanda real (mesma forma: `setColor`/`turnOff`).
- Restaurar o estado anterior do WLED ao sair do alerta (hoje só desliga).

## Verificação

1. `npx vue-tsc --noEmit` e `npx eslint` limpos.
2. Rodar `vite dev`, abrir Cap. Lounge, testar UI: toggle liga/desliga, digitar host
   inválido (ex: IP inexistente na rede) e clicar "Test Flash" → confirmar que
   `status` vira `error` sem exceção não tratada no console nem crash do app.
3. Ligar o Red Alert global (toggle em `SituationPanel.vue`) com a integração
   habilitada e observar (via DevTools Network tab) que a chamada fetch é
   disparada corretamente pro host configurado, revertendo quando o alerta desliga.
4. Teste real contra WLED físico fica pendente pra quando o usuário tiver o
   dispositivo (~1 semana) — não bloqueia esta entrega.
