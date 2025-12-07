import axios, { AxiosInstance, InternalAxiosRequestConfig, AxiosError } from 'axios';
import type { Business, BusinessListResponse, ServiceResponse } from '../types';

// Get API base URL for Next.js
const getApiBaseUrl = (): string => {
  // In Next.js, use NEXT_PUBLIC_ prefix for client-side env variables
  const envUrl = process.env.NEXT_PUBLIC_API_URL;
  if (envUrl) {
    const cleanUrl = envUrl.replace(/\/$/, '');
    return cleanUrl.endsWith('/api') ? cleanUrl : `${cleanUrl}/api`;
  }
  // Default to localhost in development, or use rewrites in next.config.js
  if (typeof window !== 'undefined') {
    // Client-side: use relative URL which will be rewritten by next.config.js
    return '/api';
  }
  // Server-side: use full URL
  return 'http://localhost:7000/api';
};

const API_BASE_URL = getApiBaseUrl();

// Debug logging in development
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  console.log('API Base URL:', API_BASE_URL);
}

interface BusinessFilters {
  page?: number;
  limit?: number;
  category?: string;
  barangay?: string;
  search?: string;
}

interface CreateBusinessData {
  name: string;
  description: string;
  category: string;
  barangay: string;
  location: string;
  lat?: number;
  lng?: number;
  contactInfo?: string;
  socials?: any;
  coverPhoto?: string;
  logo?: string;
  gallery?: string[];
  openTime?: string;
  closeTime?: string;
  verificationDocumentUrl?: string;
}

interface ExtendedAxiosRequestConfig extends InternalAxiosRequestConfig {
  _retry?: boolean;
}

class ApiService {
  private api: AxiosInstance;

  constructor() {
    this.api = axios.create({
      baseURL: API_BASE_URL,
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: 30000, // 30 second timeout for all requests
    });

    // Utility function to decode JWT and get expiration
    const getTokenExpiration = (token: string): number | null => {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        return payload.exp ? payload.exp * 1000 : null; // Convert to milliseconds
      } catch {
        return null;
      }
    };

    // Check if token is expired or will expire soon (within 2 minutes)
    const isTokenExpiringSoon = (token: string | null): boolean => {
      if (!token) return true;
      const expiration = getTokenExpiration(token);
      if (!expiration) return true;
      const twoMinutesFromNow = Date.now() + 2 * 60 * 1000; // 2 minutes buffer
      return expiration <= twoMinutesFromNow;
    };

