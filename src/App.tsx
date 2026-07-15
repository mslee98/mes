import {
  createBrowserRouter,
  Navigate,
  Outlet,
  RouterProvider,
  useLocation,
} from "react-router";
import { useEffect, useRef } from "react";

import AppLayout from "./layout/AppLayout";
import Home from "./pages/Home";
import { ScrollToTop } from "./components/common/ScrollToTop";
import AuthEntry from "./pages/AuthEntry";
import Order from "./pages/Order";
import OrderDetail from "./pages/OrderDetail";
import ProductionPlanDetail from "./pages/ProductionPlanDetail";
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
import Lenses from "./pages/Lenses";
import LensForm from "./pages/LensForm";
import LensDetail from "./pages/LensDetail";
import Partners from "./pages/Partners";
import PartnerForm from "./pages/PartnerForm";
import PartnerDetail from "./pages/PartnerDetail";
import Rma from "./pages/Rma";
import RmaRegisterForm from "./pages/RmaRegisterForm";
import UnitDetail from "./pages/UnitDetail";
import ApiFeedbackProvider from "./context/ApiFeedbackContext";
import { useAuth } from "./hooks/useAuth";
import { useKeycloakAuth } from "./context/KeycloakProvider";
import NotFound from "./pages/NotFound";
import DeliveryUnits from "./pages/DeliveryUnits";
import DeliveryPlans from "./pages/DeliveryPlans";
import DeliveryPlanDetail from "./pages/DeliveryPlanDetail";
import ProductionPlans from "./pages/ProductionPlans";
import ProductionUnits from "./pages/ProductionUnits";
import DeliveryDetail from "./pages/DeliveryDetail";
import UIPlayground from "./pages/UIPlayground";
import IddcaTypeTable from "./pages/IddcaTypeTable";
import BugBoard from "./pages/BugBoard";
import DetectorSeriesForm from "./pages/DetectorSeriesForm";
import DetectorDetail from "./pages/DetectorDetail";
import Detectors from "./pages/Detectors";
import DetectorForm from "./pages/DetectorForm";

function RequireAuth() {
  const { isLoggedIn, isLoading } = useAuth();
  const { enabled, initialized, isAuthenticated, login } = useKeycloakAuth();
  const location = useLocation();
  const keycloakLoginStarted = useRef(false);
  const isAuthLoading = enabled ? !initialized : isLoading;
  const canAccess = enabled ? isAuthenticated : isLoggedIn;

  useEffect(() => {
    if (!enabled || !initialized || isAuthenticated) return;
    if (keycloakLoginStarted.current) return;
    keycloakLoginStarted.current = true;
    void login();
  }, [enabled, initialized, isAuthenticated, login]);

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
    if (enabled) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-white dark:bg-gray-900">
          <div className="text-center">
            <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-gray-200 border-t-brand-500 dark:border-gray-700 dark:border-t-brand-400" />
            <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">
              Keycloak 로그인으로 이동하는 중...
            </p>
          </div>
        </div>
      );
    }
    return <Navigate to="/signin" replace state={{ from: location }} />;
  }

  return <Outlet />;
}

function AppShell() {
  return (
    <ApiFeedbackProvider>
      <ScrollToTop />
      <Outlet />
    </ApiFeedbackProvider>
  );
}

const router = createBrowserRouter([
  {
    element: <AppShell />,
    children: [
      {
        element: <RequireAuth />,
        children: [
          {
            path: "/",
            element: <AppLayout />,
            children: [
              { index: true, element: <Home /> },
              { path: "dashboard", element: <Home /> },

              {
                path: "products/:productId/edit",
                element: <ProductForm />,
              },
              { path: "products/new", element: <ProductForm /> },
              { path: "products/:productId", element: <ProductDetail /> },
              { path: "products", element: <Products /> },

              {
                path: "detector-series/new",
                element: <DetectorSeriesForm />,
              },
              {
                path: "detector-series-form",
                element: <Navigate to="/detector-series/new" replace />,
              },
              {
                path: "detector-series/:seriesId/edit",
                element: <DetectorSeriesForm />,
              },
              {
                path: "detector-series",
                element: <Navigate to="/detectors" replace />,
              },

              { path: "detectors/new", element: <DetectorForm /> },
              {
                path: "detector-form",
                element: <Navigate to="/detectors/new" replace />,
              },
              {
                path: "detectors/:detectorId/edit",
                element: <DetectorForm />,
              },
              {
                path: "detectors/:detectorId",
                element: <DetectorDetail />,
              },
              { path: "detectors", element: <Detectors /> },
              { path: "iddca-type", element: <IddcaTypeTable /> },
              {
                path: "iddca-type-table",
                element: <Navigate to="/iddca-type" replace />,
              },

              { path: "lenses/:lensId/edit", element: <LensForm /> },
              { path: "lenses/new", element: <LensForm /> },
              { path: "lenses/:lensId", element: <LensDetail /> },
              { path: "lenses", element: <Lenses /> },
              { path: "partners", element: <Partners /> },
              { path: "partners/new", element: <PartnerForm /> },
              {
                path: "partners/:partnerId",
                element: <PartnerDetail />,
              },
              {
                path: "partners/:partnerId/edit",
                element: <PartnerForm />,
              },

              { path: "order", element: <Order /> },
              { path: "order/new", element: <OrderForm /> },
              { path: "order/:orderId", element: <OrderDetail /> },
              {
                path: "order/:orderId/plan/:planId",
                element: <ProductionPlanDetail />,
              },
              { path: "order/:orderId/edit", element: <OrderForm /> },

              { path: "production/plans", element: <ProductionPlans /> },
              { path: "production/units", element: <ProductionUnits /> },
              {
                path: "production/overview",
                element: <Navigate to="/production/plans" replace />,
              },
              {
                path: "delivery/preparation",
                element: <Navigate to="/production/units" replace />,
              },
              {
                path: "delivery/units",
                element: <DeliveryUnits perspective="delivery" />,
              },
              {
                path: "delivery",
                element: <Navigate to="/delivery/plans" replace />,
              },
              {
                path: "delivery/units/:unitId",
                element: <UnitDetail />,
              },
              { path: "delivery/plans", element: <DeliveryPlans /> },
              {
                path: "delivery/plans/:planId",
                element: <DeliveryPlanDetail />,
              },
              {
                path: "delivery/:deliveryId",
                element: <DeliveryDetail />,
              },
              { path: "bug-board", element: <BugBoard /> },

              { path: "rma/new", element: <RmaRegisterForm /> },
              { path: "rma", element: <Rma /> },

              { path: "organization", element: <Organization /> },
              { path: "role", element: <Role /> },
              { path: "permission", element: <Permission /> },
              { path: "common-code", element: <CommonCode /> },
              { path: "menu", element: <Menu /> },

              { path: "user", element: <User /> },
              { path: "user/:userId", element: <UserDetail /> },
              { path: "profile", element: <UserProfiles /> },
              { path: "ui", element: <UIPlayground /> },
            ],
          },
        ],
      },

      { path: "/signin", element: <AuthEntry /> },
      { path: "/signup", element: <Navigate to="/signin" replace /> },
      { path: "*", element: <NotFound /> },
    ],
  },
]);

function App() {
  return <RouterProvider router={router} />;
}

export default App;
