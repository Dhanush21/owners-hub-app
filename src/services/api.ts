/**
 * API Service Layer
 * All backend API calls should go through this service
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

// Helper function to get auth token from Firebase
const getAuthToken = async () => {
  try {
    // Try to get Firebase auth token
    const { getAuth } = await import('firebase/auth');
    const auth = getAuth();
    const user = auth.currentUser;
    if (user) {
      return await user.getIdToken();
    }
  } catch (error) {
    console.warn('Could not get Firebase auth token:', error);
  }
  
  // Fallback to localStorage
  return localStorage.getItem('authToken');
};

// Helper function to make authenticated API calls
const apiCall = async (endpoint: string, options: RequestInit = {}) => {
  try {
    const token = await getAuthToken();
    
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers,
    };

    console.log(`API Call: ${API_BASE_URL}${endpoint}`);
    
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
      mode: 'cors', // Explicitly set CORS mode
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: `HTTP ${response.status}: ${response.statusText}` }));
      console.error('API Error:', error);
      
      // If there are validation errors, format them nicely
      if (error.errors && Array.isArray(error.errors)) {
        const validationErrors = error.errors.map((e: any) => `${e.path}: ${e.msg}`).join(', ');
        throw new Error(validationErrors);
      }
      
      throw new Error(error.error || error.message || 'Request failed');
    }

    return response.json();
  } catch (error) {
    console.error('API Call Failed:', error);
    throw error;
  }
};

// ==================== USER ENDPOINTS ====================
export const userAPI = {
  // Get all users (admin only)
  getAll: async (params?: { page?: number; limit?: number; role?: string; status?: string }) => {
    const queryParams = new URLSearchParams(params as any).toString();
    return apiCall(`/users${queryParams ? `?${queryParams}` : ''}`);
  },

  // Get user profile
  getProfile: async (userId: string) => {
    return apiCall(`/users/${userId}`);
  },

  // Get current user profile
  getMe: async () => {
    return apiCall('/users/me');
  },

  // Update user profile
  update: async (userId: string, data: any) => {
    return apiCall(`/users/${userId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  // Delete user
  delete: async (userId: string) => {
    return apiCall(`/users/${userId}`, {
      method: 'DELETE',
    });
  },
};

// ==================== PAYMENT ENDPOINTS ====================
export const paymentAPI = {
  // Get all payments
  getAll: async (params?: { 
    page?: number; 
    limit?: number; 
    startDate?: string; 
    endDate?: string; 
    customerEmail?: string;
  }) => {
    const queryParams = new URLSearchParams(params as any).toString();
    return apiCall(`/payments${queryParams ? `?${queryParams}` : ''}`);
  },

  // Get payment by ID
  getById: async (paymentId: string) => {
    return apiCall(`/payments/${paymentId}`);
  },

  // Create new payment
  create: async (data: {
    amount: number;
    customerName: string;
    customerEmail: string;
    description?: string;
    paymentMethod?: string;
  }) => {
    return apiCall('/payments', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // Update payment
  update: async (paymentId: string, data: any) => {
    return apiCall(`/payments/${paymentId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  // Delete payment
  delete: async (paymentId: string) => {
    return apiCall(`/payments/${paymentId}`, {
      method: 'DELETE',
    });
  },

  // Get payment stats
  getStats: async (params?: { startDate?: string; endDate?: string }) => {
    const queryParams = new URLSearchParams(params as any).toString();
    return apiCall(`/payments/stats${queryParams ? `?${queryParams}` : ''}`);
  },
};

// ==================== ISSUE ENDPOINTS ====================
export const issueAPI = {
  // Get all issues
  getAll: async (params?: {
    page?: number;
    limit?: number;
    status?: string;
    priority?: string;
    category?: string;
    unit?: string;
  }) => {
    const queryParams = new URLSearchParams(params as any).toString();
    return apiCall(`/issues${queryParams ? `?${queryParams}` : ''}`);
  },

  // Get issue by ID
  getById: async (issueId: string) => {
    return apiCall(`/issues/${issueId}`);
  },

  // Create new issue
  create: async (data: {
    title: string;
    description: string;
    category: string;
    priority: string;
    unit?: string;
  }) => {
    return apiCall('/issues', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // Update issue
  update: async (issueId: string, data: any) => {
    return apiCall(`/issues/${issueId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  // Update issue status
  updateStatus: async (issueId: string, status: string) => {
    return apiCall(`/issues/${issueId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
  },

  // Delete issue
  delete: async (issueId: string) => {
    return apiCall(`/issues/${issueId}`, {
      method: 'DELETE',
    });
  },

  // Get issue stats
  getStats: async () => {
    return apiCall('/issues/stats');
  },
};

// ==================== PROPERTY ENDPOINTS ====================
export const propertyAPI = {
  // Get all properties
  getAll: async (params?: {
    page?: number;
    limit?: number;
    status?: string;
    propertyType?: string;
  }) => {
    const queryParams = new URLSearchParams(params as any).toString();
    return apiCall(`/properties${queryParams ? `?${queryParams}` : ''}`);
  },

  // Get property by ID
  getById: async (propertyId: string) => {
    return apiCall(`/properties/${propertyId}`);
  },

  // Create new property
  create: async (data: {
    address: string;
    unit?: string;
    propertyType: string;
    bedrooms: number;
    bathrooms: number;
    rent: number;
    status?: string;
  }) => {
    return apiCall('/properties', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // Update property
  update: async (propertyId: string, data: any) => {
    return apiCall(`/properties/${propertyId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  // Delete property
  delete: async (propertyId: string) => {
    return apiCall(`/properties/${propertyId}`, {
      method: 'DELETE',
    });
  },

  // Get property stats
  getStats: async () => {
    return apiCall('/properties/stats');
  },
};

// ==================== DASHBOARD ENDPOINTS ====================
export const dashboardAPI = {
  // Get dashboard statistics
  getStats: async () => {
    return apiCall('/dashboard/stats');
  },

  // Get dashboard data (combined endpoint)
  getDashboardData: async () => {
    try {
      // Fetch all necessary data in parallel
      const [users, payments, issues, properties] = await Promise.all([
        userAPI.getAll({ role: 'resident' }).catch(() => ({ users: [] })),
        paymentAPI.getAll().catch(() => ({ payments: [] })),
        issueAPI.getAll().catch(() => ({ issues: [] })),
        propertyAPI.getAll().catch(() => ({ properties: [] })),
      ]);

      return {
        residents: users.users || [],
        payments: payments.payments || [],
        issues: issues.issues || [],
        properties: properties.properties || [],
      };
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      throw error;
    }
  },
};

// ==================== AUTH ENDPOINTS ====================
export const authAPI = {
  // Register new user (creates user in database only, not Firebase Auth)
  // Note: This uses the /users endpoint which only creates a database record.
  // For full user registration with Firebase Auth, use the AuthContext.signUp method
  register: async (data: {
    email: string;
    fullName: string;
    phone: string;
    role: string;
    unit?: string;
    monthlyRent?: number;
    securityDeposit?: number;
    leaseStart?: string;
    leaseEnd?: string;
  }) => {
    return apiCall('/users', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // Login
  login: async (email: string, password: string) => {
    return apiCall('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  },

  // Verify token
  verifyToken: async (token: string) => {
    return apiCall('/auth/verify', {
      method: 'POST',
      body: JSON.stringify({ token }),
    });
  },

  // Send OTP to phone number (using Supabase Edge Function - no CAPTCHA)
  sendOTP: async (phoneNumber: string) => {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
    const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
    
    if (!supabaseUrl || !supabaseAnonKey) {
      // Fallback to backend API if Supabase not configured
      return apiCall('/auth/send-otp', {
        method: 'POST',
        body: JSON.stringify({ phoneNumber }),
      });
    }

    const response = await fetch(`${supabaseUrl}/functions/v1/send-otp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseAnonKey}`,
      },
      body: JSON.stringify({ phoneNumber }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: `HTTP ${response.status}: ${response.statusText}` }));
      throw new Error(error.error || error.message || 'Failed to send OTP');
    }

    return response.json();
  },

  // Verify OTP (using Supabase Edge Function - no CAPTCHA)
  verifyOTP: async (phoneNumber: string, otp: string) => {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
    const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
    
    if (!supabaseUrl || !supabaseAnonKey) {
      // Fallback to backend API if Supabase not configured
      return apiCall('/auth/verify-otp', {
        method: 'POST',
        body: JSON.stringify({ phoneNumber, otp }),
      });
    }

    const response = await fetch(`${supabaseUrl}/functions/v1/verify-otp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseAnonKey}`,
      },
      body: JSON.stringify({ phoneNumber, otp }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: `HTTP ${response.status}: ${response.statusText}` }));
      throw new Error(error.error || error.message || 'Failed to verify OTP');
    }

    return response.json();
  },
};

export default {
  user: userAPI,
  payment: paymentAPI,
  issue: issueAPI,
  property: propertyAPI,
  dashboard: dashboardAPI,
  auth: authAPI,
};

