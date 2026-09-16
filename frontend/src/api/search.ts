import { api } from "@/api/client";
import type { SearchResponse } from "@/types";

export const searchApi = {
  query: async (query: string, limit = 8): Promise<SearchResponse> =>
    (await api.post<SearchResponse>("/search", { query, limit })).data,
};
