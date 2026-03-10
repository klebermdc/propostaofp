

## Lovable Travel - Ferramenta de Orçamentos de Viagens

### Visão Geral
Aplicação interna para a equipe comercial da agência "Lovable" montar orçamentos de viagens, com extração automática de informações via IA a partir de imagens e PDFs, e compartilhamento de orçamentos via link público para clientes.

---

### Arquitetura Técnica
- **Frontend:** React + TypeScript + Tailwind CSS (já configurado)
- **Backend:** Lovable Cloud (Supabase) — banco de dados, autenticação, edge functions, storage
- **IA:** Lovable AI Gateway (Gemini) para OCR e extração de dados de imagens/PDFs

---

### Banco de Dados (Lovable Cloud)

**Tabelas principais:**
- `profiles` — dados dos agentes (vinculado a auth.users)
- `quotes` — orçamentos (título, cliente_nome, cliente_email, status, share_token único, agente_id, notas, validade, moeda)
- `quote_items` — itens do orçamento (tipo: hotel/voo/transfer/passeio/seguro, descrição, datas, valor, quantidade, detalhes JSON)
- `user_roles` — controle de acesso (role: admin, agent)

---

### Funcionalidades

#### 1. Autenticação e Acesso
- Login com email/senha para agentes
- Apenas usuários autenticados com role `agent` ou `admin` acessam o sistema
- Tela de login simples e limpa

#### 2. Dashboard do Agente
- Lista de orçamentos criados (filtros por status: rascunho, enviado, aceito, expirado)
- Botão "Novo Orçamento"
- Busca por nome do cliente

#### 3. Criação/Edição de Orçamentos
- **Dados do cliente:** nome, email, telefone
- **Adicionar itens manualmente:** formulário com campos por tipo de serviço:
  - Tipo (hotel, voo, transfer, passeio, seguro viagem, outro)
  - Descrição, datas de início/fim, valor unitário, quantidade
  - Campo de observações
- **Lista de itens** com drag-and-drop para reordenar, edição inline, remoção
- **Resumo financeiro:** subtotal, descontos, total
- **Notas gerais** e condições
- **Salvar como rascunho** ou **Finalizar**

#### 4. Botão de IA — Extração Inteligente
- Botão "Extrair com IA" no editor de orçamento
- Modal com duas opções:
  - **Colar link de imagem** (ex: screenshot de cotação de hotel)
  - **Upload de PDF** (ex: cotação de operadora)
- O arquivo/imagem é enviado para uma **edge function** que:
  1. Faz upload para Storage (bucket privado)
  2. Envia para o Lovable AI Gateway (Gemini 2.5 Pro — melhor para imagem+texto) com prompt estruturado
  3. Usa **tool calling** para retornar dados estruturados: lista de itens com tipo, descrição, datas, valores
- Os itens extraídos aparecem como **preview editável** — o agente revisa, ajusta e confirma antes de adicionar ao orçamento
- Tratamento de erros: feedback claro se a extração falhar ou for parcial

#### 5. Compartilhamento via Link Público
- Ao finalizar, gera um `share_token` único (UUID)
- Link público: `/quote/{share_token}` — rota sem autenticação
- **Página do cliente** exibe:
  - Logo e nome da agência
  - Dados da viagem organizados por tipo de serviço
  - Linha do tempo visual da viagem (cronológica)
  - Resumo de valores
  - Validade do orçamento
  - Botão de contato (WhatsApp/email)
- Design limpo, responsivo, otimizado para mobile
- RLS: acesso público apenas via share_token, sem expor dados internos

#### 6. Envio por Email (opcional futuro)
- Botão para copiar link ou enviar por email diretamente

---

### Fluxos de Usuário

**Agente:**
1. Login → Dashboard → "Novo Orçamento"
2. Preenche dados do cliente
3. Adiciona itens manualmente OU usa botão IA para extrair de imagem/PDF
4. Revisa itens extraídos pela IA → confirma
5. Ajusta valores, adiciona notas
6. Finaliza → recebe link compartilhável
7. Copia link e envia ao cliente (WhatsApp/email)

**Cliente:**
1. Recebe link
2. Abre no navegador → vê orçamento completo e bonito
3. Pode entrar em contato via botão de WhatsApp/email

---

### Páginas da Aplicação
1. `/login` — Login dos agentes
2. `/dashboard` — Lista de orçamentos
3. `/quotes/new` — Criar orçamento
4. `/quotes/:id/edit` — Editar orçamento
5. `/quote/:shareToken` — Página pública do cliente (sem auth)
6. `/` — Redirect para dashboard se logado, login se não

---

### Segurança
- RLS em todas as tabelas — agentes veem apenas seus orçamentos (admins veem todos)
- Página pública acessa apenas dados do orçamento via share_token
- Roles em tabela separada com security definer function
- Upload de PDFs em bucket privado com RLS

---

### Considerações
- **Usabilidade:** Interface limpa com shadcn/ui, focada em produtividade do agente
- **IA:** Gemini 2.5 Pro para melhor qualidade de OCR e extração — com tool calling para saída estruturada
- **Escalabilidade:** Arquitetura serverless, escala naturalmente com Lovable Cloud

