import { Routes, Route } from 'react-router-dom'
import { Container } from 'react-bootstrap'
import Navigation from './components/Navigation'
import Home from './pages/Home'
import Tasks from './pages/Tasks'
import TaskDetail from './pages/TaskDetail'
import CreateTask from './pages/CreateTask'
import Submissions from './pages/Submissions'
import SubmissionDetail from './pages/SubmissionDetail'
import DAO from './pages/DAO'
import DAOAbout from './pages/DAOAbout'
import ProposalDetail from './pages/ProposalDetail'
import TestUnifiedTaskManager from './pages/TestUnifiedTaskManager'
import Rewards from './pages/Rewards'
import TokenPage from './pages/TokenPage'
import TestTaskCreation from './pages/TestTaskCreation'
import { AuthProvider } from './contexts/AuthContext'
import { Web3Provider } from './contexts/Web3Context'

function App() {
  return (
    <AuthProvider>
      <Web3Provider>
        <Navigation />
        <Container className="py-4">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/tasks" element={<Tasks />} />
            <Route path="/tasks/:taskId" element={<TaskDetail />} />
            <Route path="/create-task" element={<CreateTask />} />
            <Route path="/submissions" element={<Submissions />} />
            <Route path="/submissions/:submissionId" element={<SubmissionDetail />} />
            <Route path="/dao" element={<DAO />} />
            <Route path="/dao/about" element={<DAOAbout />} />
            <Route path="/dao/proposals/:proposalId" element={<ProposalDetail />} />
            <Route path="/test-unified-task-manager" element={<TestUnifiedTaskManager />} />
            <Route path="/rewards" element={<Rewards />} />
            <Route path="/token" element={<TokenPage />} />
            <Route path="/test-task-creation" element={<TestTaskCreation />} />
          </Routes>
        </Container>
      </Web3Provider>
    </AuthProvider>
  )
}

export default App