    // Request interceptor to add auth token and refresh if needed
    this.api.interceptors.request.use(
      async (config: InternalAxiosRequestConfig) => {
        if (typeof window !== 'undefined') {
          let token = localStorage.getItem('accessToken');
          const refreshToken = localStorage.getItem('refreshToken');

          // Proactively refresh token if it's expiring soon
          if (token && refreshToken && isTokenExpiringSoon(token)) {
            try {
              const response = await axios.post(`${API_BASE_URL}/auth/v1/refresh-token`, {
                refreshToken,
              });

              if (response.data?.status === 'success' && response.data?.data?.tokens) {
                const { accessToken: newAccessToken, refreshToken: newRefreshToken } = response.data.data.tokens;
                localStorage.setItem('accessToken', newAccessToken);
                if (newRefreshToken) {
                  localStorage.setItem('refreshToken', newRefreshToken);
                }
                token = newAccessToken;
              }
            } catch (refreshError) {
              console.error('Proactive token refresh failed:', refreshError);
              // Don't block the request, let it proceed and handle 401 in response interceptor
            }
          }

          if (token && config.headers) {
            config.headers.Authorization = `Bearer ${token}`;
          }
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor to handle token refresh
    this.api.interceptors.response.use(
      (response) => response,
      async (error: AxiosError) => {
        const originalRequest = error.config as ExtendedAxiosRequestConfig;

        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;

          try {
            if (typeof window !== 'undefined') {
              const refreshToken = localStorage.getItem('refreshToken');
              if (!refreshToken) {
                // No refresh token, redirect to login
                localStorage.removeItem('accessToken');
                localStorage.removeItem('refreshToken');
                localStorage.removeItem('user');
                window.location.href = '/login';
                return Promise.reject(error);
              }

              const response = await axios.post(`${API_BASE_URL}/auth/v1/refresh-token`, {
                refreshToken,
              });

              if (response.data?.status === 'success' && response.data?.data?.tokens) {
                const { accessToken, refreshToken: newRefreshToken } = response.data.data.tokens;
                
                // Save both new tokens
                localStorage.setItem('accessToken', accessToken);
                if (newRefreshToken) {
                  localStorage.setItem('refreshToken', newRefreshToken);
                }

                // Update the original request with new token
                if (originalRequest.headers) {
                  originalRequest.headers.Authorization = `Bearer ${accessToken}`;
                }

                return this.api(originalRequest);
              } else {
                console.error('Invalid refresh response:', response.data);
                throw new Error(response.data?.message || 'Invalid refresh response');
              }
            }
          } catch (refreshError) {
            console.error('Token refresh failed:', refreshError);
            if (typeof window !== 'undefined') {
              localStorage.removeItem('accessToken');
              localStorage.removeItem('refreshToken');
              localStorage.removeItem('user');
              // Only redirect if we're not already on login page
              if (window.location.pathname !== '/login') {
                window.location.href = '/login';
              }
            }
            return Promise.reject(refreshError);
          }
        }

        return Promise.reject(error);
      }
    );
  }

  // Auth endpoints
  async signup(name: string, email: string, password: string): Promise<ServiceResponse> {
    const response = await this.api.post('/auth/v1/signup', { name, email, password });
    return response.data;
  }

  async login(email: string, password: string): Promise<ServiceResponse> {
    const response = await this.api.post('/auth/v1/login', { email, password });
    return response.data;
  }

  async refreshToken(refreshToken: string): Promise<ServiceResponse> {
    const response = await this.api.post('/auth/v1/refresh-token', { refreshToken });
    return response.data;
  }

  async verifyEmail(token: string): Promise<ServiceResponse> {
    const response = await this.api.get('/auth/v1/verify-email', { params: { token } });
    return response.data;
  }

  async forgotPassword(email: string): Promise<ServiceResponse> {
    const response = await this.api.post('/auth/v1/forgot-password', { email });
    return response.data;
  }

  async resetPassword(token: string, password: string): Promise<ServiceResponse> {
    const response = await this.api.post('/auth/v1/reset-password', { token, password });
    return response.data;
  }

  async getCurrentUser(): Promise<ServiceResponse> {
    const response = await this.api.get('/auth/v1/me');
    return response.data;
  }

  async exchangeOAuthCode(code: string): Promise<ServiceResponse> {
    try {
      const response = await this.api.get('/auth/v1/oauth/exchange', { params: { code } });
      return response.data;
    } catch (error) {
      console.error('API exchangeOAuthCode error:', error);
      throw error;
    }
  }

  // Business endpoints
  async getBusinesses(params?: BusinessFilters): Promise<BusinessListResponse> {
    const response = await this.api.get('/businesses', { params });
    return response.data;
  }

  async getBusinessById(id: number): Promise<ServiceResponse> {
    const response = await this.api.get(`/businesses/${id}`);
    return response.data;
  }

  async searchBusinesses(params: {
    q: string;
    page?: number;
    limit?: number;
    category?: string;
    barangay?: string;
  }): Promise<BusinessListResponse> {
    const response = await this.api.get('/businesses/search', { params });
    return response.data;
  }

  async getSearchSuggestions(query: string, limit: number = 5): Promise<ServiceResponse> {
    if (!query || query.trim().length < 2) {
      return { success: true, data: { businesses: [] } };
    }
    const response = await this.api.get('/businesses/search', { 
      params: { q: query, limit, page: 1 } 
    });
    return response.data;
  }

  async getNearbyBusinesses(lat: number, lng: number, radiusKm?: number): Promise<ServiceResponse> {
    const response = await this.api.get('/businesses/nearby', {
      params: { lat, lng, radiusKm },
    });
    return response.data;
  }

  async getBusinessesByCategory(category: string, params?: { page?: number; limit?: number }): Promise<BusinessListResponse> {
    const response = await this.api.get(`/businesses/category/${category}`, { params });
    return response.data;
  }

  async getBusinessesByBarangay(barangay: string, params?: { page?: number; limit?: number }): Promise<BusinessListResponse> {
    const response = await this.api.get(`/businesses/barangay/${barangay}`, { params });
    return response.data;
  }

  async getMyBusinesses(params?: { page?: number; limit?: number }): Promise<BusinessListResponse> {
    const response = await this.api.get('/businesses/my-businesses', { params });
    return response.data;
  }

  async createBusiness(data: CreateBusinessData): Promise<ServiceResponse> {
    const response = await this.api.post('/businesses', data);
    return response.data;
  }

  async updateBusiness(id: number, data: Partial<Business>): Promise<ServiceResponse> {
    const response = await this.api.put(`/businesses/${id}`, data);
    return response.data;
  }

  async deleteBusiness(id: number): Promise<ServiceResponse> {
    const response = await this.api.delete(`/businesses/${id}`);
    return response.data;
  }

  async submitVerification(businessId: number, documentUrl: string): Promise<ServiceResponse> {
    const response = await this.api.post(`/businesses/${businessId}/verification`, { documentUrl });
    return response.data;
  }

  async getVerificationStatus(businessId: number): Promise<ServiceResponse> {
    const response = await this.api.get(`/businesses/${businessId}/verification`);
    return response.data;
  }

  async getCategories(): Promise<ServiceResponse> {
    const response = await this.api.get('/businesses/filters/categories');
    return response.data;
  }

  async getBarangays(): Promise<ServiceResponse> {
    const response = await this.api.get('/businesses/filters/barangays');
    return response.data;
  }

  // Discussion endpoints
  async getBusinessDiscussions(businessId: number): Promise<ServiceResponse> {
    const response = await this.api.get(`/discussions/business/${businessId}`);
    return response.data;
  }

  async getDiscussionById(id: number): Promise<ServiceResponse> {
    const response = await this.api.get(`/discussions/${id}`);
    return response.data;
  }

  async getMyDiscussions(): Promise<ServiceResponse> {
    const response = await this.api.get('/discussions/user/my-discussions');
    return response.data;
  }

  async createDiscussion(businessId: number, content: string, parentId?: number): Promise<ServiceResponse> {
    const response = await this.api.post('/discussions', { businessId, content, parentId });
    return response.data;
  }

  async replyToDiscussion(discussionId: number, content: string, businessId: number): Promise<ServiceResponse> {
    const response = await this.api.post('/discussions', { businessId, content, parentId: discussionId });
    return response.data;
  }

  async updateDiscussion(id: number, content: string): Promise<ServiceResponse> {
    const response = await this.api.put(`/discussions/${id}`, { content });
    return response.data;
  }

  async deleteDiscussion(id: number): Promise<ServiceResponse> {
    const response = await this.api.delete(`/discussions/${id}`);
    return response.data;
  }

  // Favorite endpoints
  async getUserFavorites(): Promise<ServiceResponse> {
    const response = await this.api.get('/favorites');
    return response.data;
  }

  async checkFavorite(businessId: number): Promise<ServiceResponse> {
    const response = await this.api.get(`/favorites/check/${businessId}`);
    return response.data;
  }

  async getBusinessFavoriteCount(businessId: number): Promise<ServiceResponse> {
    const response = await this.api.get(`/favorites/business/${businessId}/count`);
    return response.data;
  }

  async addFavorite(businessId: number): Promise<ServiceResponse> {
    const response = await this.api.post('/favorites', { businessId });
    return response.data;
  }

  async toggleFavorite(businessId: number): Promise<ServiceResponse> {
    const response = await this.api.post('/favorites/toggle', { businessId });
    return response.data;
  }

  async removeFavorite(businessId: number): Promise<ServiceResponse> {
    const response = await this.api.delete(`/favorites/${businessId}`);
    return response.data;
  }

  // Admin endpoints
  async getDashboardStats(): Promise<ServiceResponse> {
    const response = await this.api.get('/admin/dashboard');
    return response.data;
  }

  async getAllUsers(params?: { page?: number; limit?: number; role?: string; search?: string }): Promise<ServiceResponse> {
    const response = await this.api.get('/admin/users', { params });
    return response.data;
  }

  async getUserById(id: string): Promise<ServiceResponse> {
    const response = await this.api.get(`/admin/users/${id}`);
    return response.data;
  }

  async updateUserRole(id: string, role: 'CUSTOMER' | 'VENDOR' | 'ADMIN'): Promise<ServiceResponse> {
    const response = await this.api.put(`/admin/users/${id}/role`, { role });
    return response.data;
  }

  async deleteUser(id: string): Promise<ServiceResponse> {
    const response = await this.api.delete(`/admin/users/${id}`);
    return response.data;
  }

  async getAllBusinessesAdmin(params?: { page?: number; limit?: number; isVerified?: boolean; search?: string }): Promise<ServiceResponse> {
    const response = await this.api.get('/admin/businesses', { params });
    return response.data;
  }

  async getPendingBusinesses(): Promise<ServiceResponse> {
    const response = await this.api.get('/admin/businesses/pending');
    return response.data;
  }

  async verifyBusiness(id: number): Promise<ServiceResponse> {
    const response = await this.api.post(`/admin/businesses/${id}/verify`);
    return response.data;
  }

  async unverifyBusiness(id: number): Promise<ServiceResponse> {
    const response = await this.api.post(`/admin/businesses/${id}/unverify`);
    return response.data;
  }

  async deleteBusinessAdmin(id: number): Promise<ServiceResponse> {
    const response = await this.api.delete(`/admin/businesses/${id}`);
    return response.data;
  }

  async getAllVerifications(params?: { page?: number; limit?: number; status?: string }): Promise<ServiceResponse> {
    const response = await this.api.get('/admin/verifications', { params });
    return response.data;
  }

  async approveVerification(id: number): Promise<ServiceResponse> {
    const response = await this.api.post(`/admin/verifications/${id}/approve`);
    return response.data;
  }

  async rejectVerification(id: number): Promise<ServiceResponse> {
    const response = await this.api.post(`/admin/verifications/${id}/reject`);
    return response.data;
  }
}

export const api = new ApiService();

