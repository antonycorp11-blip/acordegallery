
import { Game } from './types';

export const GAMES: Game[] = [
  {
    id: 'chord-rush',
    title: 'Chord Rush',
    description: 'Treine seus acordes e agilidade neste desafio musical acelerado.',
    url: 'https://chordrush.vercel.app/',
    thumbnail: '/chord_icon.png',
    category: 'Teclado'
  },
  {
    id: 'voice-rush',
    title: 'Voice Rush',
    description: 'Use sua voz para controlar o jogo e atingir as notas certas.',
    url: 'https://voicerush.vercel.app/',
    thumbnail: 'https://voicerush.vercel.app/assets/icon-B_CoIytw.png',
    category: 'Canto'
  },
  {
    id: 'ritmo-pro',
    title: 'Ritmo Pro',
    description: 'Um jogo de ritmo intenso para testar sua coordenação.',
    url: 'https://ritmopro.vercel.app/',
    thumbnail: 'https://ritmopro.vercel.app/apple-touch-icon.png',
    category: 'Ritmo'
  },
  {
    id: 'acorde-maker',
    title: 'Acorde Maker',
    description: 'Domine o braço do violão montando acordes em tempo real. Desafio de elite para músicos.',
    url: 'https://acordemaker.vercel.app/',
    thumbnail: '/acorde_maker_icon.png',
    category: 'Violão'
  },
  {
    id: 'chord-master',
    title: 'Chord Master',
    description: 'Domine a formação de acordes no teclado com este desafio musical premium.',
    url: 'https://chordmaster-theta.vercel.app/',
    thumbnail: '/chordmaster_gallery_art.png',
    category: 'Teclado',
    scheduledRelease: '2026-02-02T08:00:00-03:00' // Segunda-feira às 08:00 (Horário Brasília presumed)
  }
];

export const TITLES = [
  "Recruta do Ritmo",
  "Aprendiz de Acordes",
  "Explorador Sonoro",
  "Guerreiro da Harmonia",
  "Cavaleiro do Teclado",
  "Mestre da Melodia",
  "Lenda das Oitavas",
  "Virtuoso de Elite",
  "Maestro do Multiverso",
  "Deus do Som"
];

export type ItemRarity = 'comum' | 'raro' | 'épico' | 'lendário' | 'exclusivo';

export interface StoreItem {
  id: string;
  name: string;
  price: number;
  type: 'card' | 'font' | 'border' | 'icon';
  preview: string; // Classes CSS ou Emoji/Texto
  description: string;
  category: string;
  rarity: ItemRarity;
  collection?: string;
  availableUntil?: string; // ISO Date String
}

