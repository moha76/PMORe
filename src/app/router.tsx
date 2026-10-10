import { LandingPage } from "../premium/LandingPage";
import { lazy, Suspense } from "react";

import { createBrowserRouter, useLocation } from "react-router-dom";

import { AppShell } from "../components/AppShell";

import { LoginPage } from "../pages/LoginPage";

const LegacyStyles = lazy(() => import("../premium/LegacyStyles"));

const OpportunityWorkspacePage = lazy(() =>
  import("../pages/OpportunityWorkspacePage").then((module) => ({
    default: module.OpportunityWorkspacePage,
  })),
);

const NewCockpitPage = lazy(() =>
  import("../pages/NewCockpitPage").then((module) => ({
    default: module.NewCockpitPage,
  })),
);

const DiscoverPage = lazy(() =>
  import("../v5/pages/DiscoverPage").then((module) => ({
    default: module.DiscoverPage,
  })),
);

const PreparePage = lazy(() =>
  import("../v5/pages/PreparePage").then((module) => ({
    default: module.PreparePage,
  })),
);

const SubmitPage = lazy(() =>
  import("../v5/pages/SubmitPage").then((module) => ({
    default: module.SubmitPage,
  })),
);

const StudyPage = lazy(() =>
  import("../v5/pages/StudyPage").then((module) => ({
    default: module.StudyPage,
  })),
);

const TodayPage = lazy(() =>
  import("../pages/TodayPage").then((module) => ({
    default: module.TodayPage,
  })),
);

const OpportunitiesPage = lazy(() =>
  import("../pages/OpportunitiesPage").then((module) => ({
    default: module.OpportunitiesPage,
  })),
);

const OpportunityDetailPage = lazy(() =>
  import("../pages/OpportunityDetailPage").then((module) => ({
    default: module.OpportunityDetailPage,
  })),
);

const MyDossiersPremiumPage = lazy(() =>
  import("../v5/pages/MyDossiersPremiumPage").then((module) => ({
    default: module.MyDossiersPremiumPage,
  })),
);

const DossiersPage = lazy(() =>
  import("../pages/DossiersPage").then((module) => ({
    default: module.DossiersPage,
  })),
);

const DossierDetailPage = lazy(() =>
  import("../pages/DossierDetailPage").then((module) => ({
    default: module.DossierDetailPage,
  })),
);

const PilotagePage = lazy(() =>
  import("../pages/PilotagePage").then((module) => ({
    default: module.PilotagePage,
  })),
);

const IntelligencePage = lazy(() =>
  import("../pages/IntelligencePage").then((module) => ({
    default: module.IntelligencePage,
  })),
);

const CompanyPage = lazy(() =>
  import("../pages/CompanyPage").then((module) => ({
    default: module.CompanyPage,
  })),
);

function PageLoader({ children }: { children: React.ReactNode }) {
  const { pathname } = useLocation();
  const legacy =
    !pathname.startsWith("/v5/") &&
    !["/company", "/intelligence"].includes(pathname);
  return (
    <Suspense fallback={<div className="mor-page-loading">Chargement…</div>}>
      {legacy && <LegacyStyles />}
      {children}
    </Suspense>
  );
}

export const router = createBrowserRouter(
  [
    { path: "/", element: <LandingPage /> },
    {
      path: "/login",
      element: <LoginPage />,
    },

    {
      element: <AppShell />,
      children: [
        {
          path: "*",
          element: (
            <main className="premium-empty">
              <h1>Cette page n’existe pas.</h1>
              <a href="/mor-v4/">Revenir à l’accueil MOR</a>
            </main>
          ),
        },
        {
          path: "/workspace/:refConsultation/:orgAcronyme",
          element: (
            <PageLoader>
              <OpportunityWorkspacePage />
            </PageLoader>
          ),
        },

        {
          path: "/next",
          element: (
            <PageLoader>
              <NewCockpitPage />
            </PageLoader>
          ),
        },

        {
          path: "/v5/discover",
          element: (
            <PageLoader>
              <DiscoverPage />
            </PageLoader>
          ),
        },

        {
          path: "/v5/submit/:refConsultation/:orgAcronyme/:lotNumber",
          element: (
            <PageLoader>
              <SubmitPage />
            </PageLoader>
          ),
        },

        {
          path: "/v5/prepare/:refConsultation/:orgAcronyme/:lotNumber",
          element: (
            <PageLoader>
              <PreparePage />
            </PageLoader>
          ),
        },

        {
          path: "/v5/study/:refConsultation/:orgAcronyme",
          element: (
            <PageLoader>
              <StudyPage />
            </PageLoader>
          ),
        },

        {
          path: "/today",
          element: (
            <PageLoader>
              <TodayPage />
            </PageLoader>
          ),
        },

        {
          path: "/opportunities",
          element: (
            <PageLoader>
              <OpportunitiesPage />
            </PageLoader>
          ),
        },

        {
          path: "/opportunities/:refConsultation/:orgAcronyme",
          element: (
            <PageLoader>
              <OpportunityDetailPage />
            </PageLoader>
          ),
        },

        {
          path: "/v5/mes-dossiers",
          element: (
            <PageLoader>
              <MyDossiersPremiumPage />
            </PageLoader>
          ),
        },

        {
          path: "/dossiers",
          element: (
            <PageLoader>
              <DossiersPage />
            </PageLoader>
          ),
        },

        {
          path: "/dossiers/:refConsultation/:orgAcronyme",
          element: (
            <PageLoader>
              <DossierDetailPage />
            </PageLoader>
          ),
        },

        {
          path: "/pilotage",
          element: (
            <PageLoader>
              <PilotagePage />
            </PageLoader>
          ),
        },

        {
          path: "/intelligence",
          element: (
            <PageLoader>
              <IntelligencePage />
            </PageLoader>
          ),
        },

        {
          path: "/company",
          element: (
            <PageLoader>
              <CompanyPage />
            </PageLoader>
          ),
        },
      ],
    },
  ],
  {
    basename: "/mor-v4",
  },
);
