
import io
import logging
import re
from typing import Optional, Tuple, Dict, Any, Callable
import tempfile
import os
import time
import gc
import psutil
import hashlib
import json
import pickle
from pathlib import Path

# PDF processing libraries with fallbacks
try:
    import pdfplumber
    PDFPLUMBER_AVAILABLE = True
except ImportError:
    PDFPLUMBER_AVAILABLE = False

try:
    import PyPDF2
    PYPDF2_AVAILABLE = True
except ImportError:
    PYPDF2_AVAILABLE = False

try:
    from pdfminer.high_level import extract_text
    PDFMINER_AVAILABLE = True
except ImportError:
    PDFMINER_AVAILABLE = False

logger = logging.getLogger(__name__)

class MemoryMonitor:
    """Monitor and manage memory usage during PDF processing"""

    def __init__(self, max_memory_mb: int = 1024):
        """
        Initialize memory monitor

        Args:
            max_memory_mb: Maximum memory usage in MB before taking action
        """
        self.max_memory_bytes = max_memory_mb * 1024 * 1024
        self.process = psutil.Process()
        self.initial_memory = self.get_current_memory()

    def get_current_memory(self) -> int:
        """Get current memory usage in bytes"""
        return self.process.memory_info().rss

    def get_memory_usage_mb(self) -> float:
        """Get current memory usage in MB"""
        return self.get_current_memory() / (1024 * 1024)

    def check_memory_limit(self) -> Tuple[bool, float]:
        """
        Check if memory usage exceeds limit

        Returns:
            Tuple of (is_over_limit, current_usage_mb)
        """
        current_memory = self.get_current_memory()
        current_mb = current_memory / (1024 * 1024)
        is_over_limit = current_memory > self.max_memory_bytes

        if is_over_limit:
            logger.warning(f"⚠️ Memory usage {current_mb:.1f}MB exceeds limit {self.max_memory_bytes/(1024*1024)}MB")

        return is_over_limit, current_mb

    def force_cleanup(self):
        """Force garbage collection and memory cleanup"""
        logger.info("🧹 Forcing memory cleanup...")
        gc.collect()
        time.sleep(0.1)  # Allow cleanup to complete

        after_cleanup = self.get_memory_usage_mb()
        logger.info(f"💾 Memory after cleanup: {after_cleanup:.1f}MB")

    def should_reduce_quality(self) -> bool:
        """Determine if processing quality should be reduced to save memory"""
        is_over_limit, current_mb = self.check_memory_limit()

        # Reduce quality if using more than 80% of limit
        threshold_mb = (self.max_memory_bytes * 0.8) / (1024 * 1024)
        should_reduce = current_mb > threshold_mb

        if should_reduce:
            logger.info(f"📉 Reducing processing quality due to memory usage: {current_mb:.1f}MB > {threshold_mb:.1f}MB")

        return should_reduce

