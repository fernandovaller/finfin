# Plano: Stack para Sistema Financeiro Pessoal

## Estado atual
- Ferramenta base: Planilhas (registro de receitas e gastos mensais)
- Problema: acompanhar gastos no cartão

---

## 1. Avaliação da Stack

| Aspecto | Excel/Google Sheets | YNAB App | Notion/Obsidian | Python Scripts |
|---|---|---|---|---|
| Inicial | ✅ Própria | ✅ | ⚠️ Complexo | ❌ |
| Registro de receitas/gastos | ✅ | ✅ | ⚠️ | ✅ |
| Alerta em cartão (auto) | ❌ | ✅ | ⚠️ | ✅ |
| Semanal/Mensual | ✅ | ✅ | ✅ | ✅ |
| Dívidas + saldo cartão | ✅ | ✅ | ✅ | ✅ |
| Integração com banco (sync) | ❌ | ❌ | ⚠️ | ✅ |

## 2. Recomendação Inicial

**Stack: Google Sheets (versões Online + mobile)** — mais acessível, já em uso e expandível.

### Estrutura do planilha sugerida

```
Receitas e Gastos (mestria)
├── Receitas
│   └── Tabela: Data | Valor | Categoria | Origem | Semanal
├── Despesas
│   ├── Necessidades
│   ├── Renda
│   ├── Dívidas
│   └── Desejos
└── Relatórios
    ├── Receita Mensal
    ├── Despesa Mensal
    ├── Saldo Mês
    └── Categorias por Ano
```

### Componentes extras (opcional)
- **Alerta em cartão:** script Python que monitora saldos diários e gera alertas via email/notificação.
- **Semanal:** calendário de revisão; cron job para importar dados mensais.

---

## 3. Phases de Implementação

### Phase 1: Fundamento (meses 1–2)
- [ ] Categorização de gastos
- [ ] Formulário de registro (data, valor, categoria)
- [ ] Relatório mensal automático (receitas − gastos = resultado)

### Phase 2: Registro Contínuo e Alerta (meses 3–4)
- [ ] Integração com cartão (saldo diário + alertas)
- [ ] Semanal/Mensual dashboard
- [ ] Dívidas e saldo em cartão

### Phase 3: Otimização e Integração (meses 5+)
- [ ] Sync com banco ou aplicativo dedicado
- [ ] Integração de objetivos financeiros
- [ ] Exportação para PDF/PDF

---

## 4. Stack Alternativa (se preferir)

### YNAB App (dedicado)
- **Vantagem:** regras de orçamento automático, categorização guiada, dashboard.
- **Desvantagem:** não é planilha; custo e aprendizado para usuários que já usam Sheets.

### Scripts em Python (PowerShell/Excel)
- **Vantagem:** full control, integração com banco via webhook.
- **Desvantagem:** requires developer time; mais complexo para uso diário.
