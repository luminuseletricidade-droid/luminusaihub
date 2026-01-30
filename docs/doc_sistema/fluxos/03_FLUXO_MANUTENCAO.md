# Fluxo de Manutencao

## Ciclo de Vida da Manutencao

```
┌─────────────────────────────────────────────────────────────────┐
│                   Ciclo de Vida                                  │
└─────────────────────────────────────────────────────────────────┘

    ┌───────────┐
    │ PENDENTE  │  Manutencao criada, aguardando agendamento
    └─────┬─────┘
          │
          │ Tecnico agenda data
          ▼
    ┌───────────┐
    │PROGRAMADO │  Data definida, aguardando execucao
    └─────┬─────┘
          │
          │ Data chegou
          ▼
    ┌─────┴─────┐
    │           │
    ▼           ▼
┌───────┐  ┌─────────┐
│EM DIA │  │EM ATRASO│  Se passou da data sem execucao
└───┬───┘  └────┬────┘
    │           │
    │           │ Tecnico inicia
    │           ▼
    │      ┌───────────┐
    └─────>│EM         │  Trabalho em andamento
           │ANDAMENTO  │
           └─────┬─────┘
                 │
                 │ Tecnico finaliza
                 ▼
           ┌───────────┐
           │ CONCLUIDO │  (status volta para EM DIA)
           └───────────┘
```

---

## Fluxo de Geracao de Cronograma

```
┌─────────────────────────────────────────────────────────────────┐
│                   Geracao de Cronograma                          │
└─────────────────────────────────┬───────────────────────────────┘
                                  │
                                  ▼
                    ┌─────────────────────────┐
                    │ 1. Seleciona contratos  │
                    │    ativos               │
                    └───────────┬─────────────┘
                                │
                                ▼
                    ┌─────────────────────────┐
                    │ 2. Analisa servicos     │
                    │    de cada contrato     │
                    └───────────┬─────────────┘
                                │
                                ▼
                    ┌─────────────────────────┐
                    │ 3. Calcula datas        │
                    │    por frequencia       │
                    └───────────┬─────────────┘
                                │
        ┌───────────────────────┼───────────────────────┐
        │                       │                       │
        ▼                       ▼                       ▼
┌───────────────┐    ┌───────────────┐    ┌───────────────┐
│ Mensal        │    │ 250h          │    │ 500h          │
│ (30 dias)     │    │ (90 dias)     │    │ (180 dias)    │
└───────┬───────┘    └───────┬───────┘    └───────┬───────┘
        │                    │                    │
        └────────────────────┼────────────────────┘
                             │
                             ▼
                    ┌─────────────────────────┐
                    │ 4. Agrupa por tecnico   │
                    │    e regiao             │
                    └───────────┬─────────────┘
                                │
                                ▼
                    ┌─────────────────────────┐
                    │ 5. Otimiza rotas        │
                    │    (minimiza desloc.)   │
                    └───────────┬─────────────┘
                                │
                                ▼
                    ┌─────────────────────────┐
                    │ 6. Gera cronograma      │
                    │    final                │
                    └───────────┬─────────────┘
                                │
                    ┌───────────┴───────────┐
                    │                       │
                    ▼                       ▼
          ┌─────────────────┐        ┌──────────────┐
          │ Visualizacao    │        │ Exportacao   │
          │ Timeline        │        │ PDF/Excel    │
          └─────────────────┘        └──────────────┘
```

---

## Fluxo de Atualizacao de Status

```
┌─────────┐          ┌─────────┐          ┌─────────┐          ┌─────────┐
│ Usuario │          │Frontend │          │ Backend │          │   DB    │
└────┬────┘          └────┬────┘          └────┬────┘          └────┬────┘
     │                    │                    │                    │
     │  1. Seleciona      │                    │                    │
     │     manutencao     │                    │                    │
     │───────────────────>│                    │                    │
     │                    │                    │                    │
     │  2. Altera status  │                    │                    │
     │     para "EM       │                    │                    │
     │     ANDAMENTO"     │                    │                    │
     │───────────────────>│                    │                    │
     │                    │                    │                    │
     │                    │  3. PUT /api/maintenances/{id}         │
     │                    │───────────────────>│                    │
     │                    │                    │                    │
     │                    │                    │  4. UPDATE        │
     │                    │                    │───────────────────>│
     │                    │                    │                    │
     │                    │                    │  5. Dispara       │
     │                    │                    │     trigger       │
     │                    │                    │     (log audit)   │
     │                    │                    │                    │
     │                    │  6. { success }    │                    │
     │                    │<───────────────────│                    │
     │                    │                    │                    │
     │                    │  7. Invalida cache │                    │
     │                    │     React Query    │                    │
     │                    │                    │                    │
     │                    │  8. Realtime       │                    │
     │                    │<───────────────────│ (Supabase)        │
     │                    │                    │                    │
     │  9. UI atualizada  │                    │                    │
     │<───────────────────│                    │                    │
     │                    │                    │                    │
```