class PDFCache:
    """Cache system for processed PDFs to avoid reprocessing identical files"""

    def __init__(self, cache_dir: str = None, max_cache_size_mb: int = 500, max_age_days: int = 7):
        """
        Initialize PDF cache

        Args:
            cache_dir: Directory for cache storage (default: temp/pdf_cache)
            max_cache_size_mb: Maximum cache size in MB
            max_age_days: Maximum age of cache entries in days
        """
        self.cache_dir = Path(cache_dir or Path.home() / "tmp" / "pdf_cache")
        self.cache_dir.mkdir(parents=True, exist_ok=True)

        self.max_cache_size = max_cache_size_mb * 1024 * 1024
        self.max_age_seconds = max_age_days * 24 * 3600

        self.metadata_file = self.cache_dir / "cache_metadata.json"
        self.metadata = self._load_metadata()

        logger.info(f"💾 PDF Cache initialized: {self.cache_dir} (max: {max_cache_size_mb}MB, {max_age_days} days)")

    def _load_metadata(self) -> Dict[str, Any]:
        """Load cache metadata from disk"""
        if self.metadata_file.exists():
            try:
                with open(self.metadata_file, 'r', encoding='utf-8') as f:
                    return json.load(f)
            except Exception as e:
                logger.warning(f"Failed to load cache metadata: {e}")
        return {}

    def _save_metadata(self):
        """Save cache metadata to disk"""
        try:
            with open(self.metadata_file, 'w', encoding='utf-8') as f:
                json.dump(self.metadata, f, indent=2)
        except Exception as e:
            logger.warning(f"Failed to save cache metadata: {e}")

    def _get_pdf_hash(self, pdf_bytes: bytes) -> str:
        """Generate unique hash for PDF content"""
        return hashlib.sha256(pdf_bytes).hexdigest()

    def _get_cache_path(self, pdf_hash: str) -> Path:
        """Get cache file path for given hash"""
        return self.cache_dir / f"{pdf_hash}.pkl"

    def _cleanup_old_entries(self):
        """Remove old cache entries"""
        current_time = time.time()
        to_remove = []

        for pdf_hash, entry_info in self.metadata.items():
            entry_age = current_time - entry_info.get('timestamp', 0)
            if entry_age > self.max_age_seconds:
                to_remove.append(pdf_hash)

        for pdf_hash in to_remove:
            self._remove_entry(pdf_hash)

        if to_remove:
            logger.info(f"🧹 Removed {len(to_remove)} old cache entries")

    def _cleanup_by_size(self):
        """Remove entries if cache exceeds size limit"""
        total_size = sum(entry.get('size', 0) for entry in self.metadata.values())

        if total_size <= self.max_cache_size:
            return

        # Sort by last access time (LRU)
        sorted_entries = sorted(
            self.metadata.items(),
            key=lambda x: x[1].get('last_access', 0)
        )

        # Remove oldest entries until under size limit
        removed_count = 0
        for pdf_hash, entry_info in sorted_entries:
            if total_size <= self.max_cache_size:
                break

            self._remove_entry(pdf_hash)
            total_size -= entry_info.get('size', 0)
            removed_count += 1

        if removed_count > 0:
            logger.info(f"🧹 Removed {removed_count} cache entries due to size limit")

    def _remove_entry(self, pdf_hash: str):
        """Remove a cache entry"""
        cache_path = self._get_cache_path(pdf_hash)
        if cache_path.exists():
            try:
                cache_path.unlink()
            except Exception as e:
                logger.warning(f"Failed to remove cache file {cache_path}: {e}")

        if pdf_hash in self.metadata:
            del self.metadata[pdf_hash]

    def get(self, pdf_bytes: bytes) -> Optional[Tuple[str, str]]:
        """
        Get cached extraction result

        Args:
            pdf_bytes: PDF content

        Returns:
            Tuple of (extracted_text, extraction_method) if cached, None otherwise
        """
        pdf_hash = self._get_pdf_hash(pdf_bytes)
        cache_path = self._get_cache_path(pdf_hash)

        if not cache_path.exists() or pdf_hash not in self.metadata:
            return None

        try:
            # Check if entry is too old
            entry_info = self.metadata[pdf_hash]
            entry_age = time.time() - entry_info.get('timestamp', 0)
            if entry_age > self.max_age_seconds:
                self._remove_entry(pdf_hash)
                return None

            # Load cached result
            with open(cache_path, 'rb') as f:
                result = pickle.load(f)

            # Update last access time
            self.metadata[pdf_hash]['last_access'] = time.time()
            self._save_metadata()

            logger.info(f"✅ Cache HIT: {pdf_hash[:8]}... (age: {entry_age/3600:.1f}h)")
            return result

        except Exception as e:
            logger.warning(f"Failed to load cache entry {pdf_hash}: {e}")
            self._remove_entry(pdf_hash)
            return None

    def put(self, pdf_bytes: bytes, extracted_text: str, extraction_method: str):
        """
        Cache extraction result

        Args:
            pdf_bytes: PDF content
            extracted_text: Extracted text
            extraction_method: Method used for extraction
        """
        pdf_hash = self._get_pdf_hash(pdf_bytes)
        cache_path = self._get_cache_path(pdf_hash)

        try:
            # Store the result
            result = (extracted_text, extraction_method)
            with open(cache_path, 'wb') as f:
                pickle.dump(result, f)

            # Update metadata
            file_size = cache_path.stat().st_size
            current_time = time.time()

            self.metadata[pdf_hash] = {
                'timestamp': current_time,
                'last_access': current_time,
                'size': file_size,
                'method': extraction_method,
                'text_length': len(extracted_text),
                'pdf_size': len(pdf_bytes)
            }

            self._save_metadata()

            # Cleanup if necessary
            self._cleanup_old_entries()
            self._cleanup_by_size()

            logger.info(f"💾 Cache STORED: {pdf_hash[:8]}... ({file_size/1024:.1f}KB)")

        except Exception as e:
            logger.warning(f"Failed to cache result for {pdf_hash}: {e}")

    def get_cache_info(self) -> Dict[str, Any]:
        """Get cache statistics"""
        total_entries = len(self.metadata)
        total_size = sum(entry.get('size', 0) for entry in self.metadata.values())
        total_size_mb = total_size / (1024 * 1024)

        oldest_entry = None
        newest_entry = None
        if self.metadata:
            timestamps = [entry.get('timestamp', 0) for entry in self.metadata.values()]
            oldest_entry = min(timestamps)
            newest_entry = max(timestamps)

        return {
            'total_entries': total_entries,
            'total_size_mb': total_size_mb,
            'max_size_mb': self.max_cache_size / (1024 * 1024),
            'oldest_entry_age_hours': (time.time() - oldest_entry) / 3600 if oldest_entry else 0,
            'newest_entry_age_hours': (time.time() - newest_entry) / 3600 if newest_entry else 0,
            'cache_dir': str(self.cache_dir)
        }

    def clear(self):
        """Clear all cache entries"""
        try:
            for cache_file in self.cache_dir.glob("*.pkl"):
                cache_file.unlink()

            self.metadata.clear()
            self._save_metadata()

            logger.info("🧹 Cache cleared")
        except Exception as e:
            logger.warning(f"Failed to clear cache: {e}")

# OCR libraries for scanned PDFs
try:
    from pdf2image import convert_from_bytes
    import pytesseract

    # Tesseract will use system PATH in production
    logger.info("✅ Tesseract configured to use system PATH")

    OCR_AVAILABLE = True
except ImportError:
    OCR_AVAILABLE = False

