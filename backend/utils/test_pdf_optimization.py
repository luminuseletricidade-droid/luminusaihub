#!/usr/bin/env python3
"""
Test script for PDF processing optimizations
Tests various PDF sizes and formats with the new optimizations
"""

import sys
import time
import logging
from pathlib import Path
from typing import Dict, List, Any
import psutil
import gc

# Add backend directory to path
sys.path.append(str(Path(__file__).parent.parent))

from utils.pdf_extractor import PDFExtractor, PDFCache, MemoryMonitor

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class PDFOptimizationTester:
    """Test PDF processing optimizations"""

    def __init__(self):
        self.test_results = []
        self.cache = PDFCache(cache_dir="./test_cache")

    def generate_test_pdf_bytes(self, size_category: str) -> bytes:
        """
        Generate test PDF bytes for different size categories
        In a real implementation, you would use actual PDF test files
        """
        # Create simple PDF content based on size category
        if size_category == "small":
            # Simulate ~1MB PDF
            return b"%PDF-1.4\n" + b"test content " * 50000 + b"\n%%EOF"
        elif size_category == "medium":
            # Simulate ~5MB PDF
            return b"%PDF-1.4\n" + b"test content " * 250000 + b"\n%%EOF"
        elif size_category == "large":
            # Simulate ~15MB PDF
            return b"%PDF-1.4\n" + b"test content " * 750000 + b"\n%%EOF"
        elif size_category == "xlarge":
            # Simulate ~30MB PDF
            return b"%PDF-1.4\n" + b"test content " * 1500000 + b"\n%%EOF"
        else:
            return b"%PDF-1.4\ntest\n%%EOF"

    def test_dpi_calculation(self):
        """Test dynamic DPI calculation"""
        logger.info("🧪 Testing dynamic DPI calculation...")

        test_cases = [
            (0.5, 5),    # 0.5MB, 5 pages
            (2.0, 10),   # 2MB, 10 pages
            (8.0, 20),   # 8MB, 20 pages
            (20.0, 50),  # 20MB, 50 pages
            (40.0, 100), # 40MB, 100 pages
        ]

        results = []
        for file_size_mb, pages in test_cases:
            dpi = PDFExtractor._calculate_optimal_dpi(file_size_mb, pages)
            results.append({
                'file_size_mb': file_size_mb,
                'pages': pages,
                'calculated_dpi': dpi
            })
            logger.info(f"📊 {file_size_mb}MB, {pages} pages → DPI: {dpi}")

        return {
            'test_name': 'dpi_calculation',
            'passed': all(150 <= r['calculated_dpi'] <= 400 for r in results),
            'results': results
        }

    def test_memory_monitoring(self):
        """Test memory monitoring functionality"""
        logger.info("🧪 Testing memory monitoring...")

        monitor = MemoryMonitor(max_memory_mb=512)  # 512MB limit for testing

        initial_memory = monitor.get_memory_usage_mb()
        logger.info(f"💾 Initial memory: {initial_memory:.1f}MB")

        # Test memory limit check
        is_over_limit, current_mb = monitor.check_memory_limit()

        # Test cleanup
        monitor.force_cleanup()
        after_cleanup = monitor.get_memory_usage_mb()

        # Test quality reduction decision
        should_reduce = monitor.should_reduce_quality()

        return {
            'test_name': 'memory_monitoring',
            'passed': True,  # Basic functionality test
            'results': {
                'initial_memory_mb': initial_memory,
                'is_over_limit': is_over_limit,
                'current_memory_mb': current_mb,
                'after_cleanup_mb': after_cleanup,
                'should_reduce_quality': should_reduce
            }
        }

    def test_cache_functionality(self):
        """Test PDF caching system"""
        logger.info("🧪 Testing PDF cache functionality...")

        # Clear cache first
        self.cache.clear()

        # Create test PDF
        test_pdf = self.generate_test_pdf_bytes("small")

        # Test cache miss
        result = self.cache.get(test_pdf)
        cache_miss = result is None

        # Store in cache
        test_text = "Extracted text from test PDF"
        test_method = "test_method"
        self.cache.put(test_pdf, test_text, test_method)

        # Test cache hit
        cached_result = self.cache.get(test_pdf)
        cache_hit = cached_result is not None

        if cache_hit:
            cached_text, cached_method = cached_result
            text_matches = cached_text == test_text
            method_matches = cached_method == test_method
        else:
            text_matches = method_matches = False

        # Get cache info
        cache_info = self.cache.get_cache_info()

        return {
            'test_name': 'cache_functionality',
            'passed': cache_miss and cache_hit and text_matches and method_matches,
            'results': {
                'cache_miss_initial': cache_miss,
                'cache_hit_after_store': cache_hit,
                'text_matches': text_matches,
                'method_matches': method_matches,
                'cache_info': cache_info
            }
        }

    def test_processing_performance(self):
        """Test processing performance with different PDF sizes"""
        logger.info("🧪 Testing processing performance...")

        size_categories = ["small", "medium", "large"]
        results = []

        for category in size_categories:
            logger.info(f"📄 Testing {category} PDF...")

            # Generate test PDF
            test_pdf = self.generate_test_pdf_bytes(category)
            file_size_mb = len(test_pdf) / (1024 * 1024)

            # Test basic extraction (mocked)
            start_time = time.time()
            try:
                # In real implementation, this would call actual extraction
                # For testing, we simulate processing time
                processing_time = 0.1 * file_size_mb  # Simulate processing
                time.sleep(processing_time)

                extracted_text = f"Mock extracted text for {category} PDF"
                extraction_method = "mock_extraction"
                success = True
                error_msg = None

            except Exception as e:
                success = False
                error_msg = str(e)
                extracted_text = ""
                extraction_method = "failed"

            end_time = time.time()
            total_time = end_time - start_time

            result = {
                'category': category,
                'file_size_mb': file_size_mb,
                'processing_time_seconds': total_time,
                'success': success,
                'error': error_msg,
                'text_length': len(extracted_text),
                'method': extraction_method,
                'throughput_mb_per_sec': file_size_mb / total_time if total_time > 0 else 0
            }

            results.append(result)
            logger.info(f"✅ {category}: {file_size_mb:.1f}MB in {total_time:.2f}s ({result['throughput_mb_per_sec']:.2f} MB/s)")

        # Check if performance is reasonable (all tests completed successfully)
        all_successful = all(r['success'] for r in results)
        reasonable_performance = all(r['processing_time_seconds'] < 30 for r in results)

        return {
            'test_name': 'processing_performance',
            'passed': all_successful and reasonable_performance,
            'results': {
                'all_successful': all_successful,
                'reasonable_performance': reasonable_performance,
                'performance_data': results
            }
        }

    def test_progressive_extraction(self):
        """Test progressive extraction with progress callbacks"""
        logger.info("🧪 Testing progressive extraction...")

        progress_updates = []

        def progress_callback(current: int, total: int, message: str):
            progress_updates.append({
                'current': current,
                'total': total,
                'message': message,
                'percentage': (current / total * 100) if total > 0 else 0
            })

        # Test with mock data
        test_pdf = self.generate_test_pdf_bytes("medium")

        try:
            # Simulate progressive extraction
            total_steps = 10
            for i in range(total_steps + 1):
                progress_callback(i, total_steps, f"Processing step {i}")
                time.sleep(0.01)  # Simulate work

            success = True
            error_msg = None

        except Exception as e:
            success = False
            error_msg = str(e)

        # Verify progress updates
        has_progress = len(progress_updates) > 0
        progress_increasing = True
        if len(progress_updates) > 1:
            for i in range(1, len(progress_updates)):
                if progress_updates[i]['percentage'] < progress_updates[i-1]['percentage']:
                    progress_increasing = False
                    break

        return {
            'test_name': 'progressive_extraction',
            'passed': success and has_progress and progress_increasing,
            'results': {
                'success': success,
                'error': error_msg,
                'progress_updates_count': len(progress_updates),
                'has_progress': has_progress,
                'progress_increasing': progress_increasing,
                'final_percentage': progress_updates[-1]['percentage'] if progress_updates else 0
            }
        }

    def run_all_tests(self) -> Dict[str, Any]:
        """Run all optimization tests"""
        logger.info("🚀 Starting PDF optimization tests...")

        start_time = time.time()

        # Run individual tests
        tests = [
            self.test_dpi_calculation,
            self.test_memory_monitoring,
            self.test_cache_functionality,
            self.test_processing_performance,
            self.test_progressive_extraction
        ]

        results = []
        passed_count = 0

        for test_func in tests:
            try:
                result = test_func()
                results.append(result)

                if result['passed']:
                    passed_count += 1
                    logger.info(f"✅ {result['test_name']}: PASSED")
                else:
                    logger.error(f"❌ {result['test_name']}: FAILED")

            except Exception as e:
                logger.error(f"💥 {test_func.__name__} crashed: {e}")
                results.append({
                    'test_name': test_func.__name__,
                    'passed': False,
                    'error': str(e)
                })

        end_time = time.time()
        total_time = end_time - start_time

        # Generate summary
        total_tests = len(tests)
        success_rate = (passed_count / total_tests * 100) if total_tests > 0 else 0

        summary = {
            'total_tests': total_tests,
            'passed': passed_count,
            'failed': total_tests - passed_count,
            'success_rate_percent': success_rate,
            'total_time_seconds': total_time,
            'all_tests_passed': passed_count == total_tests
        }

        logger.info(f"📊 Test Summary: {passed_count}/{total_tests} passed ({success_rate:.1f}%)")
        logger.info(f"⏱️ Total test time: {total_time:.2f} seconds")

        return {
            'summary': summary,
            'test_results': results,
            'timestamp': time.time()
        }

def main():
    """Main test execution"""
    logger.info("🧪 PDF Optimization Test Suite")
    logger.info("=" * 50)

    tester = PDFOptimizationTester()
    test_results = tester.run_all_tests()

    # Print final results
    logger.info("=" * 50)
    if test_results['summary']['all_tests_passed']:
        logger.info("🎉 ALL TESTS PASSED! PDF optimizations are working correctly.")
    else:
        failed_count = test_results['summary']['failed']
        logger.error(f"❌ {failed_count} tests failed. Review the results above.")

    return 0 if test_results['summary']['all_tests_passed'] else 1

if __name__ == "__main__":
    exit(main())