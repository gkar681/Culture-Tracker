import { Redirect} from "expo-router";
import { useAuth } from "@/lib/auth";

export default function Index() {
  const { user, loading = true } = useAuth();
  

  if (loading) return null;

  if (!user) {
    return <Redirect href="/(auth)/login" />;
  } else {
    return <Redirect href="/(app)/(tabs)/home" />;
  }
}