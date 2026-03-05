# 🔧 Instruções para Deploy em Produção (Railway)

## Problema Resolvido: CORS Error no Login

### ❌ Erro Original:
- Preflight OPTIONS retornando 400
- "Failed to fetch" no frontend
- CORS headers ausentes

### ✅ Correções Aplicadas:

#### 1. **Parser de CORS Melhorado** (`backend/config.py`)
- Agora suporta JSON nativo
- Remove barras no final das URLs automaticamente
- Fallback robusto para formato manual

#### 2. **Handler Explícito para OPTIONS** (`backend/main.py`)
- Adiciona rota específica para preflight
- Retorna headers CORS corretos
- Max-age de 3600 segundos (1 hora)

#### 3. **CORS Middleware Atualizado**
- `max_age=3600` adicionado
- Todos os métodos permitidos incluindo OPTIONS
- Headers `*` permitidos

---

## 📋 Checklist para Deploy no Railway

### **Passo 1: Configurar Variável de Ambiente**

No Railway Dashboard, adicione a variável:

```bash
CORS_ORIGINS=["https://luminus.trustyu.com.br","https://seu-dominio.vercel.app"]
```

**⚠️ IMPORTANTE:**
- Use formato JSON válido
- NÃO coloque barra `/` no final das URLs
- Adicione todas as URLs do frontend (produção + preview se usar Vercel)

### **Passo 2: Verificar Deploy**

Após o deploy, teste o preflight:

```bash
curl -X OPTIONS https://luminus-ai-hub-back-production.up.railway.app/api/auth/signin \
  -H "Origin: https://luminus.trustyu.com.br" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: content-type" \
  -i
```

**Esperado:**
```
HTTP/1.1 200 OK
Access-Control-Allow-Origin: https://luminus.trustyu.com.br
Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS, HEAD, PATCH
Access-Control-Allow-Headers: *
Access-Control-Allow-Credentials: true
Access-Control-Max-Age: 3600
```

### **Passo 3: Verificar Logs**

No Railway, verifique os logs de inicialização:

```
INFO:main:🌐 CORS Origins: ['https://luminus.trustyu.com.br', ...]
```

---

## 🚨 Se o Problema Persistir

### **1. Verifique se a URL do Frontend está EXATA**

```bash
# No frontend, verifique qual URL está sendo chamada:
console.log('API URL:', import.meta.env.VITE_API_URL)
```

### **2. Verifique se há Proxy Reverso**

Se usar Nginx ou outro proxy na frente do Railway:

```nginx
# Adicione ao nginx.conf:
add_header 'Access-Control-Allow-Origin' $http_origin always;
add_header 'Access-Control-Allow-Methods' 'GET, POST, PUT, DELETE, OPTIONS' always;
add_header 'Access-Control-Allow-Headers' '*' always;
add_header 'Access-Control-Allow-Credentials' 'true' always;

if ($request_method = 'OPTIONS') {
    return 204;
}
```

### **3. Teste Direto no Browser**

Abra DevTools → Network → Filtre por "signin":
- Deve ver requisição OPTIONS seguida de POST
- OPTIONS deve retornar 200, não 400
- Headers CORS devem estar presentes

---

## 📝 Mudanças Aplicadas nos Arquivos

### **backend/config.py (linhas 46-71)**
```diff
+ # Try to parse as JSON first (most reliable)
+ try:
+     origins = json.loads(env_val)
+     if isinstance(origins, list):
+         valid_origins = [
+             o.strip().rstrip('/') for o in origins
+             if isinstance(o, str) and o.strip().startswith('http')
+         ]
+         if valid_origins:
+             return valid_origins
+ except json.JSONDecodeError:
+     pass
```

### **backend/main.py (linhas 215-237)**
```diff
  app.add_middleware(
      CORSMiddleware,
      allow_origins=Config.CORS_ORIGINS,
      allow_credentials=True,
      allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "HEAD", "PATCH"],
      allow_headers=["*"],
      expose_headers=["*"],
+     max_age=3600,
  )

+ @app.options("/{full_path:path}")
+ async def options_handler(request: Request):
+     """Handle OPTIONS requests explicitly for CORS preflight"""
+     return JSONResponse(...)
```

### **backend/.env (linha 24)**
```diff
- CORS_ORIGINS=["https://luminus.trustyu.com.br", "http://localhost:5173", "http://localhost:3000"]
+ CORS_ORIGINS=["https://luminus.trustyu.com.br", "http://localhost:8080", "http://localhost:5173", "http://localhost:3000"]
```

---

## ✅ Resultado Esperado

Após aplicar essas correções:

1. ✅ Preflight OPTIONS retorna 200 OK
2. ✅ Headers CORS corretos em todas as respostas
3. ✅ Login funciona sem "Failed to fetch"
4. ✅ Cache de preflight reduz requisições

---

## 🔗 URLs de Produção Atuais

- **Backend**: `https://luminus-ai-hub-back-production.up.railway.app`
- **Frontend**: `https://luminus.trustyu.com.br`
- **Docs API**: `https://luminus-ai-hub-back-production.up.railway.app/docs`

---

**Data da correção**: 2026-03-05
**Arquivos modificados**: `backend/config.py`, `backend/main.py`, `backend/.env`
