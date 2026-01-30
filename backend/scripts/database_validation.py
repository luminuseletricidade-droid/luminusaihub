#!/usr/bin/env python3
"""
Script de Validação de Dados do Banco
Executa queries de verificação do arquivo de limpeza SQL
"""

import os
import sys
from pathlib import Path

# Adicionar o diretório backend ao path
backend_dir = Path(__file__).parent.parent
sys.path.insert(0, str(backend_dir))

from database import SupabaseDB
from datetime import datetime
import json

def print_section(title):
    """Imprime cabeçalho de seção"""
    print("\n" + "="*80)
    print(f" {title}")
    print("="*80 + "\n")

def print_results(title, results, limit=10):
    """Imprime resultados de query de forma formatada"""
    print(f"\n{title}")
    print("-" * 80)

    if not results:
        print("Nenhum resultado encontrado.")
        return

    print(f"Total de registros: {len(results)}")

    if len(results) > limit:
        print(f"Mostrando primeiros {limit} de {len(results)} registros:\n")
        results = results[:limit]
    else:
        print()

    for i, row in enumerate(results, 1):
        print(f"\n[{i}] {'-'*76}")
        for key, value in row.items():
            # Formatar valores especiais
            if value is None:
                display_value = "NULL"
            elif isinstance(value, list):
                display_value = json.dumps(value, ensure_ascii=False)
            elif isinstance(value, datetime):
                display_value = value.strftime("%Y-%m-%d %H:%M:%S")
            else:
                display_value = str(value)

            # Truncar valores muito longos
            if len(display_value) > 100:
                display_value = display_value[:97] + "..."

            print(f"  {key:20s}: {display_value}")
    print()

