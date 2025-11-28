import { useState } from 'react';
import { Home } from './pages/Home';
import { Login } from './pages/Login';
import { Upload } from './pages/Upload';

function App() {
  const [page, setPage] = useState('home');
  const [loggedIn, setLoggedIn] = useState(!!sessionStorage.getItem('access'));

  const navigate = (newPage: string) => setPage(newPage);

  if (!loggedIn && page !== 'login' && page !== 'home') {
    return <Login onLoginSuccess={() => setLoggedIn(true)} onNavigate={navigate} />;
  }

  return (
    <>
      {page === 'home' && <Home onNavigate={navigate} />}
      {page === 'login' && <Login onLoginSuccess={() => setLoggedIn(true)} onNavigate={navigate} />}
      {page === 'upload' && <Upload onNavigate={navigate} />}
    </>
  );
}

export default App;
