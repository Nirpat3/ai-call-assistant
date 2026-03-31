import { Switch, Route, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import Dashboard from "@/pages/dashboard";
import CallSettings from "@/pages/call-settings";
import CallLog from "@/pages/call-log";
import KnowledgeBase from "@/pages/knowledge-base";
import VoicemailPage from "@/pages/voicemail";
import AISettings from "@/pages/ai-settings";
import AIAgents from "@/pages/ai-agents";
import AgentTraining from "@/pages/agent-training";
import AgentDemo from "@/pages/agent-demo";
import ContactProfile from "@/pages/contact-profile-new";
import ModernDashboard from "@/pages/dashboard-new";
import SitemapPage from "@/pages/sitemap";
import CallAnalytics from "@/pages/call-analytics";
import AIAnalytics from "@/pages/analytics/ai";
import RoutingAnalytics from "@/pages/analytics/routing";
import ContactsPage from "@/pages/contacts";
import IntegrationsPage from "@/pages/integrations";
import SystemSettingsPage from "@/pages/system-settings";
import CalendarPage from "@/pages/calendar";
import EmailPage from "@/pages/email";
import LoginPage from "@/pages/login";
import NotFound from "@/pages/not-found";
import NotificationsPage from "@/pages/notifications";
import ProfilePage from "@/pages/profile";
import TimezoneSettings from "@/pages/timezone-settings";
import CallManagement from "@/pages/call-management";
import AIManagement from "@/pages/ai-management";
import QuickSetupPage from "@/pages/quick-setup";
import LiveCallsPage from "@/pages/live-calls";
import ConversationAnalyticsPage from "@/pages/conversation-analytics";
import CallRoutingPage from "@/pages/call-routing";
import IntentRecognitionPage from "@/pages/intent-recognition";
import AlertRulesPage from "@/pages/alert-rules";
import EscalationPoliciesPage from "@/pages/escalation-policies";
import AIEngineerPage from "@/pages/ai-engineer";
import EngineeringTeamPage from "@/pages/engineering-team";
import AdminPortal from "@/pages/admin-portal";
import OrganizationPortal from "@/pages/organization-portal";
import UserDashboard from "@/pages/user-dashboard";
import ConversationLog from "@/pages/conversation-log";
import MobileSync from "@/pages/mobile-sync";
import ContactDuplicates from "@/pages/contact-duplicates";
import SMSPage from "@/pages/sms";
import OnboardingPage from "@/pages/onboarding";
import CallForwardingSetupPage from "@/pages/call-forwarding-setup";
import AIAssistantConfigPage from "@/pages/ai-assistant-config";
import SalesDashboard from "@/pages/sales-dashboard";
import SupportDashboard from "@/pages/support-dashboard";
import PersonalAssistantDashboard from "@/pages/personal-assistant-dashboard";
import PersonalAssistantApp from "@/pages/personal-assistant-app";
import CRMApp from "@/pages/crm-app";
import SupportApp from "@/pages/support-app";
import ContactsApp from "@/pages/contacts-app";
import CRMDashboard from "@/pages/crm-dashboard";
import SupportDepartmentDashboard from "@/pages/support-department-dashboard";
import MainDashboard from "@/pages/main-dashboard";
import WebhookManagement from "@/pages/webhook-management";
import SupportAutomation from "@/pages/support-automation";
import SupportChatbot from "@/components/SupportChatbot";
import AICommandEngineer from "@/pages/ai-command-engineer";
import TodoPage from "@/pages/todo";
import AIAssistant from "@/pages/ai-assistant";

function LoadingSpinner() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
        <p className="text-muted-foreground">Loading AI Call Assistant...</p>
      </div>
    </div>
  );
}

function ProtectedRoute({ component: Component }: { component: React.ComponentType }) {
  const { isAuthenticated, isLoading, user } = useAuth();

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (!isAuthenticated || !user) {
    return <Redirect to="/login" />;
  }

  return <Component />;
}