def main():
    """Executa validações no banco de dados"""

    print_section("VALIDAÇÃO DE DADOS DO BANCO - Janeiro 2025")

    # Conectar ao banco
    try:
        db = SupabaseDB()
        print("✓ Conectado ao banco de dados com sucesso\n")
    except Exception as e:
        print(f"✗ Erro ao conectar ao banco: {e}")
        return 1

    # =================================================================
    # SEÇÃO 1: Verificar Serviços Inclusos
    # =================================================================
    print_section("SEÇÃO 1: VERIFICAÇÃO - Serviços Inclusos")

    # 1.1 Contratos com "teste" em services
    query1_1 = """
        SELECT
            id,
            contract_number,
            client_name,
            services,
            created_at
        FROM contracts
        WHERE 'teste' = ANY(services)
        ORDER BY created_at DESC
    """

    try:
        results = db.execute_query(query1_1)
        print_results("1.1 Contratos com 'teste' em services:", results)
    except Exception as e:
        print(f"Erro na query 1.1: {e}")

    # 1.2 Contratos com services vazios ou NULL
    query1_2 = """
        SELECT
            id,
            contract_number,
            client_name,
            services,
            CASE
                WHEN services IS NULL THEN 'NULL'
                WHEN array_length(services, 1) IS NULL THEN 'EMPTY_ARRAY'
                WHEN array_length(services, 1) = 0 THEN 'EMPTY_ARRAY'
                ELSE 'HAS_DATA'
            END as status,
            created_at
        FROM contracts
        WHERE services IS NULL
           OR array_length(services, 1) IS NULL
           OR array_length(services, 1) = 0
        ORDER BY created_at DESC
        LIMIT 20
    """

    try:
        results = db.execute_query(query1_2)
        print_results("1.2 Contratos com services vazios ou NULL:", results)
    except Exception as e:
        print(f"Erro na query 1.2: {e}")

    # =================================================================
    # SEÇÃO 2: Verificar Termos de Pagamento
    # =================================================================
    print_section("SEÇÃO 2: VERIFICAÇÃO - Termos de Pagamento")

    # 2.1 payment_terms problemáticos
    query2_1 = """
        SELECT
            id,
            contract_number,
            client_name,
            payment_terms,
            CASE
                WHEN payment_terms IS NULL THEN 'NULL'
                WHEN payment_terms = '' THEN 'EMPTY_STRING'
                WHEN payment_terms = 'não informado' THEN 'DEFAULT_VALUE'
                WHEN payment_terms LIKE '%teste%' THEN 'TEST_DATA'
                ELSE 'HAS_VALUE'
            END as status,
            length(payment_terms) as length,
            created_at
        FROM contracts
        WHERE payment_terms IS NULL
           OR payment_terms = ''
           OR payment_terms = 'não informado'
           OR payment_terms LIKE '%teste%'
        ORDER BY created_at DESC
        LIMIT 20
    """

    try:
        results = db.execute_query(query2_1)
        print_results("2.1 Contratos com payment_terms problemáticos:", results)
    except Exception as e:
        print(f"Erro na query 2.1: {e}")

    # 2.2 Valores únicos de payment_terms
    query2_2 = """
        SELECT
            payment_terms,
            COUNT(*) as count,
            CASE
                WHEN payment_terms IS NULL THEN 'NULL'
                WHEN payment_terms = '' THEN 'EMPTY'
                ELSE 'VALUE'
            END as type
        FROM contracts
        GROUP BY payment_terms
        ORDER BY count DESC, payment_terms
        LIMIT 20
    """

    try:
        results = db.execute_query(query2_2)
        print_results("2.2 Valores únicos de payment_terms:", results, limit=20)
    except Exception as e:
        print(f"Erro na query 2.2: {e}")

    # =================================================================
    # SEÇÃO 3: Estatísticas Gerais
    # =================================================================
    print_section("SEÇÃO 3: ESTATÍSTICAS GERAIS")

    query3 = """
        SELECT
            COUNT(*) as total_contracts,
            COUNT(CASE WHEN services IS NOT NULL AND array_length(services, 1) > 0 THEN 1 END) as with_services,
            COUNT(CASE WHEN services IS NULL OR array_length(services, 1) IS NULL THEN 1 END) as without_services,
            COUNT(CASE WHEN payment_terms IS NOT NULL AND payment_terms != '' THEN 1 END) as with_payment_terms,
            COUNT(CASE WHEN payment_terms IS NULL OR payment_terms = '' THEN 1 END) as without_payment_terms,
            COUNT(CASE WHEN 'teste' = ANY(services) THEN 1 END) as with_test_services,
            COUNT(CASE WHEN payment_terms LIKE '%teste%' THEN 1 END) as with_test_payment_terms
        FROM contracts
    """

    try:
        results = db.execute_query(query3)
        if results:
            stats = results[0]
            print("Estatísticas dos Contratos:")
            print("-" * 80)
            print(f"  Total de contratos:                    {stats['total_contracts']}")
            print(f"  Com serviços cadastrados:              {stats['with_services']}")
            print(f"  Sem serviços:                          {stats['without_services']}")
            print(f"  Com termos de pagamento:               {stats['with_payment_terms']}")
            print(f"  Sem termos de pagamento:               {stats['without_payment_terms']}")
            print(f"  Com 'teste' em services:               {stats['with_test_services']} ⚠️")
            print(f"  Com 'teste' em payment_terms:          {stats['with_test_payment_terms']} ⚠️")
            print()
    except Exception as e:
        print(f"Erro na query de estatísticas: {e}")

    # =================================================================
    # SEÇÃO 4: Contratos Recentes
    # =================================================================
    print_section("SEÇÃO 4: CONTRATOS RECENTES")

    query4 = """
        SELECT
            id,
            contract_number,
            client_name,
            contract_type,
            services,
            payment_terms,
            created_at
        FROM contracts
        ORDER BY created_at DESC
        LIMIT 10
    """

    try:
        results = db.execute_query(query4)
        print_results("Últimos 10 contratos criados:", results, limit=10)
    except Exception as e:
        print(f"Erro na query de contratos recentes: {e}")

    # =================================================================
    # RESUMO FINAL
    # =================================================================
    print_section("RESUMO E RECOMENDAÇÕES")

    print("📋 AÇÕES RECOMENDADAS:\n")

    try:
        # Verificar se há dados para limpar
        test_services = db.execute_query("SELECT COUNT(*) as count FROM contracts WHERE 'teste' = ANY(services)")
        test_payment = db.execute_query("SELECT COUNT(*) as count FROM contracts WHERE payment_terms LIKE '%teste%'")
        null_payment = db.execute_query("SELECT COUNT(*) as count FROM contracts WHERE payment_terms IS NULL")

        test_services_count = test_services[0]['count'] if test_services else 0
        test_payment_count = test_payment[0]['count'] if test_payment else 0
        null_payment_count = null_payment[0]['count'] if null_payment else 0

        if test_services_count > 0:
            print(f"⚠️  AÇÃO NECESSÁRIA: {test_services_count} contrato(s) com 'teste' em services")
            print("   → Execute a seção 5.1 do script SQL para limpar")
        else:
            print("✓  Nenhum dado de teste encontrado em services")

        if test_payment_count > 0:
            print(f"\n⚠️  AÇÃO NECESSÁRIA: {test_payment_count} contrato(s) com 'teste' em payment_terms")
            print("   → Execute a seção 6.3 do script SQL para limpar")
        else:
            print("✓  Nenhum dado de teste encontrado em payment_terms")

        if null_payment_count > 0:
            print(f"\n⚠️  NORMALIZAÇÃO RECOMENDADA: {null_payment_count} contrato(s) com payment_terms NULL")
            print("   → Execute a seção 6.1 do script SQL para normalizar")
        else:
            print("✓  Todos os payment_terms estão normalizados")

        print("\n" + "="*80)
        print("\n📄 Script SQL completo: supabase/migrations/99999999999999_data_cleanup_jan2025.sql")
        print("🔧 Edite o script e descomente as queries de limpeza que deseja executar")
        print("⚠️  IMPORTANTE: Crie backup antes de executar limpezas (Seção 8 do script)\n")

    except Exception as e:
        print(f"Erro ao gerar resumo: {e}")

    return 0

if __name__ == "__main__":
    sys.exit(main())
