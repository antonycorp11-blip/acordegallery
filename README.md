# ABYSS CLAW

Jogo incremental/arcade 2D de capturas submarinas. Uma garra pendurada numa **plataforma na superfície** dá um golpe seco (**PÁ!**) para pegar animais que podem fugir, esquivar ou resistir. Avance para a **direita**: o mar fica mais fundo, mais estranho e mais valioso. O que segura você é a **profundidade**: o cabo da garra tem comprimento, e cada bioma só abre quando você vence o guardião do anterior e compra mais cabo. Cada mergulho começa com **30 segundos** (até **90 s** com a árvore).

**História:** há décadas um meteoro alienígena caiu no ponto mais fundo do oceano e sua radiação reescreveu o DNA da vida marinha. Daí vêm os peixes que brilham, os mutantes e os guardiões gigantes. A Cooperativa Abissal contrata você para coletar espécimes e chegar até o meteoro, que aparece de verdade no fim do Abismo. Um diário, na aba Missões, libera um trecho da história a cada guardião capturado.

Toda a arte é **pixel art desenhada por código** em Canvas 2D (270 px de altura, ampliada com nearest-neighbor). Não há imagens externas.

## v0.4.0 — Biomas

- **Meta por bioma:** cada bioma tem uma meta de peixes (300 no recife, 900 na Costa Rochosa…). Completou, o guardião aparece onde você está; vencendo, os mergulhos seguintes **já começam no bioma seguinte**, e a plataforma desce até ele. Não dá para voltar a biomas anteriores.
- **Perder para o guardião custa caro:** a garra destruída leva metade das moedas do mergulho, o guardião se cura por completo e a meta do bioma volta para 60%.
- **Economia mais apertada:** capturas valem menos, garras automáticas rendem metade, cada nível de valor dá +12%, e os custos crescem 1,8× por nível.
- **Cota mais dura:** começa em 180 kg por dia, cresce 35% a cada dia batido e 2,6× a cada bioma; a multa por falhar é de 25% do saldo.
- **Tela inicial limpa:** logo, meta do bioma, MERGULHAR, a cota numa linha e quatro atalhos.

## v0.3.0 — Guincho Abissal

A versão aparece no canto inferior direito.

- **Barreira por profundidade:** a garra pende de um cabo. Onde o fundo passa do comprimento do cabo, a água fica escura, uma linha tracejada marca o **LIMITE DO CABO** e nada abaixo dela é alcançável (iscas param na linha e puxam os bichos para cima). O ramo **Guincho** da árvore alonga o cabo; cada trecho novo de cabo é selado pelo guardião do bioma atual.
- **Guardiões aparecem onde você está** quando a fúria enche (capturas no bioma deles). A fúria cresceu para combinar com o mar cheio.
- **Pontos de partida** de um bioma novo exigem o guardião vencido.
- **Oceano cheio:** a população cresce com a árvore (de ~60 até 220 bichos), cardumes enormes e nenhum trecho vazio ao nadar.
- **Mergulho de 30 a 90 s, sem tédio:** um evento a cada 9–14 s (cardume gigante, cardume dourado, chuva de baús, chuva de meteoros, pedido relâmpago, tubarão, correnteza) e a **Maré Final** nos 10 s finais (tudo vale 2×).
- **Tempo extra é raro:** só derrotando um guardião (+15 s), capturando um lendário/anômalo (+5 s) ou achando uma ampulheta num baú (+5 s).
- **Garras automáticas:** braços extras na plataforma atacam sozinhos o que passar embaixo deles (até 8).
- **Árvore refeita do zero** com upgrades fortes e visíveis.
- **Variantes colecionáveis:** Prateado, Albino e Cristalino somam-se a Mini, Gigante, Dourado, Bioluminescente e Mutante.
- **Arte nova** da Matriarca de Ferro e da Raia da Tempestade.
- Saves das versões anteriores são apagados (o jogo começa do zero).

