import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';

// الحالة الأولية
const initialState = {
  miningRate: 0,
  lastMiningTime: null,
  dailyLimit: 100,
  todayMined: 0,
  miningActive: false,
  miningPackages: [],
  currentPackage: null,
  loading: false,
  error: null
};

// عمليات مزامنة مع الخادم
export const getMiningStatus = createAsyncThunk(
  'mining/getMiningStatus',
  async (userId, { rejectWithValue, getState }) => {
    try {
      const { token } = getState().auth;
      
      const response = await axios.get(`${process.env.REACT_APP_API_URL}/mining/status/${userId}`, {
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

export const startMining = createAsyncThunk(
  'mining/startMining',
  async (userId, { rejectWithValue, getState }) => {
    try {
      const { token } = getState().auth;
      
      const response = await axios.post(`${process.env.REACT_APP_API_URL}/mining/start`, {
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

export const collectMiningReward = createAsyncThunk(
  'mining/collectMiningReward',
  async (userId, { rejectWithValue, getState }) => {
    try {
      const { token } = getState().auth;
      
      const response = await axios.post(`${process.env.REACT_APP_API_URL}/mining/collect`, {
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

export const getMiningPackages = createAsyncThunk(
  'mining/getMiningPackages',
  async (_, { rejectWithValue, getState }) => {
    try {
      const { token } = getState().auth;
      
      const response = await axios.get(`${process.env.REACT_APP_API_URL}/mining/packages`, {
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

export const purchaseMiningPackage = createAsyncThunk(
  'mining/purchaseMiningPackage',
  async ({ userId, packageId }, { rejectWithValue, getState }) => {
    try {
      const { token } = getState().auth;
      
      const response = await axios.post(`${process.env.REACT_APP_API_URL}/mining/purchase-package`, {
        userId,
        packageId
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

// شريحة التعدين
const miningSlice = createSlice({
  name: 'mining',
  initialState,
  reducers: {
    resetMiningState: (state) => {
      state.miningRate = 0;
      state.lastMiningTime = null;
      state.dailyLimit = 100;
      state.todayMined = 0;
      state.miningActive = false;
      state.currentPackage = null;
      state.loading = false;
      state.error = null;
    },
    updateMiningTime: (state) => {
      state.lastMiningTime = new Date().toISOString();
    }
  },
  extraReducers: (builder) => {
    builder
      // حالات الحصول على حالة التعدين
      .addCase(getMiningStatus.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getMiningStatus.fulfilled, (state, action) => {
        state.loading = false;
        state.miningRate = action.payload.miningRate;
        state.lastMiningTime = action.payload.lastMiningTime;
        state.dailyLimit = action.payload.dailyLimit;
        state.todayMined = action.payload.todayMined;
        state.miningActive = action.payload.miningActive;
        state.currentPackage = action.payload.currentPackage;
      })
      .addCase(getMiningStatus.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload ? action.payload.message : 'فشل الحصول على حالة التعدين';
      })
      
      // حالات بدء التعدين
      .addCase(startMining.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(startMining.fulfilled, (state, action) => {
        state.loading = false;
        state.miningActive = true;
        state.lastMiningTime = action.payload.startTime;
      })
      .addCase(startMining.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload ? action.payload.message : 'فشل بدء التعدين';
      })
      
      // حالات جمع مكافأة التعدين
      .addCase(collectMiningReward.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(collectMiningReward.fulfilled, (state, action) => {
        state.loading = false;
        state.miningActive = false;
        state.todayMined += action.payload.reward;
        state.lastMiningTime = null;
      })
      .addCase(collectMiningReward.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload ? action.payload.message : 'فشل جمع مكافأة التعدين';
      })
      
      // حالات الحصول على حزم التعدين
      .addCase(getMiningPackages.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getMiningPackages.fulfilled, (state, action) => {
        state.loading = false;
        state.miningPackages = action.payload.packages;
      })
      .addCase(getMiningPackages.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload ? action.payload.message : 'فشل الحصول على حزم التعدين';
      })
      
      // حالات شراء حزمة تعدين
      .addCase(purchaseMiningPackage.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(purchaseMiningPackage.fulfilled, (state, action) => {
        state.loading = false;
        state.currentPackage = action.payload.package;
        state.miningRate = action.payload.newMiningRate;
        state.dailyLimit = action.payload.newDailyLimit;
      })
      .addCase(purchaseMiningPackage.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload ? action.payload.message : 'فشل شراء حزمة التعدين';
      });
  }
});

export const { resetMiningState, updateMiningTime } = miningSlice.actions;

export default miningSlice.reducer;
