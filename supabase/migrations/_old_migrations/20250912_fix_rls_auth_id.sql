-- Desabilitar RLS temporariamente para depuração
ALTER TABLE contracts DISABLE ROW LEVEL SECURITY;
ALTER TABLE clients DISABLE ROW LEVEL SECURITY;
ALTER TABLE maintenances DISABLE ROW LEVEL SECURITY;
ALTER TABLE equipment DISABLE ROW LEVEL SECURITY;

-- Criar políticas mais permissivas para leitura
-- Contracts
CREATE POLICY "contracts_read_all" ON contracts
    FOR SELECT
    USING (true);

-- Clients  
CREATE POLICY "clients_read_all" ON clients
    FOR SELECT
    USING (true);

-- Maintenances
CREATE POLICY "maintenances_read_all" ON maintenances
    FOR SELECT
    USING (true);

-- Equipment
CREATE POLICY "equipment_read_all" ON equipment
    FOR SELECT
    USING (true);