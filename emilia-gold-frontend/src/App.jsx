import AppRoutes from "./app/AppRoutes";
import { AuthProvider } from "./store/auth.store";
import { CurrencyProvider } from "./store/currency.store";

export default function App() {
  return (
    <AuthProvider>
      <CurrencyProvider>
        <AppRoutes />
      </CurrencyProvider>
    </AuthProvider>
  );
}
