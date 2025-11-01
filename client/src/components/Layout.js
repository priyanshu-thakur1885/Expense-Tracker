import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import { useAuth } from '../context/AuthContext';

const Layout = () => {
  const { user } = useAuth();
  const hasCustomWallpaper = user?.wallpaper && user.wallpaper.trim() !== '';

  return (
    <div 
      className="min-h-screen transition-all duration-300"
      style={{
        backgroundImage: hasCustomWallpaper ? `url(${user.wallpaper})` : undefined,
        backgroundColor: !hasCustomWallpaper ? undefined : 'transparent',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        backgroundAttachment: 'fixed'
      }}
    >
      {/* Overlay for better readability */}
      {hasCustomWallpaper && (
        <div 
          className="fixed inset-0 bg-black/20 dark:bg-black/40 backdrop-blur-[0.5px] pointer-events-none z-0"
          style={{ imageRendering: 'high-quality' }}
        />
      )}
      
      <div className={`relative ${!hasCustomWallpaper ? 'bg-gray-50 dark:bg-gray-900' : ''}`}>
        <div className="flex relative z-10">
          {/* Sidebar with backdrop blur when wallpaper is active */}
          <div className={`${hasCustomWallpaper ? 'bg-white/95 dark:bg-gray-800/95 backdrop-blur-md' : 'bg-white dark:bg-gray-800'}`}>
            <Sidebar />
          </div>
          
          {/* Main content */}
          <div className="flex-1 flex flex-col min-h-screen">
            {/* Header with backdrop blur when wallpaper is active */}
            <div className={hasCustomWallpaper ? 'bg-white/95 dark:bg-gray-800/95 backdrop-blur-md' : 'bg-white dark:bg-gray-800'}>
              <Header />
            </div>
            {/* Main content area */}
            <main className="flex-1 p-6">
              <Outlet />
            </main>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Layout;
