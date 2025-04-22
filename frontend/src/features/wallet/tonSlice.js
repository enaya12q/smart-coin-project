import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';

// إنشاء محفظة TON جديدة
export const createTONWallet = createAsyncThunk(
  'ton/createWallet',
  async (_, { rejectWithValue }) => {
    try {
      const res = await axios.post('/api/ton/create-wallet');
      return res.data;
    } catch (err) {
      return rejectWithValue(err.response.data);
    }
  }
);

// الحصول على معلومات محفظة TON
export const getTONWalletInfo = createAsyncThunk(
  'ton/getWalletInfo',
  async (_, { rejectWithValue }) => {
    try {
      const res = await axios.get('/api/ton/wallet');
      return res.data;
    } catch (err) {
      if (err.response.status === 404) {
        // المستخدم ليس لديه محفظة بعد
        return null;
      }
      return rejectWithValue(err.response.data);
    }
  }
);

// ربط محفظة TON خارجية
export const linkExternalWallet = createAsyncThunk(
  'ton/linkExternalWallet',
  async ({ address, walletType }, { rejectWithValue }) => {
    try {
      const res = await axios.post('/api/ton/link-external-wallet', { address, walletType });
      return res.data;
    } catch (err) {
      return rejectWithValue(err.response.data);
    }
  }
);

// إلغاء ربط المحفظة الخارجية
export const unlinkExternalWallet = createAsyncThunk(
  'ton/unlinkExternalWallet',
  async (_, { rejectWithValue }) => {
    try {
      const res = await axios.post('/api/ton/unlink-external-wallet');
      return res.data;
    } catch (err) {
      return rejectWithValue(err.response.data);
    }
  }
);

// إنشاء رابط دفع
export const createPaymentLink = createAsyncThunk(
  'ton/createPaymentLink',
  async ({ amount, comment }, { rejectWithValue }) => {
    try {
      const res = await axios.post('/api/ton/create-payment-link', { amount, comment });
      return res.data;
    } catch (err) {
      return rejectWithValue(err.response.data);
    }
  }
);

const initialState = {
  tonWallet: null,
  seedPhrase: null,
  qrCode: null,
  paymentLink: null,
  paymentQrCode: null,
  loading: false,
  error: null
};

const tonSlice = createSlice({
  name: 'ton',
  initialState,
  reducers: {
    clearSeedPhrase: (state) => {
      state.seedPhrase = null;
    }
  },
  extraReducers: (builder) => {
    builder
      // إنشاء محفظة TON
      .addCase(createTONWallet.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createTONWallet.fulfilled, (state, action) => {
        state.loading = false;
        state.tonWallet = action.payload.wallet;
        state.seedPhrase = action.payload.seedPhrase;
        state.qrCode = action.payload.qrCode;
      })
      .addCase(createTONWallet.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload?.msg || 'فشل إنشاء المحفظة';
      })
      
      // الحصول على معلومات المحفظة
      .addCase(getTONWalletInfo.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getTONWalletInfo.fulfilled, (state, action) => {
        state.loading = false;
        if (action.payload) {
          state.tonWallet = action.payload.wallet;
          state.qrCode = action.payload.qrCode;
        } else {
          state.tonWallet = null;
        }
      })
      .addCase(getTONWalletInfo.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload?.msg || 'فشل الحصول على معلومات المحفظة';
      })
      
      // ربط محفظة خارجية
      .addCase(linkExternalWallet.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(linkExternalWallet.fulfilled, (state, action) => {
        state.loading = false;
        state.tonWallet = action.payload.wallet;
      })
      .addCase(linkExternalWallet.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload?.msg || 'فشل ربط المحفظة الخارجية';
      })
      
      // إلغاء ربط المحفظة الخارجية
      .addCase(unlinkExternalWallet.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(unlinkExternalWallet.fulfilled, (state, action) => {
        state.loading = false;
        state.tonWallet = action.payload.wallet;
      })
      .addCase(unlinkExternalWallet.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload?.msg || 'فشل إلغاء ربط المحفظة الخارجية';
      })
      
      // إنشاء رابط دفع
      .addCase(createPaymentLink.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createPaymentLink.fulfilled, (state, action) => {
        state.loading = false;
        state.paymentLink = action.payload.paymentLink;
        state.paymentQrCode = action.payload.qrCode;
      })
      .addCase(createPaymentLink.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload?.msg || 'فشل إنشاء رابط الدفع';
      });
  }
});

export const { clearSeedPhrase } = tonSlice.actions;

export default tonSlice.reducer;
