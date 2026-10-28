# Balanceamento

Números centrais ficam em `src/config.ts` (tempo, cabo, spawn, eventos), `src/systems/Upgrades.ts` (custos e efeitos da árvore) e `src/entities/Boss.ts` (força e fúria dos guardiões).

## Ritmo estimado

Gerado por `npx vite-node scripts/balance.ts`. É um modelo simples: o jogador acerta 35% dos golpes, as garras automáticas 45%, passa 25 s na base entre mergulhos e compra sempre o nó mais barato (força e cabo têm prioridade quando travam). Um jogador real tende a levar mais tempo.

| Guardião | Mergulhos | Minutos | Cabo | Força | Tempo | Garras auto | Capturas/mergulho |
|---|---|---|---|---|---|---|---|
| Caranguejo-Rei | 14 | 16 | 150 m | 4.9 | 50s | 2 | 52 |
| Moreia Colossal | 27 | 32 | 510 m | 5.4 | 55s | 2 | 94 |
| Polvo do Naufrágio | 40 | 51 | 1.080 m | 7.3 | 65s | 4 | 186 |
| Água-Viva Catedral | 59 | 81 | 2.880 m | 8.9 | 75s | 5 | 305 |
| Leviatã Primordial | 90 | 137 | 4.500 m | 14.4 | 90s | 7 | 602 |
| Matriarca de Ferro | 104 | 164 | 5.600 m | 14.4 | 90s | 8 | 673 |
| Raia da Tempestade | 122 | 199 | 8.900 m | 14.4 | 90s | 8 | 673 |

Minutos são acumulados desde o começo do jogo.

## Barreira por profundidade

| Bioma | Profundidade | Cabo necessário | Liberado por |
|---|---|---|---|
| Recife | 0–150 m | 40 → 150 m (Guincho, 5 níveis de +22 m) | início |
| Costa Rochosa | 150–600 m | até 600 m (Guincho Pesado, +90 m) | Caranguejo-Rei |
| Naufrágios | 600–1.800 m | até 1.800 m (Cabo de Aço, +240 m) | Moreia Colossal |
| Floresta Abissal | 1.800–4.500 m | até 4.500 m (Cabo Abissal, +540 m) | Polvo do Naufrágio |
| Abismo | 4.500–10.000 m | até 10.000 m (Elevador do Meteoro, +1.100 m) | Água-Viva Catedral |
| Fossa | 10.000 m+ | +1.800 m (Âncora Primordial) | Leviatã Primordial |

Quando o fundo passa do cabo, a linha de alcance sobe 260 px para cada 100% de profundidade excedente (até 210 px), então poucos metros a mais já deixam o fundo fora de alcance.

## Guardiões

| Guardião | Força | Pontos fracos × agarrões | Fúria (capturas no bioma) |
|---|---|---|---|
| Caranguejo-Rei | 4,0 | 4 × 3 | 300 |
| Moreia Colossal | 5,0 | 4 × 3 | 900 |
| Polvo do Naufrágio | 6,5 | 4 × 3 | 1.200 |
| Água-Viva Catedral | 8,0 | 5 × 3 | 2.200 |
| Leviatã Primordial | 10,0 | 7 × 4 | 3.000 |
| Matriarca de Ferro | 12,0 | 3 × 4 | 9.000 |
| Raia da Tempestade | 13,5 | 3 × 4 | 12.000 |

## Tempo

- 30 s de base, +5 s por nível de tempo (12 níveis na árvore principal), teto de 90 s.
- Dentro do mergulho: +15 s por guardião derrotado, +5 s por lendário ou anômalo, +5 s por ampulheta (8% dos baús). Não há outra forma.
- Eventos a cada 9–14 s; Maré Final (valor 2×) nos últimos 10 s.

## Custos

Custo do nível n = custo base × 1,7ⁿ. Os custos base sobem por anel da árvore:

| Anel | Custo base |
|---|---|
| Livre (início) | 20 – 40.000 |
| Selado pelo Caranguejo-Rei | 5.400 – 18.000 |
| Selado pela Moreia Colossal | 25.000 – 125.000 |
| Selado pelo Polvo do Naufrágio | 120.000 – 1,6 mi |
| Selado pela Água-Viva Catedral | 360.000 – 4,8 mi |
| Selado pelo Leviatã Primordial | 30 mi |
