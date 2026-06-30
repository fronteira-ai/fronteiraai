import { AnalyticsWindow } from "../types/enums";

export function windowToDate(window: AnalyticsWindow): Date {
  const now = new Date();
  switch (window) {
    case AnalyticsWindow.Today:
      return new Date(now.getFullYear(), now.getMonth(), now.getDate());
    case AnalyticsWindow.Last7Days:
      return new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    case AnalyticsWindow.Last30Days:
      return new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    case AnalyticsWindow.Last90Days:
      return new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
  }
}

export function windowLabel(window: AnalyticsWindow): string {
  switch (window) {
    case AnalyticsWindow.Today:      return "Hoje";
    case AnalyticsWindow.Last7Days:  return "Últimos 7 dias";
    case AnalyticsWindow.Last30Days: return "Últimos 30 dias";
    case AnalyticsWindow.Last90Days: return "Últimos 90 dias";
  }
}
