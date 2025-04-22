import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';

// الحالة الأولية
const initialState = {
  balance: 0,
  transactions: [],
  loading: false,
  error: null
};

// عمليات مزامنة مع الخادم
export const getBalance = createAsyncThunk(
  'wallet/getBalance',
  async (userId, { rejectWithValue, getState }) => {
    try {
      const { token } = getState().auth;
      
      const response = await axios.get(`${process.env.REACT_APP_API_URL}/wallet/balance/${userId}`, {
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

export const getTransactions = createAsyncThunk(
  'wallet/getTransactions',
  async (userId, { rejectWithValue, getState }) => {
    try {
      const { token } = getState().auth;
      
      const response = await axios.get(`${process.env.REACT_APP_API_URL}/wallet/transactions/${userId}`, {
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

export const transferCoins = createAsyncThunk(
  'wallet/transferCoins',
  async ({ fromUserId, toUserId, amount }, { rejectWithValue, getState }) => {
    try {
      const { token } = getState().auth;
      
      const response = await axios.post(`${process.env.REACT_APP_API_URL}/wallet/transfer`, {
        fromUserId,
        toUserId,
        amount
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

// شريحة المحفظة
const walletSlice = createSlice({
  name: 'wallet',
  initialState,
  reducers: {
    resetWalletState: (state) => {
      state.balance = 0;
      state.transactions = [];
      state.loading = false;
      state.error = null;
    }
  },
  extraReducers: (builder) => {
    builder
      // حالات الحصول على الرصيد
      .addCase(getBalance.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getBalance.fulfilled, (state, action) => {
        state.loading = false;
        state.balance = action.payload.balance;
      })
      .addCase(getBalance.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload ? action.payload.message : 'فشل الحصول على الرصيد';
      })
      
      // حالات الحصول على المعاملات
      .addCase(getTransactions.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getTransactions.fulfilled, (state, action) => {
        state.loading = false;
        state.transactions = action.payload.transactions;
      })
      .addCase(getTransactions.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload ? action.payload.message : 'فشل الحصول على المعاملات';
      })
      
      // حالات تحويل العملات
      .addCase(transferCoins.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(transferCoins.fulfilled, (state, action) => {
        state.loading = false;
        state.balance = action.payload.newBalance;
        // إضافة المعاملة الجديدة إلى قائمة المعاملات
        if (state.transactions.length > 0) {
          state.transactions.unshift({
            id: `tx_${Date.now()}`,
            type: 'تحويل',
            amount: -action.payload.amount,
            timestamp: new Date(),
            status: 'مكتمل'
          });
        }
      })
      .addCase(transferCoins.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload ? action.payload.message : 'فشل تحويل العملات';
      });
  }
});

export const { resetWalletState } = walletSlice.actions;

export default walletSlice.reducer;
