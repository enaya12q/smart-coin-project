import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';

// الحالة الأولية
const initialState = {
  referralCode: null,
  referralLink: null,
  referrals: [],
  totalReferrals: 0,
  totalEarnings: 0,
  loading: false,
  error: null
};

// عمليات مزامنة مع الخادم
export const getReferralInfo = createAsyncThunk(
  'referral/getReferralInfo',
  async (userId, { rejectWithValue, getState }) => {
    try {
      const { token } = getState().auth;
      
      const response = await axios.get(`${process.env.REACT_APP_API_URL}/referral/info/${userId}`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response.data);
    }
  }
);

export const getReferrals = createAsyncThunk(
  'referral/getReferrals',
  async (userId, { rejectWithValue, getState }) => {
    try {
      const { token } = getState().auth;
      
      const response = await axios.get(`${process.env.REACT_APP_API_URL}/referral/list/${userId}`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response.data);
    }
  }
);

export const generateReferralCode = createAsyncThunk(
  'referral/generateReferralCode',
  async (userId, { rejectWithValue, getState }) => {
    try {
      const { token } = getState().auth;
      
      const response = await axios.post(`${process.env.REACT_APP_API_URL}/referral/generate-code`, {
        userId
      }, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response.data);
    }
  }
);

// شريحة الإحالة
const referralSlice = createSlice({
  name: 'referral',
  initialState,
  reducers: {
    resetReferralState: (state) => {
      state.referralCode = null;
      state.referralLink = null;
      state.referrals = [];
      state.totalReferrals = 0;
      state.totalEarnings = 0;
      state.loading = false;
      state.error = null;
    }
  },
  extraReducers: (builder) => {
    builder
      // حالات الحصول على معلومات الإحالة
      .addCase(getReferralInfo.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getReferralInfo.fulfilled, (state, action) => {
        state.loading = false;
        state.referralCode = action.payload.referralCode;
        state.referralLink = action.payload.referralLink;
        state.totalReferrals = action.payload.totalReferrals;
        state.totalEarnings = action.payload.totalEarnings;
      })
      .addCase(getReferralInfo.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload ? action.payload.message : 'فشل الحصول على معلومات الإحالة';
      })
      
      // حالات الحصول على قائمة الإحالات
      .addCase(getReferrals.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getReferrals.fulfilled, (state, action) => {
        state.loading = false;
        state.referrals = action.payload.referrals;
      })
      .addCase(getReferrals.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload ? action.payload.message : 'فشل الحصول على قائمة الإحالات';
      })
      
      // حالات إنشاء رمز إحالة جديد
      .addCase(generateReferralCode.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(generateReferralCode.fulfilled, (state, action) => {
        state.loading = false;
        state.referralCode = action.payload.referralCode;
        state.referralLink = action.payload.referralLink;
      })
      .addCase(generateReferralCode.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload ? action.payload.message : 'فشل إنشاء رمز إحالة جديد';
      });
  }
});

export const { resetReferralState } = referralSlice.actions;

export default referralSlice.reducer;