## Como rodar

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # build de produção em dist/
npm run preview    # serve o build
npm test           # testes unitários (Vitest)
npm run smoke      # smoke test no navegador (rode após o build)
```

Requer Node 18+. O smoke test usa o pacote `playwright` com Chromium. Ele não é dependência do jogo; instale com `npm i -D playwright && npx playwright install chromium`, ou aponte `NODE_PATH` para uma instalação global. O deploy na Cloudflare usa `wrangler.jsonc`, que serve a pasta `dist` como site estático.

## Controles

| | PC | Celular (horizontal) |
|---|---|---|
| Mirar | mover o mouse | ◀ ▶ movem a garra (a câmera acompanha; na borda do mundo a garra vai até o canto) |
| Atacar | clique esquerdo ou `Espaço` | **CAPTURAR**: a garra desce reto e pega o primeiro bicho no caminho (marcado em amarelo) |
| Navegar | `A`/`D` ou `◀`/`▶` | botões `◀` `▶` (segurar) |
| Turbo | `Shift` | botão **TURBO** (barra azul sob o cronômetro) |
| Isca | `E` joga · `Q` troca o tipo | botão **ISCA** joga · **⇄** troca o tipo |
| Pausar | `Esc` ou `P` | botão `II` |

O jogo ocupa a tela inteira, sem faixas pretas: a altura interna é fixa em 270 px e a largura (400–640 px) acompanha o formato da tela. Em retrato, o jogo pede para girar o aparelho. Ele também pausa sozinho quando a aba perde o foco.

## Objetivos e progressão

- **Cota diária** (inspirada em Coal LLC): a Cooperativa Abissal exige uma quantidade de pescado em **kg** por dia, e cada dia tem 3 mergulhos.
  - Cada bicho capturado tem peso; os gigantes pesam bem mais.
  - Bater a cota paga moedas e ★ (o excedente rende bônus), sobe a **licença** (+4% no valor das capturas por nível) e aumenta a próxima cota.
  - Falhar custa multa de 25% do saldo e um nível de licença, e a cota se repete.
  - A cota começa em 180 kg, cresce 35% por dia batido e 2,6× a cada bioma novo.

- **Mundo longo e fundo**: cada bioma tem milhares de metros de distância e desce cada vez mais. O cabo começa com 40 m; o recife vai até 150 m, a Costa Rochosa até 600 m, os Naufrágios até 1.800 m, a Floresta Abissal até 4.500 m e o Abismo até 10.000 m. Os mergulhos sempre começam no bioma atual; no meio de cada bioma há uma **boia**, e depois de alcançá-la os mergulhos começam dali.
- **Meta do bioma**: cada peixe capturado no bioma conta para a meta (você está tirando a comida do guardião). Quando a meta enche, o guardião surge **ali mesmo, ao seu lado**. Se você fugir para longe, ele volta a dormir com metade da meta e o dano já causado continua salvo.
- **Guardiões atacam**: arremessam pedras (ou orbes elétricos) na direção da garra. Desvie com ◀ ▶. A garra tem 3 ♥ na luta (mais com o upgrade Casco), e cada acerto custa um coração e 3 s. A vida do guardião fica embaixo da tela para não esconder os tiros. Sem corações, a garra quebra, o mergulho acaba, você perde metade das moedas dele, o guardião se cura e a meta do bioma cai para 60%.
- **Guardiões de bioma**: sete chefes surgem quando provocados: Caranguejo-Rei, Moreia Colossal, Polvo do Naufrágio, Água-Viva Catedral, Leviatã Primordial, Matriarca de Ferro e Raia da Tempestade.
  - Para capturá-los, agarre um a um os **pontos fracos brilhantes** quando abrirem (3 vezes cada; o Leviatã, 4), e só com força suficiente; o primeiro já exige Força na árvore. O dano persiste entre mergulhos. O Caranguejo-Rei e a Moreia Colossal têm arte e animação próprias: o caranguejo anda, abre e fecha as pinças e ergue-as para atacar; a moreia ondula o corpo pintado, abre a bocarra cheia de dentes no ataque e reage ao dano.
  - Eles avisam antes de atacar (brilho vermelho). O ataque atordoa a garra que estiver perto.
  - Cada vitória paga moedas, estrelas e **+15 s** no mergulho atual, libera os nós selados da árvore (inclusive o próximo trecho de cabo) e o **bioma seguinte**: os próximos mergulhos já começam lá.
  - A Matriarca de Ferro (tubarão blindado com arpões cravados) e a Raia da Tempestade (raia elétrica com cauda faiscante) vêm depois do Leviatã, com arte e animação próprias.
- **Encomendas**: três pedidos ativos por vez (capturar espécies, raridades ou variantes, chegar a uma profundidade, fazer combos, ganhar moedas num só mergulho). Pagam moedas e ★, e são resgatadas na base.
- **Aquário**: as espécies capturadas nadam num tanque animado e rendem moedas mesmo com o jogo fechado (até 8 h, mais com ampliações pagas em ★). Completar a **coleção** de um bioma dá +10% no valor de toda captura.
- **Presente diário** com sequência de até 7 dias.
- **Renascer (prestígio)**: depois de 2 guardiões, troca moedas, árvore e garras por **Essência Abissal ✦**. A essência compra uma segunda árvore permanente: valor das capturas, tempo, força, sorte, aquário, frenesi, desconto em garras e manter as rotas.

## Na água

- **Iscas**: jogue uma isca e ela afunda até um ponto. Por alguns segundos, puxa para lá os bichos do seu grupo e chama outros pelas bordas. Bichos comendo ficam distraídos e reagem mais devagar à garra.
  - **Pão de Algas**: cardumes.
  - **Camarão Fresco**: crustáceos.
  - **Carne de Lula**: predadores, às vezes até tubarão.
  - **Isca Luminosa**: bichos das profundezas, com variantes bioluminescentes.
  - **Isca Dourada**: qualquer bicho, com variantes douradas.

  Compre na Oficina. O presente diário também dá iscas.

- **Golpe brusco** (cerca de 70–165 ms) com colisão no instante do contato, fuga real dos animais, "hit-stop" na captura e moedas voando até o contador. O celular vibra a cada captura (dá para desligar).
- **Frenesi**: 5 capturas seguidas deixam os golpes ultrarrápidos e dobram o valor por alguns segundos.
- **Eventos a cada 9–14 s** (nenhum trecho do mergulho fica parado):
  - **Cardume gigante** (14+ peixes cruzando a tela);
  - **Cardume dourado** (peixes que valem 4×);
  - **Chuva de baús** (4–6 baús caem ao alcance do cabo);
  - **Chuva de meteoros** (fragmentos transformam bichos em mutantes, que valem 3×);
  - **Pedido relâmpago** (capture N bichos de uma espécie em 12 s e receba um bônus);
  - **Tubarão** (devora os bichos pequenos e cresce; com força suficiente, dá para capturá-lo);
  - **Correnteza** (empurra para águas fundas).
- **Maré Final**: nos 10 s finais o cronômetro fica dourado, chega um último cardume e tudo vale 2×.
- **Garras automáticas**: compradas na árvore (Braço Auxiliar e seguintes), ficam penduradas na plataforma ao lado da sua e atacam sozinhas o bicho que passar embaixo. Não mexem no seu combo: o golpe manual continua sendo o principal.
- **Baús de tesouro** (moedas e às vezes ★) e **Baús-Mímicos**, que fingem ser baú, mostram os dentes e fogem.
- **24 espécies e um baú** com IA própria (o recife tem 12, incluindo Cirurgião-Azul, Peixe-Papagaio, Ermitão, Baiacu, Cavalo-Marinho e Raia-Manta), com raridades de comum a anômala.
- **Variantes colecionáveis**: cada espécie pode aparecer como **Mini, Gigante, Prateada, Albina, Dourada, Bioluminescente, Mutante ou Cristalina** (algumas só no fundo). Variantes brilhantes piscam na água.
  - A primeira captura de cada variante dá **+1★** e um aviso.
  - No catálogo, cada espécie mostra seus espaços de variante (encontradas e `???`).
  - Cada variante registrada faz aquela espécie valer **+5%** para sempre.
- **8 garras**:
  - **Sucata**: equilibrada.
  - **Relâmpago**: muito rápida, pouca força.
  - **Hidráulica**: forte e de abertura grande, mais lenta.
  - **Elétrica**: atordoa em área e ignora choques.
  - **Tripla**: até 3 alvos.
  - **Magnética**: puxa os bichos para o trajeto.
  - **Mutante**: tentáculos pegam vizinhos.
  - **Gravitacional**: atrai tudo para a boca, até 4 alvos.

  As três últimas também custam ★. Todas são desenhadas por código, simétricas, e o **acabamento evolui** (Básica → Reforçada → Dourada → Lendária) conforme você compra melhorias de captura na árvore.
- **Árvore de habilidades em tela cheia** (estilo incremental): tocar num nó abre um balão com a descrição e o efeito real (antes e depois da compra); tocar de novo (ou em Comprar) compra. Comprar revela os filhos, o anel seguinte aparece como `?` e o resto fica escondido. Dá para arrastar, dar zoom e pular para Guincho, Força, Vida e Automáticas.
  - **Captura** (para cima): golpe −16% por nível, recarga −16% por nível, abertura +2 px por nível (a garra cresce na tela), força, captura múltipla, furtividade, disputa de troféus.
  - **Expedição** (para a direita): **Guincho** (cabo), tempo (+5 s por nível, teto de 90 s), propulsores, turbo, casco (+♥), iscas.
  - **Ecologia** (para baixo): +35% de bichos por nível, cardumes maiores, sorte, variantes (+50% por nível), kg para a cota, sonar.
  - **Tecnologia** (para a esquerda): valor (+25% por nível), garras automáticas e seus motores, combo, frenesi, arsenal.
  - Os nós mais fortes são **selados** (🔒) até capturar um guardião. O ritmo estimado está em `docs/balanceamento.md`.

## Visual

Toda a arte é desenhada por código:
- água com degradê pontilhado e superfície ondulando;
- **cáusticas** animadas na água e na areia;
- feixes de luz e três camadas de parallax com névoa e silhuetas de cada bioma (colinas de coral, agulhas de rocha, florestas de kelp, colunas e cascos de navio, árvores abissais com bulbos brilhantes, cristais gigantes);
- areia com marcas de ondulação, camadas de sedimento, pedras embutidas, musgo luminoso e detritos;
- decoração animada: kelp, anêmonas, fontes hidrotermais com bolhas, cristais e plantas brilhantes;
- plâncton bioluminescente, primeiro plano escuro e vinheta.

## Estrutura

```text
src/
  config.ts            balanceamento central (tempo, spawn, raridades, frenesi, eventos, aquário…)
  main.ts              DOM, layout em tela cheia, safe areas, foco/orientação
  core/                Game (loop, regras da run, guardiões, eventos), Input, Camera, Save, RNG, Audio
  world/               Depth, Biomes, Terrain (chunks), SpawnDirector
  entities/            Species, Creature (IA), Claw (estados), ClawsCatalog, Baits, Hit, Boss (guardiões)
  systems/             Upgrades (árvores e stats), Economy, Orders (encomendas), Quota (cota diária), Meta (aquário, presente, prestígio)
  render/              Renderer, Scenery (mar e fundo), ClawArt (garras espelhadas), PixelArt (sprites), Effects, Color
  ui/                  HUD, Screens (menus em DOM), SkillTree (mapa de nós), AquariumView
