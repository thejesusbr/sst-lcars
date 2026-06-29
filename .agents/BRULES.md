# BRULES.md - Regras de Negócio do Projeto

Este documento especifica as regras de negócio e os comportamentos esperados do simulador de **Super Star Trek (SST) - LCARS Edition**.

---

## 1. Regras do Fluxo do Jogo

O jogo é uma simulação de comando estelar inspirada no clássico *Super Star Trek*. O objetivo principal é limpar a galáxia da ameaça Klingon dentro de um limite de tempo (Stardate) e proteger as bases estelares da Federação.

---

## 2. Painéis e Consolos (Consoles)

A interface é dividida em módulos específicos, cada um com regras de comportamento e dados reativos particulares:

### 2.1. Situation Panel (Painel de Situação)
- **Stardate**: Exibe o tempo atual da missão. Ações como navegação a velocidades de dobra (Warp) e combates consomem tempo.
- **Energy Level**: Indica a energia total da nave (Enterprise). Se o nível de energia chegar a 0, a simulação termina com a destruição da nave (Derrota).
- **Enemies Left (Inimigos Restantes)**: O jogo termina vitoriosamente (Vitória) quando esta contagem chega a 0.
- **Starbases Left**: Quantidade de bases ativas. Bases servem para reabastecimento de energia e reparos de sistemas. Se todas forem destruídas, a nave não poderá mais atracar.

### 2.2. Helm Console (Console de Leme / Navegação)
- **Divisão Espacial**: O universo de jogo é dividido em uma grade bidimensional de Quadrantes (System) de 8x8 e, dentro de cada quadrante, setores de 8x8.
- **Set Destination (Definição de Destino)**: O jogador define as coordenadas de destino para Quadrante (System) e Setor (Sector).
- **Controles de Movimento (D-Pad)**: O direcional pad (SVG) permite navegações rápidas e pequenos ajustes de rumo de forma tátil/visual.
- **Consumo de Energia**: O consumo de energia de dobra é calculado proporcionalmente à distância percorrida e ao fator de velocidade selecionado.

### 2.3. Weapons Console (Console de Armas)
- **Bancos de Phasers**:
  - A potência do disparo é determinada pela energia alocada para os phasers.
  - Phasers possuem **Temperatura**. Disparar phasers aquece os emissores. Temperatura excessiva (acima do limite seguro) diminui a eficácia ou causa falha temporária dos bancos.
  - Eficácia decai com o superaquecimento.
- **Torpedos Fotônicos**:
  - Armas de trajetória direta. Consumíveis limitados.
  - Podem ser disparados de tubos específicos e necessitam de mira/bloqueio de alvo.

### 2.4. Shield Console (Console de Escudos)
- **Matriz de Escudos**:
  - Escudos protegem a integridade estrutural contra ataques inimigos.
  - **Transferência de Energia**: Permite realocar energia do gerador principal (Main Energy) para o gerador de escudos e vice-versa.
  - Escudos sofrem fadiga e perdem carga à medida que absorvem dano.

### 2.5. Engineering Console (Consola de Engenharia)
- **Matriz de Energia**:
  - Controla a alocação de energia para os diferentes subsistemas: Motores (Engines), Escudos (Shields), Armas (Weapons) e Suporte de Vida (Life Support).
  - Danos sofridos em combate afetam a eficiência de conversão energética e desabilitam temporariamente sistemas até que sejam reparados por equipes de manutenção ou em uma base estelar.

---

## 3. Estados de Alerta

- **Alerta Vermelho (Red Alert)**: É ativado automaticamente ao entrar em um quadrante hostil com naves inimigas presentes, ou manualmente.
  - Altera o esquema de cores dos consoles (elementos piscantes e tons de vermelho).
  - Dispara o som clássico de sirene de alerta vermelho.
- **Alerta Amarelo/Normal**: Estado padrão de cruzeiro. Sons e animações em tons padrão (azul/laranja LCARS).
