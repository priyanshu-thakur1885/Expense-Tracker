import React from "react";
import { Link } from "react-router-dom";
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
      <div className="px-6 py-4 flex items-center gap-4 min-h-[56px]">
        {/* Hamburger - positioned fixed over sidebar when open */}
        <div className="flex items-center gap-3">
          <button
            onClick={toggleSidebar}
            className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <Menu size={22} />
          </button>

          <span className="text-lg font-bold whitespace-nowrap">
            Expense Tracker
          </span>
        </div>

        {/* Search - centered when sidebar closed, normal when open */}
        <div className={"relative flex-1 max-w-2xl"}>
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
            <Link to="/profile">
              <img
                className="h-12 w-12 rounded-full cursor-pointer"
                src={user.photo}
                alt=""
              />
            </Link>
          ) : (
            <Link to="/profile">
              <div className="h-12 w-12 rounded-full bg-primary-500 flex items-center justify-center text-white cursor-pointer">
                {user?.name?.charAt(0)?.toUpperCase()}
              </div>
            </Link>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
