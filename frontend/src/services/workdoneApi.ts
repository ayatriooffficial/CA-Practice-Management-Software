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
    const cleanParams: Record<string, string> = {};
    for (const [key, val] of Object.entries(params)) {
        if (val !== undefined && val !== null && val !== '' && val !== 'undefined' && val !== 'null') {
            cleanParams[key] = String(val);
        }
    }
    const query = Object.keys(cleanParams).length
        ? '?' + new URLSearchParams(cleanParams).toString()
        : '';
    // Adjust the endpoint path if needed to match backend routes.
    return request<any[]>(`/workdone/client-work-done${query}`);
};
