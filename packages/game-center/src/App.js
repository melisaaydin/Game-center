
import React from 'react';
import { Route, Routes } from 'react-router-dom';
import Login from './pages/Login/Login';
import SignUp from './pages/Signup/SignUp';
import Home from './pages/Home/Home';
import ForgotPassword from './pages/Login/ForgotPassword';
import './App.css'
import { ThemeContextProvider } from './context/ThemeContext';
import GameList from './components/GameList/GameList'
import ProfileSettings from './pages/Profile/ProfileSettings';
import { UserProvider } from './context/UserContext';
import LobbyDetail from './pages/LobbyDetail/LobbyDetail';
import GameDetail from './pages/GameDetails/GameDetail';
import "react-toastify/dist/ReactToastify.css";
const App = () => {

  return (
    <ThemeContextProvider>
      <UserProvider>
        <Routes>
          <Route path="/games" element={<GameList />} />
          <Route path="/games/:gameId" element={<GameDetail />} />
          <Route path="/" element={<Home />} />
          <Route path='/login' element={<Login />} />
          <Route path="/signup" element={<SignUp />} />
          <Route path="/forgotpassword" element={<ForgotPassword />} />
          <Route path="/users/user/:userId" element={<ProfileSettings />} />
          <Route path='/lobbies/:id' element={<LobbyDetail />} />
        </Routes>

      </UserProvider>
    </ThemeContextProvider>
  );
};

export default App;
