# ORIS - Backend

## Módulo de Monitoramento de Saúde e Segurança

Este módulo foi desenvolvido para fortalecer o monitoramento da conduta de saúde e segurança dos colaboradores dentro das instalações de forma preventiva.

### Funcionalidades Implementadas

#### 1. Registro de Risco / Condição Insegura

Permite o registro, acompanhamento e tratamento de riscos e condições inseguras identificadas nas instalações.

**Modelo de Dados:**
- Título
- Descrição
- Categoria (Infraestrutura, Conduta, Ambiental, Outro)
- Localização
- Prioridade (Baixa, Média, Alta, Crítica)
- Status (Aberto, Em Tratamento, Resolvido, Cancelado)
- Responsável pelo registro
- Responsável pela tratativa
- Evidências (arquivos/imagens)
- Histórico de alterações

**Endpoints:**
- `POST /api/risks` - Criar novo registro de risco
- `GET /api/risks` - Listar todos os riscos (com filtros)
- `GET /api/risks/:id` - Detalhe de um risco
- `PUT /api/risks/:id` - Atualizar status ou informações de um risco
- `DELETE /api/risks/:id` - Excluir (casos de duplicidade)

#### 2. Planos de Ação

Permite a criação e acompanhamento de planos de ação para tratamento dos riscos identificados.

**Modelo de Dados:**
- Risco associado
- Responsável
- Descrição
- Prazo
- Status (Pendente, Em Andamento, Concluído)
- Evidências (arquivos/imagens)
- Histórico de alterações

**Endpoints:**
- `POST /api/action-plans` - Criar novo plano de ação
- `GET /api/action-plans` - Listar planos de ação (com filtros)
- `GET /api/action-plans/:id` - Detalhe de um plano de ação
- `PUT /api/action-plans/:id` - Atualizar status ou informações de um plano

#### 3. Relatórios e Estatísticas

Fornece relatórios e estatísticas para acompanhamento e auditoria dos riscos e planos de ação.

**Endpoints:**
- `GET /api/reports/risks-summary` - Resumo geral de riscos
- `GET /api/reports/risks-by-location` - Quantidade de riscos por área/localização
- `GET /api/reports/risks-by-category` - Quantidade de riscos por categoria
- `GET /api/reports/average-resolution-time` - Tempo médio de resolução
- `GET /api/reports/action-plan-compliance` - % de planos de ação tratados dentro do prazo
- `GET /api/reports/monthly-evolution` - Evolução mensal de riscos

#### 4. Notificações em Tempo Real

Utiliza Socket.IO para enviar notificações em tempo real para os usuários.

**Eventos:**
- `newCriticalRisk` - Quando um novo risco crítico é registrado
- `riskReclassifiedAsCritical` - Quando um risco é reclassificado como crítico
- `actionPlanDeadlineWarning` - Quando um plano de ação está próximo do vencimento
- `actionPlanOverdue` - Quando um plano de ação está com prazo vencido

#### 5. Tarefas Agendadas

Utiliza node-cron para executar tarefas agendadas automaticamente.

**Tarefas:**
- Verificação diária de planos de ação com prazo próximo do vencimento
- Verificação diária de planos de ação com prazo vencido
- Geração automática de relatório mensal

### Armazenamento de Arquivos

Utiliza o Supabase para armazenamento de arquivos, como:
- Fotos de riscos
- Evidências de correção
- Relatórios PDF gerados

### Histórico de Alterações (Auditoria)

Todas as alterações de status dos riscos e planos de ação são registradas em um histórico, contendo:
- Status alterado
- Usuário que realizou a alteração
- Data e hora da alteração
- Comentário (opcional)

### Segurança e Permissões

O sistema utiliza autenticação JWT e controle de acesso baseado em perfis:
- Usuários comuns podem registrar riscos e visualizar informações
- Apenas administradores podem criar planos de ação, fechar riscos e excluir registros

## Como Utilizar

1. Certifique-se de que o MongoDB está em execução
2. Configure as variáveis de ambiente no arquivo `.env`
3. Instale as dependências: `npm install`
4. Inicie o servidor: `npm start` ou `npm run dev` para desenvolvimento

## Variáveis de Ambiente

Crie um arquivo `.env` na raiz do projeto com as seguintes variáveis:

```
PORT=5000
MONGODB_URI=mongodb://localhost:27017/oris
JWT_SECRET=seu_segredo_jwt
JWT_EXPIRES_IN=24h
JWT_REFRESH_SECRET=seu_segredo_refresh
JWT_REFRESH_EXPIRES_IN=7d
SUPABASE_URL=sua_url_supabase
SUPABASE_SERVICE_ROLE_KEY=sua_chave_supabase
SUPABASE_BUCKET=oris
FRONTEND_URL=http://localhost:3000
```