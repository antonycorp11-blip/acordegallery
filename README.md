# ABYSS CLAW

Jogo incremental/arcade 2D de capturas submarinas. Uma garra vem do topo da tela e dá um golpe seco (**PÁ!**) para pegar animais que podem fugir, esquivar ou resistir. Avance para a **direita**: o mar fica mais fundo, mais estranho e mais valioso. Cada mergulho começa com **30 segundos**; com o dinheiro você compra upgrades e garras novas.

Toda a arte é **pixel art desenhada por código** em Canvas 2D (480×270, ampliado com nearest-neighbor). Não há imagens externas.

## Como rodar

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # build de produção em dist/
npm run preview    # serve o build
npm test           # testes unitários (Vitest)
npm run smoke      # smoke test no navegador (rode após o build)
```

Requer Node 18+. O smoke test usa o pacote `playwright` com Chromium. Ele não é dependência do jogo; instale com `npm i -D playwright && npx playwright install chromium`, ou aponte `NODE_PATH` para uma instalação global. Não precisa de servidor, banco de dados nem login: o progresso fica no `localStorage`.

## Controles

| | PC | Celular (horizontal) |
|---|---|---|
| Mirar | mover o mouse | tocar/arrastar no mar (não dispara) |
| Atacar | clique esquerdo ou `Espaço` | botão **CAPTURAR** |
| Navegar | `A`/`D` ou `◀`/`▶` | botões `◀` `▶` (segurar) |
| Pausar | `Esc` ou `P` | botão `II` |

Dá para mirar com um dedo e atacar com outro (multitouch). Em retrato, o jogo pede para girar o aparelho. O jogo pausa sozinho quando a aba perde o foco, então o cronômetro não corre à toa.

## O que está implementado

- **Golpe brusco**: máquina de estados `READY → ANTICIPATE → STRIKE → CLOSE → RETRACT → COOLDOWN`. A investida leva cerca de 70–165 ms conforme a garra e os upgrades, com rastro, linhas de velocidade, faíscas, tremor e um breve *hit-stop* na captura. O ciclo inicial completo leva cerca de 600 ms.
- **Colisão no instante do contato**: a boca da garra (círculo do tamanho da abertura) é testada contra a hitbox das criaturas quando chega, não no clique. Não há sorte invisível: os animais percebem o golpe, reagem com atraso por espécie e fogem de verdade.
- **Feedback**: `ERROU!`, `ESCAPOU!`, `RESISTIU!`, `CAPTURADO!`, `PERFEITO!`, `ESPÉCIE NOVA!`, `CHOQUE!`, `+$valor`, `+Ns`, combo.
- **Exploração lateral contínua**: `depthAt(worldX)` é monotônica e interpolada (0 m → 100 m em 1.500 → 500 m em 4.000 → 1.500 m em 7.000 → 4.000 m em 11.000 → …). São 5 biomas contínuos com cores, decoração e fauna interpoladas: Recife Colorido, Costa Rochosa, Naufrágios e Ruínas, Floresta Abissal e Abismo Impossível. O terreno é procedural com seed por run, em chunks determinísticos, e a câmera segue o leito suavemente.
- **14 espécies** com IA própria (`IDLE`, `PATROL`, `ALERT`, `FLEE`, `HIDE`, `STUNNED`, `CAPTURED`):
  - caranguejos que correm de lado;
  - cardumes que dão dash;
  - lagosta que se esconde em fendas;
  - enguia errática;
  - Peixe-Cofre encouraçado;
  - polvo que se camufla e solta tinta;
  - água-viva que dá choque;
  - Caranguejo Dourado com bônus de tempo;
  - Peixe-Fantasma ultra-rápido;
  - Peixe-Lanterninha e Caranguejo-Aranha das águas fundas;
  - Leviatã-Lanterna (lendário);
  - Olho Errante (anômalo, se teleporta).
- **Raridades** comum → anômala e **variantes** mini, gigante, dourado, bioluminescente e mutante, que mudam tamanho, valor, força exigida e velocidade.
- **SpawnDirector**: povoa cada chunk uma única vez, sem duplicar ao voltar, e traz novos animais pelas bordas. Tem teto de 70 entidades vivas e não faz spawn sob a mira. A densidade e a sorte compradas alteram o spawn de verdade.
- **5 garras reais** (Oficina), cada uma com aparência e mecânica próprias:
  - **Sucata**: equilibrada;
  - **Relâmpago**: muito rápida, os bichos reagem mais tarde, mas tem pouca força;
  - **Hidráulica**: forte, abertura grande, mais lenta;
  - **Elétrica**: atordoa em área e ignora o choque das águas-vivas;
  - **Tripla**: 3 dentes, até 3 alvos.

  As garras são desbloqueadas por recorde de profundidade e por moedas.
- **Árvore de habilidades de verdade** (estilo incremental): um mapa de 34 nós quadrados com ícones em pixel art, que dá para arrastar e dar zoom com a roda, a pinça ou os botões. Comece pelo nó central **Instinto de Caça**: comprar um nó revela os filhos ligados a ele, o próximo anel aparece como `?` e o resto fica escondido até você chegar lá. Toque num nó para ver os detalhes e toque de novo (ou use o botão) para comprar. São 4 ramos coloridos saindo da origem:
  - **Captura** (para cima): golpe rápido, abertura, força, recuperação, precisão e captura múltipla.
  - **Expedição** (para a direita): mais tempo (+5 s por nível), propulsores e relógio dourado.
  - **Ecologia** (para baixo): mais criaturas, sorte abissal (com retorno decrescente), cardumes e variantes.
  - **Tecnologia** (à esquerda): combo, captura perfeita e sonar de raros.

  Nós mais fundos reforçam o mesmo atributo (ex.: Golpe Rápido → Estalo Relâmpago). O custo é `round(base × 1,55^nível)`.
- **Economia**: valor = base × variante × profundidade × (combo + captura perfeita). As moedas são creditadas uma única vez no fim da run e salvas na hora.
- **Telas**: Base, Resultados (capturas, moedas, profundidade/recorde, espécies novas, raridades), Habilidades, Oficina, Catálogo (silhuetas das espécies desconhecidas) e Configurações (som, apagar progresso com confirmação).
- **Áudio** sintetizado com Web Audio, sem arquivos, e botão de mudo.
- **Save** versionado e validado no `localStorage`: um save corrompido volta ao padrão sem quebrar o jogo.

## Estrutura

```text
src/
  config.ts            balanceamento central (tempo, spawn, raridades, economia…)
  main.ts              DOM, layout 16:9, safe areas, foco/orientação
  core/                Game (loop e regras da run), Input, Camera, Save, RNG, Audio
  world/               Depth, Biomes, Terrain (chunks), SpawnDirector
  entities/            Species, Creature (IA), Claw (estados), ClawsCatalog, Hit
  systems/             Upgrades (árvore e stats), Economy (valor, combo, coleção)
  render/              Renderer (camadas), PixelArt (sprites procedurais), Effects, Color
  ui/                  HUD, Screens (menus em DOM), SkillTree (mapa de nós)
tests/                 Vitest: profundidade, biomas, terreno, upgrades, save, hit, garra, spawn, economia
scripts/smoke.cjs      smoke test com Playwright
```

## Testes

- `npm test`: 35 testes unitários. Cobrem `depthAt`, a interpolação de biomas, o determinismo do terreno, os custos e efeitos dos upgrades, a estrutura da árvore e a revelação de nós, compra de garras, save/load/corrupção, colisão, tempos da garra, habitat/sorte/densidade/variantes do spawn, teto de entidades, combo e coleção.
- `npm run smoke`: abre o jogo no Chromium, inicia a run (00:30), captura um animal, confere que a profundidade aumenta indo para a direita, termina o cronômetro e confere que as moedas são creditadas uma vez e salvas. Depois compra o nó raiz da árvore, confere que 2 novos nós aparecem, que a próxima run começa com 00:35 e que o progresso persiste após recarregar.

## Próximos passos

- Garras Magnética, Mutante e Gravitacional (o catálogo já é extensível).
- Checkpoints de partida conquistados em zonas profundas.
- Chefes de captura com pontos fracos, correntezas, missões e prestígio (Essência Abissal).
