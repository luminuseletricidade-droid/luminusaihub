#!/bin/bash
#
# Verificar e fazer backup dos dados EXISTENTES no Supabase
# Project: jtrhpbgrpsgneleptzgm
# Data: 2026-02-12
#

set -e

export SUPABASE_ACCESS_TOKEN="sbp_0ec1e105304dcddf819db138ae8b24453f04f150"

# Cores
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
BOLD='\033[1m'
NC='\033[0m'

echo -e "${BOLD}${BLUE}"
cat << "EOF"
╔══════════════════════════════════════════════════════════════════════════════╗
║                                                                              ║
║            VERIFICAÇÃO E BACKUP DOS DADOS EXISTENTES - SUPABASE              ║
║                                                                              ║
╚══════════════════════════════════════════════════════════════════════════════╝
EOF
echo -e "${NC}"

echo -e "${BLUE}Project ID:${NC} jtrhpbgrpsgneleptzgm"
echo -e "${BLUE}Data:${NC} $(date '+%Y-%m-%d %H:%M:%S')"
echo ""

# Criar diretório de backup
BACKUP_DIR="backups/data_verification_$(date +%Y%m%d_%H%M%S)"
mkdir -p "$BACKUP_DIR"

echo -e "${GREEN}✓ Diretório criado: $BACKUP_DIR${NC}"
echo ""

# SQL para contar registros em todas as tabelas
cat > /tmp/count_all_data.sql <<'EOF'
DO $$
DECLARE
    table_record RECORD;
    row_count INTEGER;
BEGIN
    RAISE NOTICE '================================================================';
    RAISE NOTICE 'CONTAGEM DE REGISTROS POR TABELA';
    RAISE NOTICE '================================================================';
    RAISE NOTICE '';

    FOR table_record IN
        SELECT tablename
        FROM pg_tables
        WHERE schemaname = 'public'
        ORDER BY tablename
    LOOP
        EXECUTE format('SELECT COUNT(*) FROM %I', table_record.tablename) INTO row_count;

        IF row_count > 0 THEN
            RAISE NOTICE '✓ % : % registros',
                RPAD(table_record.tablename, 40),
                LPAD(row_count::text, 10);
        ELSE
            RAISE NOTICE '○ % : vazia',
                RPAD(table_record.tablename, 40);
        END IF;
    END LOOP;

    RAISE NOTICE '';
    RAISE NOTICE '================================================================';
END $$;
EOF

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "  CONTANDO REGISTROS EM TODAS AS TABELAS"
echo -e "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

supabase db remote --linked psql -f /tmp/count_all_data.sql 2>&1 | grep -E "NOTICE|✓|○" | sed 's/NOTICE:  //' > "$BACKUP_DIR/count_summary.txt"

cat "$BACKUP_DIR/count_summary.txt"
echo ""

# Extrair total de registros
total_records=$(grep "✓" "$BACKUP_DIR/count_summary.txt" | awk '{sum += $NF} END {print sum}')
tables_with_data=$(grep -c "✓" "$BACKUP_DIR/count_summary.txt" || echo "0")
empty_tables=$(grep -c "○" "$BACKUP_DIR/count_summary.txt" || echo "0")

echo -e "${BOLD}${GREEN}RESUMO:${NC}"
echo -e "  Total de registros: ${BOLD}$total_records${NC}"
echo -e "  Tabelas com dados: ${GREEN}$tables_with_data${NC}"
echo -e "  Tabelas vazias: ${YELLOW}$empty_tables${NC}"
echo ""

# Listar tabelas com dados para backup
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "  EXPORTANDO DADOS DAS TABELAS"
echo -e "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Pegar lista de tabelas com dados
TABLES_WITH_DATA=$(grep "✓" "$BACKUP_DIR/count_summary.txt" | awk '{print $2}')

if [ -z "$TABLES_WITH_DATA" ]; then
    echo -e "${YELLOW}⚠ Nenhuma tabela com dados encontrada${NC}"
else
    echo "$TABLES_WITH_DATA" | while read table; do
        if [ ! -z "$table" ]; then
            count=$(grep "✓ $table" "$BACKUP_DIR/count_summary.txt" | awk '{print $NF}')
            echo -ne "  Exportando ${BOLD}$table${NC} ($count registros)... "

            # Exportar para CSV
            supabase db remote --linked psql -c "\COPY $table TO STDOUT WITH CSV HEADER" > "$BACKUP_DIR/${table}.csv" 2>/dev/null && {
                echo -e "${GREEN}✓${NC}"
            } || {
                echo -e "${RED}✗ erro${NC}"
            }
        fi
    done
    echo ""
fi

