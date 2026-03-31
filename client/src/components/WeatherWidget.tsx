import { useState, useEffect } from "react";
import { Cloud, Sun, CloudRain, CloudSnow, Wind, Thermometer, Droplets, Eye } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface WeatherData {
  location: string;
  temperature: number;
  condition: string;
  description: string;
  humidity: number;
  windSpeed: number;
  visibility: number;
  icon: string;
  isDemo?: boolean;
  apiKeyInvalid?: boolean;
}

interface WeatherWidgetProps {
  location?: string;
}

export function WeatherWidget({ location = "Atlanta, GA" }: WeatherWidgetProps) {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchWeatherData();
  }, [location]);

  const fetchWeatherData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(`/api/weather?location=${encodeURIComponent(location)}`);
      
      if (!response.ok) {
        throw new Error('Weather data unavailable');
      }
      
      const data = await response.json();
      setWeather(data);
    } catch (error) {
      console.error('Error fetching weather:', error);
      setError('Weather service temporarily unavailable');
    } finally {
      setLoading(false);
    }
  };

  const getWeatherIcon = (condition: string) => {
    const conditionLower = condition.toLowerCase();
    
    if (conditionLower.includes('rain') || conditionLower.includes('drizzle')) {
      return <CloudRain className="h-8 w-8 text-blue-500" />;
    } else if (conditionLower.includes('snow')) {
      return <CloudSnow className="h-8 w-8 text-blue-200" />;
    } else if (conditionLower.includes('cloud')) {
      return <Cloud className="h-8 w-8 text-gray-500" />;
    } else if (conditionLower.includes('clear') || conditionLower.includes('sunny')) {
      return <Sun className="h-8 w-8 text-yellow-500" />;
    } else {
      return <Cloud className="h-8 w-8 text-gray-500" />;
    }
  };

  const getTemperatureColor = (temp: number) => {
    if (temp >= 80) return "text-red-600";
    if (temp >= 60) return "text-orange-600";
    if (temp >= 40) return "text-blue-600";
    return "text-blue-800";
  };

  if (loading) {
    return (
      <Card className="h-full">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Weather
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || !weather) {
    return (
      <Card className="h-full">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center space-x-2">
            <Cloud className="h-5 w-5 text-gray-500" />
            <span>Weather</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center h-32 text-gray-500">
            <Cloud className="h-8 w-8 mb-2" />
            <p className="text-sm text-center mb-2">
              {error === 'Unable to load weather data' 
                ? "Weather data requires valid OpenWeather API key" 
                : error || "Weather unavailable"}
            </p>
            <div className="text-center">
              <p className="text-xs text-gray-400 mb-2">
                Configure API key in settings to view live weather
              </p>
              <button
                onClick={fetchWeatherData}
                className="text-xs text-blue-600 hover:text-blue-800"
              >
                Retry
              </button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-blue-900/20 dark:to-indigo-900/20 border-blue-200 dark:border-blue-800">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            {getWeatherIcon(weather.condition)}
            <span>Weather</span>
          </div>
          {weather.isDemo && (
            <Badge variant="secondary" className="text-xs">
              {weather.apiKeyInvalid ? "Demo - Invalid Key" : "Demo Data"}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Location */}
        <div className="text-center">
          <h3 className="font-medium text-gray-900 dark:text-gray-100">{weather.location}</h3>
          <Badge variant="secondary" className="mt-1">
            {weather.condition}
          </Badge>
        </div>

        {/* Temperature */}
        <div className="text-center">
          <div className={`text-3xl font-bold ${getTemperatureColor(weather.temperature)}`}>
            {weather.temperature}°F
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400 capitalize">
            {weather.description}
          </p>
        </div>

        {/* Weather Details */}
        <div className="grid grid-cols-3 gap-3 pt-2">
          <div className="text-center">
            <div className="flex items-center justify-center mb-1">
              <Droplets className="h-4 w-4 text-blue-500" />
            </div>
            <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
              {weather.humidity}%
            </div>
            <div className="text-xs text-gray-600 dark:text-gray-400">Humidity</div>
          </div>
          
          <div className="text-center">
            <div className="flex items-center justify-center mb-1">
              <Wind className="h-4 w-4 text-gray-500" />
            </div>
            <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
              {weather.windSpeed} mph
            </div>
            <div className="text-xs text-gray-600 dark:text-gray-400">Wind</div>
          </div>
          
          <div className="text-center">
            <div className="flex items-center justify-center mb-1">
              <Eye className="h-4 w-4 text-gray-500" />
            </div>
            <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
              {weather.visibility} mi
            </div>
            <div className="text-xs text-gray-600 dark:text-gray-400">Visibility</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}