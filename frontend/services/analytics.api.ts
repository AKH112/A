import api from "./api";

export const getAnalyticsStats = (params?: { from?: Date; to?: Date }) => {
  const from = params?.from ? params.from.toISOString() : undefined;
  const to = params?.to ? params.to.toISOString() : undefined;
  return api.get("/analytics", { params: { from, to } });
};
