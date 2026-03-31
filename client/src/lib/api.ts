import { apiRequest } from "./queryClient";

export async function updateAIConfig(config: any) {
  return apiRequest("/api/ai-config", { method: "PUT", body: JSON.stringify(config) });
}

export async function testNotification(type: "sms" | "email" | "whatsapp" | "telegram") {
  return apiRequest(`/api/notifications/test/${type}`, { method: "POST" });
}

export async function createCallRoute(route: any) {
  return apiRequest("/api/call-routes", { method: "POST", body: JSON.stringify(route) });
}

export async function updateCallRoute(id: number, route: any) {
  return apiRequest(`/api/call-routes/${id}`, { method: "PUT", body: JSON.stringify(route) });
}
