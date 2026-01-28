-- ⚠️ ATENÇÃO: EXECUTE ESTE SCRIPT NO EDITOR SQL DO SUPABASE ⚠️
-- Ele irá apagar PERMANENTEMENTE todos os alunos e pontuações,
-- MANTENDO APENAS o Administrador (AQUILLES ANTONY - PIN 8238).

BEGIN;

-- 1. Limpar SESSÕES DE JOGO / SCORES (De todos, exceto do Admin)
DELETE FROM game_scores
WHERE player_id NOT IN (
    SELECT id FROM players
    WHERE recovery_pin = '8238'
);

-- 2. Limpar SCORES DO ADMIN (Opcional - remove para "Zerar" o ranking dele também, se quiser manter o admin mas com 0 xp, descomente abaixo)
-- DELETE FROM game_scores WHERE player_id IN (SELECT id FROM players WHERE recovery_pin = '8238');

-- 3. Limpar JOGADORES (Todos, exceto o Admin)
DELETE FROM players
WHERE recovery_pin != '8238';

-- 4. (Opcional) Resetar o Admin para o estado inicial (0 XP, 0 Coins, Inventário Padrão)
-- Útil se você quiser testar tudo do zero sem deletar sua própria conta.
/*
UPDATE players
SET 
  accumulated_xp = 0,
  acorde_coins = 2000, -- Já com o bônus inicial
  xp = 0,
  total_xp = 0,
  equipped_items = '{}'::jsonb,
  inventory = '[]'::jsonb
WHERE recovery_pin = '8238';
*/

COMMIT;

-- Verifica o resultado final
SELECT name, recovery_pin, acorde_coins, accumulated_xp FROM players;