class PDFExtractor:
    """Unified PDF text extraction with multiple fallbacks"""
    
    @staticmethod
    def get_available_libraries() -> dict:
        """Return status of available PDF libraries"""
        return {
            "pdfplumber": PDFPLUMBER_AVAILABLE,
            "pypdf2": PYPDF2_AVAILABLE,
            "pdfminer": PDFMINER_AVAILABLE,
            "ocr": OCR_AVAILABLE
        }

    @staticmethod
    def fix_duplicate_characters(text: str) -> str:
        """
        Fix OCR artifact where each character appears twice consecutively.

        This happens when PDFs have dual layers (text + image) and OCR detects
        characters from both layers, resulting in patterns like:
        "DDOOCCUUMMEENNTTAAÇÇÃÃOO" instead of "DOCUMENTAÇÃO"

        Detection: Check if pairs of characters (0-1, 2-3, 4-5...) are mostly identical.
        Fix: Take only the first character of each pair.

        Args:
            text: Raw extracted text potentially with duplicate characters

        Returns:
            Cleaned text with duplicates removed (if pattern detected)
        """
        if not text or len(text) < 10:
            return text

        # Sample a portion of text to detect duplication pattern
        # Look at alphanumeric chars only for detection
        sample = re.sub(r'[^a-zA-ZÀ-ÿ0-9]', '', text[:1000])

        if len(sample) < 10:
            return text

        # Check if character PAIRS are identical (the actual duplication pattern)
        # In "DDOOCCUUMMEENNTTOO": pairs are (D,D), (O,O), (C,C), etc.
        pair_match_count = 0
        total_pairs = len(sample) // 2

        for i in range(0, total_pairs * 2, 2):
            if sample[i] == sample[i + 1]:
                pair_match_count += 1

        # If more than 80% of pairs match, it's a duplication pattern
        pair_match_ratio = pair_match_count / total_pairs if total_pairs > 0 else 0

        if pair_match_ratio < 0.80:
            # Not a duplication pattern, return original
            return text

        logger.info(f"🔧 Detectado padrão de duplicação OCR ({pair_match_ratio:.1%} pares idênticos). Corrigindo...")

        # Apply deduplication: process character by character
        # Preserve structure (newlines, spaces, punctuation patterns)
        result = []
        i = 0
        text_len = len(text)

        while i < text_len:
            char = text[i]

            # Always keep structural characters (newlines, tabs)
            if char in '\n\r\t':
                result.append(char)
                i += 1
                continue

            # For spaces: keep one space, skip consecutive duplicates
            if char == ' ':
                result.append(char)
                # Skip additional consecutive spaces
                while i + 1 < text_len and text[i + 1] == ' ':
                    i += 1
                i += 1
                continue

            # For alphanumeric and accented chars: skip the duplicate
            if char.isalnum() or char in 'À-ÿ':
                result.append(char)
                # Skip the next char if it's the same (the duplicate)
                if i + 1 < text_len and text[i + 1] == char:
                    i += 2
                else:
                    i += 1
                continue

            # For punctuation: check if doubled
            if i + 1 < text_len and text[i + 1] == char:
                result.append(char)
                i += 2
            else:
                result.append(char)
                i += 1

        cleaned = ''.join(result)
        logger.info(f"✅ Texto limpo: {len(text)} → {len(cleaned)} caracteres")

        return cleaned

    @staticmethod
    def extract_text_from_bytes(pdf_bytes: bytes) -> Tuple[str, str]:
        """
        Enhanced text extraction with comprehensive analysis
        Returns: (extracted_text, extraction_method)
        """
        text = ""
        method_used = ""
        all_methods_tried = []

        # LOG INICIAL DETALHADO
        logger.info("🔍 ===== INICIANDO EXTRAÇÃO DE PDF =====")
        logger.info(f"📊 Tamanho do arquivo: {len(pdf_bytes) / (1024*1024):.2f} MB")
        logger.info(f"🔧 Primeiros bytes (hex): {pdf_bytes[:20].hex()}")

        # Method 1: pdfplumber (best for structured text)
        if PDFPLUMBER_AVAILABLE:
            try:
                logger.info("🔍 Tentando extração com pdfplumber...")
                with pdfplumber.open(io.BytesIO(pdf_bytes)) as pdf:
                    total_pages = len(pdf.pages)
                    logger.info(f"📄 PDF tem {total_pages} páginas")
                    
                    # If pdfplumber sees 0 pages, don't immediately give up
                    # Some valid PDFs might have structural issues that pdfplumber can't handle
                    if total_pages == 0:
                        logger.warning("pdfplumber detectou 0 páginas - tentando outros métodos primeiro")
                        all_methods_tried.append("pdfplumber (0 páginas)")
                        # Don't raise exception here - let other methods try first
                    else:
                        page_texts = []
                        for i, page in enumerate(pdf.pages):
                            logger.info(f"  Processando página {i+1}/{total_pages}")
                            
                            # Try multiple extraction methods on each page
                            page_text = page.extract_text()
                            if not page_text:
                                # Try extracting tables if text extraction failed
                                try:
                                    tables = page.extract_tables()
                                    if tables:
                                        table_text = ""
                                        for table in tables:
                                            for row in table:
                                                if row:
                                                    table_text += " ".join([str(cell) if cell else "" for cell in row]) + "\n"
                                        page_text = table_text
                                except Exception as table_e:
                                    logger.debug(f"Extração de tabelas falhou na página {i+1}: {table_e}")
                            
                            if page_text:
                                page_texts.append(f"--- PÁGINA {i+1} ---\n{page_text}")
                        
                        if page_texts:
                            text = "\n\n".join(page_texts)
                            logger.info(f"✅ Texto extraído com pdfplumber: {len(text)} caracteres")
                            # LOG DETALHADO: Mostrar primeiros 500 caracteres do texto extraído
                            logger.info(f"📝 Amostra do texto extraído (primeiros 500 chars): {text[:500] if text else 'VAZIO'}")
                            return text.strip(), "pdfplumber"
                            
                all_methods_tried.append("pdfplumber")
            except Exception as e:
                logger.warning(f"pdfplumber falhou: {e}")
                all_methods_tried.append(f"pdfplumber (erro: {str(e)[:50]})")
        
        # Method 2: PyPDF2 (fallback for encrypted/complex PDFs)
        if PYPDF2_AVAILABLE and not text.strip():
            try:
                logger.info("🔍 Tentando extração com PyPDF2...")
                pdf_reader = PyPDF2.PdfReader(io.BytesIO(pdf_bytes))
                
                # Log PDF info
                num_pages = len(pdf_reader.pages)
                logger.info(f"PyPDF2 detectou {num_pages} páginas")
                
                # Check if PDF is encrypted
                if pdf_reader.is_encrypted:
                    try:
                        pdf_reader.decrypt('')  # Try empty password
                        logger.info("📱 PDF descriptografado com senha vazia")
                    except:
                        logger.warning("🔒 PDF criptografado - tentando continuar")
                
                page_texts = []
                extracted_chars_total = 0
                
                for i, page in enumerate(pdf_reader.pages):
                    try:
                        page_text = page.extract_text()
                        if page_text:
                            extracted_chars = len(page_text.strip())
                            extracted_chars_total += extracted_chars
                            logger.debug(f"Página {i+1}: {extracted_chars} caracteres")
                            
                            if page_text.strip():
                                page_texts.append(f"--- PÁGINA {i+1} ---\n{page_text}")
                    except Exception as page_e:
                        logger.debug(f"Erro na página {i+1} com PyPDF2: {page_e}")
                
                logger.info(f"PyPDF2 extraiu total de {extracted_chars_total} caracteres de {num_pages} páginas")

                # LOG DIAGNÓSTICO SE NÃO EXTRAIU NADA
                if extracted_chars_total == 0:
                    logger.error(f"❌ PyPDF2 detectou {num_pages} páginas mas NÃO EXTRAIU NENHUM TEXTO")
                    logger.error(f"   📷 Isto indica PDF ESCANEADO (apenas imagens sem OCR)")
                    logger.error(f"   ⚠️  Necessário OCR para processar este documento")

                if page_texts:
                    text = "\n\n".join(page_texts)
                    logger.info(f"✅ Texto extraído com PyPDF2: {len(text)} caracteres")
                    return text.strip(), "pypdf2"
                    
                all_methods_tried.append(f"pypdf2 ({num_pages} págs, {extracted_chars_total} chars)")
            except Exception as e:
                logger.warning(f"PyPDF2 falhou: {e}")
                all_methods_tried.append(f"pypdf2 (erro: {str(e)[:50]})")
        
        # Method 3: pdfminer (final text-based attempt)
        if PDFMINER_AVAILABLE and not text.strip():
            try:
                logger.info("🔍 Tentando extração com pdfminer...")
                text = extract_text(io.BytesIO(pdf_bytes))
                if text and text.strip():
                    logger.info(f"✅ Texto extraído com pdfminer: {len(text)} caracteres")
                    return text.strip(), "pdfminer"
                all_methods_tried.append("pdfminer")
            except Exception as e:
                logger.warning(f"pdfminer falhou: {e}")
                all_methods_tried.append(f"pdfminer (erro: {str(e)[:50]})")
        
        # Method 4: OCR for scanned PDFs (last resort)
        if OCR_AVAILABLE and not text.strip():
            try:
                logger.info("🔍 Tentando OCR para PDF escaneado...")
                
                # Import OCR libraries locally to avoid scope issues
                from pdf2image import convert_from_bytes
                import pytesseract
                
                # Enhanced adaptive DPI based on file size and performance optimization
                file_size_mb = len(pdf_bytes) / (1024 * 1024)

                # Estimate pages before conversion to optimize DPI
                estimated_pages = 1
                try:
                    if PYPDF2_AVAILABLE:
                        pdf_reader = PyPDF2.PdfReader(io.BytesIO(pdf_bytes))
                        estimated_pages = len(pdf_reader.pages)
                except:
                    pass  # Use default of 1 page if estimation fails

                dpi = PDFExtractor._calculate_optimal_dpi(file_size_mb, estimated_pages)
                
                logger.info(f"📊 Arquivo: {file_size_mb:.1f}MB, usando DPI: {dpi}")
                
                images = convert_from_bytes(pdf_bytes, dpi=dpi, first_page=1, last_page=20)  # Limit to first 20 pages
                
                page_texts = []
                for i, image in enumerate(images):
                    logger.info(f"  📄 OCR na página {i+1}/{len(images)}...")
                    try:
                        # Try different OCR configurations
                        page_text = ""
                        
                        # First try: Standard configuration without whitelist
                        try:
                            page_text = pytesseract.image_to_string(
                                image, 
                                lang='por+eng', 
                                config='--oem 3 --psm 6'
                            )
                            logger.debug(f"OCR standard resultado: {len(page_text) if page_text else 0} caracteres")
                        except Exception as e1:
                            logger.debug(f"OCR standard falhou: {e1}")
                            
                        # If no text, try English only
                        if not page_text or not page_text.strip():
                            try:
                                page_text = pytesseract.image_to_string(
                                    image, 
                                    lang='eng',
                                    config='--oem 3 --psm 3'  # PSM 3 for automatic page segmentation
                                )
                                logger.debug(f"OCR English resultado: {len(page_text) if page_text else 0} caracteres")
                            except Exception as e2:
                                logger.debug(f"OCR English falhou: {e2}")
                        
                        # If still no text, try basic OCR without config
                        if not page_text or not page_text.strip():
                            try:
                                page_text = pytesseract.image_to_string(image)
                                logger.debug(f"OCR básico resultado: {len(page_text) if page_text else 0} caracteres")
                            except Exception as e3:
                                logger.debug(f"OCR básico falhou: {e3}")
                        
                        if page_text and page_text.strip():
                            logger.info(f"    ✅ Página {i+1}: {len(page_text)} caracteres extraídos")
                            page_texts.append(f"--- PÁGINA {i+1} (OCR) ---\n{page_text}")
                        else:
                            logger.warning(f"    ⚠️ Página {i+1}: Nenhum texto extraído")
                            
                    except Exception as page_e:
                        logger.error(f"OCR falhou completamente na página {i+1}: {page_e}")
                
                if page_texts:
                    text = "\n\n".join(page_texts)
                    logger.info(f"✅ Texto extraído com OCR: {len(text)} caracteres")
                    return text.strip(), "ocr"
                    
                all_methods_tried.append("ocr")
            except Exception as e:
                logger.warning(f"OCR falhou: {e}")
                all_methods_tried.append(f"ocr (erro: {str(e)[:50]})")
        
        # If we get here, all methods failed
        error_msg = f"Não foi possível extrair texto do PDF. Métodos tentados: {', '.join(all_methods_tried)}"
        logger.error(error_msg)
        
        # Log additional info for debugging
        logger.info(f"Tamanho do arquivo: {len(pdf_bytes) / (1024 * 1024):.2f} MB")
        logger.info(f"Primeiros bytes: {pdf_bytes[:8].hex() if len(pdf_bytes) > 8 else 'arquivo muito pequeno'}")
        
        if not text.strip():
            # Improved detection logic for scanned PDFs
            if b'%PDF' in pdf_bytes[:10]:
                # Only treat as scanned PDF if ALL text-based methods failed AND we found pages with other methods
                pypdf_found_pages = any("pypdf2" in method and "págs" in method for method in all_methods_tried)
                pdfplumber_found_pages = not any("pdfplumber (0 páginas)" in method for method in all_methods_tried)
                
                # If PyPDF2 found pages but extracted 0 characters, try OCR first
                is_likely_scanned = pypdf_found_pages and any("0 chars" in method for method in all_methods_tried)
                
                if is_likely_scanned:
                    logger.warning("📷 PDF detectado mas sem texto - tentando OCR com pytesseract")
                    
                    # Try OCR extraction before giving up
                    try:
                        if not OCR_AVAILABLE:
                            logger.warning("OCR libraries not available")
                            raise ImportError("OCR not available")
                            
                        import pytesseract
                        from pdf2image import convert_from_bytes
                        
                        logger.info("🔍 Convertendo PDF para imagens para OCR...")
                        images = convert_from_bytes(pdf_bytes, dpi=150)
                        
                        page_texts = []
                        for i, image in enumerate(images[:5]):  # Process first 5 pages
                            logger.info(f"📷 Processando página {i+1} com OCR...")
                            try:
                                # Try Portuguese + English OCR
                                page_text = pytesseract.image_to_string(image, lang='por+eng')
                                if page_text and page_text.strip():
                                    page_texts.append(f"--- PÁGINA {i+1} (OCR) ---\n{page_text}")
                                    logger.info(f"✅ Página {i+1}: {len(page_text)} caracteres extraídos via OCR")
                            except Exception as ocr_e:
                                logger.warning(f"OCR falhou na página {i+1}: {ocr_e}")
                        
                        if page_texts:
                            text = "\n\n".join(page_texts)
                            logger.info(f"✅ Texto extraído com OCR: {len(text)} caracteres")
                            return text.strip(), "ocr_emergency"
                            
                    except ImportError:
                        logger.error("pytesseract ou pdf2image não instalado - não pode fazer OCR")
                    except Exception as ocr_error:
                        logger.error(f"Erro no OCR de emergência: {ocr_error}")
                    
                    # If OCR also failed, then raise the scanned PDF error
                    logger.warning("📷 PDF detectado mas sem texto - provavelmente é um PDF escaneado ou de imagem")
                    raise Exception(f"{error_msg}. O PDF parece ser apenas imagem/escaneado sem camada de texto.")
                else:
                    # Generic PDF processing error - don't assume it's scanned
                    logger.error("❌ Erro no processamento do PDF - pode estar corrompido ou ter formato incompatível")
                    raise Exception(f"{error_msg}. O PDF pode estar corrompido ou ter um formato incompatível com os extratores disponíveis.")
            else:
                logger.error("❌ Arquivo pode não ser um PDF válido")
                raise Exception(f"{error_msg}. O arquivo pode estar corrompido ou não ser um PDF válido.")
        
        return text.strip(), "unknown"
    
    @staticmethod
    def get_pdf_info(pdf_bytes: bytes) -> Dict[str, Any]:
        """
        Get comprehensive PDF information
        """
        info = {
            "file_size_mb": len(pdf_bytes) / (1024 * 1024),
            "pages": 0,
            "encrypted": False,
            "has_text": False,
            "likely_scanned": False,
            "libraries_available": PDFExtractor.get_available_libraries()
        }
        
        # Try to get basic info with PyPDF2
        if PYPDF2_AVAILABLE:
            try:
                pdf_reader = PyPDF2.PdfReader(io.BytesIO(pdf_bytes))
                info["pages"] = len(pdf_reader.pages)
                info["encrypted"] = pdf_reader.is_encrypted
                
                # Check if it has extractable text
                if info["pages"] > 0:
                    try:
                        first_page_text = pdf_reader.pages[0].extract_text()
                        info["has_text"] = bool(first_page_text and first_page_text.strip())
                        
                        # Heuristic: if very little text per page, likely scanned
                        if info["has_text"]:
                            avg_chars_per_page = len(first_page_text) if first_page_text else 0
                            info["likely_scanned"] = avg_chars_per_page < 100
                        else:
                            info["likely_scanned"] = True
                    except:
                        info["has_text"] = False
                        info["likely_scanned"] = True
                        
            except Exception as e:
                logger.debug(f"Erro obtendo informações do PDF: {e}")
        
        return info

    @staticmethod
    def _calculate_optimal_dpi(file_size_mb: float, estimated_pages: int = 1) -> int:
        """
        Calculate optimal DPI based on file size and estimated page count

        Args:
            file_size_mb: File size in megabytes
            estimated_pages: Number of pages (if known)

        Returns:
            Optimal DPI value for OCR processing
        """
        # Base DPI calculation considering file size
        if file_size_mb < 1:
            # Very small files - high quality for better OCR
            base_dpi = 400
        elif file_size_mb < 3:
            # Small files - good balance of quality and performance
            base_dpi = 350
        elif file_size_mb < 8:
            # Medium files - reduce DPI for performance
            base_dpi = 300
        elif file_size_mb < 15:
            # Large files - balance quality and memory usage
            base_dpi = 250
        elif file_size_mb < 30:
            # Very large files - prioritize memory efficiency
            base_dpi = 200
        else:
            # Extremely large files - minimal DPI to prevent crashes
            base_dpi = 150

        # Adjust based on estimated pages (more pages = lower DPI to save memory)
        if estimated_pages > 50:
            base_dpi = max(150, base_dpi - 50)
        elif estimated_pages > 20:
            base_dpi = max(200, base_dpi - 25)
        elif estimated_pages > 10:
            base_dpi = max(250, base_dpi - 25)

        # Ensure minimum viable DPI for OCR
        final_dpi = max(150, min(400, base_dpi))

        logger.info(f"🎯 DPI calculation: {file_size_mb:.1f}MB, {estimated_pages} pages → {final_dpi} DPI")

        return final_dpi

    @staticmethod
    def extract_with_progress(
        pdf_bytes: bytes,
        progress_callback: Optional[Callable[[int, int, str], None]] = None,
        max_pages: Optional[int] = None
    ) -> Tuple[str, str]:
        """
        Extract text with page-by-page processing and progress updates

        Args:
            pdf_bytes: PDF content as bytes
            progress_callback: Function called with (current_page, total_pages, status_message)
            max_pages: Maximum number of pages to process (None for all pages)

        Returns:
            Tuple of (extracted_text, extraction_method)
        """
        def update_progress(current: int, total: int, message: str):
            if progress_callback:
                progress_callback(current, total, message)
            logger.info(f"📊 Progress: {current}/{total} - {message}")

        text = ""
        method_used = ""
        all_methods_tried = []

        logger.info("🔍 ===== INICIANDO EXTRAÇÃO COM PROGRESSO =====")
        file_size_mb = len(pdf_bytes) / (1024*1024)
        logger.info(f"📊 Tamanho do arquivo: {file_size_mb:.2f} MB")

        # Get PDF info first
        pdf_info = PDFExtractor.get_pdf_info(pdf_bytes)
        total_pages = pdf_info.get("pages", 1)
        process_pages = min(total_pages, max_pages) if max_pages else total_pages

        update_progress(0, process_pages, "Iniciando processamento...")

        # Method 1: pdfplumber with progress
        if PDFPLUMBER_AVAILABLE:
            try:
                update_progress(0, process_pages, "Tentando extração com pdfplumber...")
                with pdfplumber.open(io.BytesIO(pdf_bytes)) as pdf:
                    if len(pdf.pages) > 0:
                        page_texts = []
                        pages_to_process = min(len(pdf.pages), process_pages)

                        for i, page in enumerate(pdf.pages[:pages_to_process]):
                            update_progress(i + 1, pages_to_process, f"Processando página {i+1} com pdfplumber")

                            page_text = page.extract_text()
                            if not page_text:
                                # Try table extraction
                                try:
                                    tables = page.extract_tables()
                                    if tables:
                                        table_text = ""
                                        for table in tables:
                                            for row in table:
                                                if row:
                                                    table_text += " ".join([str(cell) if cell else "" for cell in row]) + "\n"
                                        page_text = table_text
                                except Exception as table_e:
                                    logger.debug(f"Table extraction failed on page {i+1}: {table_e}")

                            if page_text:
                                page_texts.append(f"--- PÁGINA {i+1} ---\n{page_text}")

                            # Small delay to prevent overwhelming the system
                            time.sleep(0.01)

                        if page_texts:
                            text = "\n\n".join(page_texts)
                            update_progress(pages_to_process, pages_to_process, "Extração pdfplumber concluída")
                            logger.info(f"✅ Texto extraído com pdfplumber: {len(text)} caracteres")
                            return text.strip(), "pdfplumber_progress"

                all_methods_tried.append("pdfplumber")
            except Exception as e:
                logger.warning(f"pdfplumber falhou: {e}")
                all_methods_tried.append(f"pdfplumber (erro: {str(e)[:50]})")

        # Method 2: OCR with progress updates
        if OCR_AVAILABLE and not text.strip():
            try:
                update_progress(0, process_pages, "Iniciando OCR para PDF escaneado...")

                from pdf2image import convert_from_bytes
                import pytesseract

                file_size_mb = len(pdf_bytes) / (1024 * 1024)
                dpi = PDFExtractor._calculate_optimal_dpi(file_size_mb, total_pages)

                update_progress(0, process_pages, f"Convertendo PDF para imagens (DPI: {dpi})")

                # Convert with limited pages for memory efficiency
                max_ocr_pages = min(process_pages, 50)  # Limit OCR to 50 pages max
                images = convert_from_bytes(
                    pdf_bytes,
                    dpi=dpi,
                    first_page=1,
                    last_page=max_ocr_pages
                )

                page_texts = []
                for i, image in enumerate(images):
                    update_progress(i + 1, len(images), f"OCR na página {i+1}")

                    try:
                        # Multiple OCR attempts with progress
                        page_text = ""

                        # Try Portuguese + English first
                        try:
                            page_text = pytesseract.image_to_string(
                                image,
                                lang='por+eng',
                                config='--oem 3 --psm 6'
                            )
                        except Exception:
                            # Fallback to English only
                            try:
                                page_text = pytesseract.image_to_string(
                                    image,
                                    lang='eng',
                                    config='--oem 3 --psm 3'
                                )
                            except Exception:
                                # Basic OCR as last resort
                                page_text = pytesseract.image_to_string(image)

                        if page_text and page_text.strip():
                            page_texts.append(f"--- PÁGINA {i+1} (OCR) ---\n{page_text}")
                            logger.info(f"✅ Página {i+1}: {len(page_text)} caracteres extraídos")
                        else:
                            logger.warning(f"⚠️ Página {i+1}: Nenhum texto extraído")

                        # Memory management: small delay between pages
                        time.sleep(0.1)

                    except Exception as page_e:
                        logger.error(f"OCR falhou na página {i+1}: {page_e}")
                        update_progress(i + 1, len(images), f"Erro OCR na página {i+1}")

                if page_texts:
                    text = "\n\n".join(page_texts)
                    update_progress(len(images), len(images), "OCR concluído com sucesso")
                    logger.info(f"✅ Texto extraído com OCR: {len(text)} caracteres")
                    return text.strip(), "ocr_progress"

                all_methods_tried.append("ocr")
            except Exception as e:
                logger.warning(f"OCR falhou: {e}")
                all_methods_tried.append(f"ocr (erro: {str(e)[:50]})")

        # If progressive methods failed, fall back to standard extraction
        update_progress(0, 1, "Tentando métodos de fallback...")
        return PDFExtractor.extract_text_from_bytes(pdf_bytes)

    @staticmethod
    def extract_with_memory_control(
        pdf_bytes: bytes,
        max_memory_mb: int = 1024,
        progress_callback: Optional[Callable[[int, int, str], None]] = None
    ) -> Tuple[str, str]:
        """
        Extract text with memory monitoring and control

        Args:
            pdf_bytes: PDF content as bytes
            max_memory_mb: Maximum memory usage in MB
            progress_callback: Optional progress callback function

        Returns:
            Tuple of (extracted_text, extraction_method)
        """
        memory_monitor = MemoryMonitor(max_memory_mb)

        def update_progress(current: int, total: int, message: str):
            if progress_callback:
                progress_callback(current, total, message)

            # Check memory during progress updates
            is_over_limit, current_mb = memory_monitor.check_memory_limit()
            if is_over_limit:
                memory_monitor.force_cleanup()

            logger.info(f"📊 Progress: {current}/{total} - {message} (Memory: {current_mb:.1f}MB)")

        logger.info(f"🔍 Starting extraction with memory limit: {max_memory_mb}MB")
        initial_memory = memory_monitor.get_memory_usage_mb()
        logger.info(f"💾 Initial memory usage: {initial_memory:.1f}MB")

        file_size_mb = len(pdf_bytes) / (1024 * 1024)
        pdf_info = PDFExtractor.get_pdf_info(pdf_bytes)
        total_pages = pdf_info.get("pages", 1)

        # Determine processing strategy based on memory constraints
        if memory_monitor.should_reduce_quality():
            logger.info("📉 High memory usage detected - using memory-efficient processing")
            # Reduce page limit for memory efficiency
            max_pages = min(total_pages, 20)
            use_high_quality = False
        else:
            max_pages = min(total_pages, 50)  # Still limit for safety
            use_high_quality = True

        update_progress(0, max_pages, "Iniciando processamento com controle de memória...")

        # Method 1: Memory-aware pdfplumber processing
        if PDFPLUMBER_AVAILABLE:
            try:
                update_progress(0, max_pages, "Extração com pdfplumber (controle de memória)...")

                with pdfplumber.open(io.BytesIO(pdf_bytes)) as pdf:
                    if len(pdf.pages) > 0:
                        page_texts = []
                        pages_to_process = min(len(pdf.pages), max_pages)

                        for i, page in enumerate(pdf.pages[:pages_to_process]):
                            # Check memory before processing each page
                            is_over_limit, current_mb = memory_monitor.check_memory_limit()
                            if is_over_limit:
                                logger.warning(f"⚠️ Memory limit exceeded at page {i+1}, stopping processing")
                                break

                            update_progress(i + 1, pages_to_process, f"Página {i+1}")

                            page_text = page.extract_text()
                            if page_text:
                                page_texts.append(f"--- PÁGINA {i+1} ---\n{page_text}")

                            # Cleanup every 5 pages
                            if (i + 1) % 5 == 0:
                                memory_monitor.force_cleanup()

                            # Small delay for memory management
                            time.sleep(0.02)

                        if page_texts:
                            text = "\n\n".join(page_texts)
                            final_memory = memory_monitor.get_memory_usage_mb()
                            logger.info(f"✅ pdfplumber: {len(text)} chars, Memory: {initial_memory:.1f}MB → {final_memory:.1f}MB")
                            return text.strip(), "pdfplumber_memory_controlled"

            except Exception as e:
                logger.warning(f"Memory-controlled pdfplumber failed: {e}")

        # Method 2: Memory-aware OCR processing
        if OCR_AVAILABLE:
            try:
                update_progress(0, max_pages, "OCR com controle de memória...")

                from pdf2image import convert_from_bytes
                import pytesseract

                # Adjust DPI based on memory constraints
                if memory_monitor.should_reduce_quality():
                    dpi = max(150, PDFExtractor._calculate_optimal_dpi(file_size_mb, total_pages) - 50)
                    max_ocr_pages = min(max_pages, 10)  # Very conservative
                else:
                    dpi = PDFExtractor._calculate_optimal_dpi(file_size_mb, total_pages)
                    max_ocr_pages = min(max_pages, 25)

                logger.info(f"🎯 Memory-aware OCR: DPI={dpi}, max_pages={max_ocr_pages}")

                # Process in small batches to control memory
                batch_size = 5 if use_high_quality else 3
                page_texts = []

                for batch_start in range(0, max_ocr_pages, batch_size):
                    batch_end = min(batch_start + batch_size, max_ocr_pages)

                    # Check memory before each batch
                    is_over_limit, current_mb = memory_monitor.check_memory_limit()
                    if is_over_limit:
                        logger.warning(f"⚠️ Memory limit exceeded at batch {batch_start}, stopping")
                        break

                    update_progress(batch_start, max_ocr_pages, f"OCR batch {batch_start//batch_size + 1}")

                    try:
                        # Convert only current batch
                        batch_images = convert_from_bytes(
                            pdf_bytes,
                            dpi=dpi,
                            first_page=batch_start + 1,
                            last_page=batch_end
                        )

                        for i, image in enumerate(batch_images):
                            page_num = batch_start + i + 1

                            try:
                                if use_high_quality:
                                    page_text = pytesseract.image_to_string(
                                        image, lang='por+eng', config='--oem 3 --psm 6'
                                    )
                                else:
                                    # Fast OCR for memory-constrained situations
                                    page_text = pytesseract.image_to_string(image)

                                if page_text and page_text.strip():
                                    page_texts.append(f"--- PÁGINA {page_num} (OCR) ---\n{page_text}")

                            except Exception as page_e:
                                logger.warning(f"OCR failed on page {page_num}: {page_e}")

                        # Clean up batch images
                        del batch_images
                        memory_monitor.force_cleanup()

                    except Exception as batch_e:
                        logger.warning(f"OCR batch {batch_start}-{batch_end} failed: {batch_e}")

                if page_texts:
                    text = "\n\n".join(page_texts)
                    final_memory = memory_monitor.get_memory_usage_mb()
                    logger.info(f"✅ OCR: {len(text)} chars, Memory: {initial_memory:.1f}MB → {final_memory:.1f}MB")
                    return text.strip(), "ocr_memory_controlled"

            except Exception as e:
                logger.warning(f"Memory-controlled OCR failed: {e}")

        # Final cleanup
        memory_monitor.force_cleanup()

        # Fallback to standard extraction with reduced expectations
        logger.info("🔄 Falling back to standard extraction...")
        return PDFExtractor.extract_text_from_bytes(pdf_bytes)

    @staticmethod
    def extract_with_cache(
        pdf_bytes: bytes,
        cache_dir: str = None,
        use_memory_control: bool = True,
        max_memory_mb: int = 1024,
        progress_callback: Optional[Callable[[int, int, str], None]] = None
    ) -> Tuple[str, str, bool]:
        """
        Extract text with caching to avoid reprocessing identical PDFs

        Args:
            pdf_bytes: PDF content as bytes
            cache_dir: Cache directory (default: system temp)
            use_memory_control: Whether to use memory control
            max_memory_mb: Maximum memory usage in MB
            progress_callback: Optional progress callback

        Returns:
            Tuple of (extracted_text, extraction_method, was_cached)
        """
        # Initialize cache
        cache = PDFCache(cache_dir=cache_dir)

        def update_progress(current: int, total: int, message: str):
            if progress_callback:
                progress_callback(current, total, message)

        # Check cache first
        update_progress(0, 100, "Verificando cache...")
        cached_result = cache.get(pdf_bytes)

        if cached_result:
            extracted_text, extraction_method = cached_result
            update_progress(100, 100, "Resultado obtido do cache")
            logger.info(f"🚀 Cache hit! Saved processing time for PDF")
            return extracted_text, f"{extraction_method}_cached", True

        # Cache miss - need to process
        update_progress(10, 100, "PDF não encontrado em cache, processando...")

        # Choose extraction method based on requirements
        try:
            if use_memory_control:
                extracted_text, extraction_method = PDFExtractor.extract_with_memory_control(
                    pdf_bytes,
                    max_memory_mb=max_memory_mb,
                    progress_callback=lambda c, t, m: update_progress(10 + int(c/t*80), 100, m)
                )
            else:
                extracted_text, extraction_method = PDFExtractor.extract_with_progress(
                    pdf_bytes,
                    progress_callback=lambda c, t, m: update_progress(10 + int(c/t*80), 100, m)
                )

            # Cache the result
            update_progress(95, 100, "Salvando resultado em cache...")
            cache.put(pdf_bytes, extracted_text, extraction_method)

            update_progress(100, 100, "Processamento concluído")
            logger.info(f"✅ PDF processed and cached successfully")

            return extracted_text, extraction_method, False

        except Exception as e:
            logger.error(f"Failed to extract text from PDF: {e}")
            # Try fallback without caching
            try:
                extracted_text, extraction_method = PDFExtractor.extract_text_from_bytes(pdf_bytes)
                # Don't cache failed extractions
                return extracted_text, f"{extraction_method}_fallback", False
            except Exception as fallback_e:
                logger.error(f"Fallback extraction also failed: {fallback_e}")
                raise e  # Re-raise original exception

    @staticmethod
    def get_cache_statistics(cache_dir: str = None) -> Dict[str, Any]:
        """
        Get cache statistics

        Args:
            cache_dir: Cache directory

        Returns:
            Dictionary with cache statistics
        """
        try:
            cache = PDFCache(cache_dir=cache_dir)
            return cache.get_cache_info()
        except Exception as e:
            logger.warning(f"Failed to get cache statistics: {e}")
            return {"error": str(e)}

    @staticmethod
    def clear_cache(cache_dir: str = None):
        """
        Clear PDF extraction cache

        Args:
            cache_dir: Cache directory
        """
        try:
            cache = PDFCache(cache_dir=cache_dir)
            cache.clear()
            logger.info("✅ PDF cache cleared successfully")
        except Exception as e:
            logger.warning(f"Failed to clear cache: {e}")
            raise e
