# 🔧 Troubleshooting - Erro de Login

## ❌ Erro: "Failed to fetch"

### Possíveis Causas e Soluções

#### 1. ✅ **Usuário Criado**
- **Status:** ✅ Confirmado e senha resetada
- **Email:** luminus@gmail.com
- **Senha:** 1235678
- **User ID:** de26d281-2eb6-410e-aaf2-3d9dcdd6a991

---

#### 2. 🔍 **Verificações para Fazer**

##### A. Abra o Console do Navegador
1. Pressione `F12` ou `Cmd+Option+I`
2. Vá na aba **Console**
3. Veja se há erros em vermelho
4. Copie e me envie os erros que aparecerem

##### B. Verifique a aba Network
1. No DevTools, vá em **Network**
2. Tente fazer login novamente
3. Veja se aparece alguma requisição em vermelho
4. Clique na requisição e veja o erro

---

#### 3. 🌐 **Teste Direto com Supabase**

Teste se o Supabase está respondendo:

```bash
# Teste 1: Ping na API
curl https://jtrhpbgrpsgneleptzgm.supabase.co

# Teste 2: Tentar login direto via API
curl -X POST 'https://jtrhpbgrpsgneleptzgm.supabase.co/auth/v1/token?grant_type=password' \
  -H "apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp0cmhwYmdycHNnbmVsZXB0emdtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAyMjU5ODYsImV4cCI6MjA4NTgwMTk4Nn0.cjoswlcAemdJ45-9oKFnPiNn64Wm46-pkvUcI96QX64" \
  -H "Content-Type: application/json" \
  -d '{"email":"luminus@gmail.com","password":"1235678"}'
```

---

#### 4. 🔄 **Limpar Cache do Navegador**

1. Pressione `Cmd+Shift+Delete` (Mac) ou `Ctrl+Shift+Delete` (Windows)
2. Marque "Cookies" e "Cache"
3. Limpe os dados
4. Recarregue a página (`Cmd+R` ou `F5`)

---

#### 5. 🌐 **Testar em Navegador Privado/Anônimo**

1. Abra uma janela anônima (`Cmd+Shift+N`)
2. Acesse: http://localhost:8080/
3. Tente fazer login

---

#### 6. ⚙️ **Verificar Configurações do .env**

Arquivo `.env` deve ter:
```bash
VITE_SUPABASE_PROJECT_ID=jtrhpbgrpsgneleptzgm
VITE_SUPABASE_PUBLISHABLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp0cmhwYmdycHNnbmVsZXB0emdtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAyMjU5ODYsImV4cCI6MjA4NTgwMTk4Nn0.cjoswlcAemdJ45-9oKFnPiNn64Wm46-pkvUcI96QX64
VITE_SUPABASE_URL=https://jtrhpbgrpsgneleptzgm.supabase.co
```

Se alterou o `.env`, **reinicie o servidor**:
```bash
# Parar: Ctrl+C
# Iniciar novamente:
npm run dev
```

---

#### 7. 🔍 **Verificar CORS no Supabase**

1. Acesse: https://supabase.com/dashboard/project/jtrhpbgrpsgneleptzgm/settings/api
2. Role até "CORS Configuration"
3. Adicione:
   - `http://localhost:8080`
   - `http://localhost:5173`
   - `http://localhost:3000`

---

#### 8. 📱 **Testar Email Simples**

Se `luminus@gmail.com` não funciona, tente criar outro usuário:

```bash
python3 -c "
import requests
headers = {
    'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp0cmhwYmdycHNnbmVsZXB0emdtIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MDIyNTk4NiwiZXhwIjoyMDg1ODAxOTg2fQ.3OnMpmjbyz9NbduMt3PpxF_YLlfU6YzDHZDeNGsxYe8',
    'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp0cmhwYmdycHNnbmVsZXB0emdtIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MDIyNTk4NiwiZXhwIjoyMDg1ODAxOTg2fQ.3OnMpmjbyz9NbduMt3PpxF_YLlfU6YzDHZDeNGsxYe8',
    'Content-Type': 'application/json'
}
data = {'email': 'admin@test.com', 'password': 'admin123', 'email_confirm': True}
r = requests.post('https://jtrhpbgrpsgneleptzgm.supabase.co/auth/v1/admin/users', headers=headers, json=data)
print(r.status_code, r.text)
"
```

Depois tente login com:
- Email: `admin@test.com`
- Senha: `admin123`

---

## 🐛 Erros Comuns

### "Invalid login credentials"
- Senha incorreta
- **Solução:** Senha foi resetada para `1235678`

### "Failed to fetch"
- Problema de rede/CORS
- **Solução:** Verificar console do navegador

### "Network error"
- Supabase fora do ar (raro)
- **Solução:** Verificar status em https://status.supabase.com/

### "Email not confirmed"
- Email precisa ser confirmado
- **Solução:** Usuário já foi criado com `email_confirm: true`

---

## 📞 Próximos Passos

1. **Abra o console do navegador** (F12)
2. **Tente fazer login** novamente
3. **Copie os erros** que aparecerem
4. **Me envie** os erros para eu ajudar

---

## ✅ Checklist Rápido

- [ ] Usuário existe (✅ confirmado)
- [ ] Senha correta (✅ resetada para 1235678)
- [ ] Frontend rodando (✅ localhost:8080)
- [ ] .env configurado corretamente
- [ ] Cache do navegador limpo
- [ ] Console do navegador aberto
- [ ] CORS configurado no Supabase

---

**Última atualização:** 2026-02-12 14:15
