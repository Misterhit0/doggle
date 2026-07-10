import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import ProfilePage from "./pages/ProfilePage";
import DogsPage from "./pages/DogsPage";
import DiscoveryPage from "./pages/DiscoveryPage";
import MatchesPage from "./pages/MatchesPage";
import ConversationPage from "./pages/ConversationPage";
import FavoritesPage from "./pages/FavoritesPage";
import SwipeHistoryPage from "./pages/SwipeHistoryPage";
import EventsPage from "./pages/EventsPage";
import LostDogsPage from "./pages/LostDogsPage";
import WalkingMapPage from "./pages/WalkingMapPage";
import ReviewPage from "./pages/ReviewPage";
import PublicProfilePage from "./pages/PublicProfilePage";
import VerificationPage from "./pages/VerificationPage";
import LoginPage from "./pages/LoginPage";
import SignupPage from "./pages/SignupPage";
import AppNav from "./components/AppNav";
import FeaturesPage from "./pages/FeaturesPage";
import PricingPage from "./pages/PricingPage";
import SecurityPage from "./pages/SecurityPage";
import AboutPage from "./pages/AboutPage";
import BlogPage from "./pages/BlogPage";
import ContactPage from "./pages/ContactPage";
import PrivacyPage from "./pages/PrivacyPage";
import TermsPage from "./pages/TermsPage";
import CookiesPage from "./pages/CookiesPage";
import AdminDashboardPage from "./pages/AdminDashboardPage";

function Router() {
  // make sure to consider if you need authentication for certain routes
  return (
    <>
      <AppNav />
      <main className="pb-24 md:pb-0">
        <Switch>
          <Route path="/" component={Home} />
          <Route path="/profile" component={ProfilePage} />
          <Route path="/dogs" component={DogsPage} />
          <Route path="/discovery" component={DiscoveryPage} />
          <Route path="/matches" component={MatchesPage} />
          <Route path="/conversation/:matchId" component={ConversationPage} />
          <Route path="/favorites" component={FavoritesPage} />
          <Route path="/history" component={SwipeHistoryPage} />
          <Route path="/events" component={EventsPage} />
          <Route path="/lost-dogs" component={LostDogsPage} />
          <Route path="/walking-map" component={WalkingMapPage} />
          <Route path="/review/:userId" component={ReviewPage} />
          <Route path="/profile/:userId" component={PublicProfilePage} />
          <Route path="/verification" component={VerificationPage} />
          <Route path="/login" component={LoginPage} />
          <Route path="/signup" component={SignupPage} />
          <Route path="/features" component={FeaturesPage} />
          <Route path="/pricing" component={PricingPage} />
          <Route path="/security" component={SecurityPage} />
          <Route path="/about" component={AboutPage} />
          <Route path="/blog" component={BlogPage} />
          <Route path="/contact" component={ContactPage} />
          <Route path="/privacy" component={PrivacyPage} />
          <Route path="/terms" component={TermsPage} />
          <Route path="/cookies" component={CookiesPage} />
          <Route path="/admin" component={AdminDashboardPage} />
          <Route path="/404" component={NotFound} />
          {/* Final fallback route */}
          <Route component={NotFound} />
        </Switch>
      </main>
    </>
  );
}

// NOTE: About Theme
// - First choose a default theme according to your design style (dark or light bg), than change color palette in index.css
//   to keep consistent foreground/background color across components
// - If you want to make theme switchable, pass `switchable` ThemeProvider and use `useTheme` hook

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider
        defaultTheme="light"
        // switchable
      >
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
