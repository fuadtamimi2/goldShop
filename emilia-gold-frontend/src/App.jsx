import { useAuth } from "./store/auth.store";
import AppRoutes from "./app/AppRoutes";
import { AuthProvider } from "./store/auth.store";
import { CurrencyProvider } from "./store/currency.store";
import { SettingsProvider } from "./store/settings.store";

function InnerApp() {
  const { user } = useAuth();

  return (
    <CurrencyProvider>
      <SettingsProvider user={user}>
        <AppRoutes />
      </SettingsProvider>
    </CurrencyProvider>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <InnerApp />
    </AuthProvider>
  );
}
