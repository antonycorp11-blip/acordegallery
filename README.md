# ABYSS CLAW

Jogo incremental/arcade 2D de capturas submarinas. Uma garra vem do topo da tela e dá um golpe seco (**PÁ!**) para pegar animais que podem fugir, esquivar ou resistir. Avance para a **direita**: o mar fica mais fundo, mais estranho e mais valioso, até chegar aos **guardiões** que bloqueiam cada bioma. Cada mergulho começa com **30 segundos**; com o dinheiro você compra habilidades, garras e muito mais.

**História:** há décadas um meteoro alienígena caiu no ponto mais fundo do oceano e sua radiação reescreveu o DNA da vida marinha. Daí vêm os peixes que brilham, os mutantes e os guardiões gigantes. A Cooperativa Abissal contrata você para coletar espécimes e chegar até o meteoro, que aparece de verdade no fim do Abismo. Um diário, na aba Missões, libera um trecho da história a cada guardião capturado.

Toda a arte é **pixel art desenhada por código** em Canvas 2D (270 px de altura, ampliada com nearest-neighbor). Não há imagens externas.

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
  - Falhar custa multa de 15% do saldo e um nível de licença, e a cota se repete.

- **Mundo longo**: cada bioma tem milhares de metros de distância (o primeiro guardião está a 5.800). Atravessar um bioma leva vários mergulhos e melhorias; no meio de cada bioma há uma **boia** que vira ponto de partida quando você a alcança.
- **Guardiões dormem até serem provocados**: cada bicho capturado no bioma de um guardião enche a **fúria** dele (você está tirando a comida dele). Quando enche, ele **acorda** e espera no fim do bioma; até lá, a correnteza dele bloqueia o caminho.
- **Guardiões atacam**: arremessam pedras (ou orbes elétricos) na direção da garra. Desvie com ◀ ▶. A garra tem 3 ♥ na luta, e cada acerto custa um coração e 3 s. Sem corações, a garra quebra e o mergulho acaba.
- **Guardiões de bioma**: cinco chefes gigantes bloqueiam o caminho com uma parede de correnteza: Caranguejo-Rei, Moreia Colossal, Polvo do Naufrágio, Água-Viva Catedral e Leviatã Primordial.
  - Para capturá-los, agarre um a um os **pontos fracos brilhantes** quando abrirem (cada um 2 vezes), e só com força suficiente; o primeiro já exige Força na árvore. O dano persiste entre mergulhos. O Caranguejo-Rei tem arte e animação próprias: anda, abre e fecha as pinças, ergue-as para atacar e reage ao dano.
  - Eles avisam antes de atacar (brilho vermelho). O ataque atordoa a garra que estiver perto.
  - Cada vitória paga moedas, estrelas e +10 s, e libera um **ponto de partida** no bioma seguinte.
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
- **Eventos aleatórios**:
  - **Cardume dourado** (peixes que valem 4× e dão segundos extras);
  - **Correnteza** (empurra para águas fundas);
  - **Tubarão-Martelo** (devora os bichos pequenos e morde garras fracas; com força suficiente, dá para capturá-lo).
- **Baús de tesouro** (moedas e às vezes ★) e **Baús-Mímicos**, que fingem ser baú, mostram os dentes e fogem.
- **22 espécies** com IA própria (o recife tem 12, incluindo Cirurgião-Azul, Peixe-Papagaio, Ermitão, Baiacu, Cavalo-Marinho e Raia-Manta), raridades de comum a anômala e variantes mini, gigante, dourado, bioluminescente e mutante.
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
- **Árvore de habilidades em tela cheia** (estilo incremental): tocar num nó abre um balão com a descrição; tocar de novo (ou em Comprar) compra. Comprar revela os filhos, o anel seguinte aparece como `?` e o resto fica escondido. Dá para arrastar e dar zoom.

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
```

## Testes

- `npm test`: 63 testes unitários, cobrindo:
  - profundidade, biomas e determinismo do terreno;
  - custos e efeitos dos upgrades, estrutura das duas árvores e revelação de nós, garras com estrelas;
  - save/load e recuperação de save corrompido;
  - colisão e golpe em coluna;
  - tempos da garra;
  - spawn (habitat, sorte, densidade, variantes, teto de entidades);
  - economia e combo;
  - encomendas, aquário e coleções, presente diário e prestígio;
  - guardiões (pontos fracos, ordem, pontos de partida, fúria para acordar);
  - cota diária, iscas e trilho da garra até a borda esquerda.
- `npm run smoke`: no Chromium, faz uma run completa:
  1. inicia a run (00:30) e captura um animal;
  2. confere que a profundidade aumenta indo para a direita;
  3. termina o cronômetro e confere que as moedas são creditadas uma vez e salvas;
  4. compra o nó raiz da árvore e confere que 2 nós novos aparecem;
  5. confere que a próxima run começa com 00:35 e que o progresso persiste após recarregar.

## Próximos passos

- Mais guardiões e biomas depois do Leviatã Primordial.
- Missões semanais e conquistas.
- Automação moderada das áreas já conquistadas.
