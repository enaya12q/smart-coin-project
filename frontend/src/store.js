import { configureStore } from '@reduxjs/toolkit';
import authReducer from './features/auth/authSlice';
import walletReducer from './features/wallet/walletSlice';
import miningReducer from './features/mining/miningSlice';
import storeReducer from './features/store/storeSlice';
import referralReducer from './features/referral/referralSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    wallet: walletReducer,
    mining: miningReducer,
    store: storeReducer,
    referral: referralReducer
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false
    })
});
