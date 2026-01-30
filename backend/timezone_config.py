"""
Timezone Configuration for Backend

Gerencia configuração de timezone do sistema backend.
Usa variável de ambiente TZ para configurar timezone do Python e PostgreSQL.

Default: America/Sao_Paulo (UTC-3)

Para alterar, configure TZ no .env:
    TZ=America/Manaus  # UTC-4
    TZ=America/Rio_Branco  # UTC-5
"""

import os
import logging
from datetime import datetime, timezone
from zoneinfo import ZoneInfo
from typing import Optional

logger = logging.getLogger(__name__)

# Timezones suportados (Brasil)
SUPPORTED_TIMEZONES = {
    'America/Sao_Paulo': {'offset': -3, 'name': 'Horário de Brasília'},
    'America/Fortaleza': {'offset': -3, 'name': 'Fortaleza'},
    'America/Recife': {'offset': -3, 'name': 'Recife'},
    'America/Belem': {'offset': -3, 'name': 'Belém'},
    'America/Maceio': {'offset': -3, 'name': 'Maceió'},
    'America/Bahia': {'offset': -3, 'name': 'Salvador'},
    'America/Araguaina': {'offset': -3, 'name': 'Araguaína'},
    'America/Manaus': {'offset': -4, 'name': 'Manaus'},
    'America/Cuiaba': {'offset': -4, 'name': 'Cuiabá'},
    'America/Campo_Grande': {'offset': -4, 'name': 'Campo Grande'},
    'America/Boa_Vista': {'offset': -4, 'name': 'Boa Vista'},
    'America/Porto_Velho': {'offset': -4, 'name': 'Porto Velho'},
    'America/Rio_Branco': {'offset': -5, 'name': 'Rio Branco'},
    'America/Noronha': {'offset': -2, 'name': 'Fernando de Noronha'}
}

# Default timezone
DEFAULT_TIMEZONE = 'America/Sao_Paulo'


def get_timezone() -> str:
    """
    Obtém timezone configurado via variável de ambiente TZ

    Returns:
        str: Nome do timezone (ex: 'America/Sao_Paulo')
    """
    tz = os.getenv('TZ', DEFAULT_TIMEZONE)

    if tz not in SUPPORTED_TIMEZONES:
        logger.warning(
            f"Timezone '{tz}' não suportado. Usando default: {DEFAULT_TIMEZONE}"
        )
        return DEFAULT_TIMEZONE

    return tz


def get_timezone_info() -> dict:
    """
    Obtém informações sobre o timezone configurado

    Returns:
        dict: Informações do timezone (name, offset)
    """
    tz = get_timezone()
    info = SUPPORTED_TIMEZONES.get(tz, SUPPORTED_TIMEZONES[DEFAULT_TIMEZONE])

    return {
        'timezone': tz,
        'offset': info['offset'],
        'name': info['name']
    }


def get_timezone_obj() -> ZoneInfo:
    """
    Obtém objeto ZoneInfo do timezone configurado

    Returns:
        ZoneInfo: Objeto timezone para uso com datetime
    """
    return ZoneInfo(get_timezone())


def now_local() -> datetime:
    """
    Obtém datetime atual no timezone local configurado

    Returns:
        datetime: Datetime atual com timezone
    """
    return datetime.now(get_timezone_obj())


def to_local(dt: datetime) -> datetime:
    """
    Converte datetime UTC para timezone local

    Args:
        dt: Datetime em UTC

    Returns:
        datetime: Datetime no timezone local
    """
    if dt.tzinfo is None:
        # Se não tem timezone, assume UTC
        dt = dt.replace(tzinfo=timezone.utc)

    return dt.astimezone(get_timezone_obj())


def to_utc(dt: datetime) -> datetime:
    """
    Converte datetime local para UTC

    Args:
        dt: Datetime no timezone local

    Returns:
        datetime: Datetime em UTC
    """
    if dt.tzinfo is None:
        # Se não tem timezone, assume timezone local
        dt = dt.replace(tzinfo=get_timezone_obj())

    return dt.astimezone(timezone.utc)


def format_datetime_local(dt: datetime) -> str:
    """
    Formata datetime para string no formato brasileiro

    Args:
        dt: Datetime para formatar

    Returns:
        str: String formatada (DD/MM/YYYY HH:MM:SS)
    """
    local_dt = to_local(dt) if dt.tzinfo else dt
    return local_dt.strftime('%d/%m/%Y %H:%M:%S')


def format_date_local(dt: datetime) -> str:
    """
    Formata data para string no formato brasileiro

    Args:
        dt: Datetime/Date para formatar

    Returns:
        str: String formatada (DD/MM/YYYY)
    """
    local_dt = to_local(dt) if dt.tzinfo else dt
    return local_dt.strftime('%d/%m/%Y')


def parse_date_br(date_str: str) -> datetime:
    """
    Parse string de data brasileira para datetime

    Args:
        date_str: String no formato DD/MM/YYYY

    Returns:
        datetime: Datetime no timezone local
    """
    dt = datetime.strptime(date_str, '%d/%m/%Y')
    return dt.replace(tzinfo=get_timezone_obj())


def parse_datetime_br(datetime_str: str) -> datetime:
    """
    Parse string de datetime brasileira para datetime

    Args:
        datetime_str: String no formato DD/MM/YYYY HH:MM:SS

    Returns:
        datetime: Datetime no timezone local
    """
    dt = datetime.strptime(datetime_str, '%d/%m/%Y %H:%M:%S')
    return dt.replace(tzinfo=get_timezone_obj())


# Log configuração no import
tz_info = get_timezone_info()
logger.info(
    f"🌍 Timezone configurado: {tz_info['name']} "
    f"({tz_info['timezone']}, UTC{tz_info['offset']:+d})"
)


# Exportar configuração para ser usada em queries SQL
def get_postgres_timezone_setting() -> str:
    """
    Retorna comando SQL para configurar timezone do PostgreSQL

    Returns:
        str: Comando SQL SET TIMEZONE
    """
    return f"SET TIMEZONE = '{get_timezone()}';"


# Para uso em configuração do PostgreSQL
POSTGRES_TIMEZONE = get_timezone()
