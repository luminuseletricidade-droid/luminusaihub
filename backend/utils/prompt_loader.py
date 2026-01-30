"""
Prompt Loader Utility
Loads and manages prompts from YAML files
"""

import os
import yaml
from typing import Dict, Any, Optional
from pathlib import Path
import logging

logger = logging.getLogger(__name__)

class PromptLoader:
    """
    Manages loading and caching of prompts from YAML files
    """

    def __init__(self, prompts_dir: str = None):
        """
        Initialize the prompt loader

        Args:
            prompts_dir: Directory containing prompt YAML files.
                        Defaults to backend/prompts
        """
        if prompts_dir is None:
            # Get the backend directory path
            backend_dir = Path(__file__).parent.parent
            prompts_dir = backend_dir / "prompts"

        self.prompts_dir = Path(prompts_dir)
        self._cache: Dict[str, Dict[str, Any]] = {}

        if not self.prompts_dir.exists():
            logger.warning(f"Prompts directory not found: {self.prompts_dir}")
            self.prompts_dir.mkdir(parents=True, exist_ok=True)
            logger.info(f"Created prompts directory: {self.prompts_dir}")

    def load_prompt_file(self, filename: str, force_reload: bool = False) -> Dict[str, Any]:
        """
        Load a specific prompt YAML file

        Args:
            filename: Name of the YAML file (without extension)
            force_reload: Force reload even if cached

        Returns:
            Dictionary containing the prompts
        """
        # Check cache first
        if not force_reload and filename in self._cache:
            return self._cache[filename]

        # Build file path
        file_path = self.prompts_dir / f"{filename}.yaml"

        if not file_path.exists():
            # Try with .yml extension
            file_path = self.prompts_dir / f"{filename}.yml"
            if not file_path.exists():
                logger.error(f"Prompt file not found: {filename}")
                return {}

        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                prompts = yaml.safe_load(f)

            # Cache the loaded prompts
            self._cache[filename] = prompts
            logger.info(f"Loaded prompts from: {file_path}")

            return prompts

        except Exception as e:
            logger.error(f"Error loading prompt file {file_path}: {e}")
            return {}

    def get_prompt(self, filename: str, prompt_key: str, default: str = "") -> str:
        """
        Get a specific prompt from a file

        Args:
            filename: Name of the YAML file
            prompt_key: Key of the prompt to retrieve
            default: Default value if prompt not found

        Returns:
            The prompt string
        """
        prompts = self.load_prompt_file(filename)
        return prompts.get(prompt_key, default)

    def get_contract_extraction_prompts(self) -> Dict[str, str]:
        """
        Get all contract extraction prompts

        Returns:
            Dictionary containing all contract extraction prompts
        """
        # Try new agents_prompts file first
        all_prompts = self.load_prompt_file("agents_prompts")
        if all_prompts and 'contract_extraction' in all_prompts:
            return all_prompts['contract_extraction']

        # Fallback to old contract_extraction file
        return self.load_prompt_file("contract_extraction")

    def get_agent_prompts(self, agent_name: str) -> Dict[str, str]:
        """
        Get prompts for a specific agent

        Args:
            agent_name: Name of the agent (e.g., 'maintenance_agent', 'documentation_agent')

        Returns:
            Dictionary containing the agent's prompts
        """
        all_prompts = self.load_prompt_file("agents_prompts")
        if all_prompts and agent_name in all_prompts:
            return all_prompts[agent_name]

        logger.warning(f"Prompts for agent '{agent_name}' not found")
        return {}

    def get_all_agents_prompts(self) -> Dict[str, Any]:
        """
        Get all agents prompts

        Returns:
            Dictionary containing all agents and their prompts
        """
        return self.load_prompt_file("agents_prompts")

    def get_validation_rules(self) -> Dict[str, str]:
        """
        Get validation rules for data extraction

        Returns:
            Dictionary containing validation rules
        """
        all_prompts = self.load_prompt_file("agents_prompts")
        if all_prompts and 'validation_rules' in all_prompts:
            return all_prompts['validation_rules']
        return {}

    def get_output_structures(self) -> Dict[str, str]:
        """
        Get output structure templates

        Returns:
            Dictionary containing output structures
        """
        all_prompts = self.load_prompt_file("agents_prompts")
        if all_prompts and 'output_structures' in all_prompts:
            return all_prompts['output_structures']
        return {}

    def build_contract_extraction_prompt(
        self,
        text_preview: str,
        pdf_analysis: Dict[str, Any],
        metadata: Dict[str, Any]
    ) -> tuple[str, str]:
        """
        Build the complete contract extraction prompt using YAML template

        Args:
            text_preview: Full contract text
            pdf_analysis: Complete PDF analysis with all extracted data
            metadata: Contract metadata

        Returns:
            Tuple of (system_prompt, user_prompt)
        """
        prompts = self.get_contract_extraction_prompts()

        if not prompts:
            logger.error("❌ Contract extraction prompts not found!")
            return "", ""

        # Extract individual fields from pdf_analysis for template substitution
        template_vars = {
            'extracted_cnpj': pdf_analysis.get('extracted_cnpj', 'Não encontrado'),
            'potential_client': ', '.join(pdf_analysis.get('potential_client_info', [])[:5]) or 'Buscar no texto',
            'potential_values': ', '.join([str(v) for v in pdf_analysis.get('potential_values', [])[:10]]) or 'Buscar no texto',
            'potential_equipment': ', '.join(pdf_analysis.get('potential_equipment', [])[:10]) or 'Buscar no texto',
            'potential_dates': ', '.join(pdf_analysis.get('potential_dates', [])[:10]) or 'Buscar no texto',
            'potential_client_info': ', '.join(pdf_analysis.get('potential_client_info', [])[:15]) or 'Buscar no texto',
            'full_text': text_preview,
        }

        # Get system prompt from YAML
        system_prompt = prompts.get('system_prompt', '')

        # Get user prompt template from YAML and substitute variables
        user_prompt_template = prompts.get('user_prompt_template', '')

        if user_prompt_template:
            # Use template with variable substitution
            try:
                user_prompt = user_prompt_template.format(**template_vars)
                logger.info(f"✅ User prompt construído do template YAML: {len(user_prompt)} chars")
            except KeyError as e:
                logger.error(f"❌ Erro ao formatar template - chave faltando: {e}")
                logger.error(f"Template vars disponíveis: {list(template_vars.keys())}")
                # Fallback: use template as-is
                user_prompt = user_prompt_template
        else:
            logger.warning("⚠️ user_prompt_template não encontrado no YAML!")
            user_prompt = f"Analise o contrato:\n\n{text_preview}"

        return system_prompt, user_prompt

    def _get_default_prompts(
        self,
        text_preview: str,
        analysis_context: str,
        metadata: Dict[str, Any]
    ) -> tuple[str, str]:
        """
        Get default prompts if YAML files are not available

        Returns:
            Tuple of (system_prompt, user_prompt)
        """
        system_prompt = """Você é um especialista em análise de contratos com 20 anos de experiência.
        Use a análise prévia Python como fonte primária de dados.
        Retorne APENAS JSON válido, sem markdown ou explicações."""

        user_prompt = f"""
        Analise este contrato e extraia todos os dados disponíveis.

        {analysis_context}

        TEXTO DO CONTRATO:
        {text_preview}

        METADADOS:
        {yaml.dump(metadata, allow_unicode=True)}

        Retorne um JSON estruturado com todos os dados do contrato.
        """

        return system_prompt, user_prompt

    def reload_all_prompts(self):
        """
        Force reload all cached prompts
        """
        self._cache.clear()
        logger.info("All prompts cache cleared")

    def list_available_prompts(self) -> list[str]:
        """
        List all available prompt files

        Returns:
            List of prompt file names (without extensions)
        """
        prompt_files = []

        if self.prompts_dir.exists():
            for file in self.prompts_dir.iterdir():
                if file.suffix in ['.yaml', '.yml']:
                    prompt_files.append(file.stem)

        return prompt_files

# Singleton instance
_prompt_loader = None

def get_prompt_loader(prompts_dir: str = None) -> PromptLoader:
    """
    Get or create the singleton prompt loader instance

    Args:
        prompts_dir: Directory containing prompt files

    Returns:
        PromptLoader instance
    """
    global _prompt_loader
    if _prompt_loader is None:
        _prompt_loader = PromptLoader(prompts_dir)
    return _prompt_loader