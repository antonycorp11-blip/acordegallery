
import { Game } from './types';

export const GAMES: Game[] = [
  {
    id: 'chord-rush',
    title: 'Chord Rush',
    description: 'Treine seus acordes e agilidade neste desafio musical acelerado.',
    url: 'https://chordrush.vercel.app/',
    thumbnail: 'https://picsum.photos/seed/music/600/400',
    category: 'Teclado'
  },
  {
    id: 'voice-rush',
    title: 'Voice Rush',
    description: 'Use sua voz para controlar o jogo e atingir as notas certas.',
    url: 'https://voicerush.vercel.app/',
    thumbnail: 'https://picsum.photos/seed/voice/600/400',
    category: 'Canto'
  },
  {
    id: 'ritmo-pro',
    title: 'Ritmo Pro',
    description: 'Um jogo de ritmo intenso para testar sua coordenação.',
    url: 'https://ritmopro.vercel.app/',
    thumbnail: 'https://picsum.photos/seed/rhythm/600/400',
    category: 'Ritmo'
  }
];

export const INSTRUCTIONS = [
  "No código do seu jogo (ex: App.js dos seus jogos), adicione a lógica para ler o PIN da URL.",
  "Use `const urlParams = new URLSearchParams(window.location.search);` e `const pin = urlParams.get('pin');`.",
  "Ao salvar as pontuações no Supabase, use este PIN como chave estrangeira para a tabela de 'estudantes'.",
  "Certifique-se de que todos os jogos apontem para o mesmo projeto Supabase e mesma estrutura de tabelas."
];
