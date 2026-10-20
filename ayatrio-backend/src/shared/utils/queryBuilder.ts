import { FilterQuery, Model, SortOrder } from 'mongoose';
import { PaginationMeta } from './apiResponse';

export interface QueryOptions {
  page?: number | string;
  limit?: number | string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  search?: string;
  fields?: string;
  includeDeleted?: boolean | string;
  [key: string]: unknown;
}

export interface ParsedQuery<T> {
  filter: FilterQuery<T>;
  sort: { [key: string]: SortOrder };
  skip: number;
  limit: number;
  page: number;
  projection: string | undefined;
  includeDeleted: boolean;
}

export class QueryBuilder {
  static parse<T>(
    queryParams: QueryOptions,
    searchableFields: string[] = []
  ): ParsedQuery<T> {
    const page = Math.max(1, Number(queryParams.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(queryParams.limit) || 10));
    const skip = (page - 1) * limit;

    const sortBy = (queryParams.sortBy as string) || 'createdAt';
    const sortOrder = queryParams.sortOrder === 'asc' ? 1 : -1;
    const sort: { [key: string]: SortOrder } = { [sortBy]: sortOrder };

    const filter: Record<string, unknown> = {};

    // Soft delete filter
    const includeDeleted =
      queryParams.includeDeleted === true || queryParams.includeDeleted === 'true';

    // Full-text / Regex Search over defined fields
    if (queryParams.search && searchableFields.length > 0) {
      const searchRegex = new RegExp(String(queryParams.search).trim(), 'i');
      filter.$or = searchableFields.map((field) => ({
        [field]: searchRegex,
      }));
    }

    // Extract other filter attributes, excluding reserved query parameters
    const reservedKeys = new Set([
      'page',
      'limit',
      'sortBy',
      'sortOrder',
      'search',
      'fields',
      'includeDeleted',
    ]);

    Object.keys(queryParams).forEach((key) => {
      if (!reservedKeys.has(key) && queryParams[key] !== undefined && queryParams[key] !== '') {
        const val = queryParams[key];
        // Handle boolean strings
        if (val === 'true') {
          filter[key] = true;
        } else if (val === 'false') {
          filter[key] = false;
        } else {
          filter[key] = val;
        }
      }
    });

    const projection = queryParams.fields
      ? String(queryParams.fields).split(',').join(' ')
      : undefined;

    return {
      filter: filter as FilterQuery<T>,
      sort,
      skip,
      limit,
      page,
      projection,
      includeDeleted,
    };
  }

  static async paginate<T>(
    model: Model<T>,
    parsed: ParsedQuery<T>,
    populate?: any
  ): Promise<{ items: T[]; pagination: PaginationMeta }> {
    const { filter, sort, skip, limit, page, projection, includeDeleted } = parsed;

    // Run count and query in parallel for high speed efficiency
    let query = model
      .find(filter)
      .select(projection || '')
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .lean();

    let countQuery = model.countDocuments(filter);

    if (includeDeleted) {
      query = query.setOptions({ includeDeleted: true });
      countQuery = countQuery.setOptions({ includeDeleted: true });
    }

    if (populate) {
      query = query.populate(populate);
    }

    const [items, totalDocs] = await Promise.all([
      query.exec() as Promise<T[]>,
      countQuery.exec(),
    ]);

    const totalPages = Math.ceil(totalDocs / limit) || 1;

    return {
      items,
      pagination: {
        page,
        limit,
        totalDocs,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    };
  }
}
