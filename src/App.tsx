import { BrowserRouter, Navigate, Outlet, Route, Routes, useLocation } from "react-router";

import AppLayout from "./layout/AppLayout";
import Home from "./pages/Home";
import { ScrollToTop } from "./components/common/ScrollToTop";

import SignIn from "./pages/AutpPages/SignIn";
import SignUp from "./pages/AutpPages/SIgnUp";
import Order from "./pages/Order";
import Organization from "./pages/Organization";
import Menu from "./pages/Menu";
import Permission from "./pages/Permission";
import Role from "./pages/Role";
import User from "./pages/User";
import UserDetail from "./pages/UserDetail";
import ApiFeedbackProvider from "./context/ApiFeedbackContext";
import { useAuth } from "./context/AuthContext";
import NotFound from "./pages/NotFound";

function RequireAuth() {
  const { isLoggedIn, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white dark:bg-gray-900">
        <div className="text-center">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-gray-200 border-t-brand-500 dark:border-gray-700 dark:border-t-brand-400" />
          <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">
            인증 정보를 불러오는 중...
          </p>
        </div>
      </div>
    );
  }

  if (!isLoggedIn) {
    return <Navigate to="/signin" replace state={{ from: location }} />;
  }

  return <Outlet />;
}

function RedirectIfAuthenticated() {
  const { isLoggedIn, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white dark:bg-gray-900">
        <div className="text-center">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-gray-200 border-t-brand-500 dark:border-gray-700 dark:border-t-brand-400" />
          <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">
            인증 정보를 확인하는 중...
          </p>
        </div>
      </div>
    );
  }

  if (isLoggedIn) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}

function App() {
  return (
    <BrowserRouter>
      <ApiFeedbackProvider>
        <ScrollToTop />
        <Routes>
          <Route element={<RequireAuth />}>
            <Route path="/" element={<AppLayout />}>
              <Route index element={<Home />} />
              <Route path="menu" element={<Menu />} />
              <Route path="order" element={<Order />} />
              <Route path="organization" element={<Organization />} />
              <Route path="role" element={<Role />} />
              <Route path="permission" element={<Permission />} />
              <Route path="user" element={<User />} />
              <Route path="user/:userId" element={<UserDetail />} />
              {/* <Route path="signup" element={<SignUp />} /> */}
            </Route>
          </Route>

          <Route element={<RedirectIfAuthenticated />}>
            <Route path="/signin" element={<SignIn />} />
            <Route path="/signup" element={<SignUp />} />
          </Route>

          <Route path="*" element={<NotFound />} />
        </Routes>
      </ApiFeedbackProvider>
    </BrowserRouter>
  );
}

export default App;