function Router() {
  return (
    <Switch>
      <Route path="/login" component={LoginPage} />
      
      {/* Protected Routes */}
      <Route path="/" component={() => <ProtectedRoute component={AIAssistant} />} />
      <Route path="/ai-assistant" component={() => <ProtectedRoute component={AIAssistant} />} />
      <Route path="/main-dashboard" component={() => <ProtectedRoute component={MainDashboard} />} />
      <Route path="/dashboard" component={() => <ProtectedRoute component={ModernDashboard} />} />
      <Route path="/dashboard-new" component={() => <ProtectedRoute component={ModernDashboard} />} />
      <Route path="/calls" component={() => <ProtectedRoute component={ModernDashboard} />} />
      <Route path="/call-log" component={() => <ProtectedRoute component={CallLog} />} />
      <Route path="/contact/:id" component={() => <ProtectedRoute component={ContactProfile} />} />
      <Route path="/conversation/:callId" component={() => <ProtectedRoute component={ConversationLog} />} />
      <Route path="/voicemail" component={() => <ProtectedRoute component={VoicemailPage} />} />
      <Route path="/knowledge-base" component={() => <ProtectedRoute component={KnowledgeBase} />} />
      <Route path="/contacts" component={() => <ProtectedRoute component={ContactsApp} />} />
      <Route path="/duplicate-detection" component={() => <ProtectedRoute component={ContactsApp} />} />
      <Route path="/mobile-sync" component={() => <ProtectedRoute component={ContactsApp} />} />
      <Route path="/contact-settings" component={() => <ProtectedRoute component={ContactsApp} />} />
      <Route path="/sms" component={() => <ProtectedRoute component={SMSPage} />} />
      <Route path="/calendar" component={() => <ProtectedRoute component={CalendarPage} />} />
      <Route path="/email" component={() => <ProtectedRoute component={EmailPage} />} />
      <Route path="/todo" component={() => <ProtectedRoute component={TodoPage} />} />
      <Route path="/sales-dashboard" component={() => <ProtectedRoute component={SalesDashboard} />} />
      <Route path="/support-dashboard" component={() => <ProtectedRoute component={SupportDashboard} />} />
      <Route path="/personal-assistant" component={() => <ProtectedRoute component={PersonalAssistantApp} />} />
      <Route path="/crm-dashboard" component={() => <ProtectedRoute component={CRMApp} />} />
      <Route path="/support-department" component={() => <ProtectedRoute component={SupportApp} />} />
      <Route path="/analytics/calls" component={() => <ProtectedRoute component={CallAnalytics} />} />
      <Route path="/analytics/ai" component={() => <ProtectedRoute component={AIAnalytics} />} />
      <Route path="/analytics/routing" component={() => <ProtectedRoute component={RoutingAnalytics} />} />
      <Route path="/settings/call-settings" component={() => <ProtectedRoute component={CallSettings} />} />
      <Route path="/settings/ai-config" component={() => <ProtectedRoute component={CallManagement} />} />
      <Route path="/settings/call-management">
        {() => {
          window.location.href = '/ai-management';
          return null;
        }}
      </Route>
      <Route path="/settings/call-flow" component={() => <ProtectedRoute component={CallManagement} />} />
      <Route path="/ai-receptionist" component={() => <ProtectedRoute component={CallManagement} />} />
      <Route path="/sitemap" component={() => <ProtectedRoute component={SitemapPage} />} />
      <Route path="/ai-management" component={() => <ProtectedRoute component={AIManagement} />} />
      <Route path="/onboarding" component={() => <ProtectedRoute component={OnboardingPage} />} />
      <Route path="/quick-setup" component={() => <ProtectedRoute component={QuickSetupPage} />} />
      <Route path="/live-calls" component={() => <ProtectedRoute component={LiveCallsPage} />} />
      <Route path="/conversation-analytics" component={() => <ProtectedRoute component={ConversationAnalyticsPage} />} />
      <Route path="/call-routing" component={() => <ProtectedRoute component={CallRoutingPage} />} />
      <Route path="/intent-recognition" component={() => <ProtectedRoute component={IntentRecognitionPage} />} />
      
      {/* Additional page routes */}
      <Route path="/alert-rules" component={() => <ProtectedRoute component={AlertRulesPage} />} />
      <Route path="/escalation-policies" component={() => <ProtectedRoute component={EscalationPoliciesPage} />} />
      <Route path="/ai-qa-engineer" component={() => <ProtectedRoute component={AIEngineerPage} />} />
      <Route path="/ai-engineer" component={() => <ProtectedRoute component={AIEngineerPage} />} />
      <Route path="/ai-command-engineer" component={() => <ProtectedRoute component={AICommandEngineer} />} />
      <Route path="/engineering-team" component={() => <ProtectedRoute component={EngineeringTeamPage} />} />
      <Route path="/team-directory" component={() => <ProtectedRoute component={ContactsPage} />} />
      <Route path="/call-analytics" component={() => <ProtectedRoute component={CallAnalytics} />} />
      <Route path="/ai-performance" component={() => <ProtectedRoute component={AIAnalytics} />} />
      <Route path="/business-intelligence" component={() => <ProtectedRoute component={CallAnalytics} />} />
      <Route path="/integration-settings" component={() => <ProtectedRoute component={IntegrationsPage} />} />
      <Route path="/security-settings" component={() => <ProtectedRoute component={SystemSettingsPage} />} />
      <Route path="/user-guide" component={() => <ProtectedRoute component={SitemapPage} />} />
      <Route path="/api-docs" component={() => <ProtectedRoute component={SitemapPage} />} />
      
      <Route path="/ai-agents" component={() => <ProtectedRoute component={AIAgents} />} />
      
      {/* Portal Routes */}
      <Route path="/admin" component={() => <ProtectedRoute component={AdminPortal} />} />
      <Route path="/organization" component={() => <ProtectedRoute component={OrganizationPortal} />} />
      <Route path="/user-dashboard" component={() => <ProtectedRoute component={UserDashboard} />} />
      <Route path="/agent-training" component={() => <ProtectedRoute component={AgentTraining} />} />
      <Route path="/agent-demo" component={() => <ProtectedRoute component={AgentDemo} />} />
      <Route path="/integrations" component={() => <ProtectedRoute component={IntegrationsPage} />} />
      <Route path="/system-settings" component={() => <ProtectedRoute component={SystemSettingsPage} />} />
      <Route path="/timezone-settings" component={() => <ProtectedRoute component={TimezoneSettings} />} />
      <Route path="/notifications" component={() => <ProtectedRoute component={NotificationsPage} />} />
      <Route path="/profile" component={() => <ProtectedRoute component={ProfilePage} />} />
      <Route path="/testing" component={() => <ProtectedRoute component={Dashboard} />} />
      <Route path="/support" component={() => <ProtectedRoute component={Dashboard} />} />
      <Route path="/mobile-sync" component={() => <ProtectedRoute component={MobileSync} />} />
      <Route path="/contact-duplicates" component={() => <ProtectedRoute component={ContactDuplicates} />} />
      <Route path="/onboarding" component={() => <ProtectedRoute component={OnboardingPage} />} />
      <Route path="/call-forwarding-setup" component={() => <ProtectedRoute component={CallForwardingSetupPage} />} />
      <Route path="/ai-assistant-config" component={() => <ProtectedRoute component={AIAssistantConfigPage} />} />
      <Route path="/webhook-management" component={() => <ProtectedRoute component={WebhookManagement} />} />
      <Route path="/support-automation" component={() => <ProtectedRoute component={SupportAutomation} />} />
      
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