tests/                 Vitest
scripts/smoke.cjs      smoke test com Playwright
scripts/balance.ts     simulação de ritmo (npx vite-node scripts/balance.ts)
```

## Testes

- `npm test`: testes unitários e de regressão, cobrindo:
  - profundidade, biomas e determinismo do terreno;
  - custos e efeitos dos upgrades, estrutura das duas árvores, revelação de nós e nós selados por guardião, cabo como barreira, garras automáticas, teto de 90 s, garras com estrelas;
  - save/load e recuperação de save corrompido;
  - colisão e golpe em coluna;
  - tempos da garra;
  - spawn (habitat, sorte, densidade, variantes, teto de entidades);
  - economia e combo;
  - encomendas, aquário e coleções, presente diário e prestígio;
  - guardiões (pontos fracos, ordem, pontos de partida, meta para acordar), progressão por bioma e cota por bioma;
  - cota diária, iscas e trilho da garra até a borda esquerda.
- `npm run smoke`: no Chromium, faz uma run completa:
  1. inicia a run (00:30) e captura um animal;
  2. confere que a profundidade aumenta indo para a direita;
  3. termina o cronômetro e confere que as moedas são creditadas uma vez e salvas;
  4. compra o nó raiz da árvore e confere que 4 nós novos aparecem;
  5. confere que a próxima run começa com 00:35 e que o progresso persiste após recarregar.

## Próximos passos

- Uma mecânica própria por bioma (kelp que esconde bichos, naufrágios com baús, fendas com bichos que somem).
- Missões semanais e conquistas.
- Arte própria para o Polvo, a Água-Viva e o Leviatã.
