import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Dashboard } from './pages/Dashboard';
import { Clients } from './pages/Clients';
import { Quotes } from './pages/Quotes';
import { Projects } from './pages/Projects';
import { Financial } from './pages/Financial';
import { Traffic } from './pages/Traffic';
import { Kanban } from './pages/Kanban';
import { Calendar } from './pages/Calendar';
import { ContractSign } from './pages/ContractSign';

function CrmRoutes() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/clientes" element={<Clients />} />
        <Route path="/orcamentos" element={<Quotes />} />
        <Route path="/projetos" element={<Projects />} />
        <Route path="/financeiro" element={<Financial />} />
        <Route path="/trafego" element={<Traffic />} />
        <Route path="/kanban" element={<Kanban />} />
        <Route path="/calendario" element={<Calendar />} />
      </Routes>
    </Layout>
  );
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/contrato/assinar/:token" element={<ContractSign />} />
        <Route path="/*" element={<CrmRoutes />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
