import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Layout } from './components/Layout';
import LoginPage from './pages/LoginPage';
import ConfigPage from './pages/ConfigPage';
import QuizPage from './pages/QuizPage';
import UploadPage from './pages/UploadPage';
import ResultsPage from './pages/ResultsPage';
import ManageContentPage from './pages/ManageContentPage';
import DashboardPage from './pages/DashboardPage';
import SharePage from './pages/SharePage';
import AdminDashboardPage from './pages/AdminDashboardPage';
import ProfilePage from './pages/ProfilePage';
import { AuthProvider } from './contexts/AuthContext';

function App() {
    return (
        <AuthProvider>
            <Router>
                <Layout>
                    <Routes>
                        <Route path="/login" element={<LoginPage />} />
                        <Route path="/" element={<DashboardPage />} />
                        <Route path="/setup" element={<ConfigPage />} />
                        <Route path="/upload" element={<UploadPage />} />
                        <Route path="/quiz" element={<QuizPage />} />
                        <Route path="/results" element={<ResultsPage />} />
                        <Route path="/manage" element={<ManageContentPage />} />
                        <Route path="/share/:shareId" element={<SharePage />} />
                        <Route path="/admin" element={<AdminDashboardPage />} />
                        <Route path="/profile" element={<ProfilePage />} />
                    </Routes>
                </Layout>
            </Router>
        </AuthProvider>
    );
}

export default App;
