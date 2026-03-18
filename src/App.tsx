import { BrowserRouter, Navigate, Outlet, Route, Routes, useLocation } from "react-router";

import AppLayout from "./layout/AppLayout";
import Home from "./pages/Home";
import { ScrollToTop } from "./components/common/ScrollToTop";

import SignIn from "./pages/AutpPages/SignIn";
import SignUp from "./pages/AutpPages/SIgnUp";
import Order from "./pages/Order";
import OrderDetail from "./pages/OrderDetail";
import OrderForm from "./pages/OrderForm";
import Organization from "./pages/Organization";
import Menu from "./pages/Menu";
import Permission from "./pages/Permission";
import Role from "./pages/Role";
import User from "./pages/User";
import UserDetail from "./pages/UserDetail";
import UserProfiles from "./pages/UserProfiles";
import CommonCode from "./pages/CommonCode";

import ItemCategories from "./pages/ItemCategories";
import ItemTypes from "./pages/ItemTypes";
import Items from "./pages/Items";
import ItemDetail from "./pages/ItemDetail";
import ItemForm from "./pages/ItemForm";
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


              {/* 품목 관리 */}
              <Route path="item-categories" element={<ItemCategories />} />
              <Route path="item-types" element={<ItemTypes />} />
              <Route path="items" element={<Items />} />
              <Route path="items/new" element={<ItemForm />} />
              <Route path="items/:itemId" element={<ItemDetail />} />
              <Route path="items/:itemId/edit" element={<ItemForm />} />

              {/* 발주 관리 */}
              <Route path="order" element={<Order />} />
              <Route path="order/new" element={<OrderForm />} />
              <Route path="order/:orderId" element={<OrderDetail />} />
              <Route path="order/:orderId/edit" element={<OrderForm />} />

              {/* 시스템 관리 */}
              <Route path="organization" element={<Organization />} />
              <Route path="role" element={<Role />} />
              <Route path="permission" element={<Permission />} />
              <Route path="common-code" element={<CommonCode />} />
              <Route path="menu" element={<Menu />} />

              {/* 사용자 관리 */}
              <Route path="user" element={<User />} />
              <Route path="user/:userId" element={<UserDetail />} />
              <Route path="profile" element={<UserProfiles />} />
            </Route>
          </Route>

          <Route element={<RedirectIfAuthenticated />}>
            {/* 로그인 관리 */}
            <Route path="/signin" element={<SignIn />} />
            <Route path="/signup" element={<SignUp />} />
          </Route>

          {/* 404 오류 페이지 */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </ApiFeedbackProvider>
    </BrowserRouter>
  );
}

export default App;
