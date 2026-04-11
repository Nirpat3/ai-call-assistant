import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { useLocation } from "wouter";

interface StatsCardsProps {
  dateFilter: string;
}

export default function StatsCards({ dateFilter }: StatsCardsProps) {
  const [, navigate] = useLocation();
  const { data: stats, isLoading } = useQuery({
    queryKey: ["/api/dashboard/stats", dateFilter],
    queryFn: async () => {
      const response = await fetch(`/api/dashboard/stats?dateFilter=${dateFilter}`);
      if (!response.ok) throw new Error('Failed to fetch stats');
      return response.json();
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} className="p-6">
            <CardContent className="p-0">
              <div className="animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
                <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
                <div className="h-3 bg-gray-200 rounded w-3/4"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const getPeriodLabel = (filter: string) => {
    switch (filter) {
      case 'today': return 'Calls Today';
      case 'yesterday': return 'Calls Yesterday';
      case 'week': return 'Calls This Week';
      case 'month': return 'Calls This Month';
      case 'quarter': return 'Calls This Quarter';
      case 'year': return 'Calls This Year';
      case 'last7days': return 'Calls Last 7 Days';
      case 'last30days': return 'Calls Last 30 Days';
      case 'last90days': return 'Calls Last 90 Days';
      default: return 'Total Calls';
    }
  };

  const statsData = [
    {
      title: getPeriodLabel(dateFilter),
      value: stats?.callsToday || 0,
      icon: "fas fa-phone",
      color: "blue",
      trend: "+12%",
      trendText: "vs previous period",
      onClick: () => navigate("/call-log")
    },
    {
      title: "AI Handled",
      value: stats?.aiHandled || 0,
      icon: "fas fa-robot",
      color: "green",
      subtitle: `${stats?.automationRate || 0}% automation rate`,
      onClick: () => navigate("/settings/call-management")
    },
    {
      title: "Voicemails",
      value: stats?.voicemails || 0,
      icon: "fas fa-voicemail",
      color: "orange",
      subtitle: `${stats?.transcribedVoicemails || 0} transcribed`,
      onClick: () => navigate("/voicemail")
    },
    {
      title: "Call Routes",
      value: stats?.routing?.totalRouted || 0,
      icon: "fas fa-route",
      color: "blue",
      subtitle: `${stats?.routing?.routingEfficiency || 0}% routed successfully`,
      onClick: () => navigate("/settings/call-routes")
    },
    {
      title: "Sales Routed",
      value: stats?.routing?.salesRouted || 0,
      icon: "fas fa-chart-line",
      color: "green",
      subtitle: "sales department",
      onClick: () => navigate("/call-log?routing=sales")
    },
    {
      title: "Support Routed",
      value: stats?.routing?.supportRouted || 0,
      icon: "fas fa-life-ring",
      color: "orange",
      subtitle: "support department",
      onClick: () => navigate("/call-log?routing=support")
    },
    {
      title: "Transfers",
      value: stats?.routing?.transferredCalls || 0,
      icon: "fas fa-exchange-alt",
      color: "purple",
      subtitle: "transferred to agents",
      onClick: () => navigate("/call-log?routing=transferred")
    },
    {
      title: "General Routing",
      value: stats?.routing?.generalRouted || 0,
      icon: "fas fa-phone-alt",
      color: "blue",
      subtitle: "general inquiries",
      onClick: () => navigate("/call-log?routing=general")
    },
    {
      title: "Voicemail Route",
      value: stats?.routing?.voicemailRouted || 0,
      icon: "fas fa-voicemail",
      color: "orange",
      subtitle: "went to voicemail",
      onClick: () => navigate("/call-log?routing=voicemail")
    },
    {
      title: "Response Time",
      value: stats?.responseTime || "0s",
      icon: "fas fa-stopwatch",
      color: "purple",
      trend: "-0.3s faster",
      isImprovement: true,
      onClick: () => navigate("/analytics/calls")
    }
  ];

  const colorClasses = {
    blue: "bg-blue-100 text-primary",
    green: "bg-green-100 text-accent",
    orange: "bg-orange-100 text-warning",
    purple: "bg-purple-100 text-purple-600"
  };

  // Group stats into categories
  const coreStats = statsData.slice(0, 4); // Core metrics
  const routingStats = statsData.slice(4, 10); // Routing department stats
  const performanceStats = statsData.slice(10); // Performance metrics

  return (
    <div className="space-y-8">
      {/* Core Metrics */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Core Metrics</h3>
        <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
          {coreStats.map((stat, index) => (
            <Card 
              key={index} 
              className="p-3 sm:p-4 lg:p-6 shadow-sm border border-gray-100 cursor-pointer hover:shadow-lg transition-shadow duration-200"
              onClick={stat.onClick}
            >
              <CardContent className="p-0">
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-xs sm:text-sm font-medium text-gray-600 truncate">{stat.title}</p>
                    <p className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900">{stat.value}</p>
                  </div>
                  <div className={`w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12 rounded-lg flex items-center justify-center shrink-0 ${colorClasses[stat.color as keyof typeof colorClasses]}`}>
                    <i className={`${stat.icon} text-sm sm:text-lg lg:text-xl`}></i>
                  </div>
                </div>
                {(stat.trend || stat.subtitle) && (
                  <div className="mt-4 flex items-center">
                    {stat.trend ? (
                      <span className={`text-sm font-medium ${stat.isImprovement ? 'text-green-600' : 'text-red-600'}`}>
                        {stat.trend}
                      </span>
                    ) : (
                      <span className="text-sm text-gray-500">{stat.subtitle}</span>
                    )}
                    {stat.trendText && (
                      <span className="text-sm text-gray-500 ml-2">{stat.trendText}</span>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Department Routing */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Department Routing</h3>
        <p className="text-sm text-gray-600 mb-4">Click on any department to view calls routed to that category</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-6 gap-3 sm:gap-4">
          {routingStats.map((stat, index) => (
            <Card 
              key={index} 
              className="p-3 sm:p-4 shadow-sm border border-gray-100 cursor-pointer hover:shadow-lg transition-shadow duration-200"
              onClick={stat.onClick}
            >
              <CardContent className="p-0">
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-xs sm:text-sm font-medium text-gray-600 truncate">{stat.title}</p>
                    <p className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900">{stat.value}</p>
                  </div>
                  <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center shrink-0 ${colorClasses[stat.color as keyof typeof colorClasses]}`}>
                    <i className={`${stat.icon} text-lg`}></i>
                  </div>
                </div>
                {stat.subtitle && (
                  <div className="mt-2">
                    <span className="text-xs text-gray-500">{stat.subtitle}</span>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Performance Stats */}
      {performanceStats.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Performance</h3>
          <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
            {performanceStats.map((stat, index) => (
              <Card 
                key={index} 
                className="p-3 sm:p-4 lg:p-6 shadow-sm border border-gray-100 cursor-pointer hover:shadow-lg transition-shadow duration-200"
                onClick={stat.onClick}
              >
                <CardContent className="p-0">
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-xs sm:text-sm font-medium text-gray-600 truncate">{stat.title}</p>
                      <p className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900">{stat.value}</p>
                    </div>
                    <div className={`w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12 rounded-lg flex items-center justify-center shrink-0 ${colorClasses[stat.color as keyof typeof colorClasses]}`}>
                      <i className={`${stat.icon} text-sm sm:text-lg lg:text-xl`}></i>
                    </div>
                  </div>
                  {(stat.trend || stat.subtitle) && (
                    <div className="mt-4 flex items-center">
                      {stat.trend ? (
                        <span className={`text-sm font-medium ${stat.isImprovement ? 'text-green-600' : 'text-red-600'}`}>
                          {stat.trend}
                        </span>
                      ) : (
                        <span className="text-sm text-gray-500">{stat.subtitle}</span>
                      )}
                      {stat.trendText && (
                        <span className="text-sm text-gray-500 ml-2">{stat.trendText}</span>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
