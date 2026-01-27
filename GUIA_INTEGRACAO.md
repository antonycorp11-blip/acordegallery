
# Guia de Integração: Acorde Gallery 🎹

Este guia contém as instruções EXATAS para integrar seus jogos (Chord Rush, Voice Rush, Ritmo Pro) à nova **Acorde Gallery**.

**Estratégia:** Bloqueio Total. O jogo só abrirá se vier da Galeria. Login manual nos jogos será desativado.

---

## 📋 Prompt para o Antigravity (Copie e Cole nos projetos dos jogos)

Cole o texto abaixo no chat do Antigravity quando estiver com o projeto do jogo aberto (ex: Chord Rush):

```text
Estou migrando este jogo para ser um módulo da minha nova plataforma central, a "Acorde Gallery".
Preciso fazer uma alteração profunda na autenticação e no roteamento (App.tsx).

REQUISITOS OBRIGATÓRIOS:

1. TRAVA DE SEGURANÇA (BRUTAL):
   - O jogo deve verificar na inicialização se existe o parâmetro `?pin=...` na URL.
   - Se NÃO existir esse parâmetro e o usuário não estiver validado na sessão atual:
     - BLOQUEIE totalmente o acesso ao jogo.
     - Mostre uma tela de "Acesso Negado/Redirecionamento" dizendo: "Este jogo agora faz parte da Acorde Gallery. Acesse pelo portal oficial."
     - Coloque um botão levando para: https://acorde-gallery.vercel.app (ou o link da sua galeria).
     - Remova/Esconda qualquer formulário de login manual antigo desse jogo.

2. LOGIN AUTOMÁTICO VIA URL:
   - Se o parâmetro `?pin=1234` estiver presente:
   - O jogo deve pegar esse PIN e consultar IMEDIATAMENTE o banco de dados Supabase unificado.
   - Busque o usuário na tabela `players` pelo campo `recovery_pin`.
   - Se achar: Logue o usuário silenciosamente e inicie o jogo.
   - Se não achar: Mostre erro "PIN Inválido na Galeria".

3. UNIFICAÇÃO DO SUPABASE:
   - O jogo DEVE usar o mesmo projeto Supabase da Galeria.
   - URL: https://saojbwipdxebibjmtxqc.supabase.co
   - KEY: (Verifique se as variáveis de ambiente .env batem com esse projeto).

4. OBJETIVO FINAL:
   - Ninguém joga sem passar pela Acorde Gallery.
   - O jogo vira um "slave" da Galeria.

Por favor, reescreva a lógica do componente principal (App.tsx) para atender a esses requisitos de bloqueio e autenticação passiva.
```

---

## 🛠 Passo a Passo Manual (Se preferir fazer na mão)

### 1. No arquivo `.env` dos Jogos:
Garanta que todos estejam apontando para o Projeto Mestre (Chord Rush):
```env
VITE_SUPABASE_URL=https://saojbwipdxebibjmtxqc.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9... (A chave do projeto Chord Rush)
```

### 2. A Lógica de Bloqueio (Exemplo de Código)

No `App.tsx`, logo no início:

```typescript
useEffect(() => {
  const params = new URLSearchParams(window.location.search);
  const pin = params.get('pin');

  if (!pin) {
    // Se não tiver PIN, e não tiver sessão válida salva...
    // Mude um estado para mostrar a tela de bloqueio
    setShowLockScreen(true); 
  } else {
    // Se tiver PIN, tenta logar
    loginWithPin(pin);
  }
}, []);

if (showLockScreen) {
  return (
    <div className="h-screen flex flex-col items-center justify-center bg-gray-900 text-white p-4">
      <h1 className="text-3xl font-bold mb-4">⛔ Acesso Restrito</h1>
      <p className="text-center mb-8">
        O {APP_NAME} agora é exclusivo da <strong>Acorde Gallery</strong>.
      </p>
      <a 
        href="https://acorde-gallery.vercel.app" 
        className="bg-blue-600 px-6 py-3 rounded-lg font-bold hover:bg-blue-500"
      >
        Ir para Acorde Gallery
      </a>
    </div>
  )
}
```
