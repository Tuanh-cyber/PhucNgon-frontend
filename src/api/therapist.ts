/**
 * API web bác sĩ — /therapist/* (đều cần token role=therapist; backend mask phân quyền,
 * bác sĩ chỉ thấy bệnh nhân của mình).
 */

import { apiClient } from './client';
import type {
  ClaimPatientRequest,
  ClaimPatientResponse,
  DashboardSummary,
  TherapistPatientDetail,
  TherapistPatientList,
} from '@/src/types/api';

export async function getDashboardSummary(): Promise<DashboardSummary> {
  const res = await apiClient.get<DashboardSummary>('/therapist/dashboard-summary');
  return res.data;
}

export interface PatientListParams {
  severity?: string;
  aphasia_type?: string;
  status?: 'good' | 'attention';
  search?: string;
  limit?: number;
  offset?: number;
}

export async function getMyPatients(params: PatientListParams = {}): Promise<TherapistPatientList> {
  const res = await apiClient.get<TherapistPatientList>('/therapist/me/patients', { params });
  return res.data;
}

export async function getPatientDetail(patientId: string): Promise<TherapistPatientDetail> {
  const res = await apiClient.get<TherapistPatientDetail>(`/therapist/patients/${patientId}`);
  return res.data;
}

export async function claimPatient(body: ClaimPatientRequest): Promise<ClaimPatientResponse> {
  const res = await apiClient.post<ClaimPatientResponse>('/therapist/patients/claim', body);
  return res.data;
}
