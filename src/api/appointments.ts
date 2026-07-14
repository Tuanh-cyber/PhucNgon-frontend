/**
 * API lịch hẹn — GET /patients/me/appointments?from=&to= (from/to = YYYY-MM-DD,
 * lọc theo starts_at; mặc định backend = tháng hiện tại ±1).
 */

import { apiClient } from './client';
import type { AppointmentItem } from '@/src/types/api';

export async function getMyAppointments(
  from?: string,
  to?: string,
): Promise<AppointmentItem[]> {
  const res = await apiClient.get<AppointmentItem[]>('/patients/me/appointments', {
    params: { from, to },
  });
  return res.data;
}
