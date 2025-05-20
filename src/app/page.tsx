"use client";

import React, { useEffect } from 'react';
import useAuthStore from '@/store/authStore';
import Link from 'next/link'; // Keep Link for the login button if rendered here

export default function MainPage() {
  const { isLoggedIn, isLoading: isAuthLoading, initializeAuth } = useAuthStore();

  useEffect(() => {
    // Initialize auth state when component mounts
    // This ensures that if a user is already logged in (e.g., token in localStorage),
    // the correct UI (empty content or redirect via navbar) is shown.
    initializeAuth();
  }, [initializeAuth]);

  // The NavigationBar will handle showing the Login button if !isLoggedIn.
  // This page will just be the content area below the navbar.

  if (isAuthLoading) {
    return (
      <div className="container mx-auto p-4 pt-6 text-center text-text-secondary">
        <p>Loading...</p>
      </div>
    );
  }

  // If not logged in, the Navbar will show a login button.
  // The main page content area can be simple.
  if (!isLoggedIn && typeof window !== 'undefined') { // Check for window to avoid SSR issues with localStorage
    // The login button is now in the Navbar.
    // This section can show a generic welcome or prompt to login via navbar.
    return (
      <div className="container mx-auto p-4 md:p-6 text-center">
        <h1 className="text-2xl md:text-3xl font-bold text-text-primary my-8">
          Welcome to DLMM WebApp
        </h1>
        <p className="text-text-secondary">
          Please log in using the button in the navigation bar to access your portfolio and features.
        </p>
      </div>
    );
  }
  
  // If logged in, this is the empty content area for the main page.
  return (
    <div className="container mx-auto p-4 md:p-6">
      {/* This is the main page content area, currently empty as per requirements */}
      <div className="min-h-[calc(100vh-8rem)] flex items-center justify-center"> {/* Adjust min-h as needed */}
        <p className="text-text-secondary text-lg">
          Main page content will go here. Navigate using the bar above.
        </p>
      </div>
    </div>
  );
}
