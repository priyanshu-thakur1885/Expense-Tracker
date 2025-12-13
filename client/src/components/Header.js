import React from "react";
import { useAuth } from "../context/AuthContext";
import { Search, Menu } from "lucide-react";
import NotificationCenter from "./NotificationCenter";

const Header = ({
  toggleSidebar,
  searchTerm,
  setSearchTerm,
  isSidebarOpen,
}) => {
  const { user } = useAuth();

  return (
    <header className="shadow-sm border-b border-gray-200 dark:border-gray-700">
      <div
        className={`px-6 py-4 flex items-center ${
          isSidebarOpen ? "gap-4" : "relative"
        } min-h-[56px]`}
      >
        {/* Hamburger - always on left */}
        <button
          onClick={toggleSidebar}
          className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700"
        >
          <Menu size={22} />
        </button>

        {/* Search - centered when sidebar closed, normal when open */}
        <div
          className={`relative ${
            !isSidebarOpen
              ? "absolute left-1/2 transform -translate-x-1/2"
              : "flex-1 max-w-lg"
          }`}
        >
          <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search expenses..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-3 py-2 border rounded-lg"
          />
        </div>

        {/* Right side - notifications and profile */}
        <div
          className={`flex items-center space-x-3 ${
            !isSidebarOpen ? "absolute right-6" : ""
          }`}
        >
          <NotificationCenter />
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
