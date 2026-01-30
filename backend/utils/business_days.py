"""
Utilitários para trabalhar com dias úteis (Segunda a Sexta)
"""

from datetime import datetime, timedelta
from typing import List, Optional


def is_business_day(date: datetime) -> bool:
    """
    Verifica se uma data é um dia útil (Segunda a Sexta)
    
    Args:
        date: Data a ser verificada
        
    Returns:
        True se for dia útil, False caso contrário
    """
    # weekday() retorna 0=Segunda, 6=Domingo
    return date.weekday() < 5  # 0-4 são dias úteis


def get_next_business_day(date: datetime) -> datetime:
    """
    Encontra o próximo dia útil a partir de uma data
    Se a data já for um dia útil, retorna ela mesma
    
    Args:
        date: Data base
        
    Returns:
        Próximo dia útil
    """
    current_date = date.replace()
    
    while not is_business_day(current_date):
        current_date += timedelta(days=1)
    
    return current_date


def get_previous_business_day(date: datetime) -> datetime:
    """
    Encontra o dia útil anterior a partir de uma data
    Se a data já for um dia útil, retorna ela mesma
    
    Args:
        date: Data base
        
    Returns:
        Dia útil anterior
    """
    current_date = date.replace()
    
    while not is_business_day(current_date):
        current_date -= timedelta(days=1)
    
    return current_date


def adjust_to_business_day(date: datetime) -> datetime:
    """
    Ajusta uma data para o próximo dia útil se ela cair em fim de semana
    
    Args:
        date: Data a ser ajustada
        
    Returns:
        Data ajustada para dia útil
    """
    if is_business_day(date):
        return date.replace()
    
    return get_next_business_day(date)


def add_business_days(date: datetime, business_days: int) -> datetime:
    """
    Adiciona um número específico de dias úteis a uma data
    
    Args:
        date: Data base
        business_days: Número de dias úteis a adicionar
        
    Returns:
        Nova data com os dias úteis adicionados
    """
    result = date.replace()
    days_added = 0
    
    while days_added < business_days:
        result += timedelta(days=1)
        if is_business_day(result):
            days_added += 1
    
    return result


def generate_maintenance_dates(
    start_date: datetime,
    frequency: str,
    count: int
) -> List[datetime]:
    """
    Gera uma lista de datas de manutenção considerando apenas dias úteis
    
    Args:
        start_date: Data de início
        frequency: Frequência ('monthly', 'biweekly', 'weekly')
        count: Número de datas a gerar
        
    Returns:
        Lista de datas ajustadas para dias úteis
    """
    dates = []
    current_date = adjust_to_business_day(start_date)
    
    for i in range(count):
        dates.append(current_date.replace())
        
        # Calcular próxima data baseada na frequência
        if frequency == 'monthly':
            # Adicionar 1 mês e ajustar para dia útil
            if current_date.month == 12:
                next_month = current_date.replace(year=current_date.year + 1, month=1)
            else:
                next_month = current_date.replace(month=current_date.month + 1)
            current_date = adjust_to_business_day(next_month)
            
        elif frequency == 'biweekly':
            # Adicionar 14 dias úteis
            current_date = add_business_days(current_date, 14)
            
        elif frequency == 'weekly':
            # Adicionar 7 dias úteis  
            current_date = add_business_days(current_date, 7)
        else:
            # Fallback: adicionar 30 dias e ajustar
            current_date = adjust_to_business_day(current_date + timedelta(days=30))
    
    return dates


def format_date_with_business_day(date: datetime, locale: str = 'pt-BR') -> str:
    """
    Formata uma data para exibição com indicação se é dia útil
    
    Args:
        date: Data a ser formatada
        locale: Locale para formatação
        
    Returns:
        String formatada com indicação de dia útil
    """
    weekdays_pt = {
        0: 'Seg', 1: 'Ter', 2: 'Qua', 3: 'Qui', 4: 'Sex', 5: 'Sáb', 6: 'Dom'
    }
    
    formatted = date.strftime('%d/%m/%Y')
    day_name = weekdays_pt[date.weekday()]
    is_work_day = is_business_day(date)
    
    return f"{formatted} ({day_name}){'' if is_work_day else ' - FIM DE SEMANA'}"