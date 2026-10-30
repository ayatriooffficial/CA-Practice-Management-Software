// src/services/workdoneApi.ts

import { request, ApiResponse } from './apiClient';

/**
 * Parameters for fetching workdone data.
 */
export interface WorkDoneQueryParams {
    [key: string]: any;
}

/**
 * Fetch workdone client data.
 *
 * @param params Optional query parameters.
 * @returns ApiResponse containing the workdone data array.
 */
export const getWorkDone = async (
    params: WorkDoneQueryParams = {}
): Promise<ApiResponse<any[]>> => {
    const query = Object.keys(params).length
        ? '?' + new URLSearchParams(params as Record<string, string>).toString()
        : '';
    // Adjust the endpoint path if needed to match backend routes.
    return request<any[]>(`/workdone/client-work-done${query}`);
};
