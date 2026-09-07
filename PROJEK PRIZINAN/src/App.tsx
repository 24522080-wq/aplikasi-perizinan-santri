import { useState, useEffect } from 'react';
import { Loader2, ShieldCheck } from 'lucide-react';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { Layout, type PageId } from '@/components/Layout';
import { LoginPage } from '@/pages/LoginPage';
import { DashboardPage } from '@/pages/DashboardPage';
import { CatatIzinPage } from '@/pages/CatatIzinPage';
import { RekapPage } from '@/pages/RekapPage';
import { DataSantriPage } from '@/pages/DataSantriPage';
import { UserManagementPage } from '@/pages/UserManagementPage';
import { LogAktivitasPage } from '@/pages/LogAktivitasPage';

function AppContent() {
  const { user, profile, loading } = useAuth();
  const [currentPage, setCurrentPage] = useState<PageId>('dashboard');

  // Guard: redirect non-super_admin away from users page
  useEffect(() => {
    if (currentPage === 'users' && profile && profile.role !== 'super_admin') {
      setCurrentPage('dashboard');
    }
  }, [currentPage, profile]);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-stone-50">
        <div className="w-14 h-14 rounded-2xl bg-primary-600 flex items-center justify-center">
          <ShieldCheck className="w-8 h-8 text-white" />
        </div>
        <Loader2 className="w-6 h-6 animate-spin text-stone-400" />
      </div>
    );
  }

  if (!user) {
    return <LoginPage />;
  }

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <DashboardPage />;
      case 'catat':
        return <CatatIzinPage />;
      case 'rekap':
        return <RekapPage />;
      case 'santri':
        return <DataSantriPage />;
      case 'users':
        return profile?.role === 'super_admin' ? <UserManagementPage /> : <DashboardPage />;
      case 'log':
        return <LogAktivitasPage />;
      default:
        return <DashboardPage />;
    }
  };

  return (
    <Layout current={currentPage} onNavigate={setCurrentPage}>
      {renderPage()}
    </Layout>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