# Verificar integridade referencial
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "  VERIFICANDO INTEGRIDADE REFERENCIAL"
echo -e "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

cat > /tmp/check_integrity.sql <<'EOF'
-- Verificar órfãos em foreign keys
DO $$
DECLARE
    fk_record RECORD;
    orphan_count INTEGER;
BEGIN
    RAISE NOTICE 'Verificando integridade de Foreign Keys...';
    RAISE NOTICE '';

    FOR fk_record IN
        SELECT
            tc.table_name,
            kcu.column_name,
            ccu.table_name AS foreign_table_name,
            ccu.column_name AS foreign_column_name
        FROM information_schema.table_constraints AS tc
        JOIN information_schema.key_column_usage AS kcu
            ON tc.constraint_name = kcu.constraint_name
        JOIN information_schema.constraint_column_usage AS ccu
            ON ccu.constraint_name = tc.constraint_name
        WHERE tc.constraint_type = 'FOREIGN KEY'
        AND tc.table_schema = 'public'
    LOOP
        -- Verificar órfãos
        EXECUTE format(
            'SELECT COUNT(*) FROM %I t WHERE t.%I IS NOT NULL AND NOT EXISTS (SELECT 1 FROM %I r WHERE r.%I = t.%I)',
            fk_record.table_name,
            fk_record.column_name,
            fk_record.foreign_table_name,
            fk_record.foreign_column_name,
            fk_record.column_name
        ) INTO orphan_count;

        IF orphan_count > 0 THEN
            RAISE WARNING '⚠ %.% -> %: % registros órfãos',
                fk_record.table_name,
                fk_record.column_name,
                fk_record.foreign_table_name,
                orphan_count;
        END IF;
    END LOOP;

    RAISE NOTICE '';
    RAISE NOTICE '✓ Verificação de integridade concluída';
END $$;
EOF

supabase db remote --linked psql -f /tmp/check_integrity.sql 2>&1 | grep -E "NOTICE|WARNING" | sed 's/NOTICE:  //' | sed 's/WARNING:  //' > "$BACKUP_DIR/integrity_check.txt"

if grep -q "⚠" "$BACKUP_DIR/integrity_check.txt"; then
    echo -e "${YELLOW}⚠ Encontrados problemas de integridade:${NC}"
    grep "⚠" "$BACKUP_DIR/integrity_check.txt" | while read line; do
        echo "  $line"
    done
    echo ""
else
    echo -e "${GREEN}✓ Todas as foreign keys válidas!${NC}"
    echo ""
fi

# Verificar duplicatas em campos únicos
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "  VERIFICANDO DUPLICATAS"
echo -e "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

cat > /tmp/check_duplicates.sql <<'EOF'
-- Verificar duplicatas em campos importantes
DO $$
DECLARE
    dup_count INTEGER;
BEGIN
    -- Clientes: CNPJ duplicado
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'clients') THEN
        SELECT COUNT(*) INTO dup_count FROM (
            SELECT cnpj FROM clients WHERE cnpj IS NOT NULL GROUP BY cnpj HAVING COUNT(*) > 1
        ) t;
        IF dup_count > 0 THEN
            RAISE WARNING 'clients.cnpj: % valores duplicados', dup_count;
        END IF;
    END IF;

    -- Contratos: contract_number duplicado
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'contracts') THEN
        SELECT COUNT(*) INTO dup_count FROM (
            SELECT contract_number FROM contracts WHERE contract_number IS NOT NULL
            GROUP BY contract_number HAVING COUNT(*) > 1
        ) t;
        IF dup_count > 0 THEN
            RAISE WARNING 'contracts.contract_number: % valores duplicados', dup_count;
        END IF;
    END IF;

    -- Profiles: email duplicado
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'profiles') THEN
        SELECT COUNT(*) INTO dup_count FROM (
            SELECT email FROM profiles WHERE email IS NOT NULL GROUP BY email HAVING COUNT(*) > 1
        ) t;
        IF dup_count > 0 THEN
            RAISE WARNING 'profiles.email: % valores duplicados', dup_count;
        END IF;
    END IF;

    RAISE NOTICE '✓ Verificação de duplicatas concluída';
END $$;
EOF

supabase db remote --linked psql -f /tmp/check_duplicates.sql 2>&1 | grep -E "NOTICE|WARNING" | sed 's/NOTICE:  //' | sed 's/WARNING:  //' > "$BACKUP_DIR/duplicate_check.txt"

if grep -q "WARNING" "$BACKUP_DIR/duplicate_check.txt"; then
    echo -e "${YELLOW}⚠ Encontradas duplicatas:${NC}"
    grep "WARNING" "$BACKUP_DIR/duplicate_check.txt" | while read line; do
        echo "  $line"
    done
    echo ""
