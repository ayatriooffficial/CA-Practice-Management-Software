import { call, put, takeLatest, all } from 'redux-saga/effects';
import { PayloadAction } from '@reduxjs/toolkit';
import { serviceApi, ServiceQueryParams, ServiceStats } from '@/services/serviceApi';
import { ApiResponse } from '@/services/apiClient';
import { Service } from '@/data/serviceData';
import {
  fetchServicesRequest,
  fetchServicesSuccess,
  fetchServicesFailure,
  fetchServiceByIdRequest,
  fetchServiceByIdSuccess,
  fetchServiceByIdFailure,
  fetchServiceStatsRequest,
  fetchServiceStatsSuccess,
  createServiceRequest,
  createServiceSuccess,
  createServiceFailure,
  updateServiceRequest,
  updateServiceSuccess,
  updateServiceFailure,
  deleteServiceRequest,
  deleteServiceSuccess,
  deleteServiceFailure,
  bulkDeleteServicesRequest,
  bulkDeleteServicesSuccess,
  bulkDeleteServicesFailure,
} from './serviceSlice';
import { showToast } from '../ui/uiSlice';

function* handleFetchServices(action: PayloadAction<ServiceQueryParams | undefined>): Generator<any, void, any> {
  try {
    const response: ApiResponse<Service[]> = yield call(serviceApi.getServices, action.payload || {});
    yield put(
      fetchServicesSuccess({
        services: response.data || [],
        pagination: response.pagination,
      })
    );
  } catch (error: any) {
    yield put(fetchServicesFailure(error.message || 'Failed to fetch services'));
    yield put(showToast({ type: 'error', message: error.message || 'Failed to fetch services' }));
  }
}

function* handleFetchServiceById(action: PayloadAction<string>): Generator<any, void, any> {
  try {
    const response: ApiResponse<Service> = yield call(serviceApi.getServiceById, action.payload);
    if (response.data) {
      yield put(fetchServiceByIdSuccess(response.data));
    } else {
      yield put(fetchServiceByIdFailure('Service data not found'));
    }
  } catch (error: any) {
    yield put(fetchServiceByIdFailure(error.message || 'Failed to fetch service'));
  }
}

function* handleFetchServiceStats(): Generator<any, void, any> {
  try {
    const response: ApiResponse<ServiceStats> = yield call(serviceApi.getServiceStats);
    if (response.data) {
      yield put(fetchServiceStatsSuccess(response.data));
    }
  } catch (error: any) {
    console.warn('Failed to fetch service stats:', error);
  }
}

function* handleCreateService(
  action: PayloadAction<{ data: Partial<Service>; onSuccess?: (service: Service) => void }>
): Generator<any, void, any> {
  try {
    const response: ApiResponse<Service> = yield call(serviceApi.createService, action.payload.data);
    if (response.data) {
      yield put(createServiceSuccess(response.data));
      yield put(showToast({ type: 'success', message: 'Service created successfully' }));
      if (action.payload.onSuccess) {
        action.payload.onSuccess(response.data);
      }
    }
  } catch (error: any) {
    yield put(createServiceFailure(error.message || 'Failed to create service'));
    yield put(showToast({ type: 'error', message: error.message || 'Failed to create service' }));
  }
}

function* handleUpdateService(
  action: PayloadAction<{
    id: string;
    data: Partial<Service>;
    onSuccess?: (service: Service) => void;
  }>
): Generator<any, void, any> {
  try {
    const response: ApiResponse<Service> = yield call(
      serviceApi.updateService,
      action.payload.id,
      action.payload.data
    );
    if (response.data) {
      yield put(updateServiceSuccess(response.data));
      yield put(showToast({ type: 'success', message: 'Service updated successfully' }));
      if (action.payload.onSuccess) {
        action.payload.onSuccess(response.data);
      }
    }
  } catch (error: any) {
    yield put(updateServiceFailure(error.message || 'Failed to update service'));
    yield put(showToast({ type: 'error', message: error.message || 'Failed to update service' }));
  }
}

function* handleDeleteService(
  action: PayloadAction<{ id: string; onSuccess?: () => void }>
): Generator<any, void, any> {
  try {
    yield call(serviceApi.softDeleteService, action.payload.id);
    yield put(deleteServiceSuccess(action.payload.id));
    yield put(showToast({ type: 'success', message: 'Service deleted successfully' }));
    if (action.payload.onSuccess) {
      action.payload.onSuccess();
    }
  } catch (error: any) {
    yield put(deleteServiceFailure(error.message || 'Failed to delete service'));
    yield put(showToast({ type: 'error', message: error.message || 'Failed to delete service' }));
  }
}

function* handleBulkDeleteServices(
  action: PayloadAction<{ ids: string[]; onSuccess?: () => void }>
): Generator<any, void, any> {
  try {
    yield all(action.payload.ids.map((id) => call(serviceApi.softDeleteService, id)));
    yield put(bulkDeleteServicesSuccess(action.payload.ids));
    yield put(showToast({ type: 'success', message: `${action.payload.ids.length} services deleted` }));
    if (action.payload.onSuccess) {
      action.payload.onSuccess();
    }
  } catch (error: any) {
    yield put(bulkDeleteServicesFailure(error.message || 'Failed to delete selected services'));
    yield put(showToast({ type: 'error', message: error.message || 'Failed to delete selected services' }));
  }
}

export function* serviceSaga() {
  yield takeLatest(fetchServicesRequest.type, handleFetchServices);
  yield takeLatest(fetchServiceByIdRequest.type, handleFetchServiceById);
  yield takeLatest(fetchServiceStatsRequest.type, handleFetchServiceStats);
  yield takeLatest(createServiceRequest.type, handleCreateService);
  yield takeLatest(updateServiceRequest.type, handleUpdateService);
  yield takeLatest(deleteServiceRequest.type, handleDeleteService);
  yield takeLatest(bulkDeleteServicesRequest.type, handleBulkDeleteServices);
}
