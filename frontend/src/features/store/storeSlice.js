import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';

// الحالة الأولية
const initialState = {
  products: [],
  cards: [],
  packages: [],
  cart: [],
  loading: false,
  error: null,
  paymentUrl: null,
  transactionId: null
};

// عمليات مزامنة مع الخادم
export const getStoreProducts = createAsyncThunk(
  'store/getStoreProducts',
  async (_, { rejectWithValue, getState }) => {
    try {
      const { token } = getState().auth;
      
      const response = await axios.get(`${process.env.REACT_APP_API_URL}/store/products`, {
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

export const getStoreCards = createAsyncThunk(
  'store/getStoreCards',
  async (_, { rejectWithValue, getState }) => {
    try {
      const { token } = getState().auth;
      
      const response = await axios.get(`${process.env.REACT_APP_API_URL}/store/cards`, {
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

export const getStorePackages = createAsyncThunk(
  'store/getStorePackages',
  async (_, { rejectWithValue, getState }) => {
    try {
      const { token } = getState().auth;
      
      const response = await axios.get(`${process.env.REACT_APP_API_URL}/store/packages`, {
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

export const createPayment = createAsyncThunk(
  'store/createPayment',
  async ({ userId, packageId, amount, description }, { rejectWithValue, getState }) => {
    try {
      const { token } = getState().auth;
      
      const response = await axios.post(`${process.env.REACT_APP_API_URL}/payment/create`, {
        userId,
        packageId,
        amount,
        description
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

export const verifyPayment = createAsyncThunk(
  'store/verifyPayment',
  async (transactionId, { rejectWithValue, getState }) => {
    try {
      const { token } = getState().auth;
      
      const response = await axios.post(`${process.env.REACT_APP_API_URL}/payment/verify`, {
        transactionId
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

export const purchaseCard = createAsyncThunk(
  'store/purchaseCard',
  async ({ userId, cardId, quantity }, { rejectWithValue, getState }) => {
    try {
      const { token } = getState().auth;
      
      const response = await axios.post(`${process.env.REACT_APP_API_URL}/store/purchase-card`, {
        userId,
        cardId,
        quantity
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

// شريحة المتجر
const storeSlice = createSlice({
  name: 'store',
  initialState,
  reducers: {
    resetStoreState: (state) => {
      state.products = [];
      state.cards = [];
      state.packages = [];
      state.cart = [];
      state.loading = false;
      state.error = null;
      state.paymentUrl = null;
      state.transactionId = null;
    },
    addToCart: (state, action) => {
      const { item, quantity = 1 } = action.payload;
      const existingItem = state.cart.find(cartItem => cartItem.id === item.id);
      
      if (existingItem) {
        existingItem.quantity += quantity;
      } else {
        state.cart.push({ ...item, quantity });
      }
    },
    removeFromCart: (state, action) => {
      const itemId = action.payload;
      state.cart = state.cart.filter(item => item.id !== itemId);
    },
    updateCartItemQuantity: (state, action) => {
      const { itemId, quantity } = action.payload;
      const item = state.cart.find(item => item.id === itemId);
      
      if (item) {
        item.quantity = quantity;
      }
    },
    clearCart: (state) => {
      state.cart = [];
    },
    clearPaymentData: (state) => {
      state.paymentUrl = null;
      state.transactionId = null;
    }
  },
  extraReducers: (builder) => {
    builder
      // حالات الحصول على منتجات المتجر
      .addCase(getStoreProducts.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getStoreProducts.fulfilled, (state, action) => {
        state.loading = false;
        state.products = action.payload.products;
      })
      .addCase(getStoreProducts.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload ? action.payload.message : 'فشل الحصول على منتجات المتجر';
      })
      
      // حالات الحصول على بطاقات المتجر
      .addCase(getStoreCards.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getStoreCards.fulfilled, (state, action) => {
        state.loading = false;
        state.cards = action.payload.cards;
      })
      .addCase(getStoreCards.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload ? action.payload.message : 'فشل الحصول على بطاقات المتجر';
      })
      
      // حالات الحصول على حزم المتجر
      .addCase(getStorePackages.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getStorePackages.fulfilled, (state, action) => {
        state.loading = false;
        state.packages = action.payload.packages;
      })
      .addCase(getStorePackages.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload ? action.payload.message : 'فشل الحصول على حزم المتجر';
      })
      
      // حالات إنشاء الدفع
      .addCase(createPayment.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createPayment.fulfilled, (state, action) => {
        state.loading = false;
        state.paymentUrl = action.payload.paymentUrl;
        state.transactionId = action.payload.transactionId;
      })
      .addCase(createPayment.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload ? action.payload.message : 'فشل إنشاء طلب الدفع';
      })
      
      // حالات التحقق من الدفع
      .addCase(verifyPayment.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(verifyPayment.fulfilled, (state, action) => {
        state.loading = false;
        // إذا تم التحقق من الدفع بنجاح، نقوم بمسح بيانات الدفع
        if (action.payload.success && action.payload.status === 'completed') {
          state.paymentUrl = null;
          state.transactionId = null;
        }
      })
      .addCase(verifyPayment.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload ? action.payload.message : 'فشل التحقق من حالة الدفع';
      })
      
      // حالات شراء البطاقة
      .addCase(purchaseCard.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(purchaseCard.fulfilled, (state, action) => {
        state.loading = false;
        // إزالة البطاقة المشتراة من سلة التسوق
        state.cart = state.cart.filter(item => item.id !== action.payload.cardId);
      })
      .addCase(purchaseCard.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload ? action.payload.message : 'فشل شراء البطاقة';
      });
  }
});

export const { 
  resetStoreState, 
  addToCart, 
  removeFromCart, 
  updateCartItemQuantity, 
  clearCart,
  clearPaymentData
} = storeSlice.actions;

export default storeSlice.reducer;
