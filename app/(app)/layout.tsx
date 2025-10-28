import { headers } from 'next/headers';
import { getAppConfig } from '@/lib/utils';

interface LayoutProps {
  children: React.ReactNode;
}

export default async function Layout({ children }: LayoutProps) {
  const hdrs = await headers();
  const { companyName, logo, logoDark } = await getAppConfig(hdrs);

  return (
    <>
      <header className="fixed top-0 left-0 z-50 hidden w-full flex-row justify-between p-6 md:flex">
        <a
          target="_blank"
          rel="noopener noreferrer"
          href="https://finsure.refobe.com"
          className="scale-100 transition-transform duration-300 hover:scale-110"
        >
          <span className="text-foreground font-mono text-xs font-bold tracking-wider uppercase">
            Finsure
          </span>
        </a>
      </header>

      {children}
    </>
  );
}