export const STORE_ITEMS: StoreItem[] = [
  // --- COLEÇÃO EXCLUSIVA: TIMES DE FUTEBOL (TEMPO LIMITADO) ---
  {
    id: 'exclusive-card-spfc',
    name: 'Manto Tricolor Elite',
    price: 30000,
    type: 'card',
    preview: '/assets/exclusive/cards/spfc.png',
    description: 'A elegância e o peso da história tricolor no seu perfil. (Coleção Exclusiva)',
    category: 'Cards',
    rarity: 'exclusivo',
    collection: 'Times de Futebol',
    availableUntil: '2026-02-15T23:59:59Z'
  },
  {
    id: 'exclusive-card-fla',
    name: 'Manto Rubro-Negro',
    price: 30000,
    type: 'card',
    preview: '/assets/exclusive/cards/fla.png',
    description: 'A força e a paixão da nação rubro-negra. (Coleção Exclusiva)',
    category: 'Cards',
    rarity: 'exclusivo',
    collection: 'Times de Futebol',
    availableUntil: '2026-02-15T23:59:59Z'
  },
  {
    id: 'exclusive-card-sccp',
    name: 'Armadura Alvinegra',
    price: 30000,
    type: 'card',
    preview: '/assets/exclusive/cards/cor.png',
    description: 'Garra e tradição alvinegra em cada pixel. (Coleção Exclusiva)',
    category: 'Cards',
    rarity: 'exclusivo',
    collection: 'Times de Futebol',
    availableUntil: '2026-02-15T23:59:59Z'
  },
  {
    id: 'exclusive-card-sep',
    name: 'Manto Alviverde Imponente',
    price: 30000,
    type: 'card',
    preview: '/assets/exclusive/cards/pal.png',
    description: 'A academia de futebol representada com classe. (Coleção Exclusiva)',
    category: 'Cards',
    rarity: 'exclusivo',
    collection: 'Times de Futebol',
    availableUntil: '2026-02-15T23:59:59Z'
  },
  // --- ICONES LENDÁRIOS ---
  {
    id: 'legendary-icon-piano',
    name: 'Piano dos Deuses',
    price: 21000,
    type: 'icon',
    preview: "/assets/legendary_icon_piano.png",
    description: 'Um piano majestoso forjado em marfim divino e ouro puro. (Classe Lendária)',
    category: 'Ícones',
    rarity: 'lendário'
  },
  {
    id: 'legendary-icon-guitar',
    name: 'Guitarra da Fênix',
    price: 21000,
    type: 'icon',
    preview: "/assets/legendary_icon_guitar.png",
    description: 'Uma guitarra lendária feita de fogo vivo e penas de fênix. (Classe Lendária)',
    category: 'Ícones',
    rarity: 'lendário'
  },

  // --- ICONES (Raros e Comuns) ---
  {
    id: 'rare-icon-guitar',
    name: 'Guitarra Cyber-Chrome',
    price: 1050,
    type: 'icon',
    preview: "/assets/rare_icon_guitar.png",
    description: 'Guitarra com acabamento em cromo e luzes neon. (Classe Rara)',
    category: 'Ícones',
    rarity: 'raro'
  },
  {
    id: 'rare-icon-piano',
    name: 'Piano de Cristal',
    price: 1050,
    type: 'icon',
    preview: "/assets/rare_icon_piano.png",
    description: 'Um piano majestoso feito de puro cristal luminoso. (Classe Rara)',
    category: 'Ícones',
    rarity: 'raro'
  },
  {
    id: 'rare-icon-drums',
    name: 'Bateria de Ouro',
    price: 1050,
    type: 'icon',
    preview: "/assets/rare_icon_drums.png",
    description: 'Set de bateria em ouro 24k e mogno nobre. (Classe Rara)',
    category: 'Ícones',
    rarity: 'raro'
  },

  {
    id: 'epic-icon-piano',
    name: 'Vortex das Teclas',
    price: 3150,
    type: 'icon',
    preview: "/assets/epic_icon_piano.png",
    description: 'Um piano de obsidiana envolto em um vortex de energia violeta. (Classe Épica)',
    category: 'Ícones',
    rarity: 'épico'
  },
  {
    id: 'epic-icon-drums',
    name: 'Coração de Magma',
    price: 3150,
    type: 'icon',
    preview: "/assets/epic_icon_drums.png",
    description: 'Set de bateria forjado em lava e pedras vulcânicas. (Classe Épica)',
    category: 'Ícones',
    rarity: 'épico'
  },
  {
    id: 'epic-icon-guitar',
    name: 'Lâmina do Trovão',
    price: 3150,
    type: 'icon',
    preview: "/assets/epic_icon_guitar.png",
    description: 'Uma guitarra-machado que canaliza raios e aço quente. (Classe Épica)',
    category: 'Ícones',
    rarity: 'épico'
  },
  {
    id: 'rare-icon-mic',
    name: 'Mic Neon Vintage',
    price: 1050,
    type: 'icon',
    preview: "/assets/rare_icon_mic.png",
    description: 'Microfone clássico com filamentos neon internos. (Classe Rara)',
    category: 'Ícones',
    rarity: 'raro'
  },
  {
    id: 'icon-acoustic',
    name: 'Violão de Estudo',
    price: 210,
    type: 'icon',
    preview: '🎸',
    description: 'Ícone clássico para quem está começando nas cordas.',
    category: 'Ícones',
    rarity: 'comum'
  },
  {
    id: 'icon-electric',
    name: 'Guitarra Rock',
    price: 210,
    type: 'icon',
    preview: '⚡',
    description: 'Símbolo de energia e solos distorcidos.',
    category: 'Ícones',
    rarity: 'comum'
  },
  {
    id: 'icon-bass',
    name: 'Baixo Groove',
    price: 210,
    type: 'icon',
    preview: '🎻',
    description: 'Para quem mantém o ritmo e a harmonia.',
    category: 'Ícones',
    rarity: 'comum'
  },
  {
    id: 'icon-drums',
    name: 'Bateria Brutal',
    price: 210,
    type: 'icon',
    preview: '🥁',
    description: 'O coração rítmico da banda.',
    category: 'Ícones',
    rarity: 'comum'
  },
  {
    id: 'icon-piano',
    name: 'Teclado Master',
    price: 210,
    type: 'icon',
    preview: '🎹',
    description: 'Elegância e versatilidade melódica.',
    category: 'Ícones',
    rarity: 'comum'
  },
  {
    id: 'icon-vocal',
    name: 'Microfone Studio',
    price: 210,
    type: 'icon',
    preview: '🎤',
    description: 'A voz da escola em destaque.',
    category: 'Ícones',
    rarity: 'comum'
  },

  // --- MOLDURAS (Raras e Comuns) ---
  {
    id: 'border-rare-sapphire',
    name: 'Aura de Safira',
    price: 1050,
    type: 'border',
    preview: 'border-rare-sapphire animate-breath',
    description: 'Uma aura pulsante de energia azul profunda. (Classe Rara)',
    category: 'Molduras',
    rarity: 'raro'
  },
  {
    id: 'border-rare-bronze',
    name: 'Metal Bronze',
    price: 1050,
    type: 'border',
    preview: 'border-rare-bronze',
    description: 'Textura metálica com reflexos de luz em movimento. (Classe Rara)',
    category: 'Molduras',
    rarity: 'raro'
  },
  {
    id: 'border-rare-emerald',
    name: 'Vibe Esmeralda',
    price: 1050,
    type: 'border',
    preview: 'border-rare-emerald animate-breath',
    description: 'O brilho orgânico de uma joia rara. (Classe Rara)',
    category: 'Molduras',
    rarity: 'raro'
  },
  {
    id: 'epic-border-plasma',
    name: 'Aura de Plasma',
    price: 2520,
    type: 'border',
    preview: 'border-epic-plasma animate-shimmer',
    description: 'Energia violeta e rosa em constante mutação. (Classe Épica)',
    category: 'Molduras',
    rarity: 'épico'
  },
  {
    id: 'epic-border-lava',
    name: 'Ritmo Vulcânico',
    price: 2520,
    type: 'border',
    preview: 'border-epic-lava',
    description: 'Lava incandescente que pulsa com o calor da música. (Classe Épica)',
    category: 'Molduras',
    rarity: 'épico'
  },
  {
    id: 'epic-border-crystal',
    name: 'Escudo de Cristal',
    price: 2520,
    type: 'border',
    preview: 'border-epic-crystal animate-breath',
    description: 'Fragmentos de diamante puro com reflexos prismáticos. (Classe Épica)',
    category: 'Molduras',
    rarity: 'épico'
  },
  {
    id: 'legendary-border-god',
    name: 'Soberania do Olimpo',
    price: 10500,
    type: 'border',
    preview: 'border-legendary-god',
    description: 'Uma moldura forjada em luz divina que gira e cura. (Classe Lendária)',
    category: 'Molduras',
    rarity: 'lendário'
  },
  {
    id: 'legendary-border-eclipse',
    name: 'Eclipse Eterno',
    price: 12600,
    type: 'border',
    preview: 'border-legendary-eclipse',
    description: 'Onde a escuridão absoluta encontra o brilho infinito. (Classe Lendária)',
    category: 'Molduras',
    rarity: 'lendário'
  },
  {
    id: 'border-rare-silver',
    name: 'Onda de Prata',
    price: 1050,
    type: 'border',
    preview: 'border-rare-silver',
    description: 'Elegância metálica com brilho sutil. (Classe Rara)',
    category: 'Molduras',
    rarity: 'raro'
  },
  {
    id: 'neon-orange',
    name: 'Neon Laranja',
    price: 210,
    type: 'border',
    preview: 'border-orange-500 shadow-[0_0_15px_#f97316]',
    description: 'Borda básica com brilho neon.',
    category: 'Molduras',
    rarity: 'comum'
  },
  {
    id: 'cyber-green',
    name: 'Cyber Green',
    price: 210,
    type: 'border',
    preview: 'border-green-500 shadow-[0_0_15px_#22c55e]',
    description: 'Borda tecnológica para iniciantes.',
    category: 'Molduras',
    rarity: 'comum'
  },
  {
    id: 'iron-slate',
    name: 'Placa de Ferro',
    price: 210,
    type: 'border',
    preview: 'border-stone-500 bg-stone-500/10',
    description: 'Resistência básica de metal.',
    category: 'Molduras',
    rarity: 'comum'
  },
  {
    id: 'ghostly-white',
    name: 'Branco Espectral',
    price: 210,
    type: 'border',
    preview: 'border-stone-200 shadow-[0_0_10px_#ffffff50]',
    description: 'Um brilho suave e etéreo.',
    category: 'Molduras',
    rarity: 'comum'
  },
  {
    id: 'electric-blue',
    name: 'Raio Azul',
    price: 210,
    type: 'border',
    preview: 'border-blue-500 shadow-[0_0_15px_#3b82f6]',
    description: 'Energia elétrica pulsante.',
    category: 'Molduras',
    rarity: 'comum'
  },

  // --- TIPOGRAFIA (Raras e Comuns) ---
  {
    id: 'rare-font-neon',
    name: 'Neon Pulsante',
    price: 1050,
    type: 'font',
    preview: 'font-rare-neon',
    description: 'Um brilho cyan intenso com aura neon. (Classe Rara)',
    category: 'Tipografia',
    rarity: 'raro'
  },
  {
    id: 'rare-font-gold',
    name: 'Legado de Ouro',
    price: 1050,
    type: 'font',
    preview: 'font-rare-gold',
    description: 'Texto esculpido em ouro puro com relevo. (Classe Rara)',
    category: 'Tipografia',
    rarity: 'raro'
  },
  {
    id: 'rare-font-emerald',
    name: 'Brilho de Esmeralda',
    price: 1050,
    type: 'font',
    preview: 'font-rare-emerald',
    description: 'Elegância em itálico com aura esmeralda. (Classe Rara)',
    category: 'Tipografia',
    rarity: 'raro'
  },
  {
    id: 'rare-font-chrome',
    name: 'Aço Cromado',
    price: 1050,
    type: 'font',
    preview: 'font-rare-chrome',
    description: 'Efeito de metal polido com reflexos. (Classe Rara)',
    category: 'Tipografia',
    rarity: 'raro'
  },
  {
    id: 'epic-font-glitch',
    name: 'Cyber Glitch',
    price: 2100,
    type: 'font',
    preview: 'font-epic-glitch',
    description: 'A estética futurista da distorção digital. (Classe Épica)',
    category: 'Tipografia',
    rarity: 'épico'
  },
  {
    id: 'epic-font-calligraphy',
    name: 'Manuscrito Ancestral',
    price: 2100,
    type: 'font',
    preview: 'font-epic-calligraphy',
    description: 'Caligrafia clássica banhada em luz divina. (Classe Épica)',
    category: 'Tipografia',
    rarity: 'épico'
  },
  {
    id: 'epic-font-vibration',
    name: 'Pulso Eterno',
    price: 2100,
    type: 'font',
    preview: 'font-epic-vibration',
    description: 'Letras que vibram na frequência do baixo. (Classe Épica)',
    category: 'Tipografia',
    rarity: 'épico'
  },
  {
    id: 'epic-font-8bit',
    name: 'Heroi Digital (8-Bit)',
    price: 2100,
    type: 'font',
    preview: 'font-epic-8bit',
    description: 'A nostalgia dos clássicos em alta definição. (Classe Épica)',
    category: 'Tipografia',
    rarity: 'épico'
  },
  {
    id: 'legendary-font-rainbow',
    name: 'Arco-Íris Infinito',
    price: 10500,
    type: 'font',
    preview: 'font-legendary-rainbow',
    description: 'Uma cascata de cores que flui eternamente sob seu nome. (Classe Lendária)',
    category: 'Tipografia',
    rarity: 'lendário'
  },
  {
    id: 'legendary-font-cursive',
    name: 'Manuscrito Divino',
    price: 10500,
    type: 'font',
    preview: 'font-legendary-cursive',
    description: 'Uma assinatura celestial escrita com tinta de luz líquida. (Lendário - Quebra a 4ª Parede)',
    category: 'Tipografia',
    rarity: 'lendário'
  },
  {
    id: 'legendary-font-typewriter',
    name: 'Protocolo Fantasma',
    price: 10500,
    type: 'font',
    preview: 'font-legendary-typewriter',
    description: 'Texto de uma realidade alternativa que falha e pisca. (Lendário - Estilo Glitch/Retro)',
    category: 'Tipografia',
    rarity: 'lendário'
  },
  {
    id: 'gold-name',
    name: 'Gold Metallic',
    price: 210,
    type: 'font',
    preview: 'text-yellow-400 font-bold drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]',
    description: 'Destaque metálico simples.',
    category: 'Tipografia',
    rarity: 'comum'
  },
  {
    id: 'retro-pixel',
    name: 'Retro Arcade',
    price: 210,
    type: 'font',
    preview: 'font-mono text-cyan-400 tracking-tighter',
    description: 'Estilo clássico dos fliperamas.',
    category: 'Tipografia',
    rarity: 'comum'
  },
  {
    id: 'horror-rough',
    name: 'Dark Gothic',
    price: 210,
    type: 'font',
    preview: 'font-serif italic text-red-600',
    description: 'Estilo sombrio e rústico.',
    category: 'Tipografia',
    rarity: 'comum'
  },
  {
    id: 'classic-shadow',
    name: 'Sombra Clássica',
    price: 210,
    type: 'font',
    preview: 'text-white font-black drop-shadow-[4px_4px_0px_rgba(0,0,0,0.5)]',
    description: 'Efeito 3D básico de sombra.',
    category: 'Tipografia',
    rarity: 'comum'
  },
  {
    id: 'candy-pink',
    name: 'Doce Rosa',
    price: 210,
    type: 'font',
    preview: 'text-pink-500 font-bold italic tracking-wider',
    description: 'Cor vibrante e amigável.',
    category: 'Tipografia',
    rarity: 'comum'
  },

  // --- PLANOS DE FUNDO (Épicos, Raros e Comuns) ---
  {
    id: 'epic-guitar',
    name: 'Trovoada das Cordas',
    price: 4200,
    type: 'card',
    preview: "bg-[url('/assets/epic_guitar.png')]",
    description: 'A energia bruta de uma guitarra elétrica envolta em raios lendários. (Classe Épica)',
    category: 'Planos de Fundo',
    rarity: 'épico'
  },
  {
    id: 'epic-piano',
    name: 'Majestade de Marfim',
    price: 4200,
    type: 'card',
    preview: "bg-[url('/assets/epic_piano.png')]",
    description: 'Um piano celestial em uma cathedral de luz e harmonia. (Classe Épica)',
    category: 'Planos de Fundo',
    rarity: 'épico'
  },
  {
    id: 'epic-drums',
    name: 'Impacto do Ritmo',
    price: 4200,
    type: 'card',
    preview: "bg-[url('/assets/epic_drums.png')]",
    description: 'A força bruta da percussão em uma explosão de energia dourada. (Classe Épica)',
    category: 'Planos de Fundo',
    rarity: 'épico'
  },
  {
    id: 'rare-celestial',
    name: 'Sinfonia de Luz',
    price: 1050,
    type: 'card',
    preview: "bg-[url('/assets/rare_celestial.png')]",
    description: 'Um fundo majestoso de luz celestial e harmonia divina. (Classe Rara)',
    category: 'Planos de Fundo',
    rarity: 'raro'
  },
  {
    id: 'rare-techno',
    name: 'Pulso Tecnológico',
    price: 1050,
    type: 'card',
    preview: "bg-[url('/assets/rare_techno.png')] bg-cover bg-center bg-stone-900 bg-blend-soft-light",
    description: 'Ondas rítmicas de neon cruzando uma paisagem futurista. (Classe Rara)',
    category: 'Planos de Fundo',
    rarity: 'raro'
  },
  {
    id: 'rare-forest',
    name: 'Eco da Floresta',
    price: 1050,
    type: 'card',
    preview: "bg-[url('/assets/rare_forest.png')] bg-cover bg-center bg-stone-900 bg-blend-soft-light",
    description: 'Uma floresta encantada onde a natureza pulsa em harmonia musical. (Classe Rara)',
    category: 'Planos de Fundo',
    rarity: 'raro'
  },
  {
    id: 'legendary-void-nexus',
    name: 'Nexus do Vazio',
    price: 16800,
    type: 'card',
    preview: "bg-legendary-void-nexus",
    description: 'Um redemoinho eterno de energia violeta pura. (Lendário - Efeito GIF Real)',
    category: 'Planos de Fundo',
    rarity: 'lendário'
  },
  {
    id: 'legendary-god-portal',
    name: 'Portal da Divindade',
    price: 16800,
    type: 'card',
    preview: "bg-legendary-gold-portal",
    description: 'A luz sagrada da música em rotação infinita. (Lendário - Efeito GIF Real)',
    category: 'Planos de Fundo',
    rarity: 'lendário'
  },
  {
    id: 'rare-cosmic',
    name: 'Nebulosa Rítmica',
    price: 1050,
    type: 'card',
    preview: "bg-[url('/assets/rare_cosmic.png')] bg-cover bg-center bg-stone-900 bg-blend-soft-light",
    description: 'A grandiosidade do cosmos em uma dança de estrelas e notas musicais. (Classe Rara)',
    category: 'Planos de Fundo',
    rarity: 'raro'
  },
  {
    id: 'epic-red',
    name: 'Chama da Glória',
    price: 210,
    type: 'card',
    preview: 'bg-gradient-to-br from-amber-600/50 via-orange-900/40 to-stone-900',
    description: 'Um brilho radiante de determinação e luz.',
    category: 'Planos de Fundo',
    rarity: 'comum'
  },
  {
    id: 'cyber-aqua',
    name: 'Cyber City',
    price: 210,
    type: 'card',
    preview: 'bg-gradient-to-br from-cyan-900/50 to-stone-900',
    description: 'Luzes da cidade futurista.',
    category: 'Planos de Fundo',
    rarity: 'comum'
  },
  {
    id: 'deep-space',
    name: 'Vazio Cósmico',
    price: 210,
    type: 'card',
    preview: 'bg-gradient-to-br from-purple-900/50 via-stone-950 to-black',
    description: 'Fundo espacial para recrutas.',
    category: 'Planos de Fundo',
    rarity: 'comum'
  },
  {
    id: 'forest-night',
    name: 'Floresta Noturna',
    price: 210,
    type: 'card',
    preview: 'bg-gradient-to-br from-green-900/40 to-stone-950',
    description: 'Calmaria e mistério da natureza.',
    category: 'Planos de Fundo',
    rarity: 'comum'
  },
  {
    id: 'toxic-waste',
    name: 'Resíduo Tóxico',
    price: 210,
    type: 'card',
    preview: 'bg-gradient-to-br from-lime-900/40 via-stone-900 to-black',
    description: 'Efeito radioativo básico.',
    category: 'Planos de Fundo',
    rarity: 'comum'
  }
];
