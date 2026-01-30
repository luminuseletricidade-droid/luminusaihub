# PDF-008: OCR Libraries Installation Guide

## Problem

When uploading scanned PDFs, the backend fails with:
```
ERROR:utils.pdf_extractor:OCR libraries not available
WARNING:utils.pdf_extractor:pytesseract ou pdf2image não instalado - não pode fazer OCR
```

## Root Cause

The backend is missing system-level OCR support. While `requirements.txt` lists the Python packages, they weren't installed in the Python environment.

## Solution

### Step 1: Install Python Packages

```bash
cd backend/
pip install -r requirements.txt
```

This installs from lines 14-17 of `requirements.txt`:
- `pdf2image==1.16.3` - PDF to image conversion
- `pytesseract==0.3.10` - Python OCR wrapper
- `Pillow>=10.3.0` - Image processing library

### Step 2: Install System Tesseract-OCR

**macOS (Homebrew):**
```bash
brew install tesseract
```

**Linux (Ubuntu/Debian):**
```bash
sudo apt-get install tesseract-ocr
```

**Windows:**
- Download from: https://github.com/UB-Mannheim/tesseract/wiki
- Or use Chocolatey: `choco install tesseract`

### Step 3: Verify Installation

```bash
# Check Python packages
python -c "import pdf2image, pytesseract, pdfplumber; print('✅ Python packages OK')"

# Check Tesseract binary
tesseract --version
```

### Step 4: Restart Backend

```bash
cd backend/
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

## PDF Processing Workflow

After installation, the backend handles PDFs in this order:

### Text-Based PDFs (normal documents)
```
PDF Input
    ↓
1. Try pdfplumber (fast, best for structured text)
    ↓
2. Try PyPDF2 (handles complex PDFs)
    ↓
3. Try pdfminer (comprehensive fallback)
    ↓
Extract Text ✅
```

### Scanned PDFs (image-only)
```
PDF Input
    ↓
1. Try pdfplumber (0 text detected)
    ↓
2. Try PyPDF2 (0 characters extracted)
    ↓
3. Try pdfminer (no text)
    ↓
4. Try OCR with Tesseract ← Requires installation
    ↓
Extract Text ✅
```

### Mixed PDFs (text + scanned)
- Uses text extraction for text-based pages
- Uses OCR for scanned pages
- Combines results

## Error Messages Explained

| Error | Cause | Solution |
|-------|-------|----------|
| `pytesseract.TesseractNotFoundError` | Tesseract binary not found | Install system Tesseract |
| `ModuleNotFoundError: pdf2image` | Python package not installed | `pip install pdf2image` |
| `OCR libraries not available` | Python packages missing | Run `pip install -r requirements.txt` |
| `Não foi possível extrair texto` | Unsupported PDF format or corrupted | Test with different PDF |

## Testing

### Test with Text-Based PDF
Most contracts are text-based and work immediately after Step 1.

### Test with Scanned PDF
Requires all 4 steps completed.

```bash
# After completing all steps:
curl -X POST http://localhost:8000/api/process-pdf-storage \
  -H "Content-Type: application/json" \
  -d '{
    "fileUrl": "https://your-storage.com/contract.pdf",
    "filename": "contract.pdf",
    "sessionId": "test-session"
  }'
```

## Performance Tuning

### OCR Performance Settings (in `backend/utils/pdf_extractor.py`)

OCR processes are optimized by DPI based on file size:

```python
# File size vs DPI (adaptive quality)
< 1 MB     → 400 DPI (high quality)
1-3 MB     → 350 DPI
3-8 MB     → 300 DPI (balanced)
8-15 MB    → 250 DPI
15-30 MB   → 200 DPI
> 30 MB    → 150 DPI (fast)
```

For slow OCR processing, you can:
1. Reduce DPI (faster, less accurate)
2. Process fewer pages (limit to first N pages)
3. Use `asyncProcessing: true` flag for large files

## Troubleshooting

### "tesseract is not installed or it's not in your PATH"

**macOS:**
```bash
brew install tesseract
# If still not found, add to PATH:
export PATH="/usr/local/bin:$PATH"
```

**Linux:**
```bash
sudo apt-get install tesseract-ocr
sudo apt-get install libtesseract-dev
```

### "Tesseract (not installed or in the pypath"

The PyPI package `pytesseract` is just a wrapper. The actual binary must be installed system-wide.

### OCR is slow

This is normal for large PDFs. Speed depends on:
- PDF file size (larger = more time)
- Number of pages (more pages = more time)
- DPI setting (higher DPI = more accurate but slower)
- OCR engine complexity

For large files, consider:
- Splitting PDFs before upload
- Using async processing (`asyncProcessing: true`)
- Increasing timeout limits

## Files Modified

- `backend/requirements.txt` - Already includes OCR packages (no changes needed)
- `backend/utils/pdf_extractor.py` - Handles OCR (no changes needed)
- `backend/main.py` - Calls PDF extraction (no changes needed)

## Environment Variables

No additional environment variables needed for OCR. It works automatically after installation.

## Production Deployment

When deploying to production (Railway, Docker, etc.):

1. **Docker**: Ensure Dockerfile includes Tesseract installation
2. **Railway/Buildpacks**: May need custom build script for system packages
3. **Vercel Functions**: OCR may not work (system limitations)

### Dockerfile Example
```dockerfile
FROM python:3.11-slim

# Install Tesseract
RUN apt-get update && apt-get install -y tesseract-ocr

# Copy and install Python requirements
COPY backend/requirements.txt .
RUN pip install -r requirements.txt

# Rest of configuration...
```

## Related Issues

- **PERF-001**: PDF extraction performance (uses OCR for scanned PDFs)
- **PDF-007**: Fixed request body deserialization
- **BUILD-001**: Development setup
- **BUILD-002-006**: React hook initialization errors

## Testing Checklist

- [ ] Step 1: Install Python packages (`pip install -r requirements.txt`)
- [ ] Step 2: Install Tesseract (`brew install tesseract` on macOS)
- [ ] Step 3: Verify installation (run `tesseract --version` and `python -c "import pytesseract"`)
- [ ] Step 4: Restart backend
- [ ] Step 5: Test with text-based PDF (should work)
- [ ] Step 6: Test with scanned PDF (now should work with OCR)

## Next Steps

After OCR is working:
1. Test PDF upload with various document types
2. Monitor OCR performance for large files
3. Consider OCR optimization if needed
4. Document supported file formats in user guide

## References

- Tesseract OCR: https://github.com/UberLabs/tesseract-ocr
- pytesseract: https://github.com/madmaze/pytesseract
- pdf2image: https://github.com/Belval/pdf2image
