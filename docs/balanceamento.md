# Balanceamento

Números centrais ficam em `src/config.ts` (tempo, cabo, spawn, eventos), `src/systems/Upgrades.ts` (custos e efeitos da árvore) e `src/entities/Boss.ts` (força e fúria dos guardiões).

## Ritmo estimado

Gerado por `npx vite-node scripts/balance.ts`. É um modelo simples: o jogador acerta 35% dos golpes, as garras automáticas 45% (e rendem metade), passa 25 s na base entre mergulhos e compra sempre o nó mais barato (força e cabo têm prioridade quando travam). Um jogador real tende a levar mais tempo.

| Guardião | Mergulhos | Minutos | Cabo | Força | Tempo | Garras auto | Capturas/mergulho |
|---|---|---|---|---|---|---|---|
| Caranguejo-Rei | 18 | 20 | 150 m | 4.4 | 50s | 0 | 24 |
| Moreia Colossal | 37 | 43 | 240 m | 5.4 | 50s | 2 | 68 |
| Polvo do Naufrágio | 65 | 80 | 640 m | 6.6 | 60s | 2 | 102 |
| Água-Viva Catedral | 89 | 115 | 1.840 m | 8.0 | 65s | 4 | 186 |
| Leviatã Primordial | 138 | 194 | 4.540 m | 10.9 | 80s | 6 | 373 |
| Matriarca de Ferro | 190 | 286 | 4.540 m | 13.1 | 85s | 6 | 502 |
| Raia da Tempestade | 229 | 359 | 4.540 m | 14.4 | 90s | 7 | 602 |

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

| Guardião | Força | Pontos fracos × agarrões | Meta (peixes no bioma) |
|---|---|---|---|
| Caranguejo-Rei | 4,0 | 4 × 3 | 300 |
| Moreia Colossal | 5,0 | 4 × 3 | 900 |
| Polvo do Naufrágio | 6,5 | 4 × 3 | 1.200 |
| Água-Viva Catedral | 8,0 | 5 × 3 | 2.200 |
| Leviatã Primordial | 10,0 | 7 × 4 | 3.000 |
| Matriarca de Ferro | 12,0 | 3 × 4 | 9.000 |
| Raia da Tempestade | 13,5 | 3 × 4 | 12.000 |

## Progressão, perdas e cota

- Cada bioma tem uma meta de peixes (a coluna Meta acima). Ao completá-la, o guardião aparece onde o jogador está.
- Vencer o guardião muda o bioma atual: os mergulhos começam nele, a câmera não volta para trás e o cabo desce até o começo dele (profundidade inicial + 40 m).
- Perder (garra destruída): −50% das moedas do mergulho, o guardião se cura e a meta volta a 60%.
- Valor: escala global de 0,55 nas capturas, +12% por nível de valor, garras automáticas rendem 50%.
- Cota diária: 180 kg × 1,35^(dias batidos) × 2,6^(bioma); multa de 25% ao falhar.

## Tempo

- 30 s de base, +5 s por nível de tempo (12 níveis na árvore principal), teto de 90 s.
- Dentro do mergulho: +15 s por guardião derrotado, +5 s por lendário ou anômalo, +5 s por ampulheta (8% dos baús). Não há outra forma.
- Eventos a cada 9–14 s; Maré Final (valor 2×) nos últimos 10 s.

## Custos

Custo do nível n = custo base × 1,8ⁿ. Os custos base sobem por anel da árvore:

| Anel | Custo base |
|---|---|
| Livre (início) | 20 – 40.000 |
| Selado pelo Caranguejo-Rei | 5.400 – 18.000 |
| Selado pela Moreia Colossal | 25.000 – 125.000 |
| Selado pelo Polvo do Naufrágio | 120.000 – 1,6 mi |
| Selado pela Água-Viva Catedral | 360.000 – 4,8 mi |
| Selado pelo Leviatã Primordial | 30 mi |
