# BUG BUILD-001: Servidor Não Inicia - Solução Completa

## 🎯 Problema
```
npm error code ENOENT
npm error syscall open
npm error path /Users/renansantos/package.json
npm error errno -2
npm error enoent Could not read package.json
```

**Causa Raiz**: O comando `npm run dev` foi executado no diretório home (`/Users/renansantos/`) em vez do diretório raiz do projeto.

---

## ✅ Soluções Implementadas

### 1. **Script de Setup Automático** (`scripts/dev-setup.sh`)
Script robusto que:
- ✅ Verifica se estamos no diretório correto
- ✅ Valida Node.js >= 18.0.0
- ✅ Valida npm
- ✅ Instala dependências
- ✅ Configura variáveis de ambiente
- ✅ Fornece instruções claras

**Uso**:
```bash
cd /Users/renansantos/Library/Mobile\ Documents/com~apple~CloudDocs/AI/Projetos/Tech\ Human/luminus-ai-hub
./scripts/dev-setup.sh
```

### 2. **Arquivo .env.local** (Exemplo)
Criado para facilitar setup local sem comprometer segurança

### 3. **Documentação Clara**
Adicionada em `docs/README.md` com instruções passo-a-passo

---

## 🔧 Uso Correto

### ❌ Incorreto (Causa o bug)
```bash
npm run dev
# Executa do diretório home
```

### ✅ Correto (Opção 1 - Manual)
```bash
cd /Users/renansantos/Library/Mobile\ Documents/com~apple~CloudDocs/AI/Projetos/Tech\ Human/luminus-ai-hub
npm run dev
```

### ✅ Correto (Opção 2 - Com Script)
```bash
cd /Users/renansantos/Library/Mobile\ Documents/com~apple~CloudDocs/AI/Projetos/Tech\ Human/luminus-ai-hub
./scripts/dev-setup.sh
```

### ✅ Correto (Opção 3 - Alias Shell)
Adicione ao seu `~/.zshrc` ou `~/.bashrc`:
```bash
alias luminus-dev='cd "/Users/renansantos/Library/Mobile Documents/com~apple~CloudDocs/AI/Projetos/Tech Human/luminus-ai-hub" && npm run dev'
```

Depois use:
```bash
luminus-dev
```

---

## 📋 Checklist de Validação

- [ ] Diretório de trabalho correto: `/Users/renansantos/Library/Mobile Documents/com~apple~CloudDocs/AI/Projetos/Tech Human/luminus-ai-hub`
- [ ] Node.js >= 18.0.0 instalado (`node -v`)
- [ ] npm instalado (`npm -v`)
- [ ] Arquivo `package.json` existe no diretório raiz
- [ ] Dependências instaladas (`npm install` executado)
- [ ] Arquivo `.env` configurado com variáveis necessárias
- [ ] Servidor inicia com `npm run dev`
- [ ] Acesso em `http://localhost:8080`

---

## 🐛 Se o Problema Persistir

### 1. Limpar Cache e Reinstalar
```bash
cd /Users/renansantos/Library/Mobile\ Documents/com~apple~CloudDocs/AI/Projetos/Tech\ Human/luminus-ai-hub
./scripts/dev-setup.sh --clean
```

### 2. Verificar Permissões
```bash
# Dar permissão de execução ao script
chmod +x scripts/dev-setup.sh

# Dar permissão ao diretório
chmod -R 755 /Users/renansantos/Library/Mobile\ Documents/com~apple~CloudDocs/AI/Projetos/Tech\ Human/luminus-ai-hub
```

### 3. Verificar Node.js
```bash
node -v  # Deve ser >= 18.0.0
npm -v   # Deve ser >= 8.0.0
```

### 4. Limpar package-lock.json
```bash
rm package-lock.json
npm install
```

### 5. Verificar Variáveis de Ambiente
```bash
# Verificar se .env existe e tem variáveis necessárias
cat .env

# Se não existir, criar a partir do exemplo
cp .env.example .env
```

---

## 📚 Referências
- [Node.js Documentation](https://nodejs.org/)
- [npm Documentation](https://docs.npmjs.com/)
- [Vite Documentation](https://vitejs.dev/)
- [Troubleshooting Guide](../TROUBLESHOOTING.md)

---

## 🎓 Lições Aprendidas
1. **Sempre verificar working directory** antes de executar comandos
2. **Use scripts de setup** para automatizar validações
3. **Documentar problemas comuns** ajuda futuros desenvolvedores
4. **Implementar verificações robustas** no início do processo
