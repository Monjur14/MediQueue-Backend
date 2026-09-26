/**
 * Auth API hooks
 * All auth interactions go through these — pages never call api.post directly.
 */
import { useMutation } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { AxiosError } from 'axios';
import { api, ApiError } from '@/lib/api';
import { useAuthStore, getRoleDashboard } from '@/store/auth.store';

/* ------------------------------------------------------------------ */
/*  Types                                                               */
/* ------------------------------------------------------------------ */
export interface LoginInput {
  email: string;
  password: string;
}

export interface RegisterInput {
  full_name: string;
  email: string;
  password: string;
  phone?: string;
}

export interface RegisterTenantInput {
  clinic_name: string;
  clinic_phone: string;
  full_name: string;
  email: string;
  password: string;
  phone?: string;
  plan_name: 'solo' | 'clinic' | 'hospital';
}

/* ------------------------------------------------------------------ */
/*  Error helper                                                        */
/* ------------------------------------------------------------------ */
export function getApiErrorMessage(err: unknown, fallback = 'Something went wrong'): string {
  if (err instanceof AxiosError) {
    return (err.response?.data as ApiError)?.message ?? fallback;
  }
  return fallback;
}

/* ------------------------------------------------------------------ */
/*  useLogin                                                            */
/* ------------------------------------------------------------------ */
export function useLogin() {
  const login = useAuthStore((s) => s.login);
  const router = useRouter();

  return useMutation({
    mutationFn: (input: LoginInput) =>
      api.post('/auth/login', input).then((r) => r.data),

    onSuccess: (data) => {
      login(data);
      router.replace(getRoleDashboard(data.user.role));
    },
  });
}

/* ------------------------------------------------------------------ */
/*  useRegister (patient)                                               */
/* ------------------------------------------------------------------ */
export function useRegister() {
  const router = useRouter();

  return useMutation({
    mutationFn: (input: RegisterInput) =>
      api.post('/auth/register', input).then((r) => r.data),

    onSuccess: () => {
      router.replace('/login?registered=1');
    },
  });
}

/* ------------------------------------------------------------------ */
/*  useRegisterTenant                                                   */
/* ------------------------------------------------------------------ */
export function useRegisterTenant() {
  const router = useRouter();

  return useMutation({
    mutationFn: (input: RegisterTenantInput) =>
      api.post('/auth/register/tenant', input).then((r) => r.data),

    onSuccess: () => {
      // Tenant admin must pay before they can log in — send to login with a note
      router.replace('/login?registered=tenant');
    },
  });
}

/* ------------------------------------------------------------------ */
/*  useSetupPassword                                                    */
/* ------------------------------------------------------------------ */
export function useSetupPassword() {
  const router = useRouter();

  return useMutation({
    mutationFn: ({ token, password }: { token: string; password: string }) =>
      api.post('/auth/setup-password', { token, password }).then((r) => r.data),

    onSuccess: () => {
      router.replace('/login?setup=done');
    },
  });
}

/* ------------------------------------------------------------------ */
/*  useLogout                                                           */
/* ------------------------------------------------------------------ */
export function useLogout() {
  const logout = useAuthStore((s) => s.logout);

  return useMutation({
    mutationFn: () => logout(),
  });
}
