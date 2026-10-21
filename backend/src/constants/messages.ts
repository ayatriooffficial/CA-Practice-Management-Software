/**
 * Application response and error messages.
 */
export const ResponseMessages = {
  // Generic
  SUCCESS: 'Operation completed successfully.',
  CREATED: 'Resource created successfully.',
  UPDATED: 'Resource updated successfully.',
  DELETED: 'Resource soft-deleted successfully.',
  RESTORED: 'Resource restored successfully.',
  PERMANENT_DELETED: 'Resource permanently deleted.',
  NOT_FOUND: 'Resource not found.',
  INTERNAL_ERROR: 'An unexpected error occurred on the server.',
  UNAUTHORIZED: 'Authentication required or invalid credentials.',
  FORBIDDEN: 'You do not have permission to access this resource.',
  VALIDATION_ERROR: 'Invalid input data provided.',
  TOO_MANY_REQUESTS: 'Rate limit exceeded. Please try again later.',

  // Client Module
  CLIENT_CREATED: 'Client profile registered successfully.',
  CLIENT_UPDATED: 'Client details updated successfully.',
  CLIENT_DELETED: 'Client soft-deleted successfully.',
  CLIENT_RESTORED: 'Client restored successfully.',
  CLIENT_NOT_FOUND: 'Client not found or has been removed.',
  CLIENT_FILE_NO_EXISTS: 'A client with this file number already exists.',
  CLIENT_PAN_EXISTS: 'A client with this PAN number is already registered.',
  CLIENT_FILE_ADDED: 'Customer file entry added successfully.',
  CLIENT_FILE_REMOVED: 'Customer file entry removed successfully.',

  // Lead Module
  LEAD_CREATED: 'Lead record created successfully.',
  LEAD_UPDATED: 'Lead record updated successfully.',
  LEAD_DELETED: 'Lead soft-deleted successfully.',
  LEAD_RESTORED: 'Lead restored successfully.',
  LEAD_NOT_FOUND: 'Lead record not found or has been removed.',
  LEAD_CONVERTED: 'Lead successfully converted to active Client.',
  LEAD_ALREADY_CONVERTED: 'This lead has already been converted to a client.',
  LEAD_PAN_EXISTS: 'A lead with this PAN number is already registered.',

  // Service Module
  SERVICE_CREATED: 'Service master entry created successfully.',
  SERVICE_UPDATED: 'Service details updated successfully.',
  SERVICE_DELETED: 'Service soft-deleted successfully.',
  SERVICE_RESTORED: 'Service restored successfully.',
  SERVICE_NOT_FOUND: 'Service not found or has been removed.',
  SERVICE_NAME_EXISTS: 'A service with this name already exists in the catalog.',


  // Task Module
  TASK_CREATED: 'Task created successfully.',
  TASK_UPDATED: 'Task details updated successfully.',
  TASK_DELETED: 'Task soft-deleted successfully.',
  TASK_NOT_FOUND: 'Task not found or has been removed.',
  TASK_ID_EXISTS: 'A task with this ID already exists.',
} as const;

