import React, { useState } from 'react';
import { HashRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AiModal } from './components/AiModal';
import { Layout } from './components/Layout';
import { AuthProvider, useAuth } from './context/AuthContext';
import { FinanceProvider } from './context/FinanceContext';
import { ToastProvider } from './context/ToastContext';
import { AccountsPage } from './pages/AccountsPage';
import { AnalysisPage } from './pages/AnalysisPage';
import { DashboardPage } from './pages/DashboardPage';
import { LoginPage } from './pages/LoginPage';
import { NewTransactionPage } from './pages/NewTransactionPage';
import { OptimizationPage } from './pages/OptimizationPage';
import { PredictionPage } from './pages/PredictionPage';
import { ProfilePage } from './pages/ProfilePage';
import { RegisterPage } from './pages/RegisterPage';
import { SavingsPage } from './pages/SavingsPage';
import { TransactionDetailPage } from './pages/TransactionDetailPage';
import { TransactionsPage } from './pages/TransactionsPage';
import { AiAnalysisResult } from './types/finance';

const ProtectedShell: React.FC<{
  children: (props: {
    openAiModal: () => void;
    latestAiAnalysis: AiAnalysisResult | null;
  }) => React.ReactNode;
}> = ({ children }) => {
  const { user, loading } = useAuth();
  const [aiModalOpen, setAiModalOpen] = useState(false);
  const [latestAiAnalysis, setLatestAiAnalysis] = useState<AiAnalysisResult | null>(null);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-[#09090B] text-sm text-zinc-600 dark:text-zinc-400">
        Memuat aplikasi...
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <Layout onOpenAiModal={() => setAiModalOpen(true)}>
      {children({
        openAiModal: () => setAiModalOpen(true),
        latestAiAnalysis,
      })}
      <AiModal
        isOpen={aiModalOpen}
        onClose={() => setAiModalOpen(false)}
        onResultReady={(res) => setLatestAiAnalysis(res)}
      />
    </Layout>
  );
};

const PublicOnlyRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (user) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
};

export function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <FinanceProvider>
          <HashRouter>
            <Routes>
              <Route
                path="/login"
                element={
                  <PublicOnlyRoute>
                    <LoginPage />
                  </PublicOnlyRoute>
                }
              />
              <Route
                path="/register"
                element={
                  <PublicOnlyRoute>
                    <RegisterPage />
                  </PublicOnlyRoute>
                }
              />

              <Route
                path="/dashboard"
                element={
                  <ProtectedShell>
                    {({ openAiModal, latestAiAnalysis }) => (
                      <DashboardPage
                        onOpenAiModal={openAiModal}
                        latestAiAnalysis={latestAiAnalysis}
                      />
                    )}
                  </ProtectedShell>
                }
              />
              <Route
                path="/transactions"
                element={
                  <ProtectedShell>
                    {() => <TransactionsPage />}
                  </ProtectedShell>
                }
              />
              <Route
                path="/transactions/new"
                element={
                  <ProtectedShell>
                    {() => <NewTransactionPage />}
                  </ProtectedShell>
                }
              />
              <Route
                path="/transactions/:id"
                element={
                  <ProtectedShell>
                    {() => <TransactionDetailPage />}
                  </ProtectedShell>
                }
              />
              <Route
                path="/accounts"
                element={
                  <ProtectedShell>
                    {() => <AccountsPage />}
                  </ProtectedShell>
                }
              />
              <Route
                path="/savings"
                element={
                  <ProtectedShell>
                    {() => <SavingsPage />}
                  </ProtectedShell>
                }
              />
              <Route
                path="/analysis"
                element={
                  <ProtectedShell>
                    {({ openAiModal, latestAiAnalysis }) => (
                      <AnalysisPage
                        onOpenAiModal={openAiModal}
                        latestAiAnalysis={latestAiAnalysis}
                      />
                    )}
                  </ProtectedShell>
                }
              />
              <Route
                path="/optimization"
                element={
                  <ProtectedShell>
                    {() => <OptimizationPage />}
                  </ProtectedShell>
                }
              />
              <Route
                path="/prediction"
                element={
                  <ProtectedShell>
                    {() => <PredictionPage />}
                  </ProtectedShell>
                }
              />
              <Route
                path="/profile"
                element={
                  <ProtectedShell>
                    {({ openAiModal }) => <ProfilePage onOpenAiModal={openAiModal} />}
                  </ProtectedShell>
                }
              />

              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </HashRouter>
        </FinanceProvider>
      </AuthProvider>
    </ToastProvider>
  );
}

export default App;
