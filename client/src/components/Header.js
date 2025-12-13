import React from 'react';
import { useAuth } from '../context/AuthContext';
import { Search, Menu } from 'lucide-react';
import NotificationCenter from './NotificationCenter';

const Header = ({ toggleSidebar, searchTerm, setSearchTerm }) => {
  const { user } = useAuth();

  return (
    <header className="shadow-sm border-b border-gray-200 dark:border-gray-700">
      <div className="px-6 py-4 flex items-center gap-4">

        {/* ☰ Hamburger */}
        <button
          onClick={toggleSidebar}
          className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700"
        >
          <Menu size={22} />
        </button>

        {/* Search */}
        <div className="flex-1 max-w-lg relative">
          <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search expenses..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-3 py-2 border rounded-lg"
          />
        </div>

        {/* Right */}
        <NotificationCenter />

        <div className="flex items-center space-x-3">
          {user?.photo ? (
            <img className="h-8 w-8 rounded-full" src={user.photo} alt="" />
          ) : (
            <div className="h-8 w-8 rounded-full bg-primary-500 flex items-center justify-center text-white">
              {user?.name?.charAt(0)?.toUpperCase()}
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
