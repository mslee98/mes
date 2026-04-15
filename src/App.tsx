import { BrowserRouter, Navigate, Outlet, Route, Routes, useLocation } from "react-router";

import AppLayout from "./layout/AppLayout";
import Home from "./pages/Home";
import { ScrollToTop } from "./components/common/ScrollToTop";
import AuthEntry from "./pages/AuthEntry";
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

import Products from "./pages/Products";
import ProductForm from "./pages/ProductForm";
import ProductDetail from "./pages/ProductDetail";
import Rma from "./pages/Rma";
import ApiFeedbackProvider from "./context/ApiFeedbackContext";
import { useAuth } from "./hooks/useAuth";
import { useKeycloakAuth } from "./context/KeycloakProvider";
import NotFound from "./pages/NotFound";
import Delivery from "./pages/Delivery";
import DeliveryDetail from "./pages/DeliveryDetail";
import DashboardMaterial from "./pages/DashboardMaterial";
import DashboardExecutive from "./pages/DashboardExecutive";
import DashboardTeamLead from "./pages/DashboardTeamLead";

function RequireAuth() {
  const { isLoggedIn, isLoading } = useAuth();
  const { enabled, initialized, isAuthenticated } = useKeycloakAuth();
  const location = useLocation();
  const isAuthLoading = enabled ? !initialized : isLoading;
  const canAccess = enabled ? isAuthenticated : isLoggedIn;

  if (isAuthLoading) {
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

  if (!canAccess) {
    return <Navigate to="/signin" replace state={{ from: location }} />;
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
              <Route path="dashboard" element={<Home />} />
              {/* <Route path="dashboard/material" element={<DashboardMaterial />} />
              <Route path="dashboard/executive" element={<DashboardExecutive />} />
              <Route path="dashboard/team-lead" element={<DashboardTeamLead />} /> */}

              <Route
                path="products/:productId/edit"
                element={<ProductForm />}
              />
              <Route path="products/:productId" element={<ProductDetail />} />
              <Route path="products" element={<Products />} />

              <Route path="order" element={<Order />} />
              <Route path="order/new" element={<OrderForm />} />
              <Route path="order/:orderId" element={<OrderDetail />} />
              <Route path="order/:orderId/edit" element={<OrderForm />} />

              <Route path="delivery" element={<Delivery />} />
              <Route path="delivery/:deliveryId" element={<DeliveryDetail />} />

              <Route path="rma" element={<Rma />} />

              <Route path="organization" element={<Organization />} />
              <Route path="role" element={<Role />} />
              <Route path="permission" element={<Permission />} />
              <Route path="common-code" element={<CommonCode />} />
              <Route path="menu" element={<Menu />} />

              <Route path="user" element={<User />} />
              <Route path="user/:userId" element={<UserDetail />} />
              <Route path="profile" element={<UserProfiles />} />
            </Route>
          </Route>

          <Route path="/signin" element={<AuthEntry />} />
          <Route path="/signup" element={<Navigate to="/signin" replace />} />

          <Route path="*" element={<NotFound />} />
        </Routes>
      </ApiFeedbackProvider>
    </BrowserRouter>
  );
}

export default App;