---

## Calculo de Status Automatico

```
┌─────────────────────────────────────────────────────────────────┐
│                   Job Diario (CRON)                              │
└─────────────────────────────────┬───────────────────────────────┘
                                  │
                                  ▼
                    ┌─────────────────────────┐
                    │ SELECT manutencoes      │
                    │ WHERE status IN         │
                    │ ('PROGRAMADO','EM DIA') │
                    └───────────┬─────────────┘
                                │
                                ▼
              ┌─────────────────────────────────────┐
              │ Para cada manutencao:               │
              └─────────────────┬───────────────────┘
                                │
                    ┌───────────┴───────────┐
                    │ scheduled_date < hoje? │
                    └───────────┬───────────┘
                                │
                    ┌───────────┴───────────┐
                    │                       │
                    ▼                       ▼
               ┌────────┐             ┌──────────┐
               │  Sim   │             │   Nao    │
               └────┬───┘             └────┬─────┘
                    │                      │
                    ▼                      ▼
          ┌─────────────────┐        ┌──────────────┐
          │ UPDATE status   │        │ Mantem       │
          │ = 'EM ATRASO'   │        │ status atual │
          └─────────────────┘        └──────────────┘
```

---

## Dashboard de Manutencoes

```
┌─────────────────────────────────────────────────────────────────┐
│                       Dashboard                                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐        │
│  │ EM DIA   │  │ ATRASO   │  │ANDAMENTO │  │PROGRAMADO│        │
│  │   80     │  │   15     │  │   10     │  │   25     │        │
│  │  ████    │  │  ████    │  │  ████    │  │  ████    │        │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘        │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │              Distribuicao por Status                     │    │
│  │                                                          │    │
│  │      ████████████████████ 62% EM DIA                    │    │
│  │      ██████ 12% EM ATRASO                               │    │
│  │      ████ 8% EM ANDAMENTO                               │    │
│  │      ████████ 18% PROGRAMADO                            │    │
│  │                                                          │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Filtros de Manutencao

```
┌─────────────────────────────────────────────────────────────────┐
│                   Pagina Maintenances.tsx                        │
└─────────────────────────────────────────────────────────────────┘

Filtros Disponiveis:
┌─────────────────────────────────────────────────────────────────┐
│                                                                  │
│  Status:  [x] EM DIA  [x] EM ATRASO  [x] PROGRAMADO  [ ] PENDENTE│
│                                                                  │
│  Tipo:    [Todos os tipos        ▼]                             │
│                                                                  │
│  Regiao:  [Todas as regioes      ▼]                             │
│                                                                  │
│  Tecnico: [Todos os tecnicos     ▼]                             │
│                                                                  │
│  Periodo: [01/01/2024] ate [31/12/2024]                         │
│                                                                  │
│  [Aplicar Filtros]  [Limpar]  [Exportar XLSX]                   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘

                              │
                              ▼
                    ┌─────────────────────────┐
                    │ useMaintenanceFilters() │
                    │                         │
                    │ - Aplica filtros        │
                    │ - Ordena resultados     │
                    │ - Pagina dados          │
                    └─────────────────────────┘
```

---

## Tipos de Manutencao e Periodicidade

| Tipo | Periodicidade | Icone | Cor |
|------|---------------|-------|-----|
| Manutencao Mensal | 30 dias | Calendar | Azul |
| Preventiva 250h | 90 dias | Clock | Verde |
| Preventiva 500h | 180 dias | Clock | Amarelo |
| Limpeza Tanque | 365 dias | Droplet | Ciano |
| Limpeza Radiador | 365 dias | Fan | Laranja |
| Megagem Alternador | 365 dias | Zap | Roxo |
| Regulagem Valvulas | 365 dias | Settings | Cinza |
| Troca Bateria | 730 dias | Battery | Vermelho |
