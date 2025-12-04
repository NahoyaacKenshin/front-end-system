export interface User {
  id: string;
  email: string;
  name: string;
  role: 'CUSTOMER' | 'VENDOR' | 'ADMIN';
  image?: string;
  emailVerified?: Date | string | null;
  createdAt?: string | Date;
}

export interface Business {
  id: number;
  name: string;
  description: string;
  category: string;
  barangay: string;
  location: string;
  lat?: number | null;
  lng?: number | null;
  contactInfo?: string | null;
  socials?: any;
  coverPhoto?: string | null;
  gallery: string[];
  isVerified: boolean;
  openTime?: string | null;
  closeTime?: string | null;
  createdAt: string;
  updatedAt: string;
  ownerId: string;
  owner: {
    id: string;
    name: string;
    image?: string;
  };
  discussions?: Discussion[];
  favorites?: Favorite[];
}

export interface Discussion {
  id: number;
  content: string;
  createdAt: string;
  businessId: number;
  userId: string;
  parentId?: number | null;
  user: {
    id: string;
    name: string;
    image?: string;
  };
  business?: Business;
  replies?: Discussion[];
}

export interface Favorite {
  id: number;
  userId: string;
  businessId: number;
  createdAt: string;
  business?: Business;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: string;
  refreshExpiresIn: string;
}

export interface AuthResponse {
  code: number;
  status: 'success' | 'error';
  message: string;
  data?: {
    tokens: AuthTokens;
    user: User;
  };
}

export interface PaginationResult {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface BusinessListResponse {
  success: boolean;
  data: {
    businesses: Business[];
    pagination: PaginationResult;
  };
}

export interface ServiceResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  status?: string;
}

