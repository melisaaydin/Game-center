import { Route, Routes, Outlet } from 'react-router-dom';
import Login from './pages/Login/Login';
import SignUp from './pages/Signup/SignUp';
import Home from './pages/Home/Home';
import ForgotPassword from './pages/Login/ForgotPassword';
import { LanguageProvider } from './context/LanguageContext';
import './App.css';
import { ThemeContextProvider } from './context/ThemeContext';
import GameList from './components/GameList/GameList';
import ProfileSettings from './pages/Profile/ProfileSettings';
import ProfileView from './pages/Profile/ProfileView';
import { UserProvider } from './context/UserContext';
import LobbyDetail from './pages/LobbyDetail/LobbyDetail';
import GameDetail from './pages/GameDetails/GameDetail';
import Friends from './pages/Friends/Friends';
import Sidebar from './components/SideBar/SideBar';

import { Bounce, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';


function Layout() {
  return (
    <div className="layout-container">
      <Sidebar />
      <main className="layout-content">
        <Outlet />
      </main>
    </div>
  );
}

const App = () => {
  return (
    <ThemeContextProvider>
      <LanguageProvider>
        <UserProvider>
          <Routes>
            <Route element={<Layout />}>
              <Route path="/" element={<Home />} />
              <Route path="/friends" element={<Friends />} />
              <Route path="/users/user/:userId" element={<ProfileView />} />
              <Route path="/profile/edit" element={<ProfileSettings />} />
              <Route path="/lobbies/:id" element={<LobbyDetail />} />
              <Route path="/games/:gameId" element={<GameDetail />} />
            </Route>
            <Route path="/games" element={<GameList />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<SignUp />} />
            <Route path="/forgotpassword" element={<ForgotPassword />} />
          </Routes>
          <ToastContainer
            position="bottom-left"
            autoClose={3000}
            hideProgressBar={false}
            newestOnTop={false}
            closeOnClick={false}
            rtl={false}
            pauseOnFocusLoss
            draggable
            pauseOnHover
            theme="colored"
            transition={Bounce}
          />
        </UserProvider>
      </LanguageProvider>
    </ThemeContextProvider>
  );
};

export default App;