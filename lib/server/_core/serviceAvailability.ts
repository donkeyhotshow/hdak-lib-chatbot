import { ENV } from "./env";

export type ServiceName = "dataApi" | "image" | "map" | "voice";

export function isServiceEnabled(serviceName: ServiceName): boolean {
  const serviceOverrides = ENV.serviceEnabled ?? {};
  const serviceOverride =
    serviceOverrides[serviceName as keyof typeof serviceOverrides];
  const globalEnabled =
    typeof ENV.servicesEnabled === "boolean" ? ENV.servicesEnabled : true;
  if (serviceOverride === undefined) {
    return globalEnabled;
  }
  return serviceOverride;
}
