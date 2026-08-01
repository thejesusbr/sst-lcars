## 1. Tipos nascem

- [x] 1.1 Tabela de peso por tipo em `constants.ts` (folha), somando 1.0
- [x] 1.2 Tabela de faixa de poder por tipo em `constants.ts`
- [x] 1.3 `materializeSector`: sortear tipo pelo peso e poder pela faixa do tipo,
      da mesma RNG determinística do quadrante
- [x] 1.4 `CLOAKED_RAIDER` materializa cloaked
- [x] 1.5 Teste: os 5 tipos aparecem na proporção esperada em amostra grande
- [x] 1.6 Teste: mesma semente reproduz os mesmos tipos nas mesmas células

## 2. Rendição por espécie

- [x] 2.1 Substituir `HAIL_SURRENDER_CHANCE`/`HAIL_SURRENDER_CHANCE_MAX` por
      tabela piso/teto por `EnemyType`
- [x] 2.2 `hailSurrenderChance` passa a receber o tipo além do poder
- [x] 2.3 Teste: Klingon intacto ~10%, em farrapos ~35%; raider 30%/70%
- [x] 2.4 Teste: todo membro de `ENEMY_TYPES` tem entrada — sem fallback

## 3. Cor de facção

- [x] 3.1 Variáveis de cor de facção no `colors.css` base, com fallback
- [x] 3.2 Mapa `EnemyType` → variável de tema, e jogador → azul
- [x] 3.3 `useCombatOverlay` popula `ScannerOverlay.color` pela facção de quem
      atira
- [ ] 3.4 Verificar contraste sob `.red-alert` nos 7 temas (visual, manual —
      cabe no reteste da 6ª rodada junto com o Storybook novo)

## 4. Verificação

- [x] 4.1 `npm run type-check`, `npm run lint`, `npm run test:unit` verdes
- [x] 4.2 Story de `LcarsScanner` com overlay de cada facção
- [ ] 4.3 4ª rodada: encontrar Romulano; recusa de hail com fala Romulana;
      combate com 3 atacantes de facções diferentes legível pela cor
