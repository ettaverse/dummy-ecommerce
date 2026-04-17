"use client";

import Link from "next/link";
import { useCart } from "@/context/CartContext";
import { useAuth } from "@/context/AuthContext";

export function Navbar() {
  const { cartCount } = useCart();
  const { user, isAuthenticated, isLoading, logout } = useAuth();

  return (
    <nav data-testid="navbar" className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <Link href="/" className="text-xl font-bold text-gray-900">
            ShopDemo
          </Link>

          <div className="flex items-center gap-6">
            <Link
              href="/"
              className="text-gray-600 hover:text-gray-900 font-medium"
            >
              Products
            </Link>
            <Link
              href="/cart"
              data-testid="cart-link"
              className="relative text-gray-600 hover:text-gray-900 font-medium"
            >
              Cart
              {cartCount > 0 && (
                <span
                  data-testid="cart-count"
                  className="absolute -top-2 -right-4 bg-blue-600 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center"
                >
                  {cartCount}
                </span>
              )}
            </Link>

            {isLoading ? (
              <span
                data-testid="auth-loading"
                className="text-gray-400 text-sm"
              >
                ...
              </span>
            ) : isAuthenticated && user ? (
              <div className="flex items-center gap-4">
                <span
                  data-testid="user-greeting"
                  className="text-gray-700 font-medium"
                >
                  Hi, {user.name}
                </span>
                <button
                  type="button"
                  data-testid="logout-button"
                  onClick={logout}
                  className="text-gray-600 hover:text-gray-900 font-medium"
                >
                  Log Out
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-4">
                <Link
                  href="/login"
                  data-testid="nav-login-link"
                  className="text-gray-600 hover:text-gray-900 font-medium"
                >
                  Log In
                </Link>
                <Link
                  href="/signup"
                  data-testid="nav-signup-link"
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors"
                >
                  Sign Up
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
