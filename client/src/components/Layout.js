import React, { useState } from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";
import Header from "./Header";
import { useAuth } from "../context/AuthContext";

const Layout = () => {
  const { user } = useAuth();
  const hasCustomWallpaper = user?.wallpaper && user.wallpaper.trim() !== "";

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const toggleSidebar = () => {
    setIsSidebarOpen((prev) => !prev);
  };

  return (
    <div
      className="min-h-screen transition-all duration-300"
      style={{
        backgroundImage: hasCustomWallpaper
          ? `url(${user.wallpaper})`
          : undefined,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
        backgroundAttachment: "fixed",
      }}
    >
      {hasCustomWallpaper && (
        <div className="fixed inset-0 bg-black/10 dark:bg-black/20 backdrop-blur-[0.5px] pointer-events-none z-0" />
      )}

      <div className="relative z-10 flex">
        {/* Sidebar */}
        <Sidebar
          isOpen={isSidebarOpen}
          closeSidebar={() => setIsSidebarOpen(false)}
        />

        {/* Main Content */}
        <div
          className={`flex-1 flex flex-col min-h-screen ${
            isSidebarOpen ? "ml-64" : ""
          }`}
        >
          <Header toggleSidebar={toggleSidebar} isSidebarOpen={isSidebarOpen} />
          <main className="flex-1 p-6">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
};

export default Layout;
