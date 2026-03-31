// Timezone utilities for consistent time display across the application

export function getUserTimezone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}

export function formatDateTime(
  date: string | Date, 
  options: {
    includeDate?: boolean;
    includeTime?: boolean;
    includeSeconds?: boolean;
    timezone?: string;
  } = {}
): string {
  const {
    includeDate = true,
    includeTime = true,
    includeSeconds = false,
    timezone = getUserTimezone()
  } = options;

  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  if (isNaN(dateObj.getTime())) {
    return 'Invalid date';
  }

  const formatOptions: Intl.DateTimeFormatOptions = {
    timeZone: timezone,
  };

  if (includeDate) {
    formatOptions.year = 'numeric';
    formatOptions.month = 'short';
    formatOptions.day = 'numeric';
  }

  if (includeTime) {
    formatOptions.hour = 'numeric';
    formatOptions.minute = '2-digit';
    formatOptions.hour12 = true;
    
    if (includeSeconds) {
      formatOptions.second = '2-digit';
    }
  }

  return new Intl.DateTimeFormat('en-US', formatOptions).format(dateObj);
}

export function formatTimeOnly(date: string | Date, timezone?: string): string {
  return formatDateTime(date, { 
    includeDate: false, 
    includeTime: true, 
    timezone 
  });
}

export function formatDateOnly(date: string | Date, timezone?: string): string {
  return formatDateTime(date, { 
    includeDate: true, 
    includeTime: false, 
    timezone 
  });
}

export function formatRelativeTime(date: string | Date): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diffMs = now.getTime() - dateObj.getTime();
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMinutes < 1) return 'Just now';
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  
  return formatDateTime(date, { includeSeconds: false });
}

export function isToday(date: string | Date, timezone?: string): boolean {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  const today = new Date();
  
  const dateStr = formatDateOnly(dateObj, timezone);
  const todayStr = formatDateOnly(today, timezone);
  
  return dateStr === todayStr;
}

export function isYesterday(date: string | Date, timezone?: string): boolean {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  
  const dateStr = formatDateOnly(dateObj, timezone);
  const yesterdayStr = formatDateOnly(yesterday, timezone);
  
  return dateStr === yesterdayStr;
}

// Timezone configuration for settings
export interface TimezoneConfig {
  displayTimezone: string;
  autoDetect: boolean;
}

export function getTimezoneConfig(): TimezoneConfig {
  const stored = localStorage.getItem('timezone-config');
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch {
      // Fall through to default
    }
  }
  
  return {
    displayTimezone: getUserTimezone(),
    autoDetect: true
  };
}

export function setTimezoneConfig(config: TimezoneConfig): void {
  localStorage.setItem('timezone-config', JSON.stringify(config));
}

export function getDisplayTimezone(): string {
  const config = getTimezoneConfig();
  return config.autoDetect ? getUserTimezone() : config.displayTimezone;
}

// Common timezone options for settings
export const COMMON_TIMEZONES = [
  { value: 'America/New_York', label: 'Eastern Time (ET)' },
  { value: 'America/Chicago', label: 'Central Time (CT)' },
  { value: 'America/Denver', label: 'Mountain Time (MT)' },
  { value: 'America/Los_Angeles', label: 'Pacific Time (PT)' },
  { value: 'America/Phoenix', label: 'Arizona Time (MST)' },
  { value: 'America/Anchorage', label: 'Alaska Time (AKST)' },
  { value: 'Pacific/Honolulu', label: 'Hawaii Time (HST)' },
  { value: 'UTC', label: 'UTC' },
  { value: 'Europe/London', label: 'London Time (GMT)' },
  { value: 'Europe/Paris', label: 'Central European Time (CET)' },
  { value: 'Asia/Tokyo', label: 'Japan Time (JST)' },
  { value: 'Asia/Shanghai', label: 'China Time (CST)' },
  { value: 'Australia/Sydney', label: 'Sydney Time (AEDT)' },
];

// UTC timestamp handling for server data
export function utcToLocal(utcDate: Date | string): Date {
  const dateObj = typeof utcDate === 'string' ? new Date(utcDate) : utcDate;
  return new Date(dateObj.getTime());
}

export function formatUtcToLocal(utcDate: Date | string, format: 'short' | 'medium' | 'long' | 'time' | 'date' = 'medium'): string {
  const localDate = utcToLocal(utcDate);
  const timezone = getDisplayTimezone();
  
  const formatOptions: Record<string, Intl.DateTimeFormatOptions> = {
    short: { 
      month: 'short', 
      day: 'numeric', 
      hour: 'numeric', 
      minute: '2-digit',
      timeZone: timezone
    },
    medium: { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric', 
      hour: 'numeric', 
      minute: '2-digit',
      timeZone: timezone
    },
    long: { 
      weekday: 'short',
      month: 'long', 
      day: 'numeric', 
      year: 'numeric', 
      hour: 'numeric', 
      minute: '2-digit',
      timeZone: timezone
    },
    time: { 
      hour: 'numeric', 
      minute: '2-digit',
      timeZone: timezone
    },
    date: { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric',
      timeZone: timezone
    }
  };
  
  return new Intl.DateTimeFormat('en-US', formatOptions[format]).format(localDate);
}

export function createUtcTimestamp(): Date {
  return new Date();
}

export function localToUtc(localDate: Date): Date {
  return new Date(localDate.getTime() - (localDate.getTimezoneOffset() * 60000));
}