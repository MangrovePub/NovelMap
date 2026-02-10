import { Routes, Route, Navigate, useLocation } from "react-router";
import { AnimatePresence } from "framer-motion";
import { Sidebar } from "./components/layout/Sidebar.tsx";
import { TopBar } from "./components/layout/TopBar.tsx";
import { AnimatedPage } from "./components/shared/AnimatedPage.tsx";
import { ErrorBoundary } from "./components/shared/ErrorBoundary.tsx";
import { CommandPalette } from "./components/shared/CommandPalette.tsx";
import { BookshelfView } from "./components/bookshelf/BookshelfView.tsx";
import { GraphView } from "./components/graph/GraphView.tsx";
import { FieldGuideView } from "./components/fieldguide/FieldGuideView.tsx";
import { TimelineView } from "./components/timeline/TimelineView.tsx";
import { MindMapView } from "./components/mindmap/MindMapView.tsx";
import { PlotDiagramView } from "./components/plot/PlotDiagramView.tsx";
import { ManuscriptView } from "./components/manuscript/ManuscriptView.tsx";
import { EntityDashboard } from "./components/entities/EntityDashboard.tsx";
import { CrossBookView } from "./components/crossbook/CrossBookView.tsx";
import { InsightsView } from "./components/insights/InsightsView.tsx";
import { PluginsView } from "./components/plugins/PluginsView.tsx";
import { SnapshotView } from "./components/snapshots/SnapshotView.tsx";

function page(element: React.ReactNode) {
  return <AnimatedPage>{element}</AnimatedPage>;
}

export function App() {
  const location = useLocation();

  return (
    <div className="flex h-full">
      <Sidebar />
      <CommandPalette />
      <div className="flex flex-1 flex-col min-w-0">
        <TopBar />
        <main className="flex-1 overflow-auto p-6">
          <ErrorBoundary>
            <AnimatePresence mode="wait">
              <Routes location={location} key={location.pathname}>
                <Route path="/" element={<Navigate to="/bookshelf" replace />} />
                <Route path="/bookshelf" element={page(<BookshelfView />)} />
                <Route path="/entities" element={page(<EntityDashboard />)} />
                <Route path="/crossbook" element={page(<CrossBookView />)} />
                <Route path="/insights" element={page(<InsightsView />)} />
                <Route path="/graph" element={page(<GraphView />)} />
                <Route path="/fieldguide" element={page(<FieldGuideView />)} />
                <Route path="/timeline" element={page(<TimelineView />)} />
                <Route path="/mindmap" element={page(<MindMapView />)} />
                <Route path="/plot" element={page(<PlotDiagramView />)} />
                <Route path="/plugins" element={page(<PluginsView />)} />
                <Route path="/snapshots" element={page(<SnapshotView />)} />
                <Route path="/manuscript/:id" element={page(<ManuscriptView />)} />
              </Routes>
            </AnimatePresence>
          </ErrorBoundary>
        </main>
      </div>
    </div>
  );
}
