import { MarketingLayout } from "@/components/home/marketing-layout";
import { LanguageProvider } from "@/lib/language-context";

export default function Home() {
  return (
    <LanguageProvider>
      <MarketingLayout>
        <div className="px-6">
          {/* Homepage content will go here */}
        </div>
      </MarketingLayout>
    </LanguageProvider>
  );
}
