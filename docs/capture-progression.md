# Validação da progressão de captura

## Causas corrigidas

- Força: o bônus linear deixava o Leviatã Gigante (11,9) acima da força da Sucata com toda a árvore principal (10,4).
- Velocidade/recuperação: limites nas curvas anulavam compras posteriores.
- Toque: o cálculo da trajetória parava na tangência do alvo, mas a verificação seguinte às vezes rejeitava o mesmo contato por arredondamento. Um teste reproduziu a falha antes da correção.
- Feedback: a árvore mostrava a contribuição do nó isolado, sem a força total da garra. Agora mostra o total atual e a previsão da compra; uma resistência informa força disponível/exigida.

## Cálculos

Força total = força da garra + 0,5L + 0,04 × max(0, L − 6)², com L somando todos os níveis de força, inclusive essência.

Os seis primeiros níveis preservam o equilíbrio inicial. Com Sucata, os marcos são:

| Níveis de força | Força total | Novo alvo que a força permite segurar |
| --- | --- | --- |
| 0 | 2,40 | Presas iniciais |
| 6 | 5,40 | Olho Errante normal (4,00) |
| 11 | 8,90 | Leviatã normal (7,00) |
| 15 | 13,14 | Leviatã Gigante (11,90), antes de maximizar a força |
| 16 | 14,40 | Toda espécie/variante do catálogo |

Velocidade e recuperação se aproximam do mínimo sem um corte abrupto:
tempo = mínimo + (tempo base − mínimo) × fator^L,
com fatores 0,86 para golpe/recolhimento e 0,88 para recarga.

A colisão aceita erro de até 0,0000001 nas distâncias ao quadrado. Isso corrige a tangência sem ampliar perceptivelmente o alcance; um teste verifica que um alvo 0,001 pixel fora continua sendo rejeitado.

## Testes executáveis

- `npm test`: progressão de força em cada compra, acesso sequencial aos guardiões, requisitos de todas as variantes com todas as garras, melhoria dos tempos, preservação do save e colisão em 10 mil posições.
- `npm run build`: TypeScript e compilação de produção.
- `npm run smoke`: Chromium com início de partida, captura, navegação, recompensa, compra na árvore e persistência após recarregar.
- `node scripts/capture-check.cjs`: integração no Chromium; requer Playwright e Chromium instalados, assim como o smoke existente. Inicia e encerra seu próprio servidor Vite.

O teste de captura executa o update real da partida, a IA, a trajetória da garra, a colisão e a resolução da captura. Desativa apenas a geração de outros alvos, posicionando uma presa isolada com mira alinhada. Não usa save de jogador.

Resultados:
- 19.872 tentativas com árvore principal completa, sem essência: 23 espécies × 6 variantes × 8 garras × 2 modos (mouse/toque) × 3 taxas (30/60/120 FPS) × 3 sementes. Zero falhas.
- Mais 4.000 tentativas por etapas, com Sucata: quatro alvos × cinco estágios × dois modos × 100 sementes. Leviatã normal liberado no estágio intermediário; gigante no avançado. Ambos continuam bloqueados no início.
- Compra pela interface: previsão de 5,40 para 5,94 confere com a força efetiva e com a habilidade gravada no save.

Esses resultados verificam capturabilidade em condições controladas. Não significam captura garantida com mira fora do alvo, criaturas ocultas ou outra presa bloqueando a coluna. Não houve simulação de uma campanha inteira nem acesso ao save pessoal do usuário.

Saves existentes recebem os cálculos automaticamente. Não é necessário reset.