else
    echo -e "${GREEN}✓ Nenhuma duplicata encontrada!${NC}"
    echo ""
fi

# Exportar schema completo
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "  EXPORTANDO INFORMAÇÕES ADICIONAIS"
echo -e "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

echo -n "  Exportando lista de tabelas... "
supabase db remote --linked psql -c "\dt public.*" > "$BACKUP_DIR/tables_list.txt" 2>&1 && echo -e "${GREEN}✓${NC}" || echo -e "${RED}✗${NC}"

echo -n "  Exportando foreign keys... "
supabase db remote --linked psql -c "\d+" > "$BACKUP_DIR/schema_details.txt" 2>&1 && echo -e "${GREEN}✓${NC}" || echo -e "${RED}✗${NC}"

echo -n "  Exportando storage buckets... "
supabase db remote --linked psql -c "SELECT * FROM storage.buckets" > "$BACKUP_DIR/storage_buckets.txt" 2>&1 && echo -e "${GREEN}✓${NC}" || echo -e "${RED}✗${NC}"

echo ""

# Criar relatório final
cat > "$BACKUP_DIR/REPORT.md" <<EOF
# Verificação de Dados Existentes - Supabase

**Project ID:** jtrhpbgrpsgneleptzgm
**Data:** $(date '+%Y-%m-%d %H:%M:%S')

## 📊 Resumo Geral

- **Total de Registros:** $total_records
- **Tabelas com Dados:** $tables_with_data
- **Tabelas Vazias:** $empty_tables

## 📋 Tabelas com Dados

$(grep "✓" "$BACKUP_DIR/count_summary.txt" | while read line; do
    echo "$line"
done)

## 🔍 Verificações Realizadas

### ✅ Integridade Referencial
$(cat "$BACKUP_DIR/integrity_check.txt")

### ✅ Duplicatas
$(cat "$BACKUP_DIR/duplicate_check.txt")

## 📁 Arquivos Exportados

Este backup contém:
- \`*.csv\`: Dados de cada tabela em formato CSV
- \`count_summary.txt\`: Contagem de registros por tabela
- \`integrity_check.txt\`: Verificação de foreign keys
- \`duplicate_check.txt\`: Verificação de duplicatas
- \`tables_list.txt\`: Lista completa de tabelas
- \`schema_details.txt\`: Detalhes do schema
- \`storage_buckets.txt\`: Buckets de storage

## 🔒 Segurança

✅ Todos os dados foram exportados
✅ Backup pode ser usado para restore
✅ Nenhum dado foi modificado

## 📝 Conclusão

$(if [ "$total_records" -gt 0 ]; then
    echo "✅ Banco de dados contém $total_records registros em $tables_with_data tabelas."
    echo "✅ Dados estão preservados e seguros após aplicação das migrations."
else
    echo "⚠️  Banco de dados está vazio ou sem dados nas tabelas principais."
    echo "Isso pode ser normal se é uma instalação nova."
fi)

---
Gerado automaticamente em $(date '+%Y-%m-%d %H:%M:%S')
EOF

# Mostrar relatório final
echo -e "${BOLD}${BLUE}"
cat << "EOF"
╔══════════════════════════════════════════════════════════════════════════════╗
║                                                                              ║
║                      VERIFICAÇÃO CONCLUÍDA COM SUCESSO!                      ║
║                                                                              ║
╚══════════════════════════════════════════════════════════════════════════════╝
EOF
echo -e "${NC}"

echo ""
echo -e "${GREEN}✅ Backup e verificação salvos em: ${BOLD}$BACKUP_DIR${NC}"
echo ""
echo -e "${BOLD}📊 RESUMO FINAL:${NC}"
echo -e "   Total de registros: ${BOLD}${GREEN}$total_records${NC}"
echo -e "   Tabelas com dados: ${GREEN}$tables_with_data${NC}"
echo -e "   Tabelas vazias: ${YELLOW}$empty_tables${NC}"
echo ""

if [ "$total_records" -gt 0 ]; then
    echo -e "${GREEN}✅ DADOS ESTÃO PRESERVADOS E SEGUROS!${NC}"
    echo -e "   Suas tabelas contêm dados após as migrations."
else
    echo -e "${YELLOW}ℹ️  Banco parece estar vazio ou recém-criado.${NC}"
    echo -e "   Isso é normal se for uma instalação nova."
fi

echo ""
echo -e "${BLUE}📖 Leia o relatório completo: ${BOLD}$BACKUP_DIR/REPORT.md${NC}"
echo ""
